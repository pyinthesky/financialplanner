import type { PlannerData } from './planner.ts';
import { amortize, payment } from './refinance.ts';
export interface RentalProperty {
 id:string; name:string; debtId:string; value:number|null; rent:number|null; vacancy:number|null; management:number|null;
 tax:number|null; insurance:number|null; maintenance:number|null; repairs:number|null; reserveTarget:number|null;
 taxableProfit:number|null; taxConfirmed:boolean;
}
export interface PropertyTrial { mode:'purchase'|'keep'; value:number|null; equity:number|null; buyingCosts:number|null; rate:number|null; years:number|null; holdingYears:number|null; rent:number|null; vacancy:number|null; costs:number|null; repairs:number|null; appreciation:number|null; investmentReturn:number|null; saleCostPercent:number|null }
export interface RealEstate { properties:RentalProperty[]; trial?:PropertyTrial }
export const emptyProperty=():RentalProperty=>({id:crypto.randomUUID(),name:'',debtId:'',value:null,rent:null,vacancy:null,management:null,tax:null,insurance:null,maintenance:null,repairs:null,reserveTarget:null,taxableProfit:null,taxConfirmed:false});
export const emptyPropertyTrial=():PropertyTrial=>({mode:'purchase',value:null,equity:null,buyingCosts:null,rate:null,years:null,holdingYears:null,rent:null,vacancy:null,costs:null,repairs:null,appreciation:null,investmentReturn:null,saleCostPercent:null});
export function normalizeRealEstate(input:unknown):RealEstate|undefined {
 if(input===undefined)return undefined;const r=input as RealEstate;if(!r||!Array.isArray(r.properties)||r.properties.length>30)throw Error('Invalid property records.');const ids=new Set();
 for(const p of r.properties){if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||typeof p.debtId!=='string'||typeof p.taxConfirmed!=='boolean')throw Error('Invalid property.');ids.add(p.id);for(const k of ['value','rent','vacancy','management','tax','insurance','maintenance','repairs','reserveTarget','taxableProfit'] as const)if(p[k]!==null&&(!Number.isFinite(p[k])||p[k]!<0))throw Error('Invalid property amount.');if((p.vacancy??0)>100||(p.management??0)>100)throw Error('Property percentage exceeds 100.');}
 if(r.trial){const t=r.trial;if(!['purchase','keep'].includes(t.mode))throw Error('Invalid property comparison.');for(const [k,v] of Object.entries(t))if(k!=='mode'&&v!==null&&(!Number.isFinite(v)||Number(v)<(['appreciation','investmentReturn'].includes(k)?-99:0)))throw Error('Invalid property comparison amount.');}
 return structuredClone(r);
}
export function rentalIssues(plan:PlannerData){const issues:string[]=[],loans=new Set<string>();try{normalizeRealEstate(plan.realEstate);}catch{ return ['Correct invalid rental-property values before projecting.']; }for(const p of plan.realEstate?.properties??[]){if(['value','rent','vacancy','management','tax','insurance','maintenance','repairs','reserveTarget','taxableProfit'].some(k=>p[k as keyof RentalProperty]===null))issues.push('Complete every rental-property amount, including explicit zeros.');if(!p.taxConfirmed)issues.push('Confirm nonnegative passive rental taxable profit separately from operating cash flow. Loss deductions and special tax treatments are unsupported.');if(p.debtId){if(loans.has(p.debtId)||p.debtId===plan.housing.statement?.debtId||!plan.debts.some(d=>d.id===p.debtId&&d.kind==='mortgage'))issues.push('Link each rental to one separate existing mortgage, distinct from the primary-home statement.');loans.add(p.debtId);}}return [...new Set(issues)];}
/** Operating amounts stay nominal; entered repair allowance is actual spending, reserve target is not. */
export function rentalTotals(plan:PlannerData){let rent=0,costs=0,value=0,taxable=0,reserveTarget=0;for(const p of plan.realEstate?.properties??[]){const collected=(p.rent??0)*(1-(p.vacancy??0)/100);rent+=collected;costs+=collected*(p.management??0)/100+((p.tax??0)+(p.insurance??0)+(p.maintenance??0)+(p.repairs??0))/12;value+=p.value??0;taxable+=(p.taxableProfit??0)/12;reserveTarget+=p.reserveTarget??0;}return {rent,costs,value,taxable,reserveTarget};}
/** Pre-tax same-cash comparison: matching outside contributions; positive rent reinvested. */
export function propertyComparison(t:PropertyTrial){
 const keys=Object.keys(emptyPropertyTrial()).filter(k=>k!=='mode');if(keys.some(k=>t[k as keyof PropertyTrial]===null||!Number.isFinite(t[k as keyof PropertyTrial])))return null;
 const value=t.value!,equity=t.equity!,months=t.holdingYears!*12;
 if(value<=0||equity<0||equity>value||!Number.isInteger(months)||months<1||months>600||t.years!<=0||!Number.isInteger(t.years!*12)||t.years!>50||t.rate!<0||t.rate!>100||t.vacancy!<0||t.vacancy!>100||t.saleCostPercent!<0||t.saleCostPercent!>100||t.appreciation!<=-100||t.investmentReturn!<=-100||[t.rent!,t.costs!,t.repairs!,t.buyingCosts!].some(n=>n<0))return null;
 const loan=value-equity,monthly=payment(loan,t.rate!,t.years!*12),schedule=amortize(loan,t.rate!,monthly,months),sellingNow=equity-value*t.saleCostPercent!/100;
 const initial=t.mode==='purchase'?equity+t.buyingCosts!:sellingNow;
 if(initial<0)return null; // underwater sale requires additional cash; not silently funded
 const investmentRate=Math.pow(1+t.investmentReturn!/100,1/12)-1;
 let alternative=initial,rentalCash=0,topUps=0;const rows=[];
 for(let m=1;m<=months;m++){const operating=t.rent!*(1-t.vacancy!/100)-t.costs!-t.repairs!/12,flow=operating-schedule[m-1].payment;alternative*=1+investmentRate;rentalCash*=1+investmentRate;
  if(flow<0){topUps-=flow;alternative-=flow;}else rentalCash+=flow;
  const market=value*Math.pow(1+t.appreciation!/100,m/12),proceeds=market*(1-t.saleCostPercent!/100)-schedule[m-1].balance;
  rows.push({month:m,propertyEquity:proceeds,rentalCash,alternative,advantage:proceeds+rentalCash-alternative,flow,balance:schedule[m-1].balance});
 }
 return {initial,monthly,topUps,rows,last:rows.at(-1)!,interest:schedule.at(-1)!.interest};
}
