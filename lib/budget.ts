/** Canonical budget facts. Amounts are never inferred from blank fields. */
export const FREQUENCIES = {
  weekly: { label: 'Weekly', payments: 52 },
  biweekly: { label: 'Every Two Weeks', payments: 26 },
  semimonthly: { label: 'Twice a Month', payments: 24 },
  monthly: { label: 'Monthly', payments: 12 },
  quarterly: { label: 'Quarterly', payments: 4 },
  annual: { label: 'Yearly', payments: 1 },
} as const;
export type Frequency = keyof typeof FREQUENCIES;
export type BudgetOwner = 'you' | 'partner' | 'household';
export type RetirementRule = 'continue' | 'stop' | 'replace' | 'percent' | 'retirementOnly';
export interface BudgetLine {
  id: string;
  name: string;
  category: string;
  amount: number | null;
  frequency: Frequency;
  essential: boolean;
  owner: BudgetOwner;
  /** ISO date anchors actual cash dates. Without one, only averages are known. */
  nextDueDate: string;
  endDate: string;
  retirement: { rule: RetirementRule; amount: number | null; reason: string };
}
export interface BudgetPay {
  id: string;
  name: string;
  owner: 'you' | 'partner';
  amount: number | null;
  frequency: Frequency;
  nextPayDate: string;
}
export interface BudgetData {
  version: 1;
  lines: BudgetLine[];
  pay: BudgetPay[];
  /** Migration never silently mixes category detail with an old aggregate. */
  retirementSpendingSource: 'legacy' | 'worksheet';
  reviewed: boolean;
}
export const EMPTY_BUDGET: BudgetData = {
  version: 1, lines: [], pay: [], retirementSpendingSource: 'legacy', reviewed: false,
};
export const BUDGET_CATEGORIES = ['Housing', 'Utilities', 'Food', 'Transport', 'Health', 'Dependents', 'Travel & Leisure', 'Subscriptions', 'Giving', 'Other'] as const;

export function annualize(amount: number | null, frequency: Frequency): number | null {
  return amount === null ? null : amount * FREQUENCIES[frequency].payments;
}
export function retirementAmount(line: BudgetLine): number | null {
  switch (line.retirement.rule) {
    case 'stop': return 0;
    case 'replace': case 'retirementOnly': return line.retirement.amount;
    case 'percent': return line.amount === null || line.retirement.amount === null
      ? null : line.amount * (1 + line.retirement.amount / 100);
    default: return line.amount;
  }
}
export function budgetTotals(budget: BudgetData, retired = false) {
  let essential = 0, discretionary = 0, missing = 0;
  for (const line of budget.lines) {
    const amount = retired ? retirementAmount(line) : line.retirement.rule === 'retirementOnly' ? 0 : line.amount;
    const annual = annualize(amount, line.frequency);
    if (annual === null) { missing++; continue; }
    if (line.essential) essential += annual; else discretionary += annual;
  }
  const takeHome = budget.pay.reduce((sum, pay) => sum + (annualize(pay.amount, pay.frequency) ?? 0), 0);
  return { essential, discretionary, spending: essential + discretionary, takeHome,
    margin: takeHome - essential - discretionary,
    missing: missing + (retired ? 0 : budget.pay.filter(pay => pay.amount === null).length) };
}

function validDate(value: string) {
  const date = new Date(value + 'T12:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
/** Actual due dates; null means timing has not been provided, never a zero bill. */
export function scheduledPayments(amount: number | null, frequency: Frequency, anchor: string, year: number, endDate = ''): number[] | null {
  if (amount === null || !validDate(anchor)) return null;
  const months = Array<number>(12).fill(0);
  const start = new Date(anchor + 'T12:00:00Z');
  const end = endDate && validDate(endDate) ? endDate : `${year}-12-31`;
  const add = (date: Date) => {
    const iso = date.toISOString().slice(0, 10);
    if (date.getUTCFullYear() === year && iso >= anchor && iso <= end) months[date.getUTCMonth()] += amount;
  };
  if (frequency === 'weekly' || frequency === 'biweekly') {
    const step = frequency === 'weekly' ? 7 : 14;
    const date = new Date(start);
    // Skip completed intervals efficiently when projecting distant years.
    const jan = Date.UTC(year, 0, 1, 12);
    date.setUTCDate(date.getUTCDate() + Math.max(0, Math.ceil((jan - +date) / (step * 86400000))) * step);
    while (date.getUTCFullYear() <= year) { add(date); date.setUTCDate(date.getUTCDate() + step); }
  } else {
    const stride = frequency === 'annual' ? 12 : frequency === 'quarterly' ? 3 : 1;
    const startMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
    for (let month = 0; month < 12; month++) {
      const offset = year * 12 + month - startMonth;
      if (offset < 0 || offset % stride) continue;
      const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      if (frequency === 'semimonthly') {
        // Explicit convention: 15th and final day, shown in the editor.
        add(new Date(Date.UTC(year, month, 15, 12)));
        add(new Date(Date.UTC(year, month, last, 12)));
      } else add(new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), last), 12)));
    }
  }
  return months;
}

/** Validate imported budget data before it reaches inputs/calculations. */
export function normalizeBudget(input: unknown): BudgetData {
  if (input === undefined) return structuredClone(EMPTY_BUDGET);
  if (!input || typeof input !== 'object') throw new Error('Invalid budget section.');
  const b = input as BudgetData;
  if (b.version !== 1 || !Array.isArray(b.lines) || !Array.isArray(b.pay)) throw new Error('Unsupported budget format.');
  const ids = new Set<string>();
  const money = (v: unknown, negative = false) => v === null || (typeof v === 'number' && Number.isFinite(v) && (negative ? v >= -100 : v >= 0));
  const identity = (v: { id: string; name: string; frequency: Frequency }) => {
    if (typeof v.id !== 'string' || !v.id || ids.has(v.id) || typeof v.name !== 'string' || !Object.hasOwn(FREQUENCIES, v.frequency)) throw new Error('Invalid or duplicate budget entry.');
    ids.add(v.id);
  };
  const date = (v: unknown) => typeof v === 'string' && (v === '' || validDate(v));
  for (const p of b.pay) {
    identity(p);
    if (!money(p.amount) || !['you', 'partner'].includes(p.owner) || !date(p.nextPayDate)) throw new Error('Invalid pay entry.');
  }
  for (const l of b.lines) {
    identity(l);
    if (!money(l.amount) || !l.retirement || !['continue', 'stop', 'replace', 'percent', 'retirementOnly'].includes(l.retirement.rule) || !money(l.retirement.amount, l.retirement.rule === 'percent') || typeof l.retirement.reason !== 'string' || typeof l.category !== 'string' || typeof l.essential !== 'boolean' || !['you', 'partner', 'household'].includes(l.owner) || !date(l.nextDueDate) || !date(l.endDate)) throw new Error('Invalid budget cost.');
  }
  if (!['legacy', 'worksheet'].includes(b.retirementSpendingSource) || typeof b.reviewed !== 'boolean') throw new Error('Invalid budget preferences.');
  return structuredClone(b);
}
