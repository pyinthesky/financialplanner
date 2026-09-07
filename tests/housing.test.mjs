import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_MORTGAGE_STATEMENT, reconcileMortgage } from '../lib/housing.ts';
import { DEFAULT_PLAN, propertyTaxAnnual, homeInsuranceAnnual, mortgageAncillaryAnnual, debtPayoffSchedule, projectPlan } from '../lib/planner.ts';
import { buildPlanningSignals } from '../lib/planning-signals.ts';
function fixture() {
  const p = structuredClone(DEFAULT_PLAN);
  p.debts = [{ id: 'home', name: 'Synthetic', kind: 'mortgage', balance: 200, minimumPayment: 150, interestRate: 0 }];
  p.housing.statement = { enabled: true, debtId: 'home', total: 150, principalInterest: 100, propertyTax: 20, insurance: 10, mortgageInsurance: 15, otherEscrow: 5 };
  return p;
}
test('statement requires all components and a balanced total; no missing-as-zero inference', () => {
  assert.equal(reconcileMortgage(EMPTY_MORTGAGE_STATEMENT).reconciled, false);
  const p = fixture(); assert.equal(reconcileMortgage(p.housing.statement).reconciled, true);
  p.housing.statement.insurance = null;
  assert.equal(reconcileMortgage(p.housing.statement).complete, false);
});
test('only P&I amortizes; continuing home costs survive loan payoff without duplication', () => {
  const p = fixture();
  Object.assign(p.household, { currentAge: 60, retirementAge: 60, planToAge: 61 });
  p.housing.annualInsurance = 999; p.housing.propertyTaxMode = 'annual'; p.housing.annualPropertyTax = 999;
  const debt = debtPayoffSchedule(p);
  assert.equal(debt.length, 3); assert.equal(debt[1].principalPaid, 100);
  assert.equal(propertyTaxAnnual(p), 240); assert.equal(homeInsuranceAnnual(p), 120);
  assert.equal(mortgageAncillaryAnnual(p), 40);
  assert.equal(projectPlan(p)[0].spending, 600);
  assert.equal(projectPlan(p)[1].spending, 360);
});
test('annual dollar entry bypasses mill-rate math and disabling the statement restores manual values', () => {
  const p = fixture(); p.housing.statement.enabled = false;
  p.housing.propertyTaxMode = 'annual'; p.housing.annualPropertyTax = 100;
  p.housing.homeValue = 1000; p.housing.assessedPercent = 100; p.housing.millRate = 3;
  assert.equal(propertyTaxAnnual(p), 100);
  p.housing.propertyTaxMode = 'mills'; assert.equal(propertyTaxAnnual(p), 3);
});
test('broken active statement blocks readiness rather than silently using a mismatched total', () => {
  const p = fixture(); p.housing.statement.total = 151;
  const signals = buildPlanningSignals(p, { payoffMonths: 600 });
  assert.equal(signals.ready, false); assert.equal(signals.signals[0].title, 'Reconcile the mortgage statement');
});
