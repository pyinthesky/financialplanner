import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_BUDGET, annualize, budgetTotals, normalizeBudget, retirementAmount, scheduledPayments } from '../lib/budget.ts';
import { DEFAULT_PLAN, normalizePlan, projectPlan } from '../lib/planner.ts';
const line = () => ({ id: 'bill', name: 'Synthetic Bill', category: 'Other', amount: 100, frequency: 'monthly', essential: true, owner: 'household', nextDueDate: '', endDate: '', retirement: { rule: 'continue', amount: null, reason: '' } });
test('annualization distinguishes biweekly, twice-monthly, blank and deliberate zero', () => {
  assert.equal(annualize(100, 'biweekly'), 2600);
  assert.equal(annualize(100, 'semimonthly'), 2400);
  assert.equal(annualize(null, 'monthly'), null);
  assert.equal(annualize(0, 'monthly'), 0);
});
test('retirement links follow edits while explicit replacements remain independent', () => {
  const l = line(); l.amount = 200; assert.equal(retirementAmount(l), 200);
  l.retirement = { rule: 'replace', amount: 80, reason: 'Synthetic choice' };
  l.amount = 300; assert.equal(retirementAmount(l), 80);
  l.retirement = { rule: 'percent', amount: -20, reason: '' };
  assert.equal(retirementAmount(l), 240);
  l.retirement.rule = 'stop'; assert.equal(retirementAmount(l), 0);
});
test('annual reserve and actual due month are separate calculations', () => {
  assert.equal(annualize(1200, 'annual') / 12, 100);
  assert.deepEqual(scheduledPayments(1200, 'annual', '2026-07-04', 2026), [0,0,0,0,0,0,1200,0,0,0,0,0]);
  assert.equal(scheduledPayments(1200, 'annual', '', 2026), null);
});
test('scheduled dates handle leap years, clipped month ends, end dates and a 27-pay year', () => {
  assert.deepEqual(scheduledPayments(100, 'monthly', '2028-01-31', 2028, '2028-03-31'), [100,100,100,0,0,0,0,0,0,0,0,0]);
  assert.equal(scheduledPayments(100, 'biweekly', '2026-01-01', 2026).reduce((a,b) => a+b), 2700);
  assert.equal(scheduledPayments(100, 'semimonthly', '2026-01-01', 2026).reduce((a,b) => a+b), 2400);
});
test('retirement-only costs do not inflate the current budget', () => {
  const l = line(); l.retirement = { rule: 'retirementOnly', amount: 250, reason: '' };
  const b = { ...structuredClone(EMPTY_BUDGET), lines: [l] };
  assert.equal(budgetTotals(b).spending, 0);
  assert.equal(budgetTotals(b, true).spending, 3000);
});
test('legacy migration preserves the aggregate and imported explicit zeros', () => {
  const p = structuredClone(DEFAULT_PLAN); p.schemaVersion = 1; delete p.budget;
  p.assumptions.annualSpending = 500;
  const migrated = normalizePlan(p);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.budget.retirementSpendingSource, 'legacy');
  assert.equal(migrated.assumptions.annualSpending, 500);
  const l = line(); l.amount = 0; migrated.budget.lines.push(l);
  assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(migrated))), migrated);
});
test('budget import rejects duplicate IDs, negative bills, nonfinite numbers and unknown frequency', () => {
  const b = { ...structuredClone(EMPTY_BUDGET), lines: [line()] };
  b.lines.push(line()); assert.throws(() => normalizeBudget(b)); b.lines.pop();
  b.lines[0].amount = -1; assert.throws(() => normalizeBudget(b));
  b.lines[0].amount = Infinity; assert.throws(() => normalizeBudget(b));
  b.lines[0].amount = 1; b.lines[0].frequency = 'sometimes'; assert.throws(() => normalizeBudget(b));
});
test('worksheet replaces legacy spending in the shared projection without double counting', () => {
  const p = structuredClone(DEFAULT_PLAN);
  Object.assign(p.household, { currentAge: 60, retirementAge: 60, planToAge: 60 });
  p.assumptions.annualSpending = 9000;
  p.budget.lines = [line()];
  p.budget.retirementSpendingSource = 'worksheet';
  assert.equal(projectPlan(p)[0].spending, 1200);
  p.budget.lines[0].amount = 200;
  assert.equal(projectPlan(p)[0].spending, 2400);
  p.budget.retirementSpendingSource = 'legacy';
  assert.equal(projectPlan(p)[0].spending, 9000);
});
