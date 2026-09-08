import { buildBudgetYear, retirementMonths } from './budget-calendar.ts';
import { activeMortgageStatement, debtPayoffSchedule, homeInsuranceAnnual, propertyTaxAnnual, type PlannerData } from './planner.ts';
export interface BudgetViewRow { id:string; name:string; amount:number|null; source:string }
export function budgetViewMonth(plan:PlannerData,retirement:boolean) {
  const year=plan.budget.timeline?.startYear??new Date().getFullYear();
  const dates=retirementMonths(plan.budget,plan.household,year);
  return retirement?[`${year}-01`,dates.you,dates.partner].sort().at(-1)!:`${year}-01`;
}
/** A planned month; uses the same scheduled costs, debt ledger and benefit convention as the projection. */
export function budgetView(plan:PlannerData,month:string) {
  const start=plan.budget.timeline?.startYear??new Date().getFullYear();
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<`${start}-01`)throw new Error('Choose a valid month on or after the opening-balance month.');
  const year=Number(month.slice(0,4)),m=Number(month.slice(5))-1,y=year-start;
  const calendar=buildBudgetYear(plan.budget,plan.household,year,start,plan.accounts.map(a=>a.id))[m];
  const inflation=Math.pow(1+plan.assumptions.inflation/100,y),age=plan.household.currentAge+y;
  const ledger=debtPayoffSchedule(plan),index=y*12+m+1,debt=ledger[index];
  const issues:string[]=[];
  if(!plan.budget.timeline?.startYear)issues.push('Set the opening-balance year in Household for dated comparisons.');
  if(index>=ledger.length&&(ledger.at(-1)?.totalBalance??0)>0.005)issues.push('Debt remains beyond the available payoff schedule; its future payment is unknown.');
  if(plan.housing.statement?.enabled&&!activeMortgageStatement(plan))issues.push('Reconcile the mortgage statement before using linked housing totals.');
  const income:BudgetViewRow[]=calendar.payByOwner.map(p=>({id:`pay-${p.owner}`,name:p.owner==='you'?'Your Take-Home Pay':'Partner Take-Home Pay',amount:p.amount,source:'Household'}));
  for(const s of plan.income){
    const ownerAge=(s.owner==='you'?plan.household.currentAge:plan.household.partnerAge)+y;
    if(s.owner==='partner'&&plan.household.maritalStatus==='single'||ownerAge<s.startAge||s.startAge<=0)continue;
    income.push({id:s.id,name:s.name||s.kind,amount:s.withholdingPercent==null?null:s.annualAmount*Math.pow(1+s.cola/100,ownerAge-s.startAge)*(1-s.withholdingPercent/100)/12,source:'Pensions & Social Security'});
  }
  const linked:BudgetViewRow[]=(debt?.payments??[]).filter(p=>p.payment>0).map(p=>({id:p.id,name:p.name||'Loan Payment',amount:p.payment,source:'Loans & Debts · includes cascade and extra'}));
  const add=(id:string,name:string,amount:number,source:string)=>{if(amount>0)linked.push({id,name,amount,source});};
  add('property-tax','Property Tax',propertyTaxAnnual(plan)*inflation/12,'Loans & Debts');
  add('home-insurance','Home Insurance',homeInsuranceAnnual(plan)*inflation/12,'Loans & Debts');
  const statement=activeMortgageStatement(plan);
  if(statement&&debt?.payments.some(p=>p.id===statement.debtId&&p.openingBalance>0))add('escrow-other','Mortgage Insurance & Other Escrow',(statement.mortgageInsurance??0)+(statement.otherEscrow??0),'Loans & Debts');
  const healthScale=Math.pow(1+plan.healthcare.healthInflation/100,y);
  add('health','Healthcare',(age<65?plan.healthcare.preMedicareAnnual:plan.healthcare.medicareAnnual)*healthScale/12,'Health & Long-Term Care');
  if(age>=plan.healthcare.longTermCareStartAge&&age<plan.healthcare.longTermCareStartAge+plan.healthcare.longTermCareYears)add('care','Long-Term Care',plan.healthcare.longTermCareAnnual*healthScale/12,'Health & Long-Term Care');
  for(const c of plan.recurringCosts.filter(c=>age>=c.startAge&&age<=c.endAge))add(c.id,c.name,c.annualAmount*(c.inflationLinked?inflation:1)/12,'Timed Expenses');
  for(const e of (plan.laboratory?.events??[]).filter(e=>e.month<=month&&(e.throughMonth||e.month)>=month)){
    if(e.amount==null||!e.confirmedCashTreatment){issues.push('Complete and confirm the life event before relying on monthly totals.');continue;}
    if(e.kind==='expense')add(`event-${e.id}`,e.name||'Life Event',e.amount,'Scenario Laboratory · baseline event');
    else income.push({id:`event-${e.id}`,name:e.name||'Cash Receipt',amount:e.amount,source:'Scenario Laboratory · before year-end tax settlement'});
  }
  const totalIncome=income.reduce((n,r)=>n+(r.amount??0),0),totalSpending=calendar.spending*inflation+linked.reduce((n,r)=>n+(r.amount??0),0);
  return {income,linked,calendar,inflation,totalIncome,totalSpending,savings:calendar.requestedSavings,margin:totalIncome-totalSpending-calendar.requestedSavings,issues};
}
