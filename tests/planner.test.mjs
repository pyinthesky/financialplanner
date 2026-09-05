import assert from "node:assert/strict";
import test from "node:test";

import { calculateFederalIncomeTax } from "../lib/federal-tax.ts";
import { calculateTaxableSocialSecurity } from "../lib/social-security-tax.ts";
import {
  formatNumericInputValue,
  reconcileNumericInputValue,
} from "../lib/numeric-input.ts";

import {
  DEFAULT_PLAN,
  debtPayoffSchedule,
  normalizePlan,
  projectPlan,
  propertyTaxAnnual,
} from "../lib/planner.ts";

const copyPlan = () => structuredClone(DEFAULT_PLAN);

test("projection covers every age in the planning horizon", () => {
  const projection = projectPlan(copyPlan());
  assert.equal(projection[0].age, DEFAULT_PLAN.household.currentAge);
  assert.equal(projection.at(-1).age, DEFAULT_PLAN.household.planToAge);
  assert.equal(
    projection.length,
    DEFAULT_PLAN.household.planToAge - DEFAULT_PLAN.household.currentAge + 1,
  );
});

test("property tax uses assessed value and mills", () => {
  const plan = copyPlan();
  plan.housing.homeValue = 500_000;
  plan.housing.assessedPercent = 80;
  plan.housing.millRate = 12;
  assert.equal(propertyTaxAnnual(plan), 4_800);
});

test("extra debt payment shortens the payoff schedule", () => {
  const baseline = copyPlan();
  baseline.debts = [
    {
      id: "test-card",
      name: "Test card",
      kind: "creditCard",
      balance: 10_000,
      interestRate: 18,
      minimumPayment: 200,
    },
  ];
  baseline.debtStrategy.extraMonthlyPayment = 0;
  const accelerated = structuredClone(baseline);
  accelerated.debtStrategy.extraMonthlyPayment = 1_000;
  assert.ok(
    debtPayoffSchedule(accelerated).length <
      debtPayoffSchedule(baseline).length,
  );
});

test("mortgage payoff scenario creates a retirement-year cash need", () => {
  const keep = copyPlan();
  keep.household.currentAge = 50;
  keep.household.retirementAge = 55;
  keep.household.planToAge = 56;
  keep.debts = [
    {
      id: "test-mortgage",
      name: "Test mortgage",
      kind: "mortgage",
      balance: 100_000,
      interestRate: 4,
      minimumPayment: 1_000,
    },
  ];
  keep.housing.payoffMortgageAtRetirement = false;
  const payoff = structuredClone(keep);
  payoff.housing.payoffMortgageAtRetirement = true;
  const keepYear = projectPlan(keep).find(
    (row) => row.age === keep.household.retirementAge,
  );
  const payoffYear = projectPlan(payoff).find(
    (row) => row.age === payoff.household.retirementAge,
  );
  assert.ok(payoffYear.spending > keepYear.spending);
});

test("plan import rejects an unknown schema version", () => {
  assert.throws(() => normalizePlan({ schemaVersion: 99 }), /unsupported/i);
});

test("2026 federal standard deduction shields income by filing status", () => {
  assert.equal(calculateFederalIncomeTax(16_100, "single").tax, 0);
  assert.equal(calculateFederalIncomeTax(32_200, "marriedJoint").tax, 0);
  assert.equal(calculateFederalIncomeTax(24_150, "headOfHousehold").tax, 0);
  assert.equal(calculateFederalIncomeTax(16_100, "marriedSeparate").tax, 0);
});

test("2026 federal tax applies progressive bracket thresholds", () => {
  const single = calculateFederalIncomeTax(66_500, "single");
  assert.equal(single.taxableIncome, 50_400);
  assert.equal(single.tax, 5_800);
  assert.equal(single.marginalRate, 0.12);

  const joint = calculateFederalIncomeTax(133_000, "marriedJoint");
  assert.equal(joint.taxableIncome, 100_800);
  assert.equal(joint.tax, 11_600);
  assert.equal(joint.marginalRate, 0.12);
});

test("future planning years inflation-index brackets and deduction", () => {
  const base = calculateFederalIncomeTax(66_500, "single");
  const indexed = calculateFederalIncomeTax(66_500 * 1.025, "single", 1.025);
  assert.ok(Math.abs(indexed.tax - base.tax * 1.025) < 0.001);
});

test("Publication 915 worksheet reproduces the IRS single-filer example", () => {
  const result = calculateTaxableSocialSecurity({
    benefits: 5_980,
    otherIncome: 28_990,
    filingStatus: "single",
  });
  assert.equal(result.provisionalIncome, 31_980);
  assert.equal(result.taxableBenefits, 2_990);
});

