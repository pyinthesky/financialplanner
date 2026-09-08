import { monthlyFunding, type FundingPart } from './monthly-funding.ts';
import { buildBudgetYear } from './budget-calendar.ts';
import type { PlannerData } from './planner.ts';
import type { MonthlyRow } from './monthly-projection.ts';
export function summaryFlow(plan:PlannerData,row:MonthlyRow){
  const base=monthlyFunding(row);
  const sources=base.sources.flatMap(p=>p.name==='Take-Home Pay'?(['you','partner'] as const).map(owner=>({name:owner==='you'?'Your Pay':'Partner Pay',amount:row.incomeByOwner[owner].pay})).filter(v=>v.amount>0):[p]);
  let spending:FundingPart[]=[{name:'Funded Spending & Debt',amount:row.spendingPaid}];
  if(row.unfundedSpending<0.005){
    const year=Number(row.month.slice(0,4)),m=Number(row.month.slice(5))-1,start=plan.budget.timeline!.startYear!;
    const b=buildBudgetYear(plan.budget,plan.household,year,start)[m];
    const groups:Record<string,number>={};
    for(const l of b.lines){const category=plan.budget.lines.find(v=>v.id===l.id)?.category??'Other';const scale=l.essential?(b.essential?row.essential/b.essential:0):(b.discretionary?row.discretionary/b.discretionary:0);groups[category]=(groups[category]??0)+(l.amount??0)*scale;}
    spending=[...Object.entries(groups).map(([name,amount])=>({name,amount})),{name:'Home Tax & Insurance',amount:row.housing},{name:'Healthcare & Care',amount:row.healthcare},{name:'Timed Expenses',amount:row.timedCosts},{name:'Life Events',amount:row.eventExpense},{name:'Debt Payments',amount:row.debtPrincipal+row.debtInterest}];
  }
  const uses=base.uses.flatMap(p=>p.name==='Funded Spending & Debt Payments'?spending:[p]).filter(p=>p.amount>0);
  return {...base,sources,uses,residual:sources.reduce((n,p)=>n+p.amount,0)-uses.reduce((n,p)=>n+p.amount,0)};
}
