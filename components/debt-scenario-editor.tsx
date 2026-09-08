"use client";
import { Amount } from '@/components/budget-editor';
import { DebtPayoffView } from '@/components/debt-payoff-view';
import { debtScenarioPlan } from '@/lib/debt-scenario';
import { normalizePlan } from '@/lib/planner';
import type { SavedScenario, ScenarioOverrides } from '@/lib/monthly-model';
export function DebtScenarioEditor({scenario,onChange}:{scenario:SavedScenario;onChange:(debtStrategy:ScenarioOverrides['debtStrategy'])=>void}) {
  const baseline=normalizePlan(JSON.parse(scenario.baseline));
  const strategy=scenario.overrides.debtStrategy??{};
  const plan=debtScenarioPlan(baseline,scenario.overrides);
  return <details className="budget-flow"><summary>Debt Payoff Experiment</summary><p>Change this saved scenario only. Blank overrides inherit its saved baseline. Snowball and Avalanche retain paid-off minimums; Custom uses each loan’s assigned extra and does not roll payments forward. Full scenario results include the changed payments and funding needs.</p><div className="budget-fields"><label className="budget-field"><span>Scenario Payoff Method</span><select aria-label="Scenario Payoff Method" value={strategy.method??''} onChange={e=>onChange({...strategy,method:(e.target.value||undefined) as typeof strategy.method})}><option value="">Use Saved Baseline ({baseline.debtStrategy.method})</option><option value="snowball">Snowball — Smallest Balance First</option><option value="avalanche">Avalanche — Highest APR First</option><option value="custom">Custom — Assigned Extra, No Rollover</option></select></label>{plan.debtStrategy.method!=='custom'?<Amount label="Scenario Extra Payment / Month" value={strategy.extraMonthlyPayment??null} onChange={v=>onChange({...strategy,extraMonthlyPayment:v??undefined})}/>:baseline.debts.map(d=><Amount key={d.id} label={`Scenario Extra for ${d.name||'Debt'} / Month`} value={strategy.customExtraPayments?.[d.id]??null} onChange={v=>{const payments={...strategy.customExtraPayments};if(v===null)delete payments[d.id];else payments[d.id]=v;onChange({...strategy,customExtraPayments:payments});}}/>)}</div><button className="reference-button" type="button" onClick={()=>onChange(undefined)}>Restore Baseline Debt Strategy</button><DebtPayoffView plan={plan} title="Scenario Debt Payoff Path"/></details>;
}
