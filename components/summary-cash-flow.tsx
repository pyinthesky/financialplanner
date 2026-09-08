"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { MonthNavigation } from '@/components/month-navigation';
import { debtPayoffSchedule } from '@/lib/planner';
import { Button } from '@/components/ui/button';
import { budgetViewMonth } from '@/lib/budget-view';
import { projectMonthly } from '@/lib/monthly-projection';
import { summaryFlow } from '@/lib/summary-flow';
import type { PlannerData } from '@/lib/planner';
import type { FundingPart } from '@/lib/monthly-funding';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const colors=['#168d82','#437aca','#9c6bce','#cf8351','#ad6284','#4c929d'];
export function SummaryCashFlow({plan}:{plan:PlannerData}){
  const [retired,setRetired]=useState(false),[selected,setSelected]=useState('');
  const result=useMemo(()=>projectMonthly(plan),[plan]);
  const month=selected||budgetViewMonth(plan,retired),row=result.months.find(r=>r.month===month);
  const container=useRef<HTMLElement>(null),[width,setWidth]=useState(300);
  useEffect(()=>{const el=container.current;if(!el)return;const observer=new ResizeObserver(()=>{const style=getComputedStyle(el);setWidth(Math.max(240,el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)));});observer.observe(el);return()=>observer.disconnect();},[]);
  const mobile=width<700;
  const flow=row?summaryFlow(plan,row):null;
  const height=Math.max(440,Math.max(flow?.sources.length??0,flow?.uses.length??0)*64),top=45,gap=mobile?36:26,available=height-top-30-gap*Math.max(flow?.sources.length??0,flow?.uses.length??0);
  const scale=flow?.total?available/flow.total:0,center=width/2;
  const left=mobile?5:Math.min(205,width*.23),right=mobile?width-11:width-left;
  const labelWidth=mobile?width/2-24:left-20,limit=Math.floor(labelWidth/7);
  const side=(parts:FundingPart[],incoming:boolean)=>{let outer=top,inner=top;return parts.map((p,i)=>{const h=p.amount*scale,y=outer,cy=inner;outer+=h+gap;inner+=h;const x=incoming?left+6:center+4,end=incoming?center-4:right;const sy=incoming?y:cy,ey=incoming?cy:y;const tx=incoming?(mobile?14:10):(mobile?width-14:right+14);const name=p.name.length>limit?p.name.slice(0,limit-1)+'…':p.name;return <g key={p.name}><path d={`M ${x} ${sy} C ${center} ${sy},${center} ${ey},${end} ${ey} L ${end} ${ey+h} C ${center} ${ey+h},${center} ${sy+h},${x} ${sy+h} Z`} fill={colors[i%colors.length]} opacity="0.3"><title>{p.name}: {money(p.amount)}</title></path><rect x={incoming?left:right} y={y} width="6" height={h} fill={colors[i%colors.length]}/>{mobile&&<rect x={incoming?12:width/2+10} y={y-3} width={labelWidth} height="34" fill="white" opacity="0.92" rx="3"/>}<text x={tx} y={y+9} fontSize={12} textAnchor={!incoming&&mobile?'end':'start'} fill="#334155">{name}<title>{p.name}</title></text><text x={tx} y={y+23} fontSize={13} fontWeight="600" textAnchor={!incoming&&mobile?'end':'start'} fill="#152237">{money(p.amount)}</text></g>;});};
  return <section ref={container} className="panel budget-flow summary-sankey"><div className="budget-toolbar"><h2>Cash Flow at a Glance</h2><div className="budget-actions" role="group" aria-label="Cash Flow Stage"><Button variant={retired?'outline':'default'} aria-pressed={!retired} onClick={()=>{setRetired(false);setSelected('');}}>Current</Button><Button variant={retired?'default':'outline'} aria-pressed={retired} onClick={()=>{setRetired(true);setSelected('');}}>In Retirement</Button></div></div>
    <p className="field-help">{retired?'Starts at full household retirement.':'Starts at the opening-balance month.'} Net pay and benefits, funded expenses, savings transfers and cash reserves. Withdrawals fund the gap; they are not earnings.</p>
    {!result.supported?<div role="status"><p>Complete the monthly plan to see its cash-flow diagram.</p><ul>{result.issues.map(s=><li key={s}>{s}</li>)}</ul></div>:!row?<p role="status">This retirement date is outside the planning horizon. Adjust it in Household.</p>:flow&&<><MonthNavigation months={result.months.map(r=>r.month)} value={month} onChange={setSelected} milestones={[{label:'Full Retirement',month:budgetViewMonth(plan,true)},...((debtPayoffSchedule(plan).at(-1)?.totalBalance??1)<.005?[{label:'Final Scheduled Debt Payment',month:result.months[Math.max(0,(debtPayoffSchedule(plan).at(-1)?.month??1)-1)]?.month??''}]:[])]}/>
      {flow.unfunded>0&&<p role="status">Unfunded obligations: {money(flow.unfunded)}. Only paid amounts appear in the flow.</p>}
      {Math.abs(flow.residual)>.01?<p role="alert">The cash flow does not reconcile; review the monthly ledger.</p>:flow.total===0?<p>No funded flows in this month.</p>:<svg className="summary-sankey-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${retired?'Retirement':'Current'} Cash Flow Sankey for ${month}; funding and uses each ${money(flow.total)}`}><text x={mobile?10:left} y="20" fontSize="14">Funding</text><text x={mobile?width-10:right} y="20" textAnchor={mobile?'end':'start'} fontSize="14">Uses</text>{side(flow.sources,true)}<rect x={center-4} y={top} width="8" height={flow.total*scale} fill="#334155"/>{side(flow.uses,false)}</svg>}
      <details><summary>Cash Flow Details</summary><div className="funding-columns">{[{name:'Funding',parts:flow.sources},{name:'Uses',parts:flow.uses}].map(g=><div key={g.name}><h3>{g.name} · {money(flow.total)}</h3>{g.parts.map(p=><div className="compact-linked" key={p.name}><span>{p.name}</span><strong>{money(p.amount)}</strong></div>)}</div>)}</div><p className="field-help">Reconciliation difference: {flow.residual.toFixed(6)}. December includes annual income-tax settlement. Direct payroll investments, Roth conversions and qualified charitable IRA transfers bypass this spendable-cash view.</p></details>
    </>}
  </section>;
}
