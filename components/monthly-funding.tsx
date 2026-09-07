"use client";
import { useState } from 'react';
import { monthlyFunding } from '@/lib/monthly-funding';
import type { MonthlyRow } from '@/lib/monthly-projection';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export function MonthlyFunding({rows}:{rows:MonthlyRow[]}){
 const [selected,setSelected]=useState('');
 const row=rows.find(r=>r.month===selected)??rows[0];
 if(!row)return null;
 const flow=monthlyFunding(row),colors=['#158b77','#317be5','#8964c8','#c97c35','#4d8495'];
 const ribbons=(parts:typeof flow.sources,left:boolean)=>{let y=20;return parts.map((p,i)=>{const h=flow.total?p.amount/flow.total*310:0,top=y;y+=h;const x=left?190:410,end=left?390:610;return <path key={p.name} d={`M${x},${top} C${x+90},${top} ${end-90},${top} ${end},${top} L${end},${top+h} C${end-90},${top+h} ${x+90},${top+h} ${x},${top+h} Z`} fill={colors[i%colors.length]} opacity="0.65"><title>{p.name}: {money(p.amount)}</title></path>})};
 return <section className="panel budget-flow"><div className="budget-toolbar"><h3>Where the Money Goes</h3><label className="budget-field"><span>Funding Month</span><select aria-label="Funding Month" value={row.month} onChange={e=>setSelected(e.target.value)}>{rows.map(r=><option key={r.month}>{r.month}</option>)}</select></label></div><p className="field-help">Funded cash flows for this month. Asset draws and existing cash are funding, not earnings. Payroll contributions made directly to investments and Roth conversions bypass this cash view. Reserve targets are not expenses.</p>{flow.unfunded>0&&<p role="status">Unfunded obligations: {money(flow.unfunded)}. They are not shown as paid.</p>}
 {flow.total>0&&<svg className="funding-ribbons" viewBox="0 0 800 350" role="img" aria-label={`Cash funding and uses for ${row.month}; each side totals ${money(flow.total)}`}><text x="190" y="14">Funding</text><text x="520" y="14">Uses</text>{ribbons(flow.sources,true)}<rect x="390" y="20" width="20" height="310" fill="#334155"/>{ribbons(flow.uses,false)}</svg>}
 <div className="funding-columns">{[{title:'Funding',parts:flow.sources},{title:'Uses',parts:flow.uses}].map(group=><div key={group.title}><h4>{group.title} · {money(flow.total)}</h4>{group.parts.map((p,i)=><div className="funding-part" key={p.name}><div><span>{p.name}</span><strong>{money(p.amount)}</strong></div><div className="funding-track"><span style={{width:`${flow.total?p.amount/flow.total*100:0}%`,background:colors[i%colors.length]}}/></div></div>)}</div>)}</div><p className="field-help">Cash at start {money(row.openingCash)} → cash at end {money(row.cash)}. Reconciliation difference: {flow.residual.toFixed(6)}.</p></section>;
}
