export type IrmaaFilingCategory =
  | "individual"
  | "marriedJoint"
  | "marriedSeparateLivedTogether";

export interface MedicareIrmaaInput {
  magi: number;
  filingCategory: IrmaaFilingCategory;
  partBEnrollees: number;
  partDEnrollees: number;
}

export interface MedicareIrmaaResult {
  tier: number;
  tierLabel: string;
  partBMonthlyPremiumPerEnrollee: number;
  partBMonthlyIrmaaPerEnrollee: number;
  partDMonthlyIrmaaPerEnrollee: number;
  annualHouseholdPartBPremium: number;
  annualHouseholdPartDIrmaa: number;
  annualHouseholdIrmaa: number;
  annualKnownHouseholdPremium: number;
  nextTierBoundary: number | null;
  nextTierStartsAtBoundary: boolean;
  roomBeforeNextTier: number | null;
}

interface IrmaaTier {
  upperBoundary: number | null;
  upperBoundaryInclusive: boolean;
  partBMonthlyPremium: number;
  partDMonthlyIrmaa: number;
}

export const MEDICARE_IRMAA_YEAR = 2026;
export const MEDICARE_IRMAA_LOOKBACK_TAX_YEAR = 2024;
export const STANDARD_PART_B_MONTHLY_PREMIUM = 202.9;

// CMS 2026 Medicare Parts A & B Premiums and Deductibles, released Nov. 14, 2025.
// https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-deductibles
const STANDARD_TIERS: Record<"individual" | "marriedJoint", IrmaaTier[]> = {
  individual: [
    { upperBoundary: 109_000, upperBoundaryInclusive: true, partBMonthlyPremium: 202.9, partDMonthlyIrmaa: 0 },
    { upperBoundary: 137_000, upperBoundaryInclusive: true, partBMonthlyPremium: 284.1, partDMonthlyIrmaa: 14.5 },
    { upperBoundary: 171_000, upperBoundaryInclusive: true, partBMonthlyPremium: 405.8, partDMonthlyIrmaa: 37.5 },
    { upperBoundary: 205_000, upperBoundaryInclusive: true, partBMonthlyPremium: 527.5, partDMonthlyIrmaa: 60.4 },
    { upperBoundary: 500_000, upperBoundaryInclusive: false, partBMonthlyPremium: 649.2, partDMonthlyIrmaa: 83.3 },
    { upperBoundary: null, upperBoundaryInclusive: true, partBMonthlyPremium: 689.9, partDMonthlyIrmaa: 91 },
  ],
  marriedJoint: [
    { upperBoundary: 218_000, upperBoundaryInclusive: true, partBMonthlyPremium: 202.9, partDMonthlyIrmaa: 0 },
    { upperBoundary: 274_000, upperBoundaryInclusive: true, partBMonthlyPremium: 284.1, partDMonthlyIrmaa: 14.5 },
    { upperBoundary: 342_000, upperBoundaryInclusive: true, partBMonthlyPremium: 405.8, partDMonthlyIrmaa: 37.5 },
    { upperBoundary: 410_000, upperBoundaryInclusive: true, partBMonthlyPremium: 527.5, partDMonthlyIrmaa: 60.4 },
    { upperBoundary: 750_000, upperBoundaryInclusive: false, partBMonthlyPremium: 649.2, partDMonthlyIrmaa: 83.3 },
    { upperBoundary: null, upperBoundaryInclusive: true, partBMonthlyPremium: 689.9, partDMonthlyIrmaa: 91 },
  ],
};

const MARRIED_SEPARATE_LIVED_TOGETHER_TIERS: IrmaaTier[] = [
  { upperBoundary: 109_000, upperBoundaryInclusive: true, partBMonthlyPremium: 202.9, partDMonthlyIrmaa: 0 },
  { upperBoundary: 391_000, upperBoundaryInclusive: false, partBMonthlyPremium: 649.2, partDMonthlyIrmaa: 83.3 },
  { upperBoundary: null, upperBoundaryInclusive: true, partBMonthlyPremium: 689.9, partDMonthlyIrmaa: 91 },
];

function containsMagi(tier: IrmaaTier, magi: number): boolean {
  if (tier.upperBoundary === null) return true;
  return tier.upperBoundaryInclusive
    ? magi <= tier.upperBoundary
    : magi < tier.upperBoundary;
}

export function calculateMedicareIrmaa(
  input: MedicareIrmaaInput,
): MedicareIrmaaResult {
  const magi = Math.max(0, Number.isFinite(input.magi) ? input.magi : 0);
  const partBEnrollees = Math.min(
    2,
    Math.max(0, Math.floor(Number.isFinite(input.partBEnrollees) ? input.partBEnrollees : 0)),
  );
  const partDEnrollees = Math.min(
    2,
    Math.max(0, Math.floor(Number.isFinite(input.partDEnrollees) ? input.partDEnrollees : 0)),
  );
  const tiers =
    input.filingCategory === "marriedSeparateLivedTogether"
      ? MARRIED_SEPARATE_LIVED_TOGETHER_TIERS
      : STANDARD_TIERS[input.filingCategory];
  const tier = Math.max(0, tiers.findIndex((candidate) => containsMagi(candidate, magi)));
  const selected = tiers[tier];
  const partBMonthlyIrmaaPerEnrollee = Math.max(
    0,
    selected.partBMonthlyPremium - STANDARD_PART_B_MONTHLY_PREMIUM,
  );
  const annualHouseholdPartBPremium =
    selected.partBMonthlyPremium * partBEnrollees * 12;
  const annualHouseholdPartDIrmaa =
    selected.partDMonthlyIrmaa * partDEnrollees * 12;
  const annualHouseholdIrmaa =
    partBMonthlyIrmaaPerEnrollee * partBEnrollees * 12 +
    annualHouseholdPartDIrmaa;

  return {
    tier,
    tierLabel: tier === 0 ? "Standard premium" : `IRMAA tier ${tier}`,
    partBMonthlyPremiumPerEnrollee: selected.partBMonthlyPremium,
    partBMonthlyIrmaaPerEnrollee,
    partDMonthlyIrmaaPerEnrollee: selected.partDMonthlyIrmaa,
    annualHouseholdPartBPremium,
    annualHouseholdPartDIrmaa,
    annualHouseholdIrmaa,
    annualKnownHouseholdPremium:
      annualHouseholdPartBPremium + annualHouseholdPartDIrmaa,
    nextTierBoundary: selected.upperBoundary,
    nextTierStartsAtBoundary: !selected.upperBoundaryInclusive,
    roomBeforeNextTier:
      selected.upperBoundary === null
        ? null
        : Math.max(0, selected.upperBoundary - magi),
  };
}
