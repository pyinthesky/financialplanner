import { annualize, retirementAmount, scheduledPayments, type BudgetData, type BudgetOwner, type BudgetLine, type BudgetPay, type Frequency } from './budget.ts';

export interface BudgetHousehold { currentAge: number; partnerAge: number; retirementAge: number; partnerRetirementAge: number; maritalStatus: 'single' | 'married' }
export interface BudgetMonth {
  payByOwner:{owner:'you'|'partner';amount:number}[];
  month: string; youRetired: boolean; partnerRetired: boolean;
  takeHome: number; grossPay: number; taxableWages: number; employerTaxable: number; withholding: number; payrollDeductions: number;
  essential: number; discretionary: number; spending: number;
  requestedSavings: number; employeeSavings: number; employerSavings: number;
  payrollComplete: boolean; missingAmounts: number; averageSchedules: number;
  transfers: { accountId: string; amount: number; source: 'payroll' | 'employer' | 'takeHome' }[];
  lines: { id: string; name: string; amount: number | null; essential: boolean; timing: 'scheduled' | 'average'; retired: boolean }[];
}

export function retirementMonths(budget: BudgetData, household: BudgetHousehold, startYear: number) {
  const fromAge = (retirement: number, age: number) => `${startYear + Math.max(0, retirement - age)}-01`;
  return {
    you: budget.timeline?.retirementMonthYou || fromAge(household.retirementAge, household.currentAge),
    partner: household.maritalStatus === 'single' ? `${startYear}-01` : budget.timeline?.retirementMonthPartner || fromAge(household.partnerRetirementAge, household.partnerAge),
  };
}

export function payrollReconciliation(pay: BudgetPay, accountIds: string[]) {
  const p = pay.payroll;
  if (!p || pay.amount === null || [p.gross, p.taxableWages, p.incomeTaxWithheld, p.otherDeductions, p.employeeSavings, p.employerSavings].some(v => v === null || !Number.isFinite(v) || v < 0)) return { complete: false, difference: null, reason: 'Complete all payroll fields, including explicit zero amounts.' };
  const difference = p.gross! - p.incomeTaxWithheld! - p.otherDeductions! - p.employeeSavings! - pay.amount;
  if (p.taxableWages! > p.gross! || Math.abs(difference) > 0.005) return { complete: false, difference, reason: 'Gross pay must reconcile to take-home pay, and taxable wages cannot exceed gross pay.' };
  if (p.allocations && (Math.abs(p.allocations.reduce((s,a)=>s+a.employee,0)-p.employeeSavings!)>0.005 || Math.abs(p.allocations.reduce((s,a)=>s+a.employer,0)-p.employerSavings!)>0.005 || p.allocations.some(a=>!accountIds.includes(a.accountId)) || Math.abs(p.allocations.filter(a=>a.kind==='roth').reduce((s,a)=>s+a.employer,0)-(p.employerTaxable??0))>0.005)) return {complete:false,difference,reason:'Payroll allocations must reconcile to employee/employer totals and linked accounts.'};
  if (!p.allocations && (p.employeeSavings! + p.employerSavings!) > 0 && !accountIds.includes(p.accountId)) return { complete: false, difference, reason: 'Choose the account receiving payroll savings.' };
  return { complete: true, difference, reason: 'Payroll reconciles. Taxable wages and deductions remain your entered estimates.' };
}

function monthAmount(amount: number | null, frequency: Frequency, anchor: string, year: number, m: number, end = '') {
  const schedule = scheduledPayments(amount, frequency, anchor, year, end);
  // Missing timing is explicitly an average, not an invented payment date.
  if (schedule) return { amount: schedule[m], timing: 'scheduled' as const };
  const iso = `${year}-${String(m + 1).padStart(2, '0')}`;
  if (end && iso > end.slice(0, 7)) return { amount: 0, timing: 'average' as const };
  return { amount: amount === null ? null : annualize(amount, frequency)! / 12, timing: 'average' as const };
}