test("Social Security worksheet applies both the 50% and 85% tiers", () => {
  assert.equal(calculateTaxableSocialSecurity({ benefits: 10_000, otherIncome: 20_000, filingStatus: "single" }).taxableBenefits, 0);
  assert.equal(calculateTaxableSocialSecurity({ benefits: 10_000, otherIncome: 24_000, filingStatus: "single" }).taxableBenefits, 2_000);
  assert.equal(calculateTaxableSocialSecurity({ benefits: 20_000, otherIncome: 40_000, filingStatus: "single" }).taxableBenefits, 17_000);
});

test("married-filing-separately treatment respects the lived-apart distinction", () => {
  const together = calculateTaxableSocialSecurity({ benefits: 20_000, otherIncome: 0, filingStatus: "marriedSeparate" });
  const apart = calculateTaxableSocialSecurity({ benefits: 20_000, otherIncome: 0, filingStatus: "marriedSeparate", marriedFilingSeparatelyLivedApart: true });
  assert.equal(together.taxableBenefits, 8_500);
  assert.equal(apart.taxableBenefits, 0);
});

test("projection uses calculated taxable benefits instead of assuming 85 percent", () => {
  const plan = copyPlan();
  plan.household.currentAge = 67;
  plan.household.retirementAge = 67;
  plan.household.planToAge = 67;
  plan.income = [{ id: "ss", name: "Social Security", owner: "you", kind: "socialSecurity", startAge: 67, annualAmount: 20_000, cola: 0, survivorPercent: 0 }];
  const row = projectPlan(plan)[0];
  assert.equal(row.socialSecurityIncome, 20_000);
  assert.equal(row.taxableSocialSecurity, 0);
  assert.equal(row.taxableOrdinaryIncome, 0);
});

test("taxable withdrawals realize only the gain above allocated cost basis", () => {
  const plan = copyPlan();
  plan.household.currentAge = 67;
  plan.household.retirementAge = 67;
  plan.household.planToAge = 67;
  plan.assumptions.annualSpending = 50_000;
  plan.assumptions.capitalGainsRate = 20;
  plan.accounts = [{ id: "brokerage", name: "Brokerage", kind: "taxable", owner: "you", balance: 100_000, annualContribution: 0, costBasis: 80_000 }];
  const row = projectPlan(plan)[0];
  assert.ok(Math.abs(row.realizedTaxableGain - 10_000) < 0.01);
  assert.ok(Math.abs(row.capitalGainsTaxes - 2_000) < 0.01);
});

test("taxable contributions increase adjusted basis", () => {
  const plan = copyPlan();
  plan.household.currentAge = 40;
  plan.household.retirementAge = 50;
  plan.household.planToAge = 40;
  plan.accounts = [{ id: "brokerage", name: "Brokerage", kind: "taxable", owner: "you", balance: 100_000, annualContribution: 12_000, costBasis: 70_000 }];
  const row = projectPlan(plan)[0];
  assert.equal(row.taxableCostBasis, 82_000);
});

test("market-loss withdrawals do not invent taxable gains", () => {
  const plan = copyPlan();
  plan.household.currentAge = 67;
  plan.household.retirementAge = 67;
  plan.household.planToAge = 67;
  plan.assumptions.annualSpending = 50_000;
  plan.accounts = [{ id: "brokerage", name: "Brokerage", kind: "taxable", owner: "you", balance: 100_000, annualContribution: 0, costBasis: 120_000 }];
  assert.equal(projectPlan(plan)[0].realizedTaxableGain, 0);
});

test("legacy taxable accounts retain the saved gain-share estimate", () => {
  const plan = copyPlan();
  plan.household.currentAge = 67;
  plan.household.retirementAge = 67;
  plan.household.planToAge = 67;
  plan.assumptions.annualSpending = 50_000;
  plan.assumptions.taxableGainFraction = 20;
  plan.accounts = [{ id: "legacy", name: "Legacy brokerage", kind: "taxable", owner: "you", balance: 100_000, annualContribution: 0 }];
  assert.ok(Math.abs(projectPlan(plan)[0].realizedTaxableGain - 10_000) < 0.01);
});

test("legacy plan imports receive a compatible filing status", () => {
  const legacy = copyPlan();
  legacy.household.maritalStatus = "married";
  delete legacy.household.filingStatus;
  const normalized = normalizePlan(legacy);
  assert.equal(normalized.household.filingStatus, "marriedJoint");
});

test("blank plans render zero-valued numeric inputs without a visible zero", () => {
  assert.equal(formatNumericInputValue(0), "");
  assert.equal(formatNumericInputValue(Number.NaN), "");
  assert.equal(formatNumericInputValue(1250), "1250");
});

test("numeric input text preserves a user-entered zero but follows model resets", () => {
  assert.equal(reconcileNumericInputValue("0", 0), "0");
  assert.equal(reconcileNumericInputValue("1250", 0), "");
  assert.equal(reconcileNumericInputValue("1250.00", 1250), "1250.00");
});
