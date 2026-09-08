import type { PlannerData } from './planner.ts';
export interface RateSnapshot { observed:string; source:string; rates:{years:number;rate:number}[] }
export interface RefinanceCase { debtId:string; years:number|null; rate:number|null; fees:number|null; financed:boolean; horizon:number|null; benchmarkEligible:boolean; snoozeUntil:string }
export const emptyRefinance=(debtId:string):RefinanceCase=>({debtId,years:null,rate:null,fees:null,financed:false,horizon:null,benchmarkEligible:false,snoozeUntil:''});
export function normalizeRefinancing(input:unknown):RefinanceCase[]|undefined {
 if(input===undefined)return undefined;if(!Array.isArray(input)||input.length>100)throw Error('Invalid refinance cases.');const ids=new Set();
 for(const c of input){if(!c||typeof c.debtId!=='string'||ids.has(c.debtId)||typeof c.financed!=='boolean'||typeof c.benchmarkEligible!=='boolean'||typeof c.snoozeUntil!=='string'||(c.snoozeUntil!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(c.snoozeUntil)))throw Error('Invalid refinance case.');ids.add(c.debtId);for(const k of ['years','rate','fees','horizon'])if(c[k]!==null&&(!Number.isFinite(c[k])||c[k]<0))throw Error('Invalid refinance amount.');if((c.years??0)>50||(c.horizon??0)>600||(c.rate??0)>100)throw Error('Refinance assumption out of range.');}return structuredClone(input);
}
export function payment(balance:number,rate:number,months:number){if(months<=0)return 0;const r=rate/1200;return r===0?balance/months:balance*r/(1-Math.pow(1+r,-months));}
export function amortize(balance:number,rate:number,monthly:number,horizon:number){const rows=[];let paid=0,interest=0;for(let month=1;month<=horizon;month++){const charge=balance*rate/1200,pay=Math.min(balance+charge,monthly);balance+=charge-pay;paid+=pay;interest+=charge;rows.push({month,balance,paid,interest,payment:pay});}return rows;}
export function compareRefinance(balance:number,rate:number,monthly:number,c:RefinanceCase){
 if([balance,rate,monthly,c.years,c.rate,c.fees,c.horizon].some(v=>v===null||!Number.isFinite(v)||v!<0)||(c.horizon??0)>600||(c.years??0)>50||(c.rate??0)>100)return null;
 if([c.years,c.rate,c.fees,c.horizon].some(v=>v===null)||!Number.isInteger(c.horizon)||c.horizon!<1||!Number.isInteger(c.years! *12)||c.years!<=0||balance<=0||monthly<=balance*rate/1200)return null;
 const amount=balance+(c.financed?c.fees!:0),newPayment=payment(amount,c.rate!,c.years!*12),upfront=c.financed?0:c.fees!;
 const old=amortize(balance,rate,monthly,c.horizon!),replacement=amortize(amount,c.rate!,newPayment,c.horizon!);
 const rows=old.map((o,i)=>({month:o.month,oldBalance:o.balance,newBalance:replacement[i].balance,saving:o.paid+o.balance-(upfront+replacement[i].paid+replacement[i].balance)}));
 const remaining=amortize(balance,rate,monthly,600).find(r=>r.balance<.005)?.month??null;
 return {rows,newPayment,monthlyDifference:monthly-newPayment,breakEven:rows.find(r=>r.saving>=0)?.month??null,saving:rows.at(-1)!.saving,oldInterest:old.at(-1)!.interest,newInterest:replacement.at(-1)!.interest,remaining,extends:remaining!==null&&c.years!*12>remaining};
}
export function validSnapshot(v:unknown,now=new Date()):v is RateSnapshot{const s=v as RateSnapshot;if(!s||s.source!=='https://www.freddiemac.com/pmms'||!/^\d{4}-\d{2}-\d{2}$/.test(s.observed)||!Array.isArray(s.rates)||s.rates.length!==2)return false;const age=(now.getTime()-Date.parse(s.observed+'T00:00:00Z'))/86400000;return age>=0&&age<=21&&s.rates.every(r=>r&&[15,30].includes(r.years)&&Number.isFinite(r.rate)&&r.rate>0&&r.rate<25)&&new Set(s.rates.map(r=>r.years)).size===2;}
export function refinanceOpportunities(plan:PlannerData,snapshot:unknown,now=new Date()){
 if(!validSnapshot(snapshot,now))return [];
 return (plan.refinancing??[]).filter(c=>{const d=plan.debts.find(d=>d.id===c.debtId),rate=snapshot.rates.find(r=>r.years===c.years);return d?.kind==='mortgage'&&d.balance>0&&c.benchmarkEligible&&rate&&d.interestRate>rate.rate&&(!c.snoozeUntil||c.snoozeUntil<now.toISOString().slice(0,10));}).map(c=>c.debtId);
}
