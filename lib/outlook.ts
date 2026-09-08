import { projectMonthly } from './monthly-projection.ts';
import { budgetViewMonth } from './budget-view.ts';
import type { PlannerData } from './planner.ts';
export function outlook(plan:PlannerData){
  const result=projectMonthly(plan),reasons:string[]=[];
  if(!plan.budget.reviewed)reasons.push('Review both budgets before relying on the outlook.');
  if(!result.supported||!result.months.length)reasons.push(...result.issues);
  if(!plan.budget.lines.some(l=>(l.amount??0)>0))reasons.push('Enter and review living expenses.');
  const retirementMonth=budgetViewMonth(plan,true),retirement=result.months.find(r=>r.month===retirementMonth);
  if(result.issues.some(s=>!s.startsWith('Undated'))&&result.supported)reasons.push('Review the model notes before relying on an overall assessment.');
  if(!retirement)reasons.push('Retirement must fall within the modeled horizon.');
  const ready=reasons.length===0;
  const gap=result.firstShortfall!==null||(result.legacyGap??0)>0||result.months.some(r=>r.bufferGap>.01||r.savingsUnfunded>.01);
  const status=!ready?'More Inputs Needed':gap?'Potential Gap':'On Track Under These Assumptions';
  const actions:{title:string;detail:string}[]=[];
  if(ready){
    const baseline=result.years.at(-1)!.portfolio;
    for(const [title,overrides] of [['Compare 5% Lower Everyday Spending',{spendingChangePercent:-5}],['Stress-Test Higher Inflation',{inflation:plan.assumptions.inflation+1}]] as const){
      const trial=projectMonthly(plan,overrides);
      if(trial.supported&&trial.years.length===result.years.length)actions.push({title,detail:`Ending investable assets change by ${Math.round(trial.years.at(-1)!.portfolio-baseline).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}; first unfunded month: ${trial.firstShortfall??'none modeled'}. Same horizon and other assumptions. This comparison does not change your plan.`});
    }
    if(result.months.some(r=>r.bufferGap>.01))actions.unshift({title:'Review Cash Coverage',detail:'At least one month falls below your chosen cash target. Compare funding the reserve with the taxes and investment trade-offs in Scenario Laboratory.'});
  }
  return {status,ready,cashTarget:result.months[0]?.cashTarget??null,gapReasons:[...(result.firstShortfall?[`Unfunded spending or tax begins in ${result.firstShortfall}.`]:[]),...((result.legacyGap??0)>0?[`The selected legacy target is short by ${Math.round(result.legacyGap!).toLocaleString()}.`]:[]),...(result.months.some(r=>r.bufferGap>.01)?['At least one month misses the selected cash reserve target.']:[]),...(result.months.some(r=>r.savingsUnfunded>.01)?['At least one planned savings transfer cannot be funded.']:[])],reasons:[...new Set(reasons)],actions:actions.slice(0,3),firstShortfall:result.firstShortfall,retirementMonth,monthsToRetirement:retirement?result.months.indexOf(retirement):null,retirementGap:retirement?retirement.spending-(retirement.pay+retirement.pension+retirement.socialSecurity+retirement.rentalIncome):null,cashCoverage:result.months[0]?.coverageMonths??null,notes:result.issues,legacyGap:result.legacyGap};
}
