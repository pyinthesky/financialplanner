"use client";
import { FormGrid, PlannerCard, Stack } from '@/components/ui/planner-layout';
import { useState } from 'react';
import { Amount } from '@/components/budget-editor';
import { Button } from '@/components/ui/button';
import { activeMortgageStatement, type PlannerData } from '@/lib/planner';
import { compareRefinance, emptyRefinance, validSnapshot, refinanceOpportunities, type RateSnapshot, type RefinanceCase } from '@/lib/refinance';
import { EMPTY_LAB } from '@/lib/monthly-model';
import { baselineSnapshot } from '@/lib/scenarios';
import { projectMonthly } from '@/lib/monthly-projection';
const money = (n:number) => n.toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0});

export function Refinance({plan,onChange,snapshot,onOpenScenario}:{plan:PlannerData;onChange:(p:PlannerData)=>void;snapshot:RateSnapshot|null;onOpenScenario:(id:string)=>void}) {
 const [notice,setNotice]=useState<{debtId:string;messages:string[];savedId?:string}|null>(null);
 const opportunities=refinanceOpportunities(plan,snapshot),fresh=validSnapshot(snapshot),statement=activeMortgageStatement(plan);
 function save(c:RefinanceCase) {
  const lab=plan.laboratory??structuredClone(EMPTY_LAB);
  if(lab.scenarios.length>=30){setNotice({debtId:c.debtId,messages:['Remove an unused scenario in Scenario Laboratory before saving another (maximum 30).']});return;}
  const result=projectMonthly(plan,{refinance:c});
  if(!result.supported){setNotice({debtId:c.debtId,messages:result.issues});return;}
  const id=crypto.randomUUID(),name=`Refinance ${plan.debts.find(d=>d.id===c.debtId)?.name||'Loan'} — ${c.rate}% / ${c.years} Years`;
  onChange({...plan,laboratory:{...lab,scenarios:[{id,name,baseline:baselineSnapshot(plan),overrides:{refinance:structuredClone(c)}},...lab.scenarios]}});
  setNotice({debtId:c.debtId,savedId:id,messages:[`Saved “${name}”. Open the scenario to see monthly funding, payoff effects, taxes and ending assets. Your current loan and Plan Summary baseline are unchanged.`]});
 }
 return <PlannerCard as="section" stack className="planner-panel budget-flow refinance-panel"><h2>Refinance Comparison</h2>
  <p>Choose a loan, enter an offer, and the comparison below updates immediately. Save a scenario to see how refinancing affects your household plan.</p>
  <p className="field-help">Current balance, rate and principal-and-interest (P&I) payment come from Loans & Debts and the reconciled mortgage statement. This loan-only preview excludes escrow and extra payments; saved scenarios include your existing snowball, avalanche or custom strategy.</p>
  {!plan.debts.length&&<p>Add a loan above to begin comparing.</p>}
  {plan.debts.map(d=>{
   const c=plan.refinancing?.find(c=>c.debtId===d.id)??emptyRefinance(d.id);
   const write=(patch:Partial<RefinanceCase>)=>{setNotice(null);onChange({...plan,refinancing:[...(plan.refinancing??[]).filter(v=>v.debtId!==d.id),{...c,...patch}]});};
   const monthly=statement?.debtId===d.id?statement.principalInterest!:d.minimumPayment;
   const blockedStatement=plan.housing.statement?.enabled&&!statement;
   const result=blockedStatement?null:compareRefinance(d.balance,d.interestRate,monthly,c);
   const missing=[c.years===null?'new term':null,c.rate===null?'offered rate':null,c.fees===null?'closing costs (enter 0 for none)':null,c.horizon===null?'holding period':null].filter(Boolean);
   const status=notice?.debtId===d.id?notice:null;
   return <details className="refinance-loan" key={d.id}><summary>{d.name||'Loan'} {opportunities.includes(d.id)&&<span className="opportunity-badge">Worth Comparing</span>}<small>{result?`${money(result.monthlyDifference)} monthly payment reduction · ${money(result.saving)} net saving over ${c.horizon} months`:missing.length?`${missing.length} offer fields needed`:'Review loan inputs'}</small></summary>
    <p><strong>Current Loan:</strong> {money(d.balance)} balance · {d.interestRate}% rate · {money(monthly)} P&I / month.</p>
    <FormGrid as="div" className="budget-fields"><Amount unit="years" label={`New Term / Years — ${d.name}`} value={c.years} onChange={years=>write({years})}/><Amount percent label={`Offered Rate / % — ${d.name}`} value={c.rate} onChange={rate=>write({rate})}/><Amount label={`Closing Costs and Points — ${d.name}`} value={c.fees} onChange={fees=>write({fees})}/><Amount unit="months" label={`Holding Period / Months — ${d.name}`} value={c.horizon} onChange={horizon=>write({horizon})}/></FormGrid>
    <label className="budget-check"><input type="checkbox" checked={c.financed} onChange={e=>write({financed:e.target.checked})}/> Add costs to the new loan balance</label>
    {result?<Stack as="div" className="budget-flow refinance-result" aria-label={`Refinance Results — ${d.name}`}>
     <div className="budget-metrics"><div><span>Monthly Payment Reduction</span><strong>{money(result.monthlyDifference)}</strong></div><div><span>Net Saving at Month {c.horizon}</span><strong>{money(result.saving)}</strong></div></div>
     <table className="refinance-table"><caption>Same Loan, Two Paths — {c.horizon} Months</caption><thead><tr><th>Measure</th><th>Keep Loan</th><th>Refinance</th></tr></thead><tbody>
      <tr><th>P&I / Month</th><td>{money(monthly)}</td><td>{money(result.newPayment)}</td></tr>
      <tr><th>Fees Paid Upfront</th><td>{money(0)}</td><td>{money(c.financed?0:c.fees!)}</td></tr>
      <tr><th>Interest in Period</th><td>{money(result.oldInterest)}</td><td>{money(result.newInterest)}</td></tr>
      <tr><th>Debt at Period End</th><td>{money(result.rows.at(-1)!.oldBalance)}</td><td>{money(result.rows.at(-1)!.newBalance)}</td></tr>
     </tbody></table>
     <p>{result.saving<0?`Refinancing costs ${money(-result.saving)} more over this holding period.`:`Refinancing saves ${money(result.saving)} over this holding period.`} This compares payments, upfront fees and remaining debt. First break-even: {result.breakEven===null?'not reached in this period':`month ${result.breakEven}`}. Negative payment reduction means a higher payment.</p>
     {result.extends&&<p role="status">The replacement extends the scheduled payoff term. A smaller payment can leave more debt outstanding.</p>}
     <details><summary>Remaining Debt Chart</summary><svg viewBox="0 0 600 240" role="img" aria-label={`Keep Loan and Refinance Balances — ${d.name}`} style={{width:'100%',height:'auto'}}>
      <line x1="45" y1="205" x2="575" y2="205" stroke="#64748b"/>
      {(['oldBalance','newBalance'] as const).map((key,i)=>{const rows=[{month:0,oldBalance:d.balance,newBalance:d.balance+(c.financed?c.fees!:0)},...result.rows],max=Math.max(...rows.flatMap(r=>[r.oldBalance,r.newBalance]),1);return <polyline key={key} points={rows.map(r=>`${45+r.month/c.horizon!*530},${205-r[key]/max*165}`).join(' ')} stroke={i?'#2f7df4':'#64748b'} strokeDasharray={i?undefined:'6 4'} strokeWidth="3" fill="none"/>;})}
      <text x="45" y="20">{money(d.balance+(c.financed?c.fees!:0))}</text><text x="45" y="230">Month 0</text><text x="485" y="230">Month {c.horizon}</text>
     </svg><p className="field-help">Dashed gray: Keep Loan · Blue: Refinance. Scheduled P&I only.</p></details>
     <Stack as="div" className="budget-card budget-flow"><strong>Try This in Your Plan</strong><p>Save an opening-January {plan.budget.timeline?.startYear??'balance-year'} refinance scenario. Financed fees increase debt; upfront fees enter that month’s spending and funding calculation. Existing escrow amounts and extra-payment settings remain in place. The preview’s holding period does not end the household projection.</p><p className="field-help">Fixed-rate, no cash-out only. Rental loans, changed escrow/PMI, prepayment penalties, special loan tax treatment and mid-plan refinancing require separate modeling.</p><Button onClick={()=>save(c)}>Save Refinance Scenario</Button></Stack>
    </Stack>:<p role="status">{blockedStatement?'Reconcile the enabled mortgage statement to identify the P&I payment.':missing.length?`Still needed: ${missing.join(', ')}.`:'Use a positive term in whole months, a 1–600 whole-month holding period, and a positive balance with a payment that covers interest.'}</p>}
    {status&&<div className="budget-card @container" role="status">{status.messages.map(m=><p key={m}>{m}</p>)}{status.savedId&&<Button variant="outline" onClick={()=>onOpenScenario(status.savedId!)}>View Saved Refinance Scenario</Button>}</div>}
    {d.kind==='mortgage'&&!plan.realEstate?.properties.some(p=>p.debtId===d.id)&&<details><summary>Optional Public Rate Reference</summary><p className="field-help">{fresh?`Reference dated ${snapshot!.observed}.`:'Reference missing or stale; badges are paused.'} Freddie Mac PMMS covers conventional conforming owner-occupied purchase loans. It is not a refinance offer; credit-score pricing and fees are not inferred.</p><label className="budget-check"><input type="checkbox" checked={c.benchmarkEligible} onChange={e=>write({benchmarkEligible:e.target.checked})}/> Compare to the public purchase-loan reference: conventional conforming, owner-occupied, good/excellent credit, about 80% loan-to-value; not a personalized quote</label>{fresh&&c.benchmarkEligible&&snapshot!.rates.filter(r=>r.years===c.years).map(r=><Button key={r.years} variant="outline" onClick={()=>write({rate:r.rate})}>Try {r.rate}% Public Reference</Button>)}<Button variant="ghost" onClick={()=>write({snoozeUntil:new Date(Date.now()+7*86400000).toISOString().slice(0,10)})}>Snooze Indicator for 7 Days</Button></details>}
   </details>;
  })}
  <p className="field-help">Use the note interest rate, not APR. Estimates exclude tax deductions and investment opportunity cost. <a href="https://www.consumerfinance.gov/owning-a-home/loan-estimate/" target="_blank" rel="noreferrer">How to Read a Loan Estimate</a></p>
 </PlannerCard>;
}
