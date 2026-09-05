import { calculateFederalIncomeTax, type FilingStatus } from "./federal-tax.ts";
import { calculateTaxableSocialSecurity } from "./social-security-tax.ts";

export type AccountKind = "taxable" | "traditional" | "roth" | "cash" | "hsa";
export type Owner = "you" | "partner" | "joint";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  owner: Owner;
  balance: number;
  annualContribution: number;
}

export interface IncomeStream {
  id: string;
  name: string;
  owner: Exclude<Owner, "joint">;
  kind: "pension" | "socialSecurity";
  startAge: number;
  annualAmount: number;
  cola: number;
  survivorPercent: number;
}

export interface Debt {
  id: string;
  name: string;
  kind: "mortgage" | "creditCard" | "auto" | "student" | "other";
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

export interface RecurringCost {
  id: string;
  name: string;
  annualAmount: number;
  startAge: number;
  endAge: number;
  inflationLinked: boolean;
}

export interface PlannerData {
  schemaVersion: 1;
  household: {
    maritalStatus: "single" | "married";
    filingStatus: FilingStatus;
    marriedFilingSeparatelyLivedApart: boolean;
    currentAge: number;
    partnerAge: number;
    retirementAge: number;
    partnerRetirementAge: number;
    planToAge: number;
    state: string;
  };
  assumptions: {
    annualSpending: number;
    inflation: number;
    preRetirementReturn: number;
    retirementReturn: number;
    stateEffectiveTaxRate: number;
    capitalGainsRate: number;
    taxableGainFraction: number;
    targetOrdinaryIncome: number;
    taxExemptInterest: number;
  };
  housing: {
    homeValue: number;
    assessedPercent: number;
    millRate: number;
    annualInsurance: number;
    includeInNetWorth: boolean;
    payoffMortgageAtRetirement: boolean;
  };
  healthcare: {
    preMedicareAnnual: number;
    medicareAnnual: number;
    healthInflation: number;
    longTermCareAnnual: number;
    longTermCareStartAge: number;
    longTermCareYears: number;
  };
  debtStrategy: {
    method: "snowball" | "avalanche";
    extraMonthlyPayment: number;
  };
  accounts: Account[];
  income: IncomeStream[];
  debts: Debt[];
  recurringCosts: RecurringCost[];
}

export interface ProjectionYear {
  age: number;
  year: number;
  taxable: number;
  traditional: number;
  roth: number;
  cash: number;
  hsa: number;
  home: number;
  portfolio: number;
  income: number;
  spending: number;
  taxes: number;
  federalTaxes: number;
  stateTaxes: number;
  capitalGainsTaxes: number;
  taxableOrdinaryIncome: number;
  socialSecurityIncome: number;
  taxableSocialSecurity: number;
  socialSecurityProvisionalIncome: number;
  withdrawals: number;
  taxableWithdrawal: number;
  traditionalWithdrawal: number;
  rothWithdrawal: number;
  hsaWithdrawal: number;
  fundedRatio: number;
}

export interface DebtMonth {
  month: number;
  totalBalance: number;
  interestPaid: number;
  principalPaid: number;
}

export const DEFAULT_PLAN: PlannerData = {
  schemaVersion: 1,
  household: {
    maritalStatus: "single",
    filingStatus: "single",
    marriedFilingSeparatelyLivedApart: false,
    currentAge: 0,
    partnerAge: 0,
    retirementAge: 0,
    partnerRetirementAge: 0,
    planToAge: 0,
    state: "",
  },
  assumptions: {
    annualSpending: 0,
    inflation: 0,
    preRetirementReturn: 0,
    retirementReturn: 0,
    stateEffectiveTaxRate: 0,
    capitalGainsRate: 0,
    taxableGainFraction: 0,
    targetOrdinaryIncome: 0,
    taxExemptInterest: 0,
  },
  housing: {
    homeValue: 0,
    assessedPercent: 0,
    millRate: 0,
    annualInsurance: 0,
    includeInNetWorth: false,
    payoffMortgageAtRetirement: false,
  },
  healthcare: {
    preMedicareAnnual: 0,
    medicareAnnual: 0,
    healthInflation: 0,
    longTermCareAnnual: 0,
    longTermCareStartAge: 0,
    longTermCareYears: 0,
  },
  debtStrategy: { method: "avalanche", extraMonthlyPayment: 0 },
  accounts: [],
  income: [],
  debts: [],
  recurringCosts: [],
};

const kinds: AccountKind[] = ["taxable", "traditional", "roth", "cash", "hsa"];

const pct = (value: number) => Math.max(-0.99, value / 100);

export function totalPortfolio(data: PlannerData) {
  return data.accounts.reduce(
    (sum, account) => sum + Math.max(0, account.balance),
    0,
  );
}

export function propertyTaxAnnual(data: PlannerData) {
  return (
    data.housing.homeValue *
    (data.housing.assessedPercent / 100) *
    (data.housing.millRate / 1000)
  );
}

export function projectPlan(
  data: PlannerData,
  returnOverrides?: number[],
): ProjectionYear[] {
  const balances = Object.fromEntries(kinds.map((kind) => [kind, 0])) as Record<
    AccountKind,
    number
  >;
  const contributions = Object.fromEntries(
    kinds.map((kind) => [kind, 0]),
  ) as Record<AccountKind, number>;
  for (const account of data.accounts) {
    balances[account.kind] += Math.max(0, account.balance);
    contributions[account.kind] += Math.max(0, account.annualContribution);
  }

  const rows: ProjectionYear[] = [];
  const startYear = new Date().getFullYear();
  const years = Math.max(
    1,
    data.household.planToAge - data.household.currentAge + 1,
  );
  let home = Math.max(0, data.housing.homeValue);
  const inflation = pct(data.assumptions.inflation);
  const healthInflation = pct(data.healthcare.healthInflation);
  const debtSchedule = debtPayoffSchedule(data);
  const yearsToRetirement = Math.max(
    0,
    data.household.retirementAge - data.household.currentAge,
  );
  const mortgagePayoffAtRetirement = data.housing.payoffMortgageAtRetirement
    ? data.debts
        .filter((debt) => debt.kind === "mortgage")
        .reduce(
          (sum, debt) =>
            sum + remainingLoanBalance(debt, yearsToRetirement * 12),
          0,
        )
    : 0;

  for (let index = 0; index < years; index += 1) {
    const age = data.household.currentAge + index;
    const partnerAge = data.household.partnerAge + index;
    const retired = age >= data.household.retirementAge;
    const partnerRetired =
      data.household.maritalStatus === "single" ||
      partnerAge >= data.household.partnerRetirementAge;
    const fullyRetired = retired && partnerRetired;
    const rate =
      returnOverrides?.[index] ??
      pct(
        fullyRetired
          ? data.assumptions.retirementReturn
          : data.assumptions.preRetirementReturn,
      );

    for (const kind of kinds) {
      balances[kind] *= 1 + rate;
      if (!fullyRetired) balances[kind] += contributions[kind];
    }

    let income = 0;
    let socialSecurityIncome = 0;
    for (const stream of data.income) {
      const ownerAge = stream.owner === "partner" ? partnerAge : age;
      if (
        ownerAge >= stream.startAge &&
        (data.household.maritalStatus === "married" || stream.owner === "you")
      ) {
        const value =
          stream.annualAmount *
          Math.pow(1 + pct(stream.cola), ownerAge - stream.startAge);
        income += value;
        if (stream.kind === "socialSecurity") socialSecurityIncome += value;
      }
    }

    const baseSpending =
      data.assumptions.annualSpending * Math.pow(1 + inflation, index);
    const recurring = data.recurringCosts.reduce((sum, cost) => {
      if (age < cost.startAge || age > cost.endAge) return sum;
      return (
        sum +
        cost.annualAmount *
          (cost.inflationLinked ? Math.pow(1 + inflation, index) : 1)
      );
    }, 0);
    const healthcareBase =
      age < 65
        ? data.healthcare.preMedicareAnnual
        : data.healthcare.medicareAnnual;
    const healthcare = healthcareBase * Math.pow(1 + healthInflation, index);
    const ltc =
      age >= data.healthcare.longTermCareStartAge &&
      age <
        data.healthcare.longTermCareStartAge + data.healthcare.longTermCareYears
        ? data.healthcare.longTermCareAnnual *
          Math.pow(1 + healthInflation, index)
        : 0;
    const housing =
      propertyTaxAnnual(data) * Math.pow(1 + inflation, index) +
      data.housing.annualInsurance * Math.pow(1 + inflation, index);
    const scheduledDebtService = debtSchedule
      .slice(index * 12 + 1, index * 12 + 13)
      .reduce(
        (sum, month) => sum + month.interestPaid + month.principalPaid,
        0,
      );
    const mortgageMinimums = data.debts
      .filter((debt) => debt.kind === "mortgage")
      .reduce((sum, debt) => sum + debt.minimumPayment * 12, 0);
    const debtService =
      data.housing.payoffMortgageAtRetirement && retired
        ? Math.max(0, scheduledDebtService - mortgageMinimums)
        : scheduledDebtService;
    const retirementPayoff =
      age === data.household.retirementAge ? mortgagePayoffAtRetirement : 0;
    const spending =
      (fullyRetired ? baseSpending : 0) +
      healthcare +
      recurring +
      housing +
      debtService +
      retirementPayoff;

    let spendingGap = Math.max(0, spending - income);
    let taxableWithdrawal = 0;
    let traditionalWithdrawal = 0;
    let rothWithdrawal = 0;
    let hsaWithdrawal = 0;

    if (fullyRetired) {
      const nonSocialSecurityIncome = income - socialSecurityIncome;
      const maximumTraditional = Math.min(balances.traditional, spendingGap);
      let low = 0;
      let high = maximumTraditional;
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const candidate = (low + high) / 2;
        const taxableBenefits = calculateTaxableSocialSecurity({
          benefits: socialSecurityIncome,
          otherIncome: nonSocialSecurityIncome + candidate,
          taxExemptInterest: data.assumptions.taxExemptInterest,
          filingStatus: data.household.filingStatus,
          marriedFilingSeparatelyLivedApart:
            data.household.marriedFilingSeparatelyLivedApart,
        }).taxableBenefits;
        if (
          nonSocialSecurityIncome + candidate + taxableBenefits <=
          data.assumptions.targetOrdinaryIncome
        ) low = candidate;
        else high = candidate;
      }
      traditionalWithdrawal = Math.min(
        maximumTraditional,
        low,
      );
      balances.traditional -= traditionalWithdrawal;
      spendingGap -= traditionalWithdrawal;

      taxableWithdrawal = Math.min(balances.taxable, spendingGap);
      balances.taxable -= taxableWithdrawal;
      spendingGap -= taxableWithdrawal;

      const cashWithdrawal = Math.min(balances.cash, spendingGap);
      balances.cash -= cashWithdrawal;
      spendingGap -= cashWithdrawal;

      hsaWithdrawal = Math.min(balances.hsa, healthcare, spendingGap);
      balances.hsa -= hsaWithdrawal;
      spendingGap -= hsaWithdrawal;

      const extraTraditional = Math.min(balances.traditional, spendingGap);
      balances.traditional -= extraTraditional;
      traditionalWithdrawal += extraTraditional;
      spendingGap -= extraTraditional;

      rothWithdrawal = Math.min(balances.roth, spendingGap);
      balances.roth -= rothWithdrawal;
      spendingGap -= rothWithdrawal;
    }

    const taxableGains =
      taxableWithdrawal * pct(data.assumptions.taxableGainFraction);
    const socialSecurityTax = calculateTaxableSocialSecurity({
      benefits: socialSecurityIncome,
      otherIncome:
        income - socialSecurityIncome + traditionalWithdrawal + taxableGains,
      taxExemptInterest: data.assumptions.taxExemptInterest,
      filingStatus: data.household.filingStatus,
      marriedFilingSeparatelyLivedApart:
        data.household.marriedFilingSeparatelyLivedApart,
    });
    const taxableOrdinary = Math.max(
      0,
      income -
        socialSecurityIncome +
        socialSecurityTax.taxableBenefits +
        traditionalWithdrawal,
    );
    const federalTax = calculateFederalIncomeTax(
      taxableOrdinary,
      data.household.filingStatus,
      Math.pow(1 + inflation, index),
    ).tax;
    const stateTaxes =
      taxableOrdinary * pct(data.assumptions.stateEffectiveTaxRate);
    const capitalGainsTaxes =
      taxableGains * pct(data.assumptions.capitalGainsRate);
    const taxes = federalTax + stateTaxes + capitalGainsTaxes;
    const taxDraw = Math.min(balances.taxable, taxes);
    balances.taxable -= taxDraw;
    const remainingTax = taxes - taxDraw;
    if (remainingTax > 0)
      balances.traditional = Math.max(0, balances.traditional - remainingTax);

    home *= 1 + inflation;
    const portfolio = kinds.reduce((sum, kind) => sum + balances[kind], 0);
    const withdrawals =
      taxableWithdrawal +
      traditionalWithdrawal +
      rothWithdrawal +
      hsaWithdrawal;
    rows.push({
      age,
      year: startYear + index,
      ...balances,
      home: data.housing.includeInNetWorth ? home : 0,
      portfolio,
      income,
      spending,
      taxes,
      federalTaxes: federalTax,
      stateTaxes,
      capitalGainsTaxes,
      taxableOrdinaryIncome: taxableOrdinary,
      socialSecurityIncome,
      taxableSocialSecurity: socialSecurityTax.taxableBenefits,
      socialSecurityProvisionalIncome: socialSecurityTax.provisionalIncome,
      withdrawals,
      taxableWithdrawal,
      traditionalWithdrawal,
      rothWithdrawal,
      hsaWithdrawal,
      fundedRatio:
        spending > 0 ? Math.min(1, (income + withdrawals) / spending) : 1,
    });
  }
  return rows;
}

