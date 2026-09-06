import type { PlannerData } from "./planner.ts";

export type PlanningSignalTone = "positive" | "attention" | "informational";

export interface PlanningSignal {
  title: string;
  reason: string;
  nextAction: string;
  tone: PlanningSignalTone;
}

export interface PlanningSignalSummary {
  ready: boolean;
  signals: PlanningSignal[];
}

export function buildPlanningSignals(
  data: PlannerData,
  context: { shortfallAge?: number; payoffMonths: number },
): PlanningSignalSummary {
  const missing: PlanningSignal[] = [];
  const timelineReady =
    data.household.currentAge > 0 &&
    data.household.retirementAge >= data.household.currentAge &&
    data.household.planToAge > data.household.currentAge;

  if (!timelineReady) {
    missing.push({
      title: "Complete the planning timeline",
      reason: "A current age, retirement age, and planning horizon are needed before the projection has a meaningful time scale.",
      nextAction: "Complete the Timeline section under Household.",
      tone: "attention",
    });
  }

  if (data.assumptions.annualSpending <= 0) {
    missing.push({
      title: "Add a retirement spending baseline",
      reason: "The plan cannot judge whether assets and income cover retirement until annual spending is included.",
      nextAction: "Enter annual retirement spending under Household.",
      tone: "attention",
    });
  }

  if (data.accounts.length === 0) {
    missing.push({
      title: "Add the accounts funding the plan",
      reason: "No investment, retirement, cash, or HSA accounts are included in the projection yet.",
      nextAction: "Add current balances and contributions under Accounts.",
      tone: "attention",
    });
  }

  if (missing.length > 0) return { ready: false, signals: missing };

  const incomeCount = data.income.filter((stream) => stream.annualAmount > 0).length;
  const debtCount = data.debts.filter((debt) => debt.balance > 0).length;
  const longTermCareReserve =
    data.healthcare.longTermCareAnnual * data.healthcare.longTermCareYears;
  const signals: PlanningSignal[] = [
    context.shortfallAge
      ? {
          title: `Modeled funding gap begins at age ${context.shortfallAge}`,
          reason: "In the baseline projection, modeled income and available withdrawals no longer cover all entered spending.",
          nextAction: "Compare spending, retirement timing, contributions, and return assumptions before treating the result as settled.",
          tone: "attention",
        }
      : {
          title: `Baseline covers modeled spending through age ${data.household.planToAge}`,
          reason: "The current deterministic path funds every expense entered so far; omitted costs can materially change this result.",
          nextAction: "Review healthcare, housing, taxes, and timed expenses, then compare less favorable scenarios.",
          tone: "positive",
        },
    debtCount > 0
      ? {
          title: `Entered debts pay off in about ${context.payoffMonths} months`,
          reason: `The payoff schedule includes ${debtCount} debt${debtCount === 1 ? "" : "s"} and rolls freed minimum payments into the selected strategy.`,
          nextAction: "Confirm mortgage payments exclude escrowed taxes and insurance before relying on the date.",
          tone: "informational",
        }
      : {
          title: "No debt payoff is currently modeled",
          reason: "Debt payments and payoff timing are excluded because no outstanding balances were entered.",
          nextAction: "Add debts only if they should affect retirement cash flow.",
          tone: "informational",
        },
    incomeCount > 0
      ? {
          title: `${incomeCount} guaranteed-income source${incomeCount === 1 ? " is" : "s are"} included`,
          reason: "Entered pension and Social Security amounts reduce the spending that must be funded from accounts.",
          nextAction: "Compare realistic claiming dates and verify each estimate from its original statement.",
          tone: "informational",
        }
      : {
          title: "Guaranteed income has not been added",
          reason: "The projection currently assumes no pension or Social Security income.",
          nextAction: "Add only benefits supported by a current pension or Social Security estimate.",
          tone: "attention",
        },
    longTermCareReserve > 0
      ? {
          title: "A long-term-care stress reserve is included",
          reason: "The model reserves the amount entered before applying healthcare inflation.",
          nextAction: "Check the assumed annual cost, start age, and duration against a current local source.",
          tone: "informational",
        }
      : {
          title: "Long-term care is not yet stress-tested",
          reason: "No dedicated long-term-care cost or duration is included in the baseline.",
          nextAction: "Add a stress estimate under Health & Long-Term Care if it is relevant to the household.",
          tone: "attention",
        },
  ];

  return { ready: true, signals };
}
