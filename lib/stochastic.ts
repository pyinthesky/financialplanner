import { projectMonthly } from './monthly-projection.ts';
import { scenarioIsStale } from './scenarios.ts';
import type { PlannerData } from './planner.ts';
import type { ScenarioOverrides } from './monthly-model.ts';
export interface SimulationInputs {mean:number|null;volatility:number|null;fee:number|null;samples:number|null;seed:number|null}
export const EMPTY_SIMULATION:SimulationInputs={mean:null,volatility:null,fee:null,samples:null,seed:null};
export function simulationError(input:SimulationInputs){
 if(Object.values(input).some(v=>v===null||!Number.isFinite(v)))return 'Enter every simulation assumption, including deliberate zeros.';
 if(input.mean!<=-100||input.volatility!<0||input.fee!<0||input.fee!>=100)return 'Mean return must exceed −100%; volatility must be nonnegative and fees below 100%.';
 if(!Number.isInteger(input.samples)||input.samples!<1||input.samples!>250)return 'Choose 1–250 paths. Small samples are especially unstable.';
 if(!Number.isInteger(input.seed)||input.seed!<0||input.seed!>4294967295)return 'Use an integer seed from 0 through 4294967295.';
 return null;
}
function random(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/** Independent annual lognormal gross growth factors with entered arithmetic mean/SD. */
export function returnPaths(input:SimulationInputs,startYear:number,years:number){
 const error=simulationError(input);if(error)throw new Error(error);
 const next=random(input.seed!),growth=1+input.mean!/100,sd=input.volatility!/100;
 const variance=Math.log(1+sd*sd/(growth*growth)),sigma=Math.sqrt(variance),mu=Math.log(growth)-variance/2;
 return Array.from({length:input.samples!},()=>Array.from({length:years},(_,i)=>{
  const z=Math.sqrt(-2*Math.log(Math.max(Number.MIN_VALUE,next())))*Math.cos(2*Math.PI*next());
  return {year:startYear+i,rate:(Math.exp(mu+sigma*z)*(1-input.fee!/100)-1)*100};
 }));
}
const quantile=(values:number[],p:number)=>{const a=[...values].sort((x,y)=>x-y),n=(a.length-1)*p,lo=Math.floor(n);return a[lo]+(a[Math.ceil(n)]-a[lo])*(n-lo);};
export interface SimulationOutcome {name:string;samples:number;fullyFunded:number;review:number;p10:number|null;median:number|null;p90:number|null;worstUnfunded:number;largestDiscretionaryCut:number}
export function runSimulation(plan:PlannerData,input:SimulationInputs,progress?:(percent:number)=>void):SimulationOutcome[]{
 const error=simulationError(input);if(error)throw new Error(error);
 const base=projectMonthly(plan);if(!base.supported)throw new Error('Resolve baseline input/rule notes before running uncertainty comparisons.');
 const comparisons:{name:string;overrides:ScenarioOverrides}[]=[{name:'Current Baseline',overrides:{}},...(plan.laboratory?.scenarios??[]).filter(s=>!scenarioIsStale(plan,s)).slice(0,3).map((s,i)=>({name:s.name||`Scenario ${i+1}`,overrides:s.overrides}))];
 const maxYear=Math.max(...comparisons.map(c=>base.years[0].year+(c.overrides.planToAge??plan.household.planToAge)-plan.household.currentAge));
 const paths=returnPaths(input,base.years[0].year,maxYear-base.years[0].year+1);
 return comparisons.map((c,ci)=>{
  const endings:number[]=[],cuts:number[]=[],unfunded:number[]=[];let fullyFunded=0,review=0;
  for(let i=0;i<paths.length;i++){
   const result=projectMonthly(plan,{...c.overrides,returnYears:paths[i].map(r=>c.overrides.returnYears?.find(v=>v.year===r.year)??r)});
   if(!result.supported)review++;
   if(result.supported&&!result.firstShortfall)fullyFunded++;
   endings.push(result.years.at(-1)?.portfolio??0);
   unfunded.push(result.months.reduce((n,m)=>n+m.unfundedSpending+m.unfundedTax,0));
   cuts.push(result.months.reduce((n,m)=>n+m.discretionaryReduction,0));
   progress?.(Math.round((ci*paths.length+i+1)/(comparisons.length*paths.length)*100));
  }
  // Never discard difficult paths and then report survivor-only percentiles.
  return {name:c.name,samples:paths.length,fullyFunded,review,p10:review?null:quantile(endings,.1),median:review?null:quantile(endings,.5),p90:review?null:quantile(endings,.9),worstUnfunded:Math.max(...unfunded),largestDiscretionaryCut:Math.max(...cuts)};
 });
}
