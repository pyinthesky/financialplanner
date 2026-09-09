import type { PlannerData } from './planner.ts';
import { calculateFederalIncomeTax } from './federal-tax.ts';
import { payrollReconciliation, retirementMonths } from './budget-calendar.ts';
import { payrollAnnualIncome } from './payroll-contributions.ts';
import type { Enrollment } from './enrollment.ts';
export function enrollmentFederalRate(plan:PlannerData):number|null{
  const h=plan.household,e=plan.enrollment;
  if(e?.startMonth!=='2026-01'||!h.currentAge||h.currentAge>=65||h.maritalStatus==='married'&&(!h.partnerAge||h.partnerAge>=65)||!['single','marriedJoint'].includes(h.filingStatus))return null;
  if(h.filingStatus==='marriedJoint'&&h.maritalStatus!=='married'||h.filingStatus==='single'&&h.maritalStatus!=='single')return null;
  if(plan.budget.timeline?.startYear!==2026)return null;
  const retirement=retirementMonths(plan.budget,h,2026);
  if(retirement.you<='2026-12'||h.maritalStatus==='married'&&retirement.partner<='2026-12')return null;
  if((plan.laboratory?.events??[]).length||((plan.assumptions.cashReturn??0)>0&&plan.accounts.some(a=>a.kind==='cash'&&a.balance>0)))return null;
  const pay=plan.budget.pay.filter(p=>p.owner==='you'||h.maritalStatus==='married');
  if(h.maritalStatus==='married'&&(!pay.some(p=>p.owner==='you')||!pay.some(p=>p.owner==='partner')))return null;
  if(!pay.length||pay.some(p=>!payrollReconciliation(p,plan.accounts.map(a=>a.id)).complete))return null;
  if(plan.realEstate?.properties.length||plan.assumptions.taxExemptInterest>0||plan.income.some(i=>i.annualAmount>0)||(plan.rothConversionPlanning.annualConversionYou>0||plan.rothConversionPlanning.annualConversionPartner>0))return null;
  const income=payrollAnnualIncome(plan);if(income===null)return null;
  // Incremental federal tax on the proposed deduction, not a blanket top bracket
  // across a deduction that straddles brackets. Other taxes remain explicit overrides.
  return calculateFederalIncomeTax(income,h.filingStatus).marginalRate*100;
}
export function withEnrollmentTax(plan:PlannerData,e:Enrollment):Enrollment{
  const rate=enrollmentFederalRate({...plan,enrollment:e});
  if(rate===null)return e;
  const income=payrollAnnualIncome(plan)!;
  return {...e,options:e.options.map(p=>{
    if(p.taxRate!==null||!p.hsa)return p;
    const contribution=p.ownHsa??0;
    const saving=calculateFederalIncomeTax(income,plan.household.filingStatus).tax-calculateFederalIncomeTax(Math.max(0,income-contribution),plan.household.filingStatus).tax;
    return {...p,taxRate:contribution>0?saving/contribution*100:rate};
  })};
}
