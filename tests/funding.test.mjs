import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PLAN, projectPlan } from '../lib/planner.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 0.001, `${a} != ${b}`);
function plan(balance, kind = 'cash', spending = 100) {
  const p = structuredClone(DEFAULT_PLAN);
  Object.assign(p.household, { currentAge: 60, retirementAge: 60, planToAge: 60 });
  p.assumptions.annualSpending = spending;
  p.accounts = [{ id: 'fixture', name: 'Synthetic', owner: 'you', kind, balance, annualContribution: 0 }];
  return p;
}

test('cash consumption is reported as funding and reconciles assets', () => {
  const row = projectPlan(plan(100))[0];
  close(row.cash, 0); close(row.withdrawals, 100); close(row.cashWithdrawal, 100);
  close(row.fundedRatio, 1); close(row.unfundedSpending, 0);
});

test('income surplus pays tax first and the remaining cash is retained', () => {
  const p = plan(0, 'cash', 10_000);
  p.income = [{ id: 'p', name: 'Synthetic', kind: 'pension', owner: 'you', annualAmount: 30_000, startAge: 60, cola: 0, survivorPercent: 0 }];
  const row = projectPlan(p)[0];
  close(row.taxes, 1_420); close(row.cash, 18_580); close(row.withdrawals, 0);
  close(row.income, row.spending + row.taxesPaid + row.cashSurplus);
});

test('tax-funded traditional withdrawals converge to an independent bracket equation', () => {
  const row = projectPlan(plan(100_000, 'traditional', 30_000))[0];
  // 2026 single: tax = 1240 + .12 * (gross - 28500).
  const gross = (30_000 - 2_180) / 0.88;
  close(row.traditionalWithdrawal, gross); close(row.taxes, gross - 30_000);
  close(100_000, row.portfolio + row.spending + row.taxesPaid);
  assert.equal(row.taxFundingConverged, true);
});

test('insufficient tax funding remains visible and prevents full success', () => {
  const row = projectPlan(plan(30_000, 'traditional', 30_000))[0];
  close(row.portfolio, 0); close(row.unfundedSpending, 0);
  close(row.unfundedTaxes, 1_420); close(row.taxesPaid, 0);
  assert.ok(row.fundedRatio < 1); assert.equal(row.taxFundingConverged, false);
});

test('cash pays conversion tax without becoming taxable income', () => {
  const p = plan(50_000, 'traditional', 0);
  p.accounts.push({ id: 'cash', name: 'Synthetic', owner: 'you', kind: 'cash', balance: 1_000, annualContribution: 0 });
  Object.assign(p.rothConversionPlanning, { annualConversionYou: 20_000, startAgeYou: 60, endAgeYou: 60 });
  const row = projectPlan(p)[0];
  close(row.taxes, 390); close(row.cash, 610); close(row.roth, 20_000);
  close(row.traditional, 30_000); close(row.grossOrdinaryIncome, 20_000);
  close(51_000, row.portfolio + row.taxesPaid);
});

test('a conversion cannot pay its own tax by immediately spending the converted pool', () => {
  const p = plan(20_000, 'traditional', 0);
  Object.assign(p.rothConversionPlanning, { annualConversionYou: 20_000, startAgeYou: 60, endAgeYou: 60 });
  const row = projectPlan(p)[0];
  close(row.roth, 20_000); close(row.unfundedTaxes, 390);
  close(row.rothWithdrawal, 0); assert.ok(row.fundedRatio < 1);
});
