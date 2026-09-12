"use client";
import { FormGrid, PlannerCard } from '@/components/ui/planner-layout';
import { useState } from 'react';
import type { DebtLedgerMonth } from '@/lib/debt-ledger';
import type { Debt, PlannerData } from '@/lib/planner';
import { NumericInput } from '@/components/numeric-input';
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
export function DebtCascade({ months, method, debts, updateDebt }: { months: DebtLedgerMonth[]; method: PlannerData['debtStrategy']['method']; debts: Debt[]; updateDebt?: (id: string, patch: Partial<Debt>) => void }) {
  const [selected, setSelected] = useState(1);
  const month = months[Math.min(selected, months.length - 1)];
  const preceding = months.slice(0, month.month).flatMap(row => row.released);
  return <PlannerCard as="section" stack className="planner-panel budget-flow"><h2>Follow the Payments</h2>
    <p>{method === 'custom' ? 'Custom pays each minimum plus that debt’s assigned extra. Paid-off minimums and unused extra are not moved to other debts.' : 'Your original minimums stay in the payment budget until all debts are paid. Unused minimums and extra flow to the next priority immediately.'}</p>
    {method === 'custom' && updateDebt && <FormGrid as="div" className="budget-fields">{debts.map(d => <label className="budget-field" key={d.id}><span>Extra for {d.name || 'Debt'} / Month</span><div className="input-affix"><span>$</span><NumericInput min={0} value={d.customExtraPayment ?? 0} onChange={e => updateDebt(d.id, { customExtraPayment: e.target.valueAsNumber || 0 })} /></div></label>)}</FormGrid>}
    {months.length <= 1 ? <p>Add an outstanding debt to see how its payments work.</p> : <>
      <label className="budget-field"><span>Payment Month</span><select aria-label="Payment Month" value={month.month} onChange={e => setSelected(+e.target.value)}>{months.slice(1).map(row => <option key={row.month} value={row.month}>Month {row.month} — {money(row.totalBalance)} Remaining</option>)}</select></label>
      <p>Payment budget: <strong>{money(month.paymentBudget)}</strong>. Applied: <strong>{money(month.interestPaid + month.principalPaid)}</strong>. Unused after scheduled payments: {money(month.unusedBudget)}.</p>
      {method !== 'custom' && preceding.length > 0 && <p>{preceding.map(d => `${d.name || 'Debt'} (${money(d.minimum)}/month)`).join(', ')} {preceding.length === 1 ? 'is' : 'are'} paid off. Those minimums remain available to the next debt.</p>}
      <FormGrid as="div" className="budget-fields">{month.payments.filter(p => p.openingBalance > 0).map(p => <div className="budget-card @container" key={p.id}><h3>{p.name || 'Debt'}</h3><dl>
        {[['Opening Balance', p.openingBalance], ['Minimum Applied', p.minimumPaid], ['Rolled Payments', p.rolledPayment], ['Custom Extra', p.extraPayment], ['Total Payment', p.payment], ['Interest Paid', p.interestPaid], ['Principal Paid', p.principalPaid], ['Ending Balance', p.closingBalance]].map(([label, amount]) => <div key={label} className="budget-calendar-row"><dt>{label}</dt><dd>{money(Number(amount))}</dd></div>)}
      </dl>{p.unpaidInterest > 0 && <p role="status">Payment does not cover interest. {money(p.unpaidInterest)} is added to this balance.</p>}{p.closingBalance <= 0.000001 && <p>Paid off this month. {method !== 'custom' ? 'Any unused payment capacity is already applied to the next debt.' : 'Its payment leaves the Custom budget.'}</p>}</div>)}</FormGrid>
      {months.at(-1)!.totalBalance > 0.01 && <p role="status">The debt is not fully repaid within the 600-month modeling horizon. This is not a payoff date.</p>}
      <p className="field-help">Estimate: interest accrues monthly at APR ÷ 12 before payment. Minimums stay fixed as entered. Daily interest, fees, promotional APR changes, and changing lender minimums are not modeled. Mortgage payments here must be principal and interest only; escrow is not available to roll over.</p>
    </>}
  </PlannerCard>;
}
