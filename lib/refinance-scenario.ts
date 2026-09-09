import { activeMortgageStatement, type PlannerData } from './planner.ts';
import { compareRefinance, type RefinanceCase } from './refinance.ts';
import type { PlanEvent } from './monthly-model.ts';

/** Refinance at the opening January balance, never a silent edit to the baseline. */
export function refinanceScenarioPlan(plan: PlannerData, offer: RefinanceCase) {
  const debt = plan.debts.find(d => d.id === offer.debtId);
  const statement = activeMortgageStatement(plan);
  const monthly = statement && debt && statement.debtId === debt.id ? statement!.principalInterest! : debt?.minimumPayment ?? 0;
  const result = debt && compareRefinance(debt.balance, debt.interestRate, monthly, offer);
  const issues: string[] = [];
  if (!result) issues.push('Complete the refinance offer and an amortizing current loan payment.');
  if (plan.housing.statement?.enabled && !statement) issues.push('Reconcile the current mortgage statement before comparing refinancing.');
  if (plan.realEstate?.properties.some(p => p.debtId === offer.debtId)) issues.push('Rental-loan refinancing requires a separate review of property financing and taxes; only the loan comparison is available.');
  const year = plan.budget.timeline?.startYear;
  if (!Number.isInteger(year) || !year || year < 2026 || year > 2100) issues.push('Enter the opening-balance year in Household before saving a refinance scenario.');
  if (issues.length || !debt || !result) return { plan, issues, feeEvent: null };
  const updated = structuredClone(plan);
  const replacement = updated.debts.find(d => d.id === debt.id)!;
  replacement.balance += offer.financed ? offer.fees! : 0;
  replacement.interestRate = offer.rate!;
  replacement.minimumPayment = result.newPayment;
  if (statement?.debtId === debt.id) {
    updated.housing.statement = { ...statement, principalInterest: result.newPayment, total: statement.total! - statement.principalInterest! + result.newPayment };
  }
  const feeEvent: PlanEvent | null = !offer.financed && offer.fees! > 0 ? {
    id: 'refinance-closing-costs', name: 'Refinance Closing Costs', kind: 'expense',
    month: `${year}-01`, amount: offer.fees, taxableAmount: 0, confirmedCashTreatment: true,
  } : null;
  return { plan: updated, issues, feeEvent };
}
