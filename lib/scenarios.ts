import { normalizePlan, type PlannerData } from './planner.ts';
import { EMPTY_LAB, type SavedScenario } from './monthly-model.ts';
import { projectMonthly } from './monthly-projection.ts';

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,sorted(v)]));
  return value;
}
export function baselineSnapshot(plan: PlannerData): string {
  const copy = structuredClone(plan);
  copy.laboratory = { ...(copy.laboratory ?? structuredClone(EMPTY_LAB)), scenarios: [] };
  delete copy.laboratory.simulation;
  delete copy.refinancing;
  delete copy.enrollment;
  if(copy.realEstate){delete copy.realEstate.trial;if(!copy.realEstate.properties.length)delete copy.realEstate;}
  return JSON.stringify(sorted(normalizePlan(copy)));
}
export function scenarioIsStale(plan: PlannerData, scenario: SavedScenario) { return baselineSnapshot(plan) !== scenario.baseline; }
export function scenarioChanges(plan: PlannerData, scenario: SavedScenario): string[] {
  const previous = JSON.parse(scenario.baseline), current = JSON.parse(baselineSnapshot(plan));
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  return [...keys].filter(k=>JSON.stringify(previous[k])!==JSON.stringify(current[k])).map(k=>({ realEstate:'Rental Properties', household:'Household & Timeline', budget:'Budgets & Payroll', accounts:'Account Balances & Access', assumptions:'Economic & Tax Assumptions', laboratory:'Events & Reserve Policy', debts:'Debts', income:'Benefits', housing:'Housing', healthcare:'Healthcare', recurringCosts:'Timed Costs', rothConversionPlanning:'Conversion Plan' }[k]??k));
}
export function evaluateScenario(scenario: SavedScenario) { return projectMonthly(normalizePlan(JSON.parse(scenario.baseline)), scenario.overrides); }
export function comparison(plan: PlannerData, scenarios: SavedScenario[]) {
  const baseline = projectMonthly(plan);
  return { baseline, scenarios: scenarios.map(s=>{
    const result=evaluateScenario(s), ownBaseline=projectMonthly(normalizePlan(JSON.parse(s.baseline)));
    const totalTax=(r:typeof result)=>r.years.reduce((n,y)=>n+y.taxes,0);
    return { scenario:s, result, stale:scenarioIsStale(plan,s), deltaPortfolio:(result.years.at(-1)?.portfolio??0)-(ownBaseline.years.at(-1)?.portfolio??0), deltaNetWorth:(result.years.at(-1)?.totalNetWorth??0)-(ownBaseline.years.at(-1)?.totalNetWorth??0), deltaFinancialNetWorth:(result.years.at(-1)?.financialNetWorth??0)-(ownBaseline.years.at(-1)?.financialNetWorth??0), deltaTax:totalTax(result)-totalTax(ownBaseline), comparable:result.supported&&ownBaseline.supported, baseline:ownBaseline };
  }) };
}
