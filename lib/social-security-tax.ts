import type { FilingStatus } from "./federal-tax.ts";

export interface SocialSecurityTaxInput {
  benefits: number;
  otherIncome: number;
  taxExemptInterest?: number;
  adjustments?: number;
  filingStatus: FilingStatus;
  marriedFilingSeparatelyLivedApart?: boolean;
}

export interface SocialSecurityTaxResult {
  benefits: number;
  halfBenefits: number;
  otherIncome: number;
  taxExemptInterest: number;
  adjustments: number;
  provisionalIncome: number;
  baseAmount: number;
  upperThreshold: number;
  taxableBenefits: number;
  taxablePercent: number;
}

// IRS Publication 915 (2025), Worksheet 1, effective for tax year 2025.
// https://www.irs.gov/pub/irs-pdf/p915.pdf
// These statutory thresholds are not inflation-indexed. The planner holds them
// flat in future years and does not model the worksheet's special exclusions,
// lump-sum election, or repayment rules unless supplied as adjustments.
export function calculateTaxableSocialSecurity({
  benefits,
  otherIncome,
  taxExemptInterest = 0,
  adjustments = 0,
  filingStatus,
  marriedFilingSeparatelyLivedApart = false,
}: SocialSecurityTaxInput): SocialSecurityTaxResult {
  const netBenefits = Math.max(0, benefits);
  const halfBenefits = netBenefits * 0.5;
  const taxableOtherIncome = Math.max(0, otherIncome);
  const exemptInterest = Math.max(0, taxExemptInterest);
  const allowedAdjustments = Math.max(0, adjustments);
  const provisionalIncome = Math.max(
    0,
    halfBenefits + taxableOtherIncome + exemptInterest - allowedAdjustments,
  );

  const livedWithSpouse =
    filingStatus === "marriedSeparate" &&
    !marriedFilingSeparatelyLivedApart;
  const baseAmount = filingStatus === "marriedJoint" ? 32_000 : livedWithSpouse ? 0 : 25_000;
  const upperThreshold = filingStatus === "marriedJoint" ? 44_000 : livedWithSpouse ? 0 : 34_000;

  let taxableBenefits = 0;
  if (livedWithSpouse) {
    taxableBenefits = Math.min(netBenefits * 0.85, provisionalIncome * 0.85);
  } else if (provisionalIncome > baseAmount) {
    const firstBandWidth = upperThreshold - baseAmount;
    const excess = provisionalIncome - baseAmount;
    const firstTier = Math.min(halfBenefits, Math.min(excess, firstBandWidth) * 0.5);
    const secondTier = Math.max(0, excess - firstBandWidth) * 0.85;
    taxableBenefits = Math.min(netBenefits * 0.85, firstTier + secondTier);
  }

  return {
    benefits: netBenefits,
    halfBenefits,
    otherIncome: taxableOtherIncome,
    taxExemptInterest: exemptInterest,
    adjustments: allowedAdjustments,
    provisionalIncome,
    baseAmount,
    upperThreshold,
    taxableBenefits,
    taxablePercent: netBenefits > 0 ? taxableBenefits / netBenefits : 0,
  };
}
