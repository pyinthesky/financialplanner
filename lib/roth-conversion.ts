import {
  calculateFederalIncomeTax,
  federalGrossIncomeCeilingForRate,
  type FilingStatus,
} from "./federal-tax.ts";

export interface RothConversionComparisonInput {
  filingStatus: FilingStatus;
  baselineGrossOrdinaryIncome: number;
  taxableConversionAmount: number;
  targetBracketRate: number;
}

export interface RothConversionComparison {
  targetGrossIncomeCeiling: number | null;
  roomToTargetBeforeConversion: number;
  conversionWithinTarget: number;
  amountAboveTarget: number;
  baselineFederalTax: number;
  federalTaxAfterConversion: number;
  incrementalFederalTax: number;
  averageFederalRateOnConversion: number;
  resultingMarginalRate: number;
}

// Current-year planning comparison only. The conversion input is the taxable
// portion after any Form 8606/pro-rata determination; no account balances move.
export function compareRothConversion(
  input: RothConversionComparisonInput,
): RothConversionComparison {
  const baselineGrossOrdinaryIncome = Math.max(
    0,
    Number.isFinite(input.baselineGrossOrdinaryIncome)
      ? input.baselineGrossOrdinaryIncome
      : 0,
  );
  const taxableConversionAmount = Math.max(
    0,
    Number.isFinite(input.taxableConversionAmount)
      ? input.taxableConversionAmount
      : 0,
  );
  const targetGrossIncomeCeiling = federalGrossIncomeCeilingForRate(
    input.filingStatus,
    input.targetBracketRate,
  );
  const roomToTargetBeforeConversion =
    targetGrossIncomeCeiling === null
      ? 0
      : Math.max(0, targetGrossIncomeCeiling - baselineGrossOrdinaryIncome);
  const conversionWithinTarget = Math.min(
    taxableConversionAmount,
    roomToTargetBeforeConversion,
  );
  const amountAboveTarget = Math.max(
    0,
    taxableConversionAmount - conversionWithinTarget,
  );
  const baselineTax = calculateFederalIncomeTax(
    baselineGrossOrdinaryIncome,
    input.filingStatus,
  );
  const convertedTax = calculateFederalIncomeTax(
    baselineGrossOrdinaryIncome + taxableConversionAmount,
    input.filingStatus,
  );
  const incrementalFederalTax = Math.max(0, convertedTax.tax - baselineTax.tax);

  return {
    targetGrossIncomeCeiling,
    roomToTargetBeforeConversion,
    conversionWithinTarget,
    amountAboveTarget,
    baselineFederalTax: baselineTax.tax,
    federalTaxAfterConversion: convertedTax.tax,
    incrementalFederalTax,
    averageFederalRateOnConversion:
      taxableConversionAmount > 0
        ? incrementalFederalTax / taxableConversionAmount
        : 0,
    resultingMarginalRate: convertedTax.marginalRate,
  };
}
