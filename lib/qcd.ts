export const QCD_LIMITS = {
  2026: 111_000,
} as const;

export type QcdCapacityStatus =
  | "eligible"
  | "age-date-review"
  | "underage"
  | "no-eligible-ira"
  | "unsupported-year";

export interface QcdCapacityInput {
  taxYear: number;
  ageOnDistributionDate: number;
  eligibleIraBalance: number;
  requiredMinimumDistribution: number;
}

export interface QcdCapacity {
  status: QcdCapacityStatus;
  annualLimit: number | null;
  eligibleIraBalance: number;
  potentialExclusionBeforeContributionOffset: number;
  potentialRmdSatisfied: number;
}

/**
 * A conservative QCD capacity check, not an election or tax-return calculation.
 * The caller must provide age on the actual distribution date and affirm that the
 * source is an eligible IRA. Post-age-70½ deductible IRA contributions can reduce
 * the excludable amount and are intentionally left as a visible review item.
 */
export function calculateQcdCapacity({
  taxYear,
  ageOnDistributionDate,
  eligibleIraBalance,
  requiredMinimumDistribution,
}: QcdCapacityInput): QcdCapacity {
  const annualLimit = QCD_LIMITS[taxYear as keyof typeof QCD_LIMITS] ?? null;
  const balance = Math.max(0, eligibleIraBalance);
  const rmd = Math.max(0, requiredMinimumDistribution);

  let status: QcdCapacityStatus = "eligible";
  if (annualLimit === null) status = "unsupported-year";
  else if (ageOnDistributionDate < 70) status = "underage";
  else if (ageOnDistributionDate < 70.5) status = "age-date-review";
  else if (balance <= 0) status = "no-eligible-ira";

  const potentialExclusionBeforeContributionOffset =
    status === "eligible" ? Math.min(balance, annualLimit ?? 0) : 0;

  return {
    status,
    annualLimit,
    eligibleIraBalance: balance,
    potentialExclusionBeforeContributionOffset,
    potentialRmdSatisfied: Math.min(
      potentialExclusionBeforeContributionOffset,
      rmd,
    ),
  };
}