export function debtPayoffSchedule(data: PlannerData): DebtMonth[] {
  const debts = data.debts.map((debt) => ({
    ...debt,
    balance: Math.max(0, debt.balance),
  }));
  const rows: DebtMonth[] = [
    {
      month: 0,
      totalBalance: debts.reduce((sum, debt) => sum + debt.balance, 0),
      interestPaid: 0,
      principalPaid: 0,
    },
  ];
  let rollover = Math.max(0, data.debtStrategy.extraMonthlyPayment);

  for (
    let month = 1;
    month <= 600 && debts.some((debt) => debt.balance > 0.01);
    month += 1
  ) {
    let monthInterest = 0;
    let monthPrincipal = 0;
    let freedMinimums = 0;
    for (const debt of debts) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * (pct(debt.interestRate) / 12);
      const payment = Math.min(
        debt.balance + interest,
        Math.max(0, debt.minimumPayment),
      );
      const principal = Math.max(0, payment - interest);
      debt.balance = Math.max(0, debt.balance - principal);
      monthInterest += interest;
      monthPrincipal += principal;
      if (debt.balance <= 0.01) freedMinimums += debt.minimumPayment;
    }

    const candidates = debts
      .filter((debt) => debt.balance > 0.01)
      .sort((a, b) =>
        data.debtStrategy.method === "snowball"
          ? a.balance - b.balance
          : b.interestRate - a.interestRate,
      );
    if (candidates.length > 0 && rollover > 0) {
      const target = candidates[0];
      const extra = Math.min(target.balance, rollover);
      target.balance -= extra;
      monthPrincipal += extra;
    }
    rollover += freedMinimums;
    rows.push({
      month,
      totalBalance: debts.reduce((sum, debt) => sum + debt.balance, 0),
      interestPaid: monthInterest,
      principalPaid: monthPrincipal,
    });
  }
  return rows;
}

