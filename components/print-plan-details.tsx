import type { ReactNode } from 'react';
import { debtPayoffSchedule, homeInsuranceAnnual, propertyTaxAnnual, type PlannerData } from '@/lib/planner';
import { budgetView, budgetViewMonth } from '@/lib/budget-view';
import { projectMonthly } from '@/lib/monthly-projection';
import { summaryFlow } from '@/lib/summary-flow';
import type { FundingPart } from '@/lib/monthly-funding';
const money=(n:number|null|undefined)=>n==null?'Not Entered':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const names:Record<string,string>={you:'You',partner:'Partner',joint:'Joint',household:'Household',traditional:'Tax-Deferred',roth:'Roth',taxable:'Taxable',cash:'Cash',hsa:'HSA',pension:'Pension',socialSecurity:'Social Security',single:'Single',married:'Married',marriedJoint:'Married Filing Jointly',marriedSeparate:'Married Filing Separately',headOfHousehold:'Head of Household',snowball:'Snowball',avalanche:'Avalanche',custom:'Custom'};
const name=(s:string)=>names[s]??s;
function ReportTable({headers,rows}:{headers:string[];rows:ReactNode[][]}){
  return rows.length?<table className="report-detail-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>:<p>No entries.</p>;
}
/** Fixed SVG coordinates: printing never relies on measuring a hidden screen chart. */
function PrintCashFlow({flow,title}:{flow:ReturnType<typeof summaryFlow>;title:string}){
  const count=Math.max(flow.sources.length,flow.uses.length),height=Math.max(270,count*42+55),scale=(height-60-count*26)/Math.max(1,flow.total);
  const side=(parts:FundingPart[],incoming:boolean)=>{let outer=35,inner=35;return parts.map((p,i)=>{
    const h=p.amount*scale,y=outer,c=inner;outer+=h+26;inner+=h;
    const x=incoming?160:353,x2=incoming?347:540,y1=incoming?y:c,y2=incoming?c:y;
    const color=['#148d82','#3979cb','#9671ba','#b47b47'][i%4];
    return <g key={p.name}><path d={`M${x},${y1} C350,${y1} 350,${y2} ${x2},${y2} L${x2},${y2+h} C350,${y2+h} 350,${y1+h} ${x},${y1+h}Z`} fill={color} opacity=".32"/><rect x={incoming?154:540} y={y} width="6" height={h} fill={color}/><text x={incoming?8:552} y={y+9} fontSize="10">{p.name.length>25?p.name.slice(0,24)+'…':p.name}</text><text x={incoming?8:552} y={y+21} fontSize="11" fontWeight="600">{money(p.amount)}</text></g>;
  });};
  return <><p>Funding and paid uses each total {money(flow.total)}. Unfunded obligations: {money(flow.unfunded)}.</p>{flow.total>0&&Math.abs(flow.residual)<.01?<svg className="report-flow-svg" viewBox={`0 0 700 ${height}`} role="img" aria-label={`${title} Cash Flow Sankey`}><text x="154" y="16" fontSize="12">Funding</text><text x="540" y="16" fontSize="12">Uses</text>{side(flow.sources,true)}<rect x="347" y="35" width="6" height={flow.total*scale} fill="#334155"/>{side(flow.uses,false)}</svg>:<p>{flow.total===0?'No funded flows in this month.':'Cash flow requires reconciliation.'}</p>}<p className="report-caption">Net cash flows. Portfolio draws, RMDs and opening cash are funding sources. Direct payroll investments, conversions and QCD transfers bypass this cash-flow view. December includes income-tax settlement.</p></>;
}
export function PrintPlanDetails({plan}:{plan:PlannerData}){
  const monthly=projectMonthly(plan),debt=debtPayoffSchedule(plan),last=debt.at(-1),h=plan.household,a=plan.assumptions;
  return <div className="report-plan-details">
    <section className="report-detail-section"><h2>Household & Economic Assumptions</h2><ReportTable headers={['Assumption','Entered Value']} rows={[
      ['Household / Filing',`${name(h.maritalStatus)} / ${name(h.filingStatus)}`],['Current Age / Retirement Age',`${h.currentAge} / ${h.retirementAge}`],...(h.maritalStatus==='married'?[['Partner Age / Retirement Age',`${h.partnerAge} / ${h.partnerRetirementAge}`]]:[]),['Plan through Age',h.planToAge],['Opening-Balance Year',plan.budget.timeline?.startYear??'Not Entered'],['Inflation',`${a.inflation}%`],['Return before / in Retirement',`${a.preRetirementReturn}% / ${a.retirementReturn}%`],['Cash Interest Rate',`${a.cashReturn??0}%`],['State Income-Tax Estimate',`${a.stateEffectiveTaxRate}% - entered estimate; not a state-law calculation`],['Retirement Spending Source',plan.budget.retirementSpendingSource==='worksheet'?'Linked Budget Worksheet':`Legacy Aggregate: ${money(a.annualSpending)} / year`],
    ]}/></section>
    {[false,true].map(retired=>{
      const title=retired?'Retirement':'Current',month=budgetViewMonth(plan,retired),view=budgetView(plan,month),row=monthly.months.find(r=>r.month===month);
      return <section className="report-detail-section report-budget-stage" key={title}><h2>{title} Budget & Cash Flow</h2><p>Planned month: {month}. Bill totals include their timing and modeled inflation; these are not observed transactions.</p>
        <div className="report-metrics"><div><span>Income Deposits</span><strong>{money(view.totalIncome)}</strong></div><div><span>Planned Spending</span><strong>{money(view.totalSpending)}</strong></div><div><span>Savings Transfers</span><strong>{money(view.savings)}</strong></div><div><span>Margin before Portfolio Funding</span><strong>{money(view.margin)}</strong></div></div>
        {view.issues.map(i=><p key={i}>{i}</p>)}<h3>Income Deposits</h3><ReportTable headers={['Source','Net Deposits']} rows={view.income.map(r=>[r.name,r.amount===null?'Withholding Needed':money(r.amount)])}/>
        <h3>Everyday Bills</h3><ReportTable headers={['Category / Bill','Planned Amount','Timing']} rows={view.calendar.lines.map(l=>[`${plan.budget.lines.find(b=>b.id===l.id)?.category??'Other'} / ${l.name}`,money(l.amount===null?null:l.amount*view.inflation),l.timing==='scheduled'?'Scheduled':'Monthly Average'])}/>
        <h3>Linked Costs</h3><ReportTable headers={['Cost','Planned Amount','Managed In']} rows={view.linked.map(r=>[r.name,money(r.amount),r.source])}/><p className="report-caption">Linked debts include extra and cascaded payments. Paid-off loans disappear; property tax and insurance continue. These costs are counted once.</p>
        <div className="report-flow-block"><h3>{title} Cash Flow</h3>{monthly.supported&&row?<PrintCashFlow flow={summaryFlow(plan,row)} title={title}/>:<><p>Cash-flow projection unavailable for this month.</p>{monthly.issues.map(i=><p key={i}>{i}</p>)}</>}</div>
      </section>;
    })}
    <section className="report-detail-section"><h2>Investment Accounts</h2><ReportTable headers={['Account','Owner','Tax Treatment','Opening Balance','Annual Contribution']} rows={plan.accounts.map(v=>[v.name,name(v.owner),name(v.kind),money(v.balance),money(v.annualContribution)])}/><p className="report-caption">Monthly planning uses linked payroll and budget transfers for new contributions. Account annual-contribution inputs belong to the annual engine.</p>
      <h3>Pensions & Social Security</h3><ReportTable headers={['Income','Owner','Start Age','Annual Amount','COLA / Withholding']} rows={plan.income.map(v=>[v.name||name(v.kind),name(v.owner),v.startAge,money(v.annualAmount),`${v.cola}% / ${v.withholdingPercent==null?'Not Entered':v.withholdingPercent+'%'}`])}/>
    </section>
    <section className="report-detail-section"><h2>Housing & Debt Payoff</h2><p>Home value: {money(plan.housing.homeValue)}. Annual property tax: {money(propertyTaxAnnual(plan))}. Annual home insurance: {money(homeInsuranceAnnual(plan))}. {plan.housing.statement?.enabled?'Mortgage statement reconciliation is enabled.':'Manual carrying-cost inputs are selected.'}</p><p>Payoff method: {name(plan.debtStrategy.method)}; extra payment: {money(plan.debtStrategy.extraMonthlyPayment)} / month. {last&&(last.totalBalance<=.005?`All modeled debts are paid after ${last.month} months.`:`Debt remaining at the ${last.month}-month horizon: ${money(last.totalBalance)}.`)}</p>
      <ReportTable headers={['Debt','Opening Balance','Interest Rate','Minimum / Month']} rows={plan.debts.map(v=>[v.name,money(v.balance),`${v.interestRate}%`,money(v.minimumPayment)])}/>
      <h3>Healthcare & Long-Term Care</h3><ReportTable headers={['Assumption','Amount']} rows={[
        ['Before Medicare / year',money(plan.healthcare.preMedicareAnnual)],['Medicare Years / year',money(plan.healthcare.medicareAnnual)],['Healthcare Inflation',`${plan.healthcare.healthInflation}%`],['Long-Term Care / year',money(plan.healthcare.longTermCareAnnual)],['Care Start Age / Duration',`${plan.healthcare.longTermCareStartAge} / ${plan.healthcare.longTermCareYears} years`],
      ]}/><h3>Timed Expenses</h3><ReportTable headers={['Expense','Annual Amount','Age Range','Inflation Linked']} rows={plan.recurringCosts.map(v=>[v.name,money(v.annualAmount),`${v.startAge}-${v.endAge}`,v.inflationLinked?'Yes':'No'])}/>
    </section>
    <section className="report-detail-section"><h2>Tax, Withdrawal & Reserve Policy</h2><ReportTable headers={['Policy','Entered Setting']} rows={[
      ['Ordinary-Income Withdrawal Target',money(a.targetOrdinaryIncome)],['Annual Roth Conversion - You / Partner',`${money(plan.rothConversionPlanning.annualConversionYou)} / ${money(plan.rothConversionPlanning.annualConversionPartner)}`],['Annual QCD Target - You / Partner',`${money(plan.qcdPlanning.annualGiftYou)} / ${money(plan.qcdPlanning.annualGiftPartner)}`],['Cash Coverage Target',plan.laboratory?.settings.cashCoverageMonths==null?'Not Entered':`${plan.laboratory.settings.cashCoverageMonths} months`],['Extra Cash Reserve',money(plan.laboratory?.settings.reserveExtra)],['Legacy Target',money(plan.laboratory?.settings.legacyTarget)],
    ]}/><p>Federal tax estimates use the app's 2026 rules and labeled planning assumptions. State tax is an entered effective estimate. Eligibility exceptions, future law, Social Security survivor changes and transaction-specific tax treatment require separate review. ACA and IRMAA worksheets are dated sensitivities, not premiums automatically charged to this cash-flow ledger.</p></section>
  </div>;
}
