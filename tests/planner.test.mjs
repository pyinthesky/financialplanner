import assert from "node:assert/strict";
import test from "node:test";

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
  assert.equal(projection.length, DEFAULT_PLAN.household.planToAge - DEFAULT_PLAN.household.currentAge + 1);
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
  baseline.debtStrategy.extraMonthlyPayment = 0;
  const accelerated = copyPlan();
  accelerated.debtStrategy.extraMonthlyPayment = 1_000;
  assert.ok(debtPayoffSchedule(accelerated).length < debtPayoffSchedule(baseline).length);
});

test("mortgage payoff scenario creates a retirement-year cash need", () => {
  const keep = copyPlan();
  keep.housing.payoffMortgageAtRetirement = false;
  const payoff = copyPlan();
  payoff.housing.payoffMortgageAtRetirement = true;
  const keepYear = projectPlan(keep).find((row) => row.age === keep.household.retirementAge);
  const payoffYear = projectPlan(payoff).find((row) => row.age === payoff.household.retirementAge);
  assert.ok(payoffYear.spending > keepYear.spending);
});

test("plan import rejects an unknown schema version", () => {
  assert.throws(() => normalizePlan({ schemaVersion: 99 }), /unsupported/i);
});