function remainingLoanBalance(debt: Debt, months: number) {
  const principal = Math.max(0, debt.balance);
  const payment = Math.max(0, debt.minimumPayment);
  const monthlyRate = pct(debt.interestRate) / 12;
  if (months <= 0 || principal <= 0) return principal;
  if (monthlyRate === 0) return Math.max(0, principal - payment * months);
  const growth = Math.pow(1 + monthlyRate, months);
  return Math.max(
    0,
    principal * growth - payment * ((growth - 1) / monthlyRate),
  );
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number) {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function estimateSuccessRate(data: PlannerData, simulations = 240) {
  let success = 0;
  for (let run = 0; run < simulations; run += 1) {
    const random = mulberry32(20260905 + run);
    const years = data.household.planToAge - data.household.currentAge + 1;
    const returns = Array.from({ length: years }, (_, index) => {
      const age = data.household.currentAge + index;
      const mean = pct(
        age >= data.household.retirementAge
          ? data.assumptions.retirementReturn
          : data.assumptions.preRetirementReturn,
      );
      return Math.max(-0.45, Math.min(0.45, mean + normal(random) * 0.12));
    });
    const projection = projectPlan(data, returns);
    const fullRetirementAge = Math.max(
      data.household.retirementAge,
      data.household.maritalStatus === "married"
        ? data.household.currentAge +
            Math.max(
              0,
              data.household.partnerRetirementAge - data.household.partnerAge,
            )
        : data.household.retirementAge,
    );
    if (
      projection
        .filter((row) => row.age >= fullRetirementAge)
        .every((row) => row.fundedRatio >= 0.995)
    )
      success += 1;
  }
  return Math.round((success / simulations) * 100);
}

export function normalizePlan(input: unknown): PlannerData {
  if (!input || typeof input !== "object")
    throw new Error("This file does not contain a retirement plan.");
  const candidate = input as Partial<PlannerData>;
  if (candidate.schemaVersion !== 1)
    throw new Error("This plan uses an unsupported file version.");
  if (
    !candidate.household ||
    !candidate.assumptions ||
    !Array.isArray(candidate.accounts)
  ) {
    throw new Error("The plan file is missing required sections.");
  }
  const maritalStatus = candidate.household.maritalStatus ?? "single";
  const filingStatus =
    candidate.household.filingStatus ??
    (maritalStatus === "married" ? "marriedJoint" : "single");
  return {
    ...candidate,
    household: {
      ...candidate.household,
      maritalStatus,
      filingStatus,
      marriedFilingSeparatelyLivedApart:
        candidate.household.marriedFilingSeparatelyLivedApart ?? false,
    },
    assumptions: {
      ...candidate.assumptions,
      taxExemptInterest: candidate.assumptions.taxExemptInterest ?? 0,
    },
  } as PlannerData;
}
