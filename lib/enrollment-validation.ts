import type { Enrollment, HealthOption, Money } from './enrollment.ts';
export type EnrollmentErrors = Record<string, string>;
/** Paths identify the actual input, shared by the calculation and its inline editor. */
export function healthInputErrors(e: Enrollment, p: HealthOption): EnrollmentErrors {
  const errors: EnrollmentErrors = {}, o=`options.${p.id}.`, family=e.people.length>1;
  const issue=(path:string,message:string)=>{errors[path]=message;};
  const need=(value:Money|undefined,path:string,message='Enter an amount; 0 is valid.')=>{if(value==null)issue(path,message);};
  if(!e.startMonth)issue('startMonth','Choose the year and month coverage begins.');
  if(!e.people.length)issue('people','Add at least one covered person.');
  need(p.premium,o+'premium');need(p.payPeriods,o+'payPeriods','Enter the number of premium deductions per year.');
  need(p.individualMax,o+'individualMax','Find the per-person out-of-pocket maximum in the benefits summary.');
  if(family){need(p.familyMax,o+'familyMax');need(p.familyDeductible,o+'familyDeductible');}
  if(!family||p.deductibleMode==='embedded')need(p.individualDeductible,o+'individualDeductible');
  if(family&&p.individualMax!=null&&p.familyMax!=null&&p.individualMax>p.familyMax)issue(o+'individualMax','The per-person maximum cannot exceed the family maximum.');
  if(family&&p.deductibleMode==='embedded'&&p.individualDeductible!=null&&p.familyDeductible!=null&&p.individualDeductible>p.familyDeductible)issue(o+'individualDeductible','The embedded deductible cannot exceed the family deductible.');
  if(e.people.some(x=>(x.annualMedical??0)>0))need(p.coinsurance,o+'coinsurance','Enter your share after the deductible, as a percentage.');
  need(e.processingMonths,'processingMonths','Enter months until the insurer processes a claim; 0 is valid.');need(e.dueMonths,'dueMonths','Enter months from the EOB to the payment due date; 0 is valid.');
  if(p.hsa&&(p.hraAnnual??0)>0)issue(o+'hraAnnual','Combined HSA/HRA arrangements are not modeled. Remove this allowance to compare the HSA alone.');
  if(p.hsa){
    for(const key of ['employerHsa','ownHsa','openingHsa'] as const)need(p[key],o+key);
    if((p.ownHsa??0)+(p.employerHsa??0)>0){need(p.contributionLimit,o+'contributionLimit','Enter the owner’s contribution limit, or use the full-year shortcut.');if((p.ownHsa??0)+(p.employerHsa??0)>(p.contributionLimit??Infinity))issue(o+'contributionLimit','Employer and personal contributions exceed this limit.');}
    // A tax estimate is optional: omitted means no HSA tax savings, never a fabricated rate.
    need(e.reimbursementMonths,'reimbursementMonths','Enter months until HSA reimbursement; 0 means immediate.');
  }
  for(const person of e.people){const prefix=`people.${person.id}.`;
    need(person.annualMedical,prefix+'annualMedical','Enter negotiated medical charges before insurance pays; 0 if all care is itemized.');
    if(person.basis==='priorOop')issue(prefix+'basis','Use insurer-negotiated charges from an EOB, rather than past personal payments.');
    if(person.timing==='once')need(person.month,prefix+'month','Choose a service month from 1–12.');
    if(p.hsa&&(!person.hsaEligible||person.hsaEligible==='unknown'))issue(prefix+'hsaEligible','Choose whether this person can use the HSA. See the eligibility note below.');
    for(const care of person.care){const c=prefix+`care.${care.id}.`,r=o+`rules.${care.id}.`,rule=p.rules[care.id];
      need(care.allowed,c+'allowed');need(care.count,c+'count','Enter visits or fills per year.');if(care.timing==='once')need(care.month,c+'month','Choose a service month from 1–12.');
      if(care.kind==='noncovered')continue;
      if(!rule||rule.coverage==='unknown'){issue(r+'coverage','Check whether this visit or prescription is covered in the benefits guide or formulary.');continue;}
      if(rule.coverage!=='covered')continue;
      if(rule.deductible==='separate'&&care.kind!=='prescription')issue(r+'deductible','Separate deductibles are supported only for prescriptions.');
      if(care.kind!=='preventive'){need(rule.amount,r+'amount','Enter the copay or your coinsurance percentage.');if(rule.countsOop==='unknown')issue(r+'countsOop','Check whether this payment counts toward the combined out-of-pocket maximum.');}
      if(rule.minimum!=null&&rule.maximum!=null&&rule.minimum>rule.maximum)issue(r+'minimum','The minimum cannot exceed the maximum.');
      if(rule.deductible==='separate'){need(p.rxIndividualDeductible,o+'rxIndividualDeductible');if(family)need(p.rxFamilyDeductible,o+'rxFamilyDeductible');}
    }
  }
  for(const w of e.waivers??[]){if(!(w.amount&&w.amount>0))continue;
    if(!p.employer)issue(o+'employer','Choose whose employer provides this option so waiver income can be applied.');
    if(!p.employer||p.employer===w.employer)continue;
    const prefix=`waivers.${w.employer}.`;
    if(w.basis==='gross')need(w.taxRate,prefix+'taxRate','Enter a combined tax estimate, or use the take-home amount.');
    need(w.firstMonth,prefix+'firstMonth','Enter the first eligible month, 1–12.');need(w.lastMonth,prefix+'lastMonth','Enter the last eligible month, 1–12.');
    if(w.firstMonth!=null&&w.lastMonth!=null&&w.firstMonth>w.lastMonth)issue(prefix+'lastMonth','The last month cannot precede the first.');
    if(w.payment==='annual'){need(w.payoutMonth,prefix+'payoutMonth','Choose the payout month.');if(w.payoutMonth!=null&&w.lastMonth!=null&&w.payoutMonth<w.lastMonth)issue(prefix+'payoutMonth','The payout must follow the last eligible month.');}
  }
  return errors;
}
