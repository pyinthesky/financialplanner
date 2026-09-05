import assert from "node:assert/strict";
import test from "node:test";

import { calculateFederalIncomeTax } from "../lib/federal-tax.ts";

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

test("legacy plan imports receive a compatible filing status", () => {
  const legacy = copyPlan();
  legacy.household.maritalStatus = "married";
  delete legacy.household.filingStatus;
  const normalized = normalizePlan(legacy);
  assert.equal(normalized.household.filingStatus, "marriedJoint");
});
