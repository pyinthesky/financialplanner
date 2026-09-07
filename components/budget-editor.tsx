"use client";
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BUDGET_CATEGORIES, FREQUENCIES, annualize, budgetTotals, retirementAmount, scheduledPayments, type BudgetData, type BudgetLine, type Frequency } from '@/lib/budget';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
function Amount({ label, value, onChange, percent = false }: { label: string; value: number | null; onChange: (n: number | null) => void; percent?: boolean }) {
  return <label className="budget-field"><span>{label}</span><div className="input-affix"><span>{percent ? '%' : '$'}</span><Input type="number" min={percent ? -100 : 0} step="any" value={value ?? ''} onFocus={e => e.currentTarget.select()} onChange={e => onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></div></label>;
}
function FrequencySelect({ value, onChange }: { value: Frequency; onChange: (v: Frequency) => void }) {
  return <label className="budget-field"><span>Frequency</span><select value={value} onChange={e => onChange(e.target.value as Frequency)}>{Object.entries(FREQUENCIES).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}</select></label>;
}
export function BudgetEditor({ budget, onChange, retirement = false, married, linkedAnnual, legacyAnnual }: { budget: BudgetData; onChange: (b: BudgetData) => void; retirement?: boolean; married: boolean; linkedAnnual: { housing: number; debt: number; health: number }; legacyAnnual: number }) {
  const [month, setMonth] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const year = new Date().getFullYear();
  const current = budgetTotals(budget);
  const future = budgetTotals(budget, true);
  const totals = retirement ? future : current;
  const linked = linkedAnnual.housing + linkedAnnual.debt + linkedAnnual.health;
  const updateLine = (id: string, patch: Partial<BudgetLine>) => onChange({ ...budget, reviewed: false, lines: budget.lines.map(l => l.id === id ? { ...l, ...patch } : l) });
  const addLine = (category: string) => onChange({ ...budget, reviewed: false, lines: [...budget.lines, { id: crypto.randomUUID(), name: '', category, amount: null, frequency: 'monthly', essential: false, owner: 'household', nextDueDate: '', endDate: '', retirement: { rule: retirement ? 'retirementOnly' : 'continue', amount: null, reason: '' } }] });
  const missingSchedule = budget.lines.filter(l => l.retirement.rule !== 'retirementOnly' && scheduledPayments(l.amount, l.frequency, l.nextDueDate, year, l.endDate) === null).length;
  return <div className="budget-flow">
    <div className="section-heading"><h1>{retirement ? 'Retirement Budget' : 'Current Budget'}</h1><p>{retirement ? 'Start with the life you know. Keep what fits, then change only what retirement changes.' : 'Start with your take-home pay and a few bills. You can refine the details whenever you are ready.'}</p></div>
    <div className="budget-metrics">
      <div><span>{retirement ? 'Current Everyday Costs' : 'Take-Home Pay'} / Month</span><strong>{money((retirement ? current.spending : current.takeHome) / 12)}</strong></div>
      <div><span>{retirement ? 'Retirement Everyday Costs' : 'Entered Costs Including Linked Items'} / Month</span><strong>{money((totals.spending + (retirement ? 0 : linked)) / 12)}</strong></div>
      <div><span>{retirement ? 'Everyday Cost Change' : 'Remaining Before Savings & Other Costs'} / Month</span><strong>{money((retirement ? future.spending - current.spending : current.margin - linked) / 12)}</strong></div>
    </div>
    <p className="field-help">{totals.missing > 0 ? `${totals.missing} entries still need an amount. ` : ''}These totals cover entered items only. Monthly averages spread irregular bills across the year; they are not actual due-month spending.</p>

    {!retirement && <section className="panel budget-flow"><h2>Take-Home Pay</h2><p>Use the amount deposited after payroll deductions. Do not enter pension or Social Security here; those remain in Benefits. Take-home pay currently informs this cash budget; it is not treated as gross taxable wages in the long-range projection.</p>
      {budget.pay.map(p => <div className="budget-card" key={p.id}><div className="budget-fields">
        <label className="budget-field"><span>Pay Description</span><Input value={p.name} onChange={e => onChange({ ...budget, pay: budget.pay.map(q => q.id === p.id ? { ...q, name: e.target.value } : q) })} /></label>
        <Amount label="Take-Home per Payment" value={p.amount} onChange={amount => onChange({ ...budget, pay: budget.pay.map(q => q.id === p.id ? { ...q, amount } : q) })} />
        <FrequencySelect value={p.frequency} onChange={frequency => onChange({ ...budget, pay: budget.pay.map(q => q.id === p.id ? { ...q, frequency } : q) })} />
        <label className="budget-field"><span>Whose Pay?</span><select value={p.owner} onChange={e => onChange({ ...budget, pay: budget.pay.map(q => q.id === p.id ? { ...q, owner: e.target.value as 'you' | 'partner' } : q) })}><option value="you">You</option>{married && <option value="partner">Partner</option>}</select></label>
        <label className="budget-field"><span>Next Pay Date (Optional)</span><Input type="date" value={p.nextPayDate} onChange={e => onChange({ ...budget, pay: budget.pay.map(q => q.id === p.id ? { ...q, nextPayDate: e.target.value } : q) })} /></label>
      </div><Button variant="ghost" aria-label="Remove Pay Entry" onClick={() => onChange({ ...budget, pay: budget.pay.filter(q => q.id !== p.id) })}><Trash2 /> Remove</Button></div>)}
      <Button variant="outline" onClick={() => onChange({ ...budget, pay: [...budget.pay, { id: crypto.randomUUID(), name: '', owner: 'you', amount: null, frequency: 'monthly', nextPayDate: '' }] })}><Plus /> Add Take-Home Pay</Button>
    </section>}

    <section className="panel budget-flow"><h2>{retirement ? 'What Changes?' : 'Everyday Bills'}</h2><p>Housing property tax and insurance, debt payments, and entered healthcare are linked below. Add other bills here to avoid counting those costs twice. Classification starts unconfirmed: mark the bills you consider essential.</p>
      {budget.lines.map(l => <div className="budget-card" key={l.id}>
        <div className="budget-fields">
          <label className="budget-field"><span>Description</span><Input value={l.name} onChange={e => updateLine(l.id, { name: e.target.value })} /></label>
          <label className="budget-field"><span>Category</span><select value={l.category} onChange={e => updateLine(l.id, { category: e.target.value })}>{BUDGET_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          {l.retirement.rule !== 'retirementOnly' && !retirement && <Amount label="Current Amount" value={l.amount} onChange={amount => updateLine(l.id, { amount })} />}
          <FrequencySelect value={l.frequency} onChange={frequency => updateLine(l.id, { frequency })} />
          <label className="budget-check"><input type="checkbox" checked={l.essential} onChange={e => updateLine(l.id, { essential: e.target.checked })} /> Essential Cost</label>
        </div>
        {retirement ? <>
          <div className="budget-fields"><label className="budget-field"><span>In Retirement</span><select value={l.retirement.rule} onChange={e => updateLine(l.id, { retirement: { ...l.retirement, rule: e.target.value as BudgetLine['retirement']['rule'] } })}><option value="continue">Continue Current Amount</option><option value="stop">Stop</option><option value="replace">Replace Amount</option><option value="percent">Change by Percentage</option><option value="retirementOnly">New Retirement Cost</option></select></label>
          {['replace', 'percent', 'retirementOnly'].includes(l.retirement.rule) && <Amount label={l.retirement.rule === 'percent' ? 'Change (− for Less)' : 'Retirement Amount'} percent={l.retirement.rule === 'percent'} value={l.retirement.amount} onChange={amount => updateLine(l.id, { retirement: { ...l.retirement, amount } })} />}
          <label className="budget-field"><span>Reason (Optional)</span><Input value={l.retirement.reason} onChange={e => updateLine(l.id, { retirement: { ...l.retirement, reason: e.target.value } })} /></label></div>
          <p className="field-help">Current: {l.amount === null ? 'Not Entered' : money(annualize(l.amount, l.frequency)! / 12)} / month → Retirement: {retirementAmount(l) === null ? 'Not Entered' : money(annualize(retirementAmount(l), l.frequency)! / 12)} / month. {l.retirement.rule === 'continue' ? 'Linked: editing the current amount updates retirement too.' : 'Explicit retirement choice preserved when the current amount changes.'}</p>
        </> : <details><summary>Bill Timing</summary><div className="budget-fields"><label className="budget-field"><span>Next Due Date</span><Input type="date" value={l.nextDueDate} onChange={e => updateLine(l.id, { nextDueDate: e.target.value })} /></label><label className="budget-field"><span>Final Due Date (Optional)</span><Input type="date" value={l.endDate} onChange={e => updateLine(l.id, { endDate: e.target.value })} /></label></div><p className="field-help">Twice-monthly scheduling uses the 15th and last day. Weekly dates may yield 53 payments; biweekly may yield 27 in some calendar years. Timing currently informs the bill calendar; long-range retirement spending uses annual averages.</p></details>}
        <Button variant="ghost" aria-label={`Remove ${l.name || l.category} Cost`} onClick={() => onChange({ ...budget, reviewed: false, lines: budget.lines.filter(q => q.id !== l.id) })}><Trash2 /> Remove Cost</Button>
      </div>)}
      <div className="budget-actions">{BUDGET_CATEGORIES.map(c => <Button key={c} variant="outline" onClick={() => addLine(c)}><Plus /> {c}</Button>)}</div>
    </section>

    <section className="panel budget-flow"><h2>Linked Costs</h2><p>These are read from their existing sections, never copied into your everyday bills. They stay separate in retirement projections.</p><dl className="budget-metrics"><div><dt>Home Taxes & Insurance / Month</dt><dd>{money(linkedAnnual.housing / 12)}</dd></div><div><dt>First-Year Debt Payments / Month</dt><dd>{money(linkedAnnual.debt / 12)}</dd></div><div><dt>Entered Healthcare / Month</dt><dd>{money(linkedAnnual.health / 12)}</dd></div></dl><p className="field-help">Timed expenses, payroll savings, pension/benefit withholding, and other unentered obligations are not included in the current margin above. Debt amounts assume principal and interest exclude escrow.</p></section>

    {retirement ? <section className="panel budget-flow"><h2>Use This in the Projection</h2><p>Choose either the existing aggregate retirement baseline ({money(legacyAnnual)} / year) or this worksheet ({money(future.spending)} / year). They are never added together. Worksheet amounts are in today's dollars; the projection applies your inflation assumption from today.</p><label className="budget-field"><span>Retirement Spending Source</span><select value={budget.retirementSpendingSource} onChange={e => onChange({ ...budget, retirementSpendingSource: e.target.value as BudgetData['retirementSpendingSource'] })}><option value="legacy">Existing Aggregate Baseline</option><option value="worksheet">Linked Budget Worksheet</option></select></label><label className="budget-check"><input type="checkbox" checked={budget.reviewed} onChange={e => onChange({ ...budget, reviewed: e.target.checked })} /> I have reviewed the everyday costs and the separately linked costs.</label><p className="field-help">The long-range engine currently switches this everyday spending at full household retirement. Separate spouse/month transitions and the earnings-to-savings bridge remain in development; the current cash budget is not yet a complete working-year projection.</p></section> : <section className="panel budget-flow"><h2>Bill Calendar</h2><Button variant="outline" onClick={() => setShowSchedule(!showSchedule)}>{showSchedule ? 'Hide' : 'Show'} Scheduled Payments</Button>{showSchedule && <><label className="budget-field"><span>Month in {year}</span><select value={month} onChange={e => setMonth(+e.target.value)}>{Array.from({ length: 12 }, (_, m) => <option key={m} value={m}>{new Date(year, m).toLocaleString('en-US', { month: 'long' })}</option>)}</select></label><p>{missingSchedule ? `${missingSchedule} costs have no complete due-date schedule; they are excluded below.` : 'All entered everyday costs have schedules.'} This calendar covers everyday bills only; linked costs remain separate.</p>{budget.lines.filter(l => l.retirement.rule !== 'retirementOnly').map(l => { const schedule = scheduledPayments(l.amount, l.frequency, l.nextDueDate, year, l.endDate); return <div className="budget-calendar-row" key={l.id}><span>{l.name || l.category}</span><strong>{schedule === null ? 'Date / Amount Needed' : money(schedule[month])}</strong></div>; })}</>}</section>}
  </div>;
}
