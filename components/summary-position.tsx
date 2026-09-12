import { PlannerCard } from '@/components/ui/planner-layout';
import type { PlannerData } from '@/lib/planner';
import { totalPortfolio } from '@/lib/planner';

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const labels:Record<string,string>={cash:'Cash',taxable:'Taxable',traditional:'Tax-Deferred',roth:'Roth',hsa:'HSA'};

export function SummaryPosition({plan}:{plan:PlannerData}){
  const total=totalPortfolio(plan);
  const groups=['cash','taxable','traditional','roth','hsa'].map(kind=>({kind,label:labels[kind],amount:plan.accounts.filter(a=>a.kind===kind).reduce((sum,a)=>sum+a.balance,0)})).filter(g=>g.amount>0);
  const primaryDebt=plan.debts.find(d=>d.id===plan.housing.statement?.debtId)?.balance??0;
  const homes=[...(plan.housing.homeValue>0?[{id:'primary-home',name:'Primary Home',value:plan.housing.homeValue,debt:primaryDebt}]:[]),...(plan.realEstate?.properties??[]).map(p=>({id:p.id,name:p.name||'Rental Property',value:p.value??0,debt:plan.debts.find(d=>d.id===p.debtId)?.balance??0}))];
  return <div className="summary-position-grid">
    <PlannerCard as="section" stack className="panel budget-flow"><div className="budget-toolbar"><div><p className="eyebrow">STARTING POSITION</p><h2>Cash & Investments</h2></div><strong>{money(total)}</strong></div>{groups.length?<div className="summary-position-list">{groups.map(g=><div key={g.kind}><div><span>{g.label}</span><strong>{money(g.amount)}</strong></div><div className="summary-position-track" aria-label={`${g.label}: ${money(g.amount)}`}><span style={{width:`${total?100*g.amount/total:0}%`}}/></div></div>)}</div>:<p>Add accounts to see the starting investment mix.</p>}</PlannerCard>
    <PlannerCard as="section" stack className="panel budget-flow"><div className="budget-toolbar"><div><p className="eyebrow">PROPERTY EQUITY</p><h2>Real Estate</h2></div><strong>{money(homes.reduce((sum,h)=>sum+Math.max(0,h.value-h.debt),0))}</strong></div>{homes.length?<div className="summary-position-list">{homes.map(h=><div className="summary-property-row" key={h.id}><div><span>{h.name}</span><strong>{money(h.value-h.debt)} equity</strong></div><small>{money(h.value)} value · {money(h.debt)} linked debt</small></div>)}</div>:<p>Add a primary home or rental property to see property equity.</p>}<p className="field-help">Entered property value less its linked loan balance. Selling costs and taxes are not deducted here.</p></PlannerCard>
  </div>;
}
