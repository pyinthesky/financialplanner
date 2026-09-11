import data from '../data/fehb/2026-benefits.json' with {type:'json'};
import { EMPTY_RULE, type Enrollment, type HealthOption, type Rule, type Care } from './enrollment.ts';
type PublishedRule=Rule & {label?:string};
type BenefitMapping={fields:Partial<HealthOption>;services:Record<string,PublishedRule>;tierDeductibles:Record<string,number|null>;brochure:string;unresolvedServices:Record<string,string>;scope?:string};
export const FEHB_BENEFITS=data as unknown as {version:string;catalogVersion:string;year:number;reviewedAt:string;sources:Record<string,{url:string;sha256:string;supplement?:{url:string;sha256:string}}>;plans:Record<string,BenefitMapping>};
export const MEDICAL_SERVICES:Record<string,string>={primary:'Primary Care',specialist:'Specialist Visit',urgent:'Urgent Care',emergency:'Emergency Care',inpatient:'Hospital Admission',outpatient:'Outpatient Facility',surgery:'Surgery — Physician Bill',labs:'Lab / X-Ray — Professional Bill',imaging:'CT / MRI / PET — Professional Bill',mental:'Outpatient Mental Health Visit',physical:'Physical Therapy',occupational:'Occupational Therapy',speech:'Speech Therapy'};
export function publishedBenefits(o:HealthOption){return o.federalReference?FEHB_BENEFITS.plans[o.federalReference.id]:undefined;}
export function serviceLabel(key:string,r?:PublishedRule){return r?.label??MEDICAL_SERVICES[key]??(key==='preventive'?'Covered Preventive Care':/^rx\d$/.test(key)?`Tier ${key.slice(2)} — Network Pharmacy`:key);}
/** Explicit selection/update only. Never resets personal HSA funding, tax rates or premiums. */
export function applyPublishedBenefits(o:HealthOption):HealthOption {
  const ref=o.federalReference,m=publishedBenefits(o);if(!ref||!m||ref.version!==FEHB_BENEFITS.catalogVersion)return o;
  const family=ref.tier!=='self';const fields={...m.fields};
  if(!family){delete fields.individualMax;delete fields.individualDeductible;delete fields.deductibleMode;}
  return {...o,...fields,...(family?{deductibleMode:fields.deductibleMode??'unknown',familyDeductible:m.tierDeductibles[ref.tier],individualDeductible:fields.deductibleMode==='aggregate'?null:fields.individualDeductible??null,individualMax:fields.individualMax??null}:{individualDeductible:m.tierDeductibles.self}),federalReference:{...ref,benefitVersion:FEHB_BENEFITS.version}};
}
/** Personal care categories are local. A formulary tier is chosen for each plan, not inferred from a drug name. */
export function publishedCareRule(o:HealthOption,c:Care):Rule {
  const existing=o.rules[c.id],ref=o.federalReference;
  if(!ref?.benefitVersion||ref.benefitVersion!==FEHB_BENEFITS.version||existing?.manual)return existing??EMPTY_RULE;
  const service=existing?.service||(c.kind==='preventive'?'preventive':c.kind==='medical'?c.service:'');
  const mapped=service?publishedBenefits(o)?.services[service]:undefined;
  if(!mapped)return {...EMPTY_RULE,service:existing?.service??''};
  const {label:_,...rule}=mapped;
  return {...rule,service:existing?.service??'',manual:false};
}
export function withFederalBenefits(e:Enrollment):Enrollment {
  if(!e.federal)return e;
  const options=e.federal.options.map(o=>{
    if(o.federalReference?.benefitVersion!==FEHB_BENEFITS.version)return o;
    return {...o,rules:Object.fromEntries(e.people.flatMap(p=>p.care.map(c=>[c.id,publishedCareRule(o,c)])))};
  });
  return {...e,federal:{...e.federal,options}};
}
