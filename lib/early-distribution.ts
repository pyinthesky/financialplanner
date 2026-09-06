export type EarlyDistributionStatus =
  | "not-early"
  | "subject-to-additional-tax"
  | "age-date-review";

export interface EarlyDistributionInput {
  ageOnDistributionDate: number;
  taxableDistribution: number;
  confirmedExceptionAmount: number;
}

export interface EarlyDistributionResult {
  status: EarlyDistributionStatus;
  taxableDistribution: number;
  confirmedExceptionAmount: number;
  penaltyBase: number;
  additionalTax: number;
}

/**
 * Estimates the IRC section 72(t) 10% additional tax. Exception eligibility is
 * deliberately not inferred; the caller supplies only an amount already
 * confirmed under an applicable IRS exception.
 */
export function calculateEarlyDistributionTax({
  ageOnDistributionDate,
  taxableDistribution,
  confirmedExceptionAmount,
}: EarlyDistributionInput): EarlyDistributionResult {
  const distribution = Math.max(0, taxableDistribution);
  const exception = Math.min(
    distribution,
    Math.max(0, confirmedExceptionAmount),
  );
  const isEarly = ageOnDistributionDate < 59.5;
  const penaltyBase = isEarly ? Math.max(0, distribution - exception) : 0;

  return {
    status: !isEarly
      ? "not-early"
      : ageOnDistributionDate >= 59
        ? "age-date-review"
        : "subject-to-additional-tax",
    taxableDistribution: distribution,
    confirmedExceptionAmount: isEarly ? exception : 0,
    penaltyBase,
    additionalTax: penaltyBase * 0.1,
  };
}
