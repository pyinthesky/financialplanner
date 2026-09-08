"use client";
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DebtCascade } from '@/components/debt-cascade';
import { debtPayoffSchedule, type PlannerData } from '@/lib/planner';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export function DebtPayoffView({plan,title='Debt Payoff Path'}:{plan:PlannerData;title?:string}) {
  const months=useMemo(()=>debtPayoffSchedule(plan),[plan]);
  const last=months.at(-1)!;
  return <section className="budget-flow" aria-label={title}><div className="planner-panel budget-flow"><h2>{title}</h2><p>Scheduled payments under your {plan.debtStrategy.method} strategy. This path assumes every payment is funded; review the monthly cash-flow results for any shortfalls.</p><div className="budget-metrics"><div><span>Opening Debt</span><strong>{money(months[0].totalBalance)}</strong></div><div><span>Scheduled Payoff</span><strong>{months.length===1?'No Outstanding Debt':last.totalBalance>.005?'Beyond 50-Year Horizon':`${Math.floor(last.month/12)}y ${last.month%12}m`}</strong></div><div><span>Modeled Interest</span><strong>{money(months.reduce((n,m)=>n+m.interestPaid,0))}</strong></div></div>{months.length>1&&<ChartContainer config={{totalBalance:{label:'Debt Balance',color:'#2f7df4'}}} className="h-[240px] w-full aspect-auto"><LineChart data={months.filter((_,i)=>i%3===0||i===months.length-1)}><CartesianGrid vertical={false}/><XAxis dataKey="month" tickFormatter={v=>`${v}m`}/><YAxis tickFormatter={v=>new Intl.NumberFormat('en-US',{notation:'compact'}).format(v)} width={55}/><ChartTooltip content={<ChartTooltipContent formatter={v=>money(Number(v))}/>}/><Line name="Debt Balance" dataKey="totalBalance" stroke="#2f7df4" dot={false}/></LineChart></ChartContainer>}</div><DebtCascade months={months} method={plan.debtStrategy.method} debts={plan.debts}/></section>;
}
