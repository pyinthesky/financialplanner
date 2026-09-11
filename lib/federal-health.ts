import data from '../data/fehb/2026.json' with {type:'json'};
import { compareHealth, newOption, type Enrollment, type FederalSelection, type HealthOption, type Rule } from './enrollment.ts';
export type FederalTier = {code:string;tier:string;biweekly:number;deductible:number|null;maximum:number|null;accountContribution:number|null};
export type FederalPlan = {id:string;name:string;option:string;planCode:string;network:string;kind:string;account:string;brochure:string;links:Record<string,string>;tiers:FederalTier[];nationwide:boolean;regions:[string,boolean,string,string,boolean,string][];terms:Record<string,string>};
export const FEHB = {...data,plans:data.plans.map(p=>({...p,terms:Object.fromEntries(p.terms.map(([k,v])=>[data.dictionary[k],data.dictionary[v]]))}))} as unknown as {year:number;version:string;retrieved:string;rateType:string;sources:{name:string;url:string;released:string;sha256:string}[];counts:{planNames:number;options:number;enrollmentCodes:number};plans:FederalPlan[]};
export const blankFederal=():FederalSelection=>({enabled:false,employee:'',zip:'',state:'',county:'',eligible:false,options:[]});
export function federalLocation(plan:FederalPlan,f:FederalSelection):'match'|'unknown'|'outside' {
  if(plan.nationwide)return 'match';
  if(!plan.regions.length)return 'unknown';
  if(!f.state&&!f.zip)return 'unknown';
  for(const [state,statewide,county,,countywide,zip] of plan.regions){
    if(f.state&&state!==f.state)continue;
    if(statewide&&state===f.state)return 'match';
    if(zip&&zip===f.zip)return 'match';
    if(countywide&&county&&county===f.county&&state===f.state)return 'match';
  }
  // Missing county/ZIP cannot establish that a regional plan is unavailable.
  if(!f.state||!f.county||plan.regions.some(r=>r[0]===f.state&&!r[1]&&!r[4]&&!f.zip))return 'unknown';
  return 'outside';
}
export function tiersForPeople(p:FederalPlan,n:number){return p.tiers.filter(t=>n===1?t.tier==='self':n===2?t.tier==='plusOne'||t.tier==='family':n>2&&t.tier==='family');}
/** Stable care fingerprint invalidates review when the household/service inputs change. */
export function careSignature(e:Enrollment){
  const people=e.people.map(p=>({id:p.id,householdMemberId:p.householdMemberId??'',hsaEligible:p.hsaEligible??'unknown',annualMedical:p.annualMedical,basis:p.basis,timing:p.timing,month:p.month,care:p.care.map(c=>({id:c.id,kind:c.kind,label:c.label,allowed:c.allowed,count:c.count,timing:c.timing,month:c.month,payAtService:c.payAtService??c.kind==='prescription',hsaExcluded:c.hsaExcluded??false}))}));
  let h=2166136261;for(const c of JSON.stringify({start:e.startMonth,people})){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);
}
export function federalDraft(p:FederalPlan,t:FederalTier,employee:FederalSelection['employee']):HealthOption {
  const o=newOption(`fehb-${t.code}`);o.label=`${p.name} · ${p.option} · ${t.code}`.slice(0,100);o.employer=employee;o.network=['PPO','HMO','POS','EPO'].includes(p.network)?p.network as HealthOption['network']:'unspecified';
  o.premium=t.biweekly;o.payPeriods=26;
  // Self-only values must never be used as embedded family limits.
  if(t.tier==='self'){o.individualDeductible=t.deductible;o.individualMax=t.maximum;}
  else {o.familyDeductible=t.deductible;o.familyMax=t.maximum;}
  o.hsa=p.account==='Health Savings Account';if(o.hsa)o.employerHsa=t.accountContribution;
  if(p.account==='Health Reimbursement Arrangement')o.hraAnnual=t.accountContribution;
  o.federalReference={id:p.id,version:FEHB.version,tier:t.tier,reviewed:false,careSignature:''};return o;
}
export const SERVICE_CATEGORIES=['Primary Care Office Visit','Specialist Office Visit','Urgent Care','Emergency Care','Diagnostic Tests or Procedures (e.g., Blood Tests, X-rays, Urinalysis, Ultrasounds)','Diagnostic Tests or Procedures (e.g., CT scans, MRIs, PET Scans)','Professional Services (Mental Health and Substance Use Disorder)','Physical Therapy','Occupational Therapy','Speech Therapy','Applied Behavioral Analysis (ABA)','Doctor Costs for Outpatient Surgery','Other Outpatient Surgery Costs','Hospital Inpatient Cost Per Admission','Tier 0','Tier 1','Tier 2','Tier 3','Tier 4','Tier 5','Tier 6'];
/** Only exact scalar prices are suggested. Coverage, deductible and OOP treatment still require review. */
export function suggestRule(text:string):Partial<Rule>|null {
  let m=text.match(/^\$([\d,]+(?:\.\d+)?)\s*(?:Copayment)?$/i);if(m)return {payment:'copay',amount:Number(m[1].replaceAll(',',''))};
  m=text.match(/^(\d+(?:\.\d+)?)%\s*(?:Coinsurance)?$/i);if(m&&+m[1]<=100)return {payment:'coinsurance',amount:+m[1]};
  if(text==='Member Pays Nothing')return {payment:'copay',amount:0};
  return null;
}
export function federalReviewIssues(e:Enrollment,o:HealthOption,people=e.people):string[]{
  const f=e.federal,ref=o.federalReference;if(!ref)return [];
  const issues:string[]=[],p=FEHB.plans.find(p=>p.id===ref.id);
  if(!f?.enabled)issues.push('Federal options are disabled.');
  if(!f?.eligible||!f.employee)issues.push('Confirm standard active non-postal FEHB eligibility and the employee.');
  if(e.startMonth!==`${FEHB.year}-01`)issues.push(`This catalog supports the ${FEHB.year} calendar benefit year only.`);
  if(!p||ref.version!==FEHB.version)issues.push('This saved federal reference needs a current source review.');
  if(p&&f&&federalLocation(p,f)!=='match')issues.push('Confirm a matching federal service area.');
  if(o.coveredPersonIds&&(new Set(o.coveredPersonIds).size!==people.length||people.some(p=>!o.coveredPersonIds!.includes(p.id))))issues.push('Review the people assigned to this federal enrollment tier.');
  if(p?.account==='Health Reimbursement Arrangement'&&o.hraAnnual==null)issues.push('Enter the confirmed HRA allowance, including explicit zero when applicable.');
  if(p?.account==='Health Savings Account'&&!o.hsa&&o.hraAnnual==null)issues.push('Confirm HSA funding or enter a verified HRA alternative for this HDHP.');
  if(o.employer!==f?.employee)issues.push('Review the employee assigned to this federal option.');
  if(p&&!tiersForPeople(p,people.length).some(t=>t.tier===ref.tier))issues.push('The enrollment tier does not cover this group size.');
  return issues;
}
export function federalCandidates(e:Enrollment,scale=1){
  return (e.federal?.enabled?e.federal.options:[]).map(option=>({option,result:compareHealth({...e,people:option.coveredPersonIds?e.people.filter(p=>option.coveredPersonIds!.includes(p.id)):e.people},option,scale),issues:federalReviewIssues(e,option)})).map(c=>({...c,result:{...c.result,issues:[...c.result.issues,...c.issues]}}));
}
export function comparisonEnrollment(e:Enrollment,scale=1):Enrollment {
  const ready=federalCandidates(e,scale).filter(c=>!c.result.issues.length).sort((a,b)=>a.result.netCost-b.result.netCost||a.option.id.localeCompare(b.option.id)).filter((c,i)=>e.federal?.showAll||i<3||c.option.federalReference?.pinned).map(c=>c.option);
  return {...e,options:[...e.options,...ready]};
}
