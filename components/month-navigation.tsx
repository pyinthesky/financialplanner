"use client";
import { ActionRow, FormGrid } from '@/components/ui/planner-layout';
import { CalendarDays,ChevronLeft,ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
export function MonthNavigation({months,value,onChange,milestones=[]}:{months:string[];value:string;onChange:(v:string)=>void;milestones?:{label:string;month:string}[]}){
 const [open,setOpen]=useState(false),index=months.indexOf(value);
 return <div className="month-navigation"><ActionRow as="div" className="budget-actions"><Button variant="outline" size="icon" aria-label="Previous Cash-Flow Month" disabled={index<=0} onClick={()=>onChange(months[index-1])}><ChevronLeft/></Button><Button variant="outline" aria-label="Choose Cash-Flow Month" aria-expanded={open} onClick={()=>setOpen(!open)}><CalendarDays/>{value?new Date(value+'-02T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long'}):'Choose Month'}</Button><Button variant="outline" size="icon" aria-label="Next Cash-Flow Month" disabled={index<0||index>=months.length-1} onClick={()=>onChange(months[index+1])}><ChevronRight/></Button></ActionRow>{open&&<FormGrid as="div" className="budget-fields"><label className="budget-field"><span>Cash-Flow Month</span><input aria-label="Sankey Month" type="month" min={months[0]} max={months.at(-1)} value={value} onChange={e=>{if(months.includes(e.target.value))onChange(e.target.value);}}/></label>{milestones.filter(m=>months.includes(m.month)).map(m=><Button key={m.label} variant="outline" onClick={()=>{onChange(m.month);setOpen(false);}}>{m.label}</Button>)}</FormGrid>}</div>;
}
