export type FilingStatus =
  | "single"
  | "marriedJoint"
  | "headOfHousehold"
  | "marriedSeparate";

interface TaxBracket {
  ceiling: number | null;
  rate: number;
}

interface FederalTaxTable {
  standardDeduction: number;
  brackets: TaxBracket[];
}

export interface FederalTaxResult {
  grossOrdinaryIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  tax: number;
  marginalRate: number;
  effectiveRate: number;
}

export const FEDERAL_TAX_BASE_YEAR = 2026;

// IRS Rev. Proc. 2025-32, sections 4.01 and 4.14, effective for tax year 2026.
// https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
const TABLES: Record<FilingStatus, FederalTaxTable> = {
  marriedJoint: {
    standardDeduction: 32_200,
    brackets: [
      { ceiling: 24_800, rate: 0.1 },
      { ceiling: 100_800, rate: 0.12 },
      { ceiling: 211_400, rate: 0.22 },
      { ceiling: 403_550, rate: 0.24 },
      { ceiling: 512_450, rate: 0.32 },
      { ceiling: 768_700, rate: 0.35 },
      { ceiling: null, rate: 0.37 },
    ],
  },
  headOfHousehold: {
    standardDeduction: 24_150,
    brackets: [
      { ceiling: 17_700, rate: 0.1 },
      { ceiling: 67_450, rate: 0.12 },
      { ceiling: 105_700, rate: 0.22 },
      { ceiling: 201_750, rate: 0.24 },
      { ceiling: 256_200, rate: 0.32 },
      { ceiling: 640_600, rate: 0.35 },
      { ceiling: null, rate: 0.37 },
    ],
  },
  single: {
    standardDeduction: 16_100,
    brackets: [
      { ceiling: 12_400, rate: 0.1 },
      { ceiling: 50_400, rate: 0.12 },
      { ceiling: 105_700, rate: 0.22 },
      { ceiling: 201_775, rate: 0.24 },
      { ceiling: 256_225, rate: 0.32 },
      { ceiling: 640_600, rate: 0.35 },
      { ceiling: null, rate: 0.37 },
    ],
  },
  marriedSeparate: {
    standardDeduction: 16_100,
    brackets: [
      { ceiling: 12_400, rate: 0.1 },
      { ceiling: 50_400, rate: 0.12 },
      { ceiling: 105_700, rate: 0.22 },
      { ceiling: 201_775, rate: 0.24 },
      { ceiling: 256_225, rate: 0.32 },
      { ceiling: 384_350, rate: 0.35 },
      { ceiling: null, rate: 0.37 },
    ],
  },
};

export function calculateFederalIncomeTax(
  grossOrdinaryIncome: number,
  filingStatus: FilingStatus,
  inflationFactor = 1,
): FederalTaxResult {
  const table = TABLES[filingStatus];
  const factor = Number.isFinite(inflationFactor)
    ? Math.max(0, inflationFactor)
    : 1;
  const gross = Math.max(0, grossOrdinaryIncome);
  const standardDeduction = table.standardDeduction * factor;
  const taxableIncome = Math.max(0, gross - standardDeduction);
  let tax = 0;
  let floor = 0;
  let marginalRate = 0;

  for (const bracket of table.brackets) {
    if (taxableIncome <= floor) break;
    const ceiling =
      bracket.ceiling === null ? taxableIncome : bracket.ceiling * factor;
    const amountInBracket = Math.max(
      0,
      Math.min(taxableIncome, ceiling) - floor,
    );
    tax += amountInBracket * bracket.rate;
    if (amountInBracket > 0) marginalRate = bracket.rate;
    floor = ceiling;
  }

  return {
    grossOrdinaryIncome: gross,
    standardDeduction,
    taxableIncome,
    tax,
    marginalRate,
    effectiveRate: gross > 0 ? tax / gross : 0,
  };
}
