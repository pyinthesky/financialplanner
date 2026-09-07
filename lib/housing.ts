export interface MortgageStatement {
  enabled: boolean;
  debtId: string;
  total: number | null;
  principalInterest: number | null;
  propertyTax: number | null;
  insurance: number | null;
  mortgageInsurance: number | null;
  otherEscrow: number | null;
}
export const EMPTY_MORTGAGE_STATEMENT: MortgageStatement = { enabled: false, debtId: '', total: null, principalInterest: null, propertyTax: null, insurance: null, mortgageInsurance: null, otherEscrow: null };
export function reconcileMortgage(s: MortgageStatement) {
  const values = [s.total, s.principalInterest, s.propertyTax, s.insurance, s.mortgageInsurance, s.otherEscrow];
  const complete = values.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0) && !!s.debtId;
  const parts = (s.principalInterest ?? 0) + (s.propertyTax ?? 0) + (s.insurance ?? 0) + (s.mortgageInsurance ?? 0) + (s.otherEscrow ?? 0);
  const difference = s.total === null ? null : s.total - parts;
  return { complete, parts, difference, reconciled: complete && Math.abs(difference!) <= 0.005 };
}
