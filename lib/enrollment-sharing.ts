import { newOption, normalizeEnrollment, type Enrollment, type HealthOption } from './enrollment.ts';

// Positive allowlist: never serialize an option wholesale, a private ID, label,
// care rule, salary, personal contribution, tax assumption or household object.
const amounts = ['premium','payPeriods','individualDeductible','familyDeductible','individualMax','familyMax','coinsurance','rxIndividualDeductible','rxFamilyDeductible','rxIndividualMax','rxFamilyMax','employerHsa'] as const;
const enums = { network:['unspecified','PPO','HMO','EPO','POS'], deductibleMode:['embedded','aggregate'], employerTiming:['monthly','upfront'] } as const;
export type EmployerPackage = { format:'retirement-planner/employer-health-options'; version:1; options:Record<string,unknown>[] };
export function exportEmployerOptions(options:HealthOption[]):EmployerPackage {
  return {format:'retirement-planner/employer-health-options',version:1,options:options.map(p=>{
    const row:Record<string,unknown>={};
    for(const k of amounts) row[k]=p[k];
    for(const k of Object.keys(enums) as (keyof typeof enums)[]) row[k]=p[k];
    row.hsa=p.hsa;
    return row;
  })};
}
export function parseEmployerOptions(value:unknown):HealthOption[] {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose an employer health-options file.');
  const v=value as Record<string,unknown>;
  if(v.format!=='retirement-planner/employer-health-options'||v.version!==1||!Array.isArray(v.options)||!v.options.length||v.options.length>4)throw Error('Expected 1–4 employer options in the supported version. A full personal plan cannot be imported here.');
  const options=v.options.map((raw,i)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid option record.');
    const r=raw as Record<string,unknown>,p=newOption(`imported-option-${i}`);
    for(const k of amounts){const n=r[k];if(n!==null&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e9))throw Error(`Invalid ${k}.`);if(k==='payPeriods'&&n!==null&&(!Number.isInteger(n)||Number(n)<1||Number(n)>366)||k==='coinsurance'&&Number(n)>100)throw Error(`Invalid ${k}.`);p[k]=n as number|null;}
    for(const k of Object.keys(enums) as (keyof typeof enums)[]){if(!(enums[k] as readonly unknown[]).includes(r[k]))throw Error(`Invalid ${k}.`);Object.assign(p,{[k]:r[k]});}
    if(typeof r.hsa!=='boolean')throw Error('Invalid HSA option.');p.hsa=r.hsa;p.label=`Employer Option ${i+1}`;
    return p;
  });
  return options;
}
export function replaceEmployerOptions(e:Enrollment,options:HealthOption[]):Enrollment {
  // Recipient data survives; personal rules must be confirmed for these new plans.
  return normalizeEnrollment({...e,options:options.map((p,i)=>({...p,id:`employer-option-${i}`}))})!;
}
export function lowestCostIndices(results:{netCost:number;issues:string[]}[]):number[]{
  if(!results.length||results.some(r=>r.issues.length||!Number.isFinite(r.netCost)))return [];
  const cents=results.map(r=>Math.round(r.netCost*100)),min=Math.min(...cents);
  return cents.flatMap((n,i)=>n===min?[i]:[]);
}
