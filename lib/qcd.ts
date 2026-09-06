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

export interface QcdElectionInput extends QcdCapacityInput {
  intendedDistribution: number;
  unusedDeductibleContributionOffset: number;
}

export interface QcdCapacity {
  status: QcdCapacityStatus;
  annualLimit: number | null;
  eligibleIraBalance: number;
  potentialExclusionBeforeContributionOffset: number;
  potentialRmdSatisfied: number;
}

export interface QcdElection extends QcdCapacity {
  distribution: number;
  excludedFromIncome: number;
  taxableAmount: number;
  contributionOffsetUsed: number;
  contributionOffsetRemaining: number;
  rmdSatisfied: number;
  limitBasisYear: 2026 | null;
  limitHeldFlat: boolean;
}

function planningLimit(taxYear: number) {
  if (taxYear < 2026) return null;
  return QCD_LIMITS[2026];
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
  const annualLimit = planningLimit(taxYear);
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

/**
 * Applies a recurring planning election using the known 2026 ceiling as a
 * conservative nominal cap in later years. It separates the amount leaving the
 * IRA, the part excluded from income, and the part made taxable by the user's
 * remaining post-age-70½ deductible-contribution offset.
 */
export function calculateQcdElection(input: QcdElectionInput): QcdElection {
  const capacity = calculateQcdCapacity(input);
  const requested = Math.max(0, input.intendedDistribution);
  const offset = Math.max(0, input.unusedDeductibleContributionOffset);
  const distribution = Math.min(
    requested,
    capacity.potentialExclusionBeforeContributionOffset,
  );
  const contributionOffsetUsed = Math.min(distribution, offset);
  const excludedFromIncome = distribution - contributionOffsetUsed;

  return {
    ...capacity,
    distribution,
    excludedFromIncome,
    taxableAmount: contributionOffsetUsed,
    contributionOffsetUsed,
    contributionOffsetRemaining: offset - contributionOffsetUsed,
    rmdSatisfied: Math.min(
      distribution,
      Math.max(0, input.requiredMinimumDistribution),
    ),
    limitBasisYear: capacity.annualLimit === null ? null : 2026,
    limitHeldFlat: input.taxYear > 2026 && capacity.annualLimit !== null,
  };
}
