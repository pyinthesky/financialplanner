import {
  calculateFederalIncomeTax,
  type FilingStatus,
} from "./federal-tax.ts";

interface CapitalGainThresholds {
  zeroRateCeiling: number;
  fifteenRateCeiling: number;
  niitThreshold: number;
}

export interface CapitalGainsTaxInput {
  filingStatus: FilingStatus;
  grossOrdinaryIncome: number;
  netLongTermCapitalGain: number;
  modifiedAdjustedGrossIncome: number;
  netInvestmentIncome: number;
  inflationFactor?: number;
  overrideRatePercent?: number;
}

export interface CapitalGainsTaxResult {
  ordinaryTaxableIncome: number;
  standardDeduction: number;
  unusedStandardDeduction: number;
  taxableLongTermCapitalGain: number;
  zeroRateCeiling: number;
  fifteenRateCeiling: number;
  zeroRateGain: number;
  fifteenRateGain: number;
  twentyRateGain: number;
  statutoryRegularCapitalGainsTax: number;
  regularCapitalGainsTax: number;
  niitThreshold: number;
  niitBase: number;
  niitTax: number;
  totalCapitalGainsTax: number;
  effectiveRate: number;
  overrideApplied: boolean;
}

export const CAPITAL_GAINS_TAX_BASE_YEAR = 2026;

// IRS Rev. Proc. 2025-32, section 3.03, effective for tax year 2026.
// NIIT thresholds are statutory and are not indexed for inflation.
// https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
// https://www.irs.gov/individuals/net-investment-income-tax
const THRESHOLDS: Record<FilingStatus, CapitalGainThresholds> = {
  marriedJoint: {
    zeroRateCeiling: 98_900,
    fifteenRateCeiling: 613_700,
    niitThreshold: 250_000,
  },
  headOfHousehold: {
    zeroRateCeiling: 66_200,
    fifteenRateCeiling: 579_600,
    niitThreshold: 200_000,
  },
  single: {
    zeroRateCeiling: 49_450,
    fifteenRateCeiling: 545_500,
    niitThreshold: 200_000,
  },
  marriedSeparate: {
    zeroRateCeiling: 49_450,
    fifteenRateCeiling: 306_850,
    niitThreshold: 125_000,
  },
};

const finiteNonnegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateCapitalGainsTax(
  input: CapitalGainsTaxInput,
): CapitalGainsTaxResult {
  const inflationFactor = Number.isFinite(input.inflationFactor)
    ? Math.max(0, input.inflationFactor ?? 1)
    : 1;
  const grossOrdinaryIncome = finiteNonnegative(input.grossOrdinaryIncome);
  const netLongTermCapitalGain = finiteNonnegative(
    input.netLongTermCapitalGain,
  );
  const ordinaryTax = calculateFederalIncomeTax(
    grossOrdinaryIncome,
    input.filingStatus,
    inflationFactor,
  );
  const unusedStandardDeduction = Math.max(
    0,
    ordinaryTax.standardDeduction - grossOrdinaryIncome,
  );
  const taxableLongTermCapitalGain = Math.max(
    0,
    netLongTermCapitalGain - unusedStandardDeduction,
  );
  const thresholds = THRESHOLDS[input.filingStatus];
  const zeroRateCeiling = thresholds.zeroRateCeiling * inflationFactor;
  const fifteenRateCeiling = thresholds.fifteenRateCeiling * inflationFactor;

  const zeroRateGain = Math.min(
    taxableLongTermCapitalGain,
    Math.max(0, zeroRateCeiling - ordinaryTax.taxableIncome),
  );
  const afterZero = taxableLongTermCapitalGain - zeroRateGain;
  const fifteenRateGain = Math.min(
    afterZero,
    Math.max(
      0,
      fifteenRateCeiling - ordinaryTax.taxableIncome - zeroRateGain,
    ),
  );
  const twentyRateGain = Math.max(0, afterZero - fifteenRateGain);
  const statutoryRegularCapitalGainsTax =
    fifteenRateGain * 0.15 + twentyRateGain * 0.2;

  const overrideRatePercent = finiteNonnegative(
    input.overrideRatePercent ?? 0,
  );
  const overrideApplied = overrideRatePercent > 0;
  const regularCapitalGainsTax = overrideApplied
    ? taxableLongTermCapitalGain * (overrideRatePercent / 100)
    : statutoryRegularCapitalGainsTax;

  const modifiedAdjustedGrossIncome = finiteNonnegative(
    input.modifiedAdjustedGrossIncome,
  );
  const netInvestmentIncome = finiteNonnegative(input.netInvestmentIncome);
  const niitBase = Math.min(
    netInvestmentIncome,
    Math.max(0, modifiedAdjustedGrossIncome - thresholds.niitThreshold),
  );
  const niitTax = niitBase * 0.038;
  const totalCapitalGainsTax = regularCapitalGainsTax + niitTax;

  return {
    ordinaryTaxableIncome: ordinaryTax.taxableIncome,
    standardDeduction: ordinaryTax.standardDeduction,
    unusedStandardDeduction,
    taxableLongTermCapitalGain,
    zeroRateCeiling,
    fifteenRateCeiling,
    zeroRateGain,
    fifteenRateGain,
    twentyRateGain,
    statutoryRegularCapitalGainsTax,
    regularCapitalGainsTax,
    niitThreshold: thresholds.niitThreshold,
    niitBase,
    niitTax,
    totalCapitalGainsTax,
    effectiveRate:
      taxableLongTermCapitalGain > 0
        ? totalCapitalGainsTax / taxableLongTermCapitalGain
        : 0,
    overrideApplied,
  };
}
