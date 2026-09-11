import { employerAdjustments, type Waiver, type Arrangement } from './enrollment-incentives.ts';
/** Local, user-entered benefit comparison. See docs/open-enrollment.md for boundaries. */
export type Money = number | null;
export type CareKind = 'medical' | 'prescription' | 'preventive' | 'noncovered';
export type Care = { id: string; kind: CareKind; label: string; allowed: Money; count: Money; timing: 'spread' | 'once'; month: Money; payAtService?: boolean; hsaExcluded?: boolean };
export type Person = { id: string; householdMemberId?: string; hsaEligible?: 'unknown' | 'yes' | 'no'; annualMedical: Money; basis: 'allowed' | 'priorOop'; timing: 'spread' | 'once'; month: Money; care: Care[] };
export type Rule = { minimum?: Money; maximum?: Money; allowedOverride?: Money; coverage: 'unknown' | 'covered' | 'excluded'; deductible: 'shared' | 'separate' | 'exempt'; payment: 'coinsurance' | 'copay'; amount: Money; countsOop: 'unknown' | 'yes' | 'no' };
export type HealthOption = {
  id: string; label: string; autoTaxEstimate?:boolean; coveredPersonIds?:string[]; hraAnnual?:Money; hraConfirmed?:boolean; employer?: ''|'you'|'partner'; spouseSurcharge?: Money; surchargeConfirmed?: boolean; federalReference?: {id:string;version:string;tier:string;pinned?:boolean;reviewed:boolean;careSignature:string}; network: 'unspecified' | 'PPO' | 'HMO' | 'EPO' | 'POS'; premium: Money; payPeriods: Money; premiumTaxRate: Money;
  deductibleMode: 'embedded' | 'aggregate'; individualDeductible: Money; familyDeductible: Money;
  individualMax: Money; familyMax: Money; coinsurance: Money;
  rxIndividualDeductible: Money; rxFamilyDeductible: Money; rxIndividualMax: Money; rxFamilyMax: Money;
  rules: Record<string, Rule>; hsa: boolean; eligibilityConfirmed: boolean; contributionLimit: Money;
  employerHsa: Money; employerTiming: 'monthly' | 'upfront'; ownHsa: Money; openingHsa: Money; taxRate: Money;
};
export type TermQuote = { id: string; label: string; ownership: 'individual' | 'employer'; coverage: Money; premium: Money; years: Money; guaranteedYears: Money; portable: 'unknown' | 'yes' | 'no' };
export type FederalSelection = { enabled:boolean; employee:''|'you'|'partner'; zip:string; state:string; county:string; eligible:boolean; showAll?:boolean; options:HealthOption[] };
export type Enrollment = { federal?:FederalSelection; waivers?:Waiver[]; arrangements?:Arrangement[]; startMonth: string; people: Person[]; options: HealthOption[]; processingMonths: Money; dueMonths: Money; reimbursementMonths: Money; qualifiedConfirmed: boolean; quotes: TermQuote[]; employmentYears: Money };
export const EMPTY_ENROLLMENT: Enrollment = { startMonth: '', people: [], options: [], processingMonths: null, dueMonths: null, reimbursementMonths: null, qualifiedConfirmed: false, quotes: [], employmentYears: null };
export const EMPTY_RULE: Rule = { coverage: 'unknown', deductible: 'shared', payment: 'coinsurance', amount: null, countsOop: 'unknown' };
export function newPerson(id: string): Person { return { id, hsaEligible: 'unknown', annualMedical: null, basis: 'allowed', timing: 'spread', month: null, care: [] }; }
export function newOption(id: string): HealthOption { return { id, label: '', network: 'unspecified', premium: null, payPeriods: null, premiumTaxRate: null, deductibleMode: 'embedded', individualDeductible: null, familyDeductible: null, individualMax: null, familyMax: null, coinsurance: null, rxIndividualDeductible: null, rxFamilyDeductible: null, rxIndividualMax: null, rxFamilyMax: null, rules: {}, hsa: false, eligibilityConfirmed: false, contributionLimit: null, employerHsa: null, employerTiming: 'monthly', ownHsa: null, openingHsa: null, taxRate: null }; }
const obj = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const num = (x: unknown, max = 1e9): Money => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max ? x : null;
const int = (x: unknown, max: number, min = 0): Money => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : null;
const str = (x: unknown) => typeof x === 'string' ? x.slice(0, 100) : '';
const choice = <T extends string>(x: unknown, values: readonly T[], fallback: T): T => values.includes(x as T) ? x as T : fallback;
const list = (x: unknown, max: number): unknown[] => Array.isArray(x) ? x.slice(0, max) : [];
export function normalizeEnrollment(value: unknown): Enrollment | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = obj(value), e = structuredClone(EMPTY_ENROLLMENT);
  e.startMonth = typeof v.startMonth === 'string' && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(v.startMonth) ? v.startMonth : '';
  e.processingMonths = int(v.processingMonths, 12); e.dueMonths = int(v.dueMonths, 12); e.reimbursementMonths = int(v.reimbursementMonths, 12);
  e.qualifiedConfirmed = v.qualifiedConfirmed === true; e.employmentYears = num(v.employmentYears, 50);
  const ids = new Set<string>();
  const id = (x: unknown, fallback: string) => { const candidate = str(x); let next = candidate && !ids.has(candidate) && !['__proto__','constructor','prototype'].includes(candidate) ? candidate : fallback; while(ids.has(next))next += '-'; ids.add(next); return next; };
  e.people = list(v.people, 8).map((raw, i) => { const p = obj(raw); return { id: id(p.id, `person-${i}`), householdMemberId: str(p.householdMemberId), hsaEligible: choice<'unknown'|'yes'|'no'>(p.hsaEligible,['unknown','yes','no'],'unknown'), annualMedical: num(p.annualMedical), basis: choice(p.basis, ['allowed', 'priorOop'], 'allowed'), timing: choice(p.timing, ['spread','once'], 'spread'), month: int(p.month,12,1), care: list(p.care,20).map((raw,j)=>{const c=obj(raw);return {id:id(c.id,`care-${i}-${j}`),kind:choice(c.kind,['medical','prescription','preventive','noncovered'],'medical'),label:str(c.label),allowed:num(c.allowed),count:int(c.count,366),timing:choice(c.timing,['spread','once'],'spread'),month:int(c.month,12,1),payAtService:typeof c.payAtService==='boolean'?c.payAtService:c.kind==='prescription',hsaExcluded:c.hsaExcluded===true};}) }; });
  const careIds = e.people.flatMap(p=>p.care.map(c=>c.id));
  const normalizeOptions=(values:unknown,limit:number):HealthOption[]=>list(values,limit).map((raw,i)=>{const p=obj(raw), out=newOption(id(p.id,`option-${i}`));if(Array.isArray(p.coveredPersonIds))out.coveredPersonIds=list(p.coveredPersonIds,8).map(str);out.hraAnnual=num(p.hraAnnual);out.hraConfirmed=p.hraConfirmed===true;out.label=str(p.label);out.employer=choice<''|'you'|'partner'>(p.employer,['','you','partner'],'');out.spouseSurcharge=num(p.spouseSurcharge);out.surchargeConfirmed=p.surchargeConfirmed===true;const ref=obj(p.federalReference);if(ref.id)out.federalReference={id:str(ref.id),version:str(ref.version),tier:str(ref.tier),pinned:ref.pinned===true,reviewed:ref.reviewed===true,careSignature:typeof ref.careSignature==='string'?ref.careSignature.slice(0,200):''};out.network=choice(p.network,['unspecified','PPO','HMO','EPO','POS'],'unspecified');
    for(const k of ['premium','individualDeductible','familyDeductible','individualMax','familyMax','rxIndividualDeductible','rxFamilyDeductible','rxIndividualMax','rxFamilyMax','contributionLimit','employerHsa','ownHsa','openingHsa'] as const)out[k]=num(p[k]);
    out.payPeriods=int(p.payPeriods,366,1);out.coinsurance=num(p.coinsurance,100);out.taxRate=num(p.taxRate,100);out.premiumTaxRate=num(p.premiumTaxRate,100);out.deductibleMode=choice(p.deductibleMode,['embedded','aggregate'],'embedded');out.employerTiming=choice(p.employerTiming,['monthly','upfront'],'monthly');out.hsa=p.hsa===true;out.eligibilityConfirmed=p.eligibilityConfirmed===true;
    for(const cid of careIds){const r=obj(obj(p.rules)[cid]);out.rules[cid]={minimum:num(r.minimum),maximum:num(r.maximum),allowedOverride:num(r.allowedOverride),coverage:choice(r.coverage,['unknown','covered','excluded'],'unknown'),deductible:choice(r.deductible,['shared','separate','exempt'],'shared'),payment:choice(r.payment,['coinsurance','copay'],'coinsurance'),amount:num(r.amount,r.payment==='copay'?1e9:100),countsOop:choice(r.countsOop,['unknown','yes','no'],'unknown')};}return out;});
  e.options=normalizeOptions(v.options,4);
  if(v.federal){const f=obj(v.federal);e.federal={enabled:f.enabled===true,employee:choice(f.employee,['','you','partner'],''),zip:str(f.zip).replace(/\D/g,'').slice(0,5),state:str(f.state).slice(0,2).toUpperCase(),county:str(f.county).slice(0,5),eligible:f.eligible===true,showAll:f.showAll===true,options:normalizeOptions(f.options,12)};}
  if(v.waivers)e.waivers=list(v.waivers,2).map(raw=>{const w=obj(raw);return {employer:choice(w.employer,['','you','partner'],''),amount:num(w.amount),basis:choice(w.basis,['net','gross'],'net'),taxRate:num(w.taxRate,100),firstMonth:int(w.firstMonth,12,1),lastMonth:int(w.lastMonth,12,1),payment:choice(w.payment,['monthly','quarterly','annual'],'monthly'),payoutMonth:int(w.payoutMonth,12,1),confirmed:w.confirmed===true};});
  if(v.arrangements)e.arrangements=list(v.arrangements,6).map((raw,i)=>{const a=obj(raw);return {confirmed:a.confirmed===true,id:id(a.id,`arrangement-${i}`),label:str(a.label),groups:list(a.groups,2).map(raw=>{const g=obj(raw);return {optionId:str(g.optionId),personIds:list(g.personIds,8).map(str)};})};});
  e.quotes=list(v.quotes,6).map((raw,i)=>{const q=obj(raw);return {id:id(q.id,`term-${i}`),label:str(q.label),ownership:choice(q.ownership,['individual','employer'],'individual'),coverage:num(q.coverage),premium:num(q.premium),years:[10,15,30].includes(q.years as number)?q.years as number:null,guaranteedYears:num(q.guaranteedYears,30),portable:choice(q.portable,['unknown','yes','no'],'unknown')};});
  return e;
}
export type Claim = { person: number; label: string; month: number; allowed: number; member: number; covered: number; excluded: number; deductible: number; oopCredit: number; kind: CareKind; payAtService?: boolean; hsaExcluded?: boolean };
export type EnrollmentResult = { hraReimbursement?:number; waiverIncome?:number; surcharge?:number; issues: string[]; claims: Claim[]; premiums: number; medical: number; prescriptions: number; excluded: number; total: number; netCost: number; taxSavings: number; premiumTaxSavings: number; employerFunds: number; maximumCovered: number; people: { medical: number; prescriptions: number; excluded: number; oop: number }[]; timeline: CashMonth[]; endingHsa: number; unreimbursed: number; peakBridge: number };
export type CashMonth = { hraReimbursement?:number; waiverIncome?:number; surcharge?:number; month: string; incurred: number; eob: number; bills: number; premium: number; ownContribution: number; employerContribution: number; reimbursement: number; outsideCash: number; hsaBalance: number; bridge: number };
const sum = (values: number[]) => values.reduce((a,b)=>a+b,0);
const monthKey=(start:string,offset:number)=>{const [y,m]=start.split('-').map(Number);return `${y+Math.floor((m-1+offset)/12)}-${String((m-1+offset)%12+1).padStart(2,'0')}`;};
/** One complete benefit year; allowances accrue by service month, never bill month. */
function compareBaseHealth(e: Enrollment, p: HealthOption, medicalScale = 1): EnrollmentResult {
  const issues: string[] = [], n=e.people.length, family=n>1;
  if(p.hraAnnual!=null){if(p.hsa)issues.push('This comparison cannot combine an HSA and HRA in one option.');if(!p.hraConfirmed)issues.push('Confirm the HRA reimburses the modeled covered medical/Rx costs with its full allowance available at plan-year start.');}
  const need=(v:Money,label:string)=>{if(v===null)issues.push(label);};
  if(!e.startMonth)issues.push('Choose a plan-year start month.');if(!n)issues.push('Add the people covered by every compared option.');
  need(p.premium,'Enter the employee premium per pay period.');need(p.payPeriods,'Enter annual pay periods.');if(e.people.some(person=>(person.annualMedical??0)>0))need(p.coinsurance,'Enter the member medical coinsurance percentage.');need(p.individualMax,'Enter the per-person out-of-pocket limit.');
  if(family){need(p.familyMax,'Enter the family out-of-pocket limit.');need(p.familyDeductible,'Enter the family deductible.');}
  if(!family||p.deductibleMode==='embedded')need(p.individualDeductible,'Enter the per-person deductible.');
  if(family&&p.individualMax!==null&&p.familyMax!==null&&p.individualMax>p.familyMax)issues.push('The per-person limit cannot exceed the family limit.');
  if(family&&p.deductibleMode==='embedded'&&p.individualDeductible!==null&&p.familyDeductible!==null&&p.individualDeductible>p.familyDeductible)issues.push('The embedded deductible cannot exceed the family deductible.');
  need(e.processingMonths,'Enter months from service to EOB (zero is valid).');need(e.dueMonths,'Enter months from EOB to payment due (zero is valid).');
  if(p.hsa){if(((p.ownHsa??0)+(p.employerHsa??0)>0)&&!p.eligibilityConfirmed)issues.push('Confirm personal HSA contribution eligibility and the allowable contribution total.');if(!e.qualifiedConfirmed)issues.push('Confirm the modeled costs qualify for this HSA owner’s reimbursements.');
    for(const [key,label] of [['contributionLimit','Allowable HSA contributions'],['employerHsa','Employer HSA contribution'],['ownHsa','Your HSA contribution'],['openingHsa','Opening HSA balance'],['taxRate','HSA tax-saving rate']] as const)need(p[key],`Enter ${label.toLowerCase()} (zero is valid).`);
    need(e.reimbursementMonths,'Enter the HSA reimbursement delay.');if((p.employerHsa??0)+(p.ownHsa??0)>(p.contributionLimit??Infinity))issues.push('Employer and personal HSA contributions exceed the entered allowance.');
  }
  type Event={person:number;label:string;month:number;allowed:number;kind:CareKind;rule:Rule;payAtService?:boolean;hsaExcluded?:boolean};
  const events:Event[]=[];
  e.people.forEach((person,i)=>{
    if(p.hsa&&(!person.hsaEligible||person.hsaEligible==='unknown'))issues.push(`Person ${i+1}: confirm eligibility for this HSA owner's reimbursements.`);
    need(person.annualMedical,`Person ${i+1}: enter annual medical allowed charges, excluding the itemized care below.`);
    if(person.basis==='priorOop')issues.push(`Person ${i+1}: prior out-of-pocket spending is not an allowed-charge estimate. Use insurer-negotiated charges before plan payments.`);
    if(person.timing==='once')need(person.month,`Person ${i+1}: choose the medical service month.`);
    const annual=(person.annualMedical??0)*medicalScale;
    for(let j=0;j<(person.timing==='spread'?12:1);j++)events.push({person:i,label:'General Medical',month:person.timing==='spread'?j:(person.month??1)-1,allowed:annual/(person.timing==='spread'?12:1),kind:'medical',rule:{coverage:'covered',deductible:'shared',payment:'coinsurance',amount:p.coinsurance,countsOop:'yes'}});
    person.care.forEach((c,j)=>{const label=c.label||`${c.kind==='prescription'?'Prescription':'Care'} ${j+1}`;need(c.allowed,`Person ${i+1}, ${label}: enter the allowed charge per visit/fill.`);need(c.count,`Person ${i+1}, ${label}: enter visits/fills per year.`);if(c.timing==='once')need(c.month,`Person ${i+1}, ${label}: choose a service month.`);
      const rule=c.kind==='noncovered'?{...EMPTY_RULE,coverage:'excluded' as const}:p.rules[c.id]??EMPTY_RULE;
      if(rule.coverage==='unknown')issues.push(`Person ${i+1}, ${label}: confirm coverage for this option.`);
      if(rule.coverage==='covered'){
        if(rule.deductible==='separate'&&c.kind!=='prescription')issues.push(`${label}: separate deductibles are supported only for prescriptions.`);
        if(c.kind!=='preventive'&&rule.countsOop==='unknown')issues.push(`Person ${i+1}, ${label}: confirm whether member payments count toward the combined out-of-pocket limit.`);
        if(rule.minimum!=null&&rule.maximum!=null&&rule.minimum>rule.maximum)issues.push(`${label}: the minimum charge exceeds the maximum charge.`);
        if(c.kind!=='preventive')need(rule.amount,`${label}: enter the copay or coinsurance for this option.`);
        if(rule.deductible==='separate'){need(p.rxIndividualDeductible,'Enter the separate per-person prescription deductible.');if(family)need(p.rxFamilyDeductible,'Enter the separate family prescription deductible.');}
      }
      for(let k=0;k<(c.count??0);k++)events.push({person:i,label,month:c.timing==='once'?(c.month??1)-1:Math.floor(k*12/(c.count||1)),allowed:(rule.allowedOverride??c.allowed??0)*(c.kind==='medical'?medicalScale:1),kind:c.kind,rule,payAtService:c.payAtService??c.kind==='prescription',hsaExcluded:c.hsaExcluded});
    });
  });
  const claims:Claim[]=[], deductible=Array(n).fill(0), rxDeductible=Array(n).fill(0), oop=Array(n).fill(0), rxOop=Array(n).fill(0);
  const people=Array.from({length:n},()=>({medical:0,prescriptions:0,excluded:0,oop:0}));
  events.sort((a,b)=>a.month-b.month); // Stable: member order, then general medical, then listed services.
  for(const event of events){
    const {person:i,allowed,rule,kind}=event;let member=0,appliedDed=0,credit=0;
    const covered=rule.coverage==='covered';
    if(!covered)member=allowed;
    else if(kind!=='preventive'){
      const separate=rule.deductible==='separate',acc=separate?rxDeductible:deductible;
      const individual=(separate?p.rxIndividualDeductible:p.individualDeductible)??0, fam=(separate?p.rxFamilyDeductible:p.familyDeductible)??0;
      const remaining=rule.deductible==='exempt'?0:Math.max(0,family?Math.min(Math.max(0,fam-sum(acc)),p.deductibleMode==='embedded'?Math.max(0,individual-acc[i]):Infinity):individual-acc[i]);
      appliedDed=Math.min(allowed,remaining);
      const after=allowed-appliedDed;const share=rule.payment==='copay'?rule.amount??0:after*(rule.amount??0)/100;
      member=appliedDed+Math.min(after,Math.max(0,Math.min(rule.maximum??Infinity,Math.max(rule.minimum??0,share))));
      if(rule.countsOop==='yes'){
        let cap=Math.max(0,Math.min((p.individualMax??0)-oop[i],family?(p.familyMax??0)-sum(oop):Infinity));
        if(kind==='prescription')cap=Math.max(0,Math.min(cap,p.rxIndividualMax===null?Infinity:p.rxIndividualMax-rxOop[i],family&&p.rxFamilyMax!==null?p.rxFamilyMax-sum(rxOop):Infinity));
        member=Math.min(member,cap);credit=member;oop[i]+=credit;if(kind==='prescription')rxOop[i]+=credit;
      }
      // Only actual deductible dollars paid count; hitting the OOP cap can stop payment mid-claim.
      appliedDed=Math.min(appliedDed,member);acc[i]+=appliedDed;
    }
    people[i][!covered?'excluded':kind==='prescription'?'prescriptions':'medical']+=member;people[i].oop=oop[i];
    claims.push({person:i,label:event.label,month:event.month,allowed,member,covered:covered?member:0,excluded:covered?0:member,deductible:appliedDed,oopCredit:credit,kind,payAtService:event.payAtService,hsaExcluded:event.hsaExcluded});
  }
  const premiums=(p.premium??0)*(p.payPeriods??0),medical=sum(people.map(x=>x.medical)),prescriptions=sum(people.map(x=>x.prescriptions)),excluded=sum(people.map(x=>x.excluded));
  const employerFunds=p.hsa?p.employerHsa??0:0,own=p.hsa?p.ownHsa??0:0,taxSavings=own*(p.hsa?p.taxRate??0:0)/100;
  const total=premiums+medical+prescriptions+excluded,premiumTaxSavings=premiums*(p.premiumTaxRate??0)/100;
  const maxDelay=(e.processingMonths??0)+(e.dueMonths??0)+(p.hsa?e.reimbursementMonths??0:0);
  const timeline:CashMonth[]=Array.from({length:12+maxDelay},(_,i)=>({month:e.startMonth?monthKey(e.startMonth,i):`Month ${i+1}`,incurred:0,eob:0,bills:0,premium:i<12?premiums/12:0,ownContribution:i<12?own/12:0,employerContribution:i<12?(p.employerTiming==='upfront'?(i===0?employerFunds:0):employerFunds/12):0,reimbursement:0,outsideCash:0,hsaBalance:0,bridge:0}));
  const pending:number[]=Array(timeline.length).fill(0),eligibleBills:number[]=Array(timeline.length).fill(0);
  claims.forEach(c=>{const bill=c.month+(c.payAtService?0:(e.processingMonths??0)+(e.dueMonths??0));timeline[c.month].incurred+=c.member;timeline[c.month+(e.processingMonths??0)].eob+=c.member;timeline[bill].bills+=c.member;if(p.hsa&&e.qualifiedConfirmed&&e.people[c.person].hsaEligible==='yes'&&!c.hsaExcluded){pending[bill+(e.reimbursementMonths??0)]+=c.member;eligibleBills[bill]+=c.member;}});
  let balance=p.hsa?p.openingHsa??0:0,owed=0,bridge=0,peakBridge=0;
  timeline.forEach((m,i)=>{balance+=m.ownContribution+m.employerContribution;owed+=pending[i];const reimbursed=Math.min(balance,owed);balance-=reimbursed;owed-=reimbursed;m.reimbursement=reimbursed;m.hsaBalance=balance;m.outsideCash=m.premium+m.ownContribution+m.bills-reimbursed;bridge+=eligibleBills[i]-reimbursed;m.bridge=bridge;peakBridge=Math.max(peakBridge,bridge);});
  let hraReimbursement=0;
  if(!p.hsa&&p.hraAnnual!=null&&p.hraConfirmed){let remaining=p.hraAnnual;const eligible=Array(timeline.length).fill(0);claims.filter(c=>c.covered>0).forEach(c=>{eligible[c.month+(c.payAtService?0:(e.processingMonths??0)+(e.dueMonths??0))]+=c.covered;});timeline.forEach((m,i)=>{const paid=Math.min(remaining,eligible[i]);remaining-=paid;hraReimbursement+=paid;m.hraReimbursement=paid;m.outsideCash-=paid;});}
  return {hraReimbursement,issues:[...new Set(issues)],claims,premiums,medical,prescriptions,excluded,total,netCost:total-employerFunds-taxSavings-premiumTaxSavings-hraReimbursement,taxSavings,premiumTaxSavings,employerFunds,maximumCovered:premiums+Math.min((p.individualMax??0)*n,family?p.familyMax??0:p.individualMax??0),people,timeline,endingHsa:balance,unreimbursed:owed,peakBridge};
}
/** Single employer option, with waiver income shown separately from insurance costs. */
export function compareHealth(e:Enrollment,p:HealthOption,medicalScale=1):EnrollmentResult {
  const result=compareBaseHealth(e,p,medicalScale),adjust=employerAdjustments(e,[p]);
  return {...result,issues:[...result.issues,...adjust.issues],waiverIncome:adjust.waiverIncome,surcharge:adjust.surcharge,netCost:result.netCost-adjust.waiverIncome+adjust.surcharge,timeline:result.timeline.map((m,i)=>({...m,waiverIncome:adjust.months[i]??0,surcharge:adjust.surcharges[i]??0,outsideCash:m.outsideCash-(adjust.months[i]??0)+(adjust.surcharges[i]??0)}))};
}
/** A person belongs to exactly one primary plan; family accumulators never cross groups. */
export function compareArrangement(e:Enrollment,a:Arrangement,options:HealthOption[]) {
  const issues:string[]=[],seen=new Set<string>(),selected:HealthOption[]=[];
  if(!a.confirmed)issues.push('Confirm premiums, coverage tiers and HSA eligibility for the selected groups.');
  const groups=a.groups.map(g=>{
    const option=options.find(p=>p.id===g.optionId);
    if(!option){issues.push('Choose an available option for every coverage group.');return null;}
    if(selected.some(p=>p.id===option.id))issues.push('Combine people using the same option into one coverage group.');
    if(a.groups.length>1&&(!option.employer||selected.some(p=>p.employer===option.employer)))issues.push('Split coverage requires different, assigned employee sources.');
    selected.push(option);
    if(!g.personIds.length)issues.push('Each coverage group needs at least one person.');
    for(const id of g.personIds){if(seen.has(id))issues.push('Each person must have exactly one primary coverage group.');seen.add(id);if(!e.people.some(p=>p.id===id))issues.push('A covered person is no longer present.');}
    const subset={...e,waivers:[],people:e.people.filter(p=>g.personIds.includes(p.id))};
    const result=compareBaseHealth(subset,option);
    issues.push(...result.issues.map(x=>(option.label||'Option')+': '+x));
    if(option.federalReference){const n=subset.people.length,tier=option.federalReference.tier;if(tier==='self'&&n!==1||tier==='plusOne'&&n!==2||tier==='family'&&n<2)issues.push('Federal enrollment tier does not match its covered group.');if(!option.federalReference.reviewed)issues.push('Review federal plan benefits before comparing.');}
    return {option,result,people:subset.people};
  }).filter((g):g is NonNullable<typeof g>=>g!==null);
  if(seen.size!==e.people.length)issues.push('Assign every covered person once.');
  if(selected.filter(p=>p.hsa&&(p.ownHsa??0)>0).length>1&&selected.some(p=>p.autoTaxEstimate))issues.push('Enter reviewed tax-saving rates for both HSA owners; automatic single-option deductions cannot be added across split coverage.');
  const adjust=employerAdjustments(e,selected);issues.push(...adjust.issues);
  const total=groups.reduce((n,g)=>n+g.result.netCost,0)+adjust.surcharge-adjust.waiverIncome;
  const timeline=Array.from({length:Math.max(12,...groups.map(g=>g.result.timeline.length))},(_,i)=>({month:monthKey(e.startMonth||'2026-01',i),waiverIncome:adjust.months[i]??0,surcharge:adjust.surcharges[i]??0,outsideCash:groups.reduce((n,g)=>n+(g.result.timeline[i]?.outsideCash??0),0)+(adjust.surcharges[i]??0)-(adjust.months[i]??0)}));
  return {issues:[...new Set(issues)],groups,netCost:total,waiverIncome:adjust.waiverIncome,surcharge:adjust.surcharge,timeline};
}
export function compareTerm(q: TermQuote, employmentYears: Money) {
  const issues:string[]=[];
  if(q.coverage===null||q.coverage<=0)issues.push('Enter coverage.');if(q.premium===null)issues.push('Enter the annual employee/individual premium.');if(q.years===null)issues.push('Choose a 10, 15 or 30 year comparison term.');if(q.guaranteedYears===null)issues.push('Enter the years for which this premium is guaranteed.');
  if(q.guaranteedYears!==null&&q.years!==null&&q.guaranteedYears>q.years)issues.push('Guaranteed premium years cannot exceed the term.');
  if(q.ownership==='employer'&&employmentYears===null)issues.push('Enter the years until a possible job change.');
  const knownYears=Math.min(q.years??0,q.guaranteedYears??0,q.ownership==='employer'?employmentYears??0:Infinity);
  return {issues,knownYears,knownPremiums:knownYears*(q.premium??0),perThousand:q.coverage?(q.premium??0)/q.coverage*1000:0,jobChange:q.ownership==='individual'?'Employment does not control this policy; coverage depends on its terms and continued premiums.':q.portable==='yes'?'Portability entered; continued coverage, deadlines and the new premium still need policy confirmation.':'Coverage after leaving employment is not established.'};
}
