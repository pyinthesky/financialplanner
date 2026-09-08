import type { PlannerData } from './planner.ts';
import type { ScenarioOverrides } from './monthly-model.ts';
/** Apply an isolated strategy to the saved plan. Escrow reconciliation stays in
 * debtPayoffSchedule, so only principal and interest can cascade. */
export function debtScenarioPlan(plan:PlannerData, overrides:ScenarioOverrides):PlannerData {
  const strategy=overrides.debtStrategy;
  if(!strategy)return plan;
  return {...plan,debtStrategy:{method:strategy.method??plan.debtStrategy.method,extraMonthlyPayment:strategy.extraMonthlyPayment??plan.debtStrategy.extraMonthlyPayment},debts:plan.debts.map(d=>({...d,customExtraPayment:strategy.customExtraPayments?.[d.id]??d.customExtraPayment}))};
}