/** Latest applicable dated edit wins; array order provides deterministic precedence. */
export function amountForMonth(budget: BudgetData, line: BudgetLine, month: string, retired: boolean) {
  let amount = retired ? retirementAmount(line) : line.retirement.rule === 'retirementOnly' ? 0 : line.amount;
  for (const edit of budget.overrides ?? []) if (edit.lineId === line.id && month >= edit.fromMonth && (!edit.throughMonth || month <= edit.throughMonth)) amount = edit.amount;
  return amount;
}

/** Planned cash by calendar month. No bank observations and no account funds are manufactured. */
export function buildBudgetYear(budget: BudgetData, household: BudgetHousehold, year: number, startYear: number, accountIds: string[] = []): BudgetMonth[] {
  const dates = retirementMonths(budget, household, startYear);
  return Array.from({ length: 12 }, (_, m) => {
    const month = `${year}-${String(m + 1).padStart(2, '0')}`;
    const youRetired = month >= dates.you, partnerRetired = month >= dates.partner;
    const retired = (owner: BudgetOwner) => owner === 'you' ? youRetired : owner === 'partner' ? partnerRetired : youRetired && partnerRetired;
    const row: BudgetMonth = { payByOwner:[],month, youRetired, partnerRetired, takeHome: 0, grossPay: 0, taxableWages: 0, employerTaxable: 0, withholding: 0, payrollDeductions: 0, essential: 0, discretionary: 0, spending: 0, requestedSavings: 0, employeeSavings: 0, employerSavings: 0, payrollComplete: true, missingAmounts: 0, averageSchedules: 0, transfers: [], lines: [] };
    for (const pay of budget.pay) {
      if (retired(pay.owner) || pay.owner === 'partner' && household.maritalStatus === 'single') continue;
      const net = monthAmount(pay.amount, pay.frequency, pay.nextPayDate, year, m);
      row.takeHome += net.amount ?? 0;
      row.payByOwner.push({owner:pay.owner,amount:net.amount??0});
      if (net.amount === null) row.missingAmounts++;
      if (net.timing === 'average') row.averageSchedules++;
      const reconciled = payrollReconciliation(pay, accountIds);
      row.payrollComplete &&= reconciled.complete;
      if (reconciled.complete) {
        const p = pay.payroll!;
        const value = (amount: number | null) => monthAmount(amount, pay.frequency, pay.nextPayDate, year, m).amount ?? 0;
        row.grossPay += value(p.gross); row.taxableWages += value(p.taxableWages); row.employerTaxable += value(p.employerTaxable??0);
        row.withholding += value(p.incomeTaxWithheld); row.payrollDeductions += value(p.otherDeductions);
        row.employeeSavings += value(p.employeeSavings); row.employerSavings += value(p.employerSavings);
        if(p.allocations) for(const a of p.allocations) row.transfers.push({accountId:a.accountId,amount:value(a.employee),source:'payroll'},{accountId:a.accountId,amount:value(a.employer),source:'employer'});
        else row.transfers.push({ accountId: p.accountId, amount: value(p.employeeSavings), source: 'payroll' }, { accountId: p.accountId, amount: value(p.employerSavings), source: 'employer' });
      }
    }
    for (const line of budget.lines) {
      if (line.owner === 'partner' && household.maritalStatus === 'single') continue;
      const isRetired = retired(line.owner);
      const amount = amountForMonth(budget, line, month, isRetired);
      const entry = monthAmount(amount, line.frequency, line.nextDueDate, year, m, line.endDate);
      row.lines.push({ id: line.id, name: line.name || line.category, amount: entry.amount, essential: line.essential, timing: entry.timing, retired: isRetired });
      if (entry.amount === null) row.missingAmounts++;
      else if (line.essential) row.essential += entry.amount; else row.discretionary += entry.amount;
      if (entry.timing === 'average' && amount !== 0) row.averageSchedules++;
    }
    row.spending = row.essential + row.discretionary;
    for (const saving of budget.savings ?? []) {
      if (retired(saving.owner) || saving.owner === 'partner' && household.maritalStatus === 'single') continue;
      if (saving.amount === null) row.missingAmounts++;
      const amount = (annualize(saving.amount, saving.frequency) ?? 0) / 12;
      row.requestedSavings += amount;
      row.transfers.push({ accountId: saving.accountId, amount, source: 'takeHome' });
    }
    return row;
  });
}
