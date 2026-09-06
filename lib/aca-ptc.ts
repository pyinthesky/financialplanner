export type PovertyGuidelineLocation = "contiguous" | "alaska" | "hawaii";
export type AcaPtcStatus =
  | "standard-income-range"
  | "below-standard-income-range"
  | "above-standard-income-range";

export interface AcaPtcInput {
  householdMagi: number;
  taxFamilySize: number;
  location: PovertyGuidelineLocation;
  annualEnrollmentPremium: number;
  annualBenchmarkPremium: number;
}

export interface AcaPtcResult {
  status: AcaPtcStatus;
  povertyGuideline: number;
  householdIncomePercentOfFpl: number;
  applicablePercentage: number | null;
  expectedHouseholdContribution: number;
  potentialPremiumTaxCredit: number;
  estimatedNetEnrollmentPremium: number;
  incomeRoomTo400PercentFpl: number;
}

export const ACA_PTC_YEAR = 2026;
export const ACA_PTC_POVERTY_GUIDELINE_YEAR = 2025;

// HHS 2025 poverty guidelines. CMS continues using these guidelines for all
// Marketplace applications for plan year 2026.
// https://www.federalregister.gov/documents/2025/01/17/2025-01377/
const POVERTY_GUIDELINES: Record<
  PovertyGuidelineLocation,
  { firstPerson: number; additionalPerson: number }
> = {
  contiguous: { firstPerson: 15_650, additionalPerson: 5_500 },
  alaska: { firstPerson: 19_550, additionalPerson: 6_880 },
  hawaii: { firstPerson: 17_990, additionalPerson: 6_330 },
};

interface ApplicablePercentageBand {
  lowerFplPercent: number;
  upperFplPercent: number;
  initialPercentage: number;
  finalPercentage: number;
}

// IRS Rev. Proc. 2025-25, section 3.01, effective for tax year 2026.
// https://www.irs.gov/pub/irs-drop/rp-25-25.pdf
const APPLICABLE_PERCENTAGE_BANDS: ApplicablePercentageBand[] = [
  { lowerFplPercent: 100, upperFplPercent: 133, initialPercentage: 0.021, finalPercentage: 0.021 },
  { lowerFplPercent: 133, upperFplPercent: 150, initialPercentage: 0.0314, finalPercentage: 0.0419 },
  { lowerFplPercent: 150, upperFplPercent: 200, initialPercentage: 0.0419, finalPercentage: 0.066 },
  { lowerFplPercent: 200, upperFplPercent: 250, initialPercentage: 0.066, finalPercentage: 0.0844 },
  { lowerFplPercent: 250, upperFplPercent: 300, initialPercentage: 0.0844, finalPercentage: 0.0996 },
  { lowerFplPercent: 300, upperFplPercent: 400, initialPercentage: 0.0996, finalPercentage: 0.0996 },
];

export function povertyGuideline(
  taxFamilySize: number,
  location: PovertyGuidelineLocation,
): number {
  const size = Math.max(
    1,
    Math.floor(Number.isFinite(taxFamilySize) ? taxFamilySize : 1),
  );
  const guideline = POVERTY_GUIDELINES[location];
  return guideline.firstPerson + (size - 1) * guideline.additionalPerson;
}

export function acaApplicablePercentage(
  householdIncomePercentOfFpl: number,
): number | null {
  if (
    householdIncomePercentOfFpl < 100 ||
    householdIncomePercentOfFpl > 400
  ) {
    return null;
  }
  const band = APPLICABLE_PERCENTAGE_BANDS.find(
    (candidate, index) =>
      householdIncomePercentOfFpl >= candidate.lowerFplPercent &&
      (index === APPLICABLE_PERCENTAGE_BANDS.length - 1
        ? householdIncomePercentOfFpl <= candidate.upperFplPercent
        : householdIncomePercentOfFpl < candidate.upperFplPercent),
  );
  if (!band) return null;
  if (band.initialPercentage === band.finalPercentage) {
    return band.initialPercentage;
  }
  const progress =
    (householdIncomePercentOfFpl - band.lowerFplPercent) /
    (band.upperFplPercent - band.lowerFplPercent);
  return (
    band.initialPercentage +
    progress * (band.finalPercentage - band.initialPercentage)
  );
}

export function calculateAcaPremiumTaxCredit(
  input: AcaPtcInput,
): AcaPtcResult {
  const householdMagi = Math.max(
    0,
    Number.isFinite(input.householdMagi) ? input.householdMagi : 0,
  );
  const annualEnrollmentPremium = Math.max(
    0,
    Number.isFinite(input.annualEnrollmentPremium)
      ? input.annualEnrollmentPremium
      : 0,
  );
  const annualBenchmarkPremium = Math.max(
    0,
    Number.isFinite(input.annualBenchmarkPremium)
      ? input.annualBenchmarkPremium
      : 0,
  );
  const guideline = povertyGuideline(input.taxFamilySize, input.location);
  const householdIncomePercentOfFpl = (householdMagi / guideline) * 100;
  const applicablePercentage = acaApplicablePercentage(
    householdIncomePercentOfFpl,
  );
  const status: AcaPtcStatus =
    householdIncomePercentOfFpl < 100
      ? "below-standard-income-range"
      : householdIncomePercentOfFpl > 400
        ? "above-standard-income-range"
        : "standard-income-range";
  const expectedHouseholdContribution =
    applicablePercentage === null ? 0 : householdMagi * applicablePercentage;
  const potentialPremiumTaxCredit =
    status === "standard-income-range"
      ? Math.min(
          annualEnrollmentPremium,
          Math.max(0, annualBenchmarkPremium - expectedHouseholdContribution),
        )
      : 0;

  return {
    status,
    povertyGuideline: guideline,
    householdIncomePercentOfFpl,
    applicablePercentage,
    expectedHouseholdContribution,
    potentialPremiumTaxCredit,
    estimatedNetEnrollmentPremium: Math.max(
      0,
      annualEnrollmentPremium - potentialPremiumTaxCredit,
    ),
    incomeRoomTo400PercentFpl: Math.max(
      0,
      guideline * 4 - householdMagi,
    ),
  };
}
