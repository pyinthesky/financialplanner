import type { Enrollment, HealthOption, Money } from './enrollment.ts';
export type Employer = '' | 'you' | 'partner';
export type Waiver = { employer: Employer; amount: Money; basis: 'net'|'gross'; taxRate: Money; firstMonth: Money; lastMonth: Money; payment: 'monthly'|'quarterly'|'annual'; payoutMonth: Money; confirmed: boolean };
export const newWaiver = (employer:Employer):Waiver => ({employer,amount:null,basis:'net',taxRate:null,firstMonth:null,lastMonth:null,payment:'monthly',payoutMonth:null,confirmed:false});
export type Arrangement = {confirmed?:boolean;id:string;label:string;groups:{optionId:string;personIds:string[]}[]};
export function employerAdjustments(e:Enrollment,options:HealthOption[]) {
  const issues:string[]=[], months=Array<number>(12).fill(0), surcharges=Array<number>(12).fill(0);
  const employers=new Set(options.map(p=>p.employer??''));
  const active=(e.waivers??[]).filter(w=>(w.amount??0)>0);
  if(active.length&&employers.has(''))issues.push('Assign an employer to every selected option before applying waiver income.');
  const seen=new Set<string>();
  for(const w of active){
    if(!w.employer||seen.has(w.employer)){issues.push('Each waiver must belong to a different employee.');continue;}seen.add(w.employer);
    if(employers.has(w.employer))continue;
    if(employers.has('')||!options.length)continue;
    if(!w.confirmed){issues.push('Confirm the waiver requirements for enrollment in the other employer’s coverage.');continue;}
    if(w.basis==='gross'&&w.taxRate===null){issues.push('Enter the applicable tax estimate or a confirmed take-home waiver amount.');continue;}
    if(w.firstMonth===null||w.lastMonth===null||w.firstMonth>w.lastMonth){issues.push('Enter a valid first and last eligible waiver month (1–12).');continue;}
    if(w.payment==='annual'&&(w.payoutMonth===null||w.payoutMonth<w.lastMonth)){issues.push('Choose an annual payout month on or after the last eligible month.');continue;}
    const earned=(w.amount??0)/12*(1-(w.basis==='gross'?(w.taxRate??0)/100:0));
    for(let m=w.firstMonth-1;m<w.lastMonth;m++){
      const paid=w.payment==='annual'?(w.payoutMonth??12)-1:w.payment==='quarterly'?Math.floor(m/3)*3+2:m;
      months[paid]+=earned;
    }
  }
  for(const p of options){
    if((p.spouseSurcharge??0)>0){
      if(!p.surchargeConfirmed)issues.push('Confirm the spousal surcharge applies to this option’s covered group.');
      else for(let i=0;i<12;i++)surcharges[i]+=(p.spouseSurcharge??0)/12;
    }
  }
  return {issues,months,surcharges,waiverIncome:months.reduce((a,b)=>a+b,0),surcharge:surcharges.reduce((a,b)=>a+b,0)};
}
