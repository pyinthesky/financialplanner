import type { FilingStatus } from './federal-tax.ts';

export interface HomeMove {
  month: string; mortgageId: string;
  salePrice: number | null; sellingCosts: number | null; adjustedBasis: number | null;
  exclusion: 'none' | 'standard'; eligibilityConfirmed: boolean; standardCaseConfirmed: boolean;
  replacementPrice: number | null; replacementClosingCosts: number | null;
  newMonthlyHousing: number | null; newAnnualPropertyTax: number | null; newAnnualInsurance: number | null;
}
export const EMPTY_HOME_MOVE: HomeMove = { month:'',mortgageId:'',salePrice:null,sellingCosts:null,adjustedBasis:null,exclusion:'none',eligibilityConfirmed:false,standardCaseConfirmed:false,replacementPrice:null,replacementClosingCosts:null,newMonthlyHousing:null,newAnnualPropertyTax:null,newAnnualInsurance:null };
/** IRS Pub 523 (2025), worksheets 1–3; checked September 7, 2026.
 * https://www.irs.gov/publications/p523
 * Only user-confirmed standard personal-residence long-term sales. Rental use,
 * depreciation, reduced exclusions, nonqualified use and installment sales are
 * not inferred. A mortgage affects cash proceeds, never the gain's tax basis.
 */
export function calculateHomeMove(move: HomeMove, filingStatus: FilingStatus, mortgageBalance: number) {
  const numeric=['salePrice','sellingCosts','adjustedBasis','replacementPrice','replacementClosingCosts','newMonthlyHousing','newAnnualPropertyTax','newAnnualInsurance'] as const;
  const complete=numeric.every(k=>move[k]!==null&&Number.isFinite(move[k])&&move[k]!>=0) && move.salePrice!>0 && move.standardCaseConfirmed && (move.exclusion==='none'||move.eligibilityConfirmed) && /^\d{4}-(0[1-9]|1[0-2])$/.test(move.month);
  if(!complete)return {supported:false,reason:'Complete the sale, basis, replacement costs and supported-case confirmations. Enter zero explicitly for costs that do not apply.',gain:0,excludedGain:0,taxableGain:0,netCash:0};
  const gain=Math.max(0,move.salePrice!-move.sellingCosts!-move.adjustedBasis!);
  const excludedGain=move.exclusion==='standard'?Math.min(gain,filingStatus==='marriedJoint'?500000:250000):0;
  const netCash=move.salePrice!-move.sellingCosts!-mortgageBalance-move.replacementPrice!-move.replacementClosingCosts!;
  return {supported:true,reason:'Standard personal-home estimate; cash proceeds and taxable gain are separate.',gain,excludedGain,taxableGain:gain-excludedGain,netCash};
}
