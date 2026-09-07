export interface MonthlySettings {
  enabled: boolean;
  cashCoverageMonths: number | null;
  dependableIncomeMonthly: number | null;
  reserveExtra: number | null;
  refillCash: boolean;
  guardrailFloor: number | null;
  discretionaryCutPercent: number | null;
  legacyTarget: number | null;
  legacyRealDollars: boolean;
}
export interface PlanEvent {
  id: string; name: string; month: string;
  kind: 'expense' | 'cashReceipt';
  amount: number | null;
  taxableAmount: number | null;
  confirmedCashTreatment: boolean;
}
export interface ScenarioOverrides {
  retirementMonthYou?: string;
  retirementMonthPartner?: string;
  spendingChangePercent?: number;
  inflation?: number;
  planToAge?: number;
  returnYears?: { year: number | null; rate: number | null }[];
  events?: PlanEvent[];
  cashCoverageMonths?: number;
  discretionaryCutPercent?: number;
  guardrailFloor?: number;
}
export interface SavedScenario {
  id: string; name: string;
  /** Immutable local snapshot; never sent to a server. */
  baseline: string;
  overrides: ScenarioOverrides;
}
export interface Laboratory {
  version: 1;
  settings: MonthlySettings;
  events: PlanEvent[];
  scenarios: SavedScenario[];
}
export const EMPTY_LAB: Laboratory = {
  version: 1,
  settings: { enabled: false, cashCoverageMonths: null, dependableIncomeMonthly: null, reserveExtra: null, refillCash: false, guardrailFloor: null, discretionaryCutPercent: null, legacyTarget: null, legacyRealDollars: true },
  events: [], scenarios: [],
};
const month = (v: unknown) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const amount = (v: unknown) => v === null || typeof v === 'number' && Number.isFinite(v) && v >= 0;
function validateEvents(events: PlanEvent[]) {
  if (!Array.isArray(events) || events.length > 500) throw new Error('Invalid life events.');
  const ids = new Set<string>();
  for (const e of events) {
    if (!e.id || ids.has(e.id) || typeof e.name !== 'string' || !(e.month === '' || month(e.month)) || !['expense', 'cashReceipt'].includes(e.kind) || !amount(e.amount) || !amount(e.taxableAmount) || typeof e.confirmedCashTreatment !== 'boolean' || (e.amount !== null && e.taxableAmount !== null && e.taxableAmount > e.amount)) throw new Error('Invalid life event.');
    ids.add(e.id);
  }
}
export function normalizeLaboratory(input: unknown): Laboratory {
  if (input === undefined) return structuredClone(EMPTY_LAB);
  if (!input || typeof input !== 'object') throw new Error('Invalid scenario laboratory.');
  const lab = input as Laboratory, s = lab.settings;
  if (lab.version !== 1 || !s || !['enabled', 'refillCash', 'legacyRealDollars'].every(k => typeof s[k as keyof MonthlySettings] === 'boolean') || !['cashCoverageMonths', 'dependableIncomeMonthly', 'reserveExtra', 'guardrailFloor', 'discretionaryCutPercent', 'legacyTarget'].every(k => amount(s[k as keyof MonthlySettings])) || (s.discretionaryCutPercent ?? 0) > 100) throw new Error('Invalid monthly settings.');
  validateEvents(lab.events);
  if (!Array.isArray(lab.scenarios) || lab.scenarios.length > 30) throw new Error('Invalid saved scenarios.');
  const ids = new Set<string>();
  for (const scenario of lab.scenarios) {
    if (!scenario.id || ids.has(scenario.id) || typeof scenario.name !== 'string' || typeof scenario.baseline !== 'string' || scenario.baseline.length > 2_000_000 || !scenario.overrides) throw new Error('Invalid scenario.');
    ids.add(scenario.id);
    const o = scenario.overrides;
    if (o.retirementMonthYou !== undefined && !month(o.retirementMonthYou) || o.retirementMonthPartner !== undefined && !month(o.retirementMonthPartner)) throw new Error('Invalid scenario timeline.');
    for (const key of ['spendingChangePercent', 'inflation', 'planToAge', 'cashCoverageMonths', 'guardrailFloor', 'discretionaryCutPercent'] as const) if (o[key] !== undefined && (!Number.isFinite(o[key]) || o[key]! < (key === 'spendingChangePercent' ? -100 : key === 'inflation' ? -99 : 0))) throw new Error('Invalid scenario assumption.');
    if ((o.discretionaryCutPercent ?? 0) > 100 || (o.planToAge ?? 0) > 120) throw new Error('Scenario assumption out of range.');
    if (o.returnYears !== undefined && (!Array.isArray(o.returnYears) || o.returnYears.some(r => !(r.year === null || Number.isInteger(r.year) && r.year >= 2026) || !(r.rate === null || Number.isFinite(r.rate) && r.rate > -100)))) throw new Error('Invalid return path.');
    if (o.events !== undefined) validateEvents(o.events);
    const baseline = JSON.parse(scenario.baseline);
    if (!baseline || typeof baseline !== 'object' || baseline.laboratory?.scenarios?.length) throw new Error('Scenario snapshots cannot contain other scenarios.');
  }
  return structuredClone(lab);
}
