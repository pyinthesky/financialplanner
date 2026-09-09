import type { PlannerData } from './planner.ts';
export interface Dependent {id:string;birthYear:number|null;collegeStartYear:number|null;collegeYears:number|null;annualCost:number|null;costGrowth:number|null}
export interface EducationAccount {id:string;beneficiaryId:string;balance:number|null;monthlyContribution:number|null;returnRate:number|null}
export interface Education {accounts:EducationAccount[]}
export const newDependent=(id:string):Dependent=>({id,birthYear:null,collegeStartYear:null,collegeYears:null,annualCost:null,costGrowth:null});
export const newEducationAccount=(id:string):EducationAccount=>({id,beneficiaryId:'',balance:null,monthlyContribution:null,returnRate:null});
const object=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
const number=(x:unknown,min:number,max:number,integer=false)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max&&(!integer||Number.isInteger(x))?x:null;
function uniqueId(raw:unknown,fallback:string,ids:Set<string>){let id=typeof raw==='string'&&raw.length<=100&&raw&&!['__proto__','prototype','constructor'].includes(raw)?raw:fallback;while(ids.has(id))id+='-';ids.add(id);return id;}
export function normalizeDependents(x:unknown):Dependent[]{const ids=new Set<string>();return (Array.isArray(x)?x.slice(0,12):[]).map((raw,i)=>{const d=object(raw);return {id:uniqueId(d.id,`dependent-${i}`,ids),birthYear:number(d.birthYear,1900,2100,true),collegeStartYear:number(d.collegeStartYear,2026,2100,true),collegeYears:number(d.collegeYears,1,10,true),annualCost:number(d.annualCost,0,1e7),costGrowth:number(d.costGrowth,-20,30)};});}
export function normalizeEducation(x:unknown):Education|undefined{if(!x||typeof x!=='object'||Array.isArray(x))return undefined;const v=object(x),ids=new Set<string>();return {accounts:(Array.isArray(v.accounts)?v.accounts.slice(0,24):[]).map((raw,i)=>{const a=object(raw);return {id:uniqueId(a.id,`education-${i}`,ids),beneficiaryId:typeof a.beneficiaryId==='string'?a.beneficiaryId.slice(0,100):'',balance:number(a.balance,0,1e9),monthlyContribution:number(a.monthlyContribution,0,1e7),returnRate:number(a.returnRate,-99,50)};})};}
export function projectEducation(plan:PlannerData){
 const start=plan.budget.timeline?.startYear,dependents=normalizeDependents(plan.household.dependents),accounts=normalizeEducation(plan.education)?.accounts??[];
 const issues:string[]=[];
 if(!start)issues.push('Set the opening-balance year in Household.');
 for(const [i,a] of accounts.entries())if(!dependents.some(d=>d.id===a.beneficiaryId))issues.push(`Assign 529 ${i+1} to a household dependent.`);
 const goals=dependents.filter(d=>accounts.some(a=>a.beneficiaryId===d.id)).map(d=>{
  const label=`Dependent ${dependents.indexOf(d)+1}`,linked=accounts.filter(a=>a.beneficiaryId===d.id),problems:string[]=[];
  if(d.collegeStartYear===null||d.collegeYears===null||d.annualCost===null||d.costGrowth===null)problems.push('Complete the college start, duration, annual qualified-cost goal and cost growth.');
  if(start&&d.collegeStartYear!==null&&d.collegeStartYear<start)problems.push('College start must be at or after opening balances; enter remaining years for a student already enrolled.');
  if(linked.some(a=>a.balance===null||a.monthlyContribution===null||a.returnRate===null))problems.push('Complete each linked 529 balance, monthly contribution and return assumption.');
  const rows:{year:number;opening:number;contributions:number;growth:number;cost:number;withdrawal:number;gap:number;ending:number}[]=[];
  if(!problems.length&&start){const balances=linked.map(a=>a.balance!),end=d.collegeStartYear!+d.collegeYears!;
   for(let year=start;year<end;year++){
    const opening=balances.reduce((s,b)=>s+b,0),cost=year>=d.collegeStartYear!?d.annualCost!*(1+d.costGrowth!/100)**(year-start):0,withdrawal=Math.min(opening,cost);
    if(opening)for(let i=0;i<balances.length;i++)balances[i]-=withdrawal*balances[i]/opening;
    let contributions=0,growth=0;
    for(let month=0;month<12;month++)for(let i=0;i<balances.length;i++){
      const add=year<d.collegeStartYear! ? linked[i].monthlyContribution! : 0;
      balances[i]+=add;contributions+=add;const change=balances[i]*((1+linked[i].returnRate!/100)**(1/12)-1);balances[i]+=change;growth+=change;
    }
    rows.push({year,opening,contributions,growth,cost,withdrawal,gap:cost-withdrawal,ending:balances.reduce((s,b)=>s+b,0)});
   }
  }
  return {id:d.id,label,issues:problems,rows,totalCost:rows.reduce((s,r)=>s+r.cost,0),totalGap:rows.reduce((s,r)=>s+r.gap,0),collegeOpening:rows.find(r=>r.year===d.collegeStartYear)?.opening??0};
 });return {issues,goals};
}
/** Explicit canonical budget provision for external education saving; never create retirement assets. */
export function linkEducationBudget(plan:PlannerData,accountId:string):PlannerData{
 const a=plan.education?.accounts.find(a=>a.id===accountId),d=plan.household.dependents?.find(d=>d.id===a?.beneficiaryId),start=plan.budget.timeline?.startYear;
 if(!a||a.monthlyContribution===null||!d?.collegeStartYear||!start||d.collegeStartYear<=start)throw Error('Complete a future college start, opening year and monthly saving before linking.');
 const id=`education-saving:${a.id}`,name=`529 — Dependent ${(plan.household.dependents??[]).indexOf(d)+1}`;
 return {...plan,budget:{...plan.budget,lines:[...plan.budget.lines.filter(l=>l.id!==id),{id,name,category:'Dependents',amount:a.monthlyContribution,frequency:'monthly',essential:false,flexibility:'fixed',owner:'household',nextDueDate:`${start}-01-01`,endDate:`${d.collegeStartYear-1}-12-31`,retirement:{rule:'continue',amount:null,reason:'Education saving stops before the college start year.'}}]}};
}
