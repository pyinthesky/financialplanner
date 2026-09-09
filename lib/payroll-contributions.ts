import { annualize, scheduledPayments, type BudgetPay } from './budget.ts';
import type { Account, PlannerData } from './planner.ts';
export interface ContributionElection {
  year:number|null; mode:'fixed'|'percent'|'maximum'; amount:number|null;
  catchUp:boolean; priorYearWages:number|null; otherDeferrals:number|null;
  employeeRothPercent:number|null; employerAmount:number|null; employerRothPercent:number|null;
  employerRothConfirmed:boolean; otherPretax:number|null; traditionalAccountId:string; rothAccountId:string;
}
export interface PayrollAllocation {accountId:string;employee:number;employer:number;kind:'traditional'|'roth'}
export const EMPTY_ELECTION:ContributionElection={year:null,mode:'fixed',amount:null,catchUp:false,priorYearWages:null,otherDeferrals:null,employeeRothPercent:null,employerAmount:null,employerRothPercent:null,employerRothConfirmed:false,otherPretax:null,traditionalAccountId:'',rothAccountId:''};
export function normalizeElection(value:unknown):ContributionElection|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  const v=value as Record<string,unknown>,e={...EMPTY_ELECTION};
  for(const k of ['year','amount','priorYearWages','otherDeferrals','employeeRothPercent','employerAmount','employerRothPercent','otherPretax'] as const){const n=v[k];e[k]=typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9?n:null;}
  e.mode=['fixed','percent','maximum'].includes(String(v.mode))?v.mode as ContributionElection['mode']:'fixed';e.catchUp=v.catchUp===true;e.employerRothConfirmed=v.employerRothConfirmed===true;
  for(const k of ['traditionalAccountId','rothAccountId'] as const)e[k]=typeof v[k]==='string'?v[k].slice(0,100):'';
  return e;
}
export function paycheckCount(pay:BudgetPay,year:number){return scheduledPayments(1,pay.frequency,pay.nextPayDate,year)?.reduce((a,b)=>a+b,0)??annualize(1,pay.frequency)!;}
/** 2026 Notice 2025-67; elective-deferral limit is shared across this person's plans.
 * This is a full-year election preview, not an employer match or payroll-tax calculator.
 */
