"use client";
import { FormGrid, PlannerCard } from '@/components/ui/planner-layout';
import { Input } from '@/components/ui/input';
import { EMPTY_MORTGAGE_STATEMENT, reconcileMortgage, type MortgageStatement } from '@/lib/housing';
import type { Debt } from '@/lib/planner';
export function MortgageStatementEditor({ statement, debts, onChange }: { statement?: MortgageStatement; debts: Debt[]; onChange: (s: MortgageStatement) => void }) {
  const s = statement ?? EMPTY_MORTGAGE_STATEMENT;
  const result = reconcileMortgage(s);
  const matchingDebt = debts.some(d => d.id === s.debtId && d.kind === 'mortgage');
  return <PlannerCard as="section" stack className="planner-panel budget-flow"><h2>Reconcile a Mortgage Statement</h2><p>Your lender's payment may include taxes and insurance. Only principal and interest can pay down the loan or roll into the next debt.</p>
    <label className="budget-field"><span>Mortgage Account</span><select aria-label="Mortgage Account" value={s.debtId} onChange={e => onChange({ ...s, debtId: e.target.value })}><option value="">Select an Entered Mortgage</option>{debts.filter(d => d.kind === 'mortgage').map(d => <option key={d.id} value={d.id}>{d.name || 'Mortgage'}</option>)}</select></label>
    <FormGrid as="div" className="budget-fields">{([['total','Total Statement Payment'],['principalInterest','Principal & Interest'],['propertyTax','Property Tax Escrow'],['insurance','Home Insurance Escrow'],['mortgageInsurance','Mortgage Insurance'],['otherEscrow','Other Escrow']] as const).map(([key,label]) => <label className="budget-field" key={key}><span>{label} / Month</span><div className="input-affix"><span>$</span><Input aria-label={label} type="number" min={0} step="0.01" value={s[key] ?? ''} onFocus={e => e.currentTarget.select()} onChange={e => onChange({ ...s, [key]: e.target.value === '' ? null : e.target.valueAsNumber })} /></div></label>)}</FormGrid>
    <p role="status">{!result.complete ? 'Enter each component, using an explicit zero where your statement has no charge.' : result.reconciled ? 'The components match your statement.' : `Unreconciled difference: $${result.difference!.toFixed(2)}. Check the statement before using this breakdown.`}</p>
    <label className="budget-check"><input type="checkbox" checked={s.enabled} disabled={!s.enabled && (!result.reconciled || !matchingDebt)} onChange={e => onChange({ ...s, enabled: e.target.checked })} /> Use This Statement in the Plan</label>
    <p className="field-help">When enabled, this is the shared source for this loan's P&I and this home's property tax and insurance. It replaces those manually entered amounts. Tax and home insurance continue after payoff; mortgage insurance and other escrow continue only while this loan remains in the schedule. Other escrow must cover loan-related charges; enter ongoing expenses elsewhere. Escrow deposits are cash estimates, not actual tax assessments or premiums. Lender changes and early mortgage-insurance cancellation need updated inputs.</p>
    {s.enabled && (!result.reconciled || !matchingDebt) && <p role="alert">This active statement needs correction. Projection readiness is blocked; derived loan and housing amounts are incomplete.</p>}
  </PlannerCard>;
}
