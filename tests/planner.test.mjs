import assert from "node:assert/strict";
import test from "node:test";

import { calculateFederalIncomeTax } from "../lib/federal-tax.ts";
import { calculateTaxableSocialSecurity } from "../lib/social-security-tax.ts";
import { calculateRmd, rmdApplicableAge } from "../lib/rmd.ts";
import { buildPrintPortfolioChart } from "../lib/print-chart.ts";
import { buildPlanningSignals } from "../lib/planning-signals.ts";
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

test("print chart builds finite stacked geometry without browser measurement", () => {
  const geometry = buildPrintPortfolioChart([
    { age: 40, traditional: 100_000, taxable: 80_000, roth: 30_000, cash: 20_000, hsa: 5_000 },
    { age: 50, traditional: 140_000, taxable: 100_000, roth: 50_000, cash: 15_000, hsa: 8_000 },
    { age: 60, traditional: 180_000, taxable: 120_000, roth: 75_000, cash: 25_000, hsa: 12_000 },
  ]);
  assert.equal(geometry.polygons.length, 5);
  assert.deepEqual(geometry.ageTicks.map((tick) => tick.age), [40, 50, 60]);
  assert.ok(geometry.maxValue >= 412_000);

  for (const series of geometry.polygons) {
    const coordinates = series.points.split(/[ ,]/).map(Number);
    assert.ok(coordinates.length > 4);
    assert.ok(coordinates.every(Number.isFinite));
    assert.ok(coordinates.every((value, index) => index % 2 === 0 ? value >= 0 && value <= geometry.width : value >= 0 && value <= geometry.height));
  }
});

test("print chart produces non-degenerate visible areas for funded series", () => {
  const geometry = buildPrintPortfolioChart([
    { age: 40, traditional: 100, taxable: 0, roth: 0, cash: 0, hsa: 0 },
    { age: 41, traditional: 200, taxable: 0, roth: 0, cash: 0, hsa: 0 },
  ]);
  const traditional = geometry.polygons.find((series) => series.key === "traditional");
  const yValues = traditional.points.split(" ").map((point) => Number(point.split(",")[1]));
  assert.ok(new Set(yValues).size > 1, "funded series should occupy printable area");
});

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

test("RMD applicable ages follow final Treasury rules without guessing for 1959", () => {
  assert.equal(rmdApplicableAge(1958), 73);
  assert.equal(rmdApplicableAge(1959), null);
  assert.equal(rmdApplicableAge(1960), 75);
});

test("Uniform Lifetime Table calculates the IRS age-75 example", () => {
  const result = calculateRmd({
    birthYear: 1951,
    calendarYear: 2026,
    age: 75,
    priorYearEndBalance: 100_000,
  });
  assert.equal(result.status, "required");
  assert.equal(result.denominator, 24.6);
  assert.ok(Math.abs(result.requiredDistribution - 4_065.04) < 0.01);
});

test("projection calculates RMDs separately for each account owner", () => {
  const plan = copyPlan();
  plan.household.maritalStatus = "married";
  plan.household.currentAge = 73;
  plan.household.birthYear = 1953;
  plan.household.partnerAge = 75;
  plan.household.partnerBirthYear = 1951;
  plan.household.retirementAge = 73;
  plan.household.partnerRetirementAge = 75;
  plan.household.planToAge = 73;
  plan.accounts = [
    { id: "your-ira", name: "Your IRA", kind: "traditional", owner: "you", balance: 265_000, annualContribution: 0 },
    { id: "partner-ira", name: "Partner IRA", kind: "traditional", owner: "partner", balance: 246_000, annualContribution: 0 },
  ];
  const row = projectPlan(plan)[0];
  assert.ok(Math.abs(row.youRmd - 10_000) < 0.01);
  assert.ok(Math.abs(row.partnerRmd - 10_000) < 0.01);
  assert.ok(Math.abs(row.requiredMinimumDistribution - 20_000) < 0.01);
  assert.ok(Math.abs(row.cash - 20_000) < 0.01);
});

test("joint tax-deferred balances are not silently assigned to an RMD owner", () => {
  const plan = copyPlan();
  plan.household.currentAge = 75;
  plan.household.birthYear = 1951;
  plan.household.retirementAge = 75;
  plan.household.planToAge = 75;
  plan.accounts = [
    { id: "needs-owner", name: "Needs owner", kind: "traditional", owner: "joint", balance: 246_000, annualContribution: 0 },
  ];
  assert.equal(projectPlan(plan)[0].requiredMinimumDistribution, 0);
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

test("an untouched plan asks for inputs instead of claiming it is fully funded", () => {
  const summary = buildPlanningSignals(DEFAULT_PLAN, { payoffMonths: 0 });

  assert.equal(summary.ready, false);
  assert.deepEqual(summary.signals.map((signal) => signal.title), [
    "Complete the planning timeline",
    "Add a retirement spending baseline",
    "Add the accounts funding the plan",
  ]);
  assert.ok(summary.signals.every((signal) => signal.tone === "attention"));
});

test("a populated baseline prioritizes funding before supporting checks", () => {
  const plan = copyPlan();
  plan.household.currentAge = 50;
  plan.household.retirementAge = 65;
  plan.household.planToAge = 95;
  plan.assumptions.annualSpending = 70_000;
  plan.accounts = [{ id: "ira", name: "IRA", kind: "traditional", owner: "you", balance: 500_000, annualContribution: 10_000 }];

  const summary = buildPlanningSignals(plan, { shortfallAge: 82, payoffMonths: 0 });

  assert.equal(summary.ready, true);
  assert.equal(summary.signals[0].title, "Modeled funding gap begins at age 82");
  assert.equal(summary.signals[0].tone, "attention");
  assert.match(summary.signals[1].title, /No debt payoff/);
  assert.match(summary.signals[2].title, /Guaranteed income has not been added/);
});
