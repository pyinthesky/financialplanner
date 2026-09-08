/** Public, bundled reference data. Applying a reference is always opt-in. */
export const INFLATION_REFERENCE = {
  id: 'bls-cpi-u-annual-2004-2024-v1',
  title: '20-Year Historical Inflation (2004–2024)',
  source: 'Bureau of Labor Statistics, CPI-U, U.S. City Average, All Items',
  url: 'https://www.bls.gov/cpi/tables/supplemental-files/historical-cpi-u-202412.pdf',
  reviewedOn: '2026-09-07',
  period: 'Annual-average index, 2004 to 2024',
  geography: 'United States urban consumers',
  units: 'percent per year',
  startIndex: 188.9,
  endIndex: 313.689,
  years: 20,
  method: '(313.689 / 188.9)^(1 / 20) - 1; compound annual change, not the average of yearly percentage changes',
  limitation: 'Historical reference, not a forecast. This window ends in 2024; October 2025 CPI is unavailable, so this is not labeled the latest rolling 20-year annual-average window.',
  missingDataUrl: 'https://www.bls.gov/regions/mid-atlantic/data/consumerpriceindexhistorical_us_table.htm',
} as const;
export function inflationReferenceValue() {
  return ((INFLATION_REFERENCE.endIndex / INFLATION_REFERENCE.startIndex) ** (1 / INFLATION_REFERENCE.years) - 1) * 100;
}
export interface InflationReceipt {
  reference: typeof INFLATION_REFERENCE;
  previousValue: number;
  appliedValue: number;
}
export function applyInflationReference(value: number): { value: number; receipt: InflationReceipt } {
  const appliedValue = inflationReferenceValue();
  return { value: appliedValue, receipt: { reference: INFLATION_REFERENCE, previousValue: value, appliedValue } };
}
export function canUndoInflationReference(value: number, receipt?: InflationReceipt): boolean {
  return !!receipt && Number.isFinite(receipt.previousValue) && receipt.appliedValue === value;
}

/** Published calendar-year averages, not compound-growth forecasts. */
export const RETURN_REFERENCES = {
  preRetirementReturn:{value:11.1,label:'90/10 Historical Average',period:'1928–2025'},
  retirementReturn:{value:9.8,label:'70/30 Historical Average',period:'1928–2025'},
  cashReturn:{value:3.575,label:'Two-Bank HYSA Average',period:'Observed 2026-09-08'},
} as const;
export interface ReturnReceipt { value:number; previousValue:number; label:string; period:string }