export function contributionPreview(pay:BudgetPay,e:ContributionElection,birthYear:number,accounts:Account[]){
  const issues:string[]=[],p=pay.payroll,age=e.year&&birthYear?e.year-birthYear:null;
  for(const key of ['year','amount','priorYearWages','otherDeferrals','employeeRothPercent','employerAmount','employerRothPercent','otherPretax'] as const)if(e[key]!==null&&(!Number.isFinite(e[key])||e[key]!<0||e[key]!>1e9))issues.push('Contribution inputs must be finite and nonnegative.');
  if(p&&[p.gross,p.incomeTaxWithheld,p.otherDeductions].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))issues.push('Payroll inputs must be finite and nonnegative.');
  if(e.catchUp&&(!Number.isInteger(birthYear)||birthYear<1900||birthYear>2026))issues.push('Enter a valid birth year for catch-up.');
  if(e.year!==2026)issues.push('Select 2026: this calculator does not extrapolate future contribution limits.');
  if(!p||p.gross===null||p.incomeTaxWithheld===null||p.otherDeductions===null)issues.push('Enter gross pay, income-tax withholding and other payroll deductions first.');
  const periods=paycheckCount(pay,2026),salary=(p?.gross??0)*periods;
  if(periods<=0)issues.push('No paychecks fall in the selected year.');
  for(const k of ['otherDeferrals','employeeRothPercent','employerAmount','employerRothPercent','otherPretax'] as const)if(e[k]===null)issues.push(`Enter ${k.replace(/([A-Z])/g,' $1').toLowerCase()}, including explicit zero.`);
  if(e.mode!=='maximum'&&e.amount===null)issues.push('Enter the contribution amount or percentage.');
  if((e.employeeRothPercent??0)>100||(e.employerRothPercent??0)>100||(e.mode==='percent'&&(e.amount??0)>100))issues.push('Percentages must be between 0 and 100.');
  if(e.catchUp&&(age===null||age<50))issues.push('Catch-up requires a birth year confirming age 50 or older by year-end.');
  if(e.catchUp&&e.priorYearWages===null)issues.push('Enter prior-year Social Security wages from this employer to determine Roth catch-up treatment.');
  const catchLimit=e.catchUp&&age!==null&&age>=50?(age>=60&&age<=63?11250:8000):0;
  const limit=24500+catchLimit,other=e.otherDeferrals??0,available=Math.max(0,Math.min(limit-other,salary));
  if(other>limit)issues.push('Other elective deferrals already exceed the supported individual limit.');
  const requested=e.mode==='maximum'?available:e.mode==='percent'?salary*(e.amount??0)/100:e.amount??0;
  if(requested>available+0.005)issues.push('Requested employee savings exceed compensation or the remaining shared deferral limit.');
  const employee=Math.min(requested,available),catchAmount=Math.min(employee,Math.max(0,employee+other-24500));
  // Conservative: this job supplies the catch-up after reported other deferrals.
  const mandatoryRoth=e.catchUp&&(e.priorYearWages??0)>150000?catchAmount:0;
  const employeeRoth=Math.max(employee*(e.employeeRothPercent??0)/100,mandatoryRoth),employeeTraditional=employee-employeeRoth;
  const employer=e.employerAmount??0,employerRoth=employer*(e.employerRothPercent??0)/100,employerTraditional=employer-employerRoth;
  if(employee-catchAmount+employer>Math.min(72000,salary)+0.005)issues.push('Employee regular deferrals plus employer funding exceed the supported annual-additions limit.');
  if(employerRoth>0&&!e.employerRothConfirmed)issues.push('Confirm the plan permits fully vested Roth employer allocations.');
  if((e.otherPretax??0)>(p?.otherDeductions??0))issues.push('Other pretax deductions must be part of, not additional to, Other Payroll Deductions.');
  const allocations:PayrollAllocation[]=[{accountId:e.traditionalAccountId,kind:'traditional',employee:employeeTraditional/periods,employer:employerTraditional/periods},{accountId:e.rothAccountId,kind:'roth',employee:employeeRoth/periods,employer:employerRoth/periods}].filter(a=>a.employee+a.employer>0) as PayrollAllocation[];
  for(const a of allocations)if(!accounts.some(x=>x.id===a.accountId&&x.kind===a.kind&&x.owner===pay.owner))issues.push(`Choose a ${a.kind==='roth'?'Roth':'traditional'} account owned by ${pay.owner}.`);
  const taxableWages=(p?.gross??0)-employeeTraditional/periods-(e.otherPretax??0),net=(p?.gross??0)-employee/periods-(p?.incomeTaxWithheld??0)-(p?.otherDeductions??0);
  if(taxableWages<0||net<0)issues.push('Deductions exceed the paycheck. Review contributions and withholding.');
  return {issues,periods,limit,available,employee,employer,employeeTraditional,employeeRoth,employerTraditional,employerRoth,catchAmount,mandatoryRoth,allocations,taxableWages,net};
}
export function applyContributionElection(pay:BudgetPay,e:ContributionElection,birthYear:number,accounts:Account[]):BudgetPay{
  const r=contributionPreview(pay,e,birthYear,accounts);if(r.issues.length)throw Error(r.issues.join(' '));
  return {...pay,amount:r.net,payroll:{...pay.payroll!,employeeSavings:r.employee/r.periods,employerSavings:r.employer/r.periods,taxableWages:r.taxableWages,allocations:r.allocations,employerTaxable:r.employerRoth/r.periods,election:{...e},accountId:''}};
}
/** Derived wage-only federal rate. Never infer full household income from a net deposit. */
export function payrollAnnualIncome(plan:PlannerData):number|null{
  const active=plan.budget.pay.filter(p=>p.owner==='you'||plan.household.maritalStatus==='married');
  if(!active.length||active.some(p=>!p.payroll||p.payroll.taxableWages===null))return null;
  return active.reduce((s,p)=>s+(p.payroll!.taxableWages!+(p.payroll!.employerTaxable??0))*paycheckCount(p,2026),0);
}
