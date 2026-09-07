import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN, normalizePlan } from '../lib/planner.ts';
import { EMPTY_LAB } from '../lib/monthly-model.ts';
import { buildBudgetYear, payrollReconciliation } from '../lib/budget-calendar.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';

const close = (a,b) => assert.ok(Math.abs(a-b)<0.005, `${a} versus ${b}`);
const bill = () => ({ id:'bill', name:'Synthetic Cost', category:'Other', amount:100, frequency:'monthly', essential:true, owner:'household', nextDueDate:'', endDate:'', retirement:{rule:'continue',amount:null,reason:''} });
const plan = () => {
  const p=structuredClone(DEFAULT_PLAN);
  Object.assign(p.household,{currentAge:60,retirementAge:60,planToAge:60,birthYear:1966});
  p.budget.lines=[bill()]; p.budget.reviewed=true; p.budget.retirementSpendingSource='worksheet';
  p.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};
  p.accounts=[{id:'cash',name:'Synthetic Cash',kind:'cash',owner:'you',balance:10000,annualContribution:0}];
  p.laboratory=structuredClone(EMPTY_LAB);
  return p;
};
test('monthly cash-only plan reconciles all months and annual totals',()=>{
  const p=plan(), r=projectMonthly(p);
  assert.equal(r.months.length,12); close(r.years[0].portfolio,8800); close(r.years[0].spending,1200);
  for(const m of r.months) close(m.conservationResidual,0);
  assert.equal(r.firstShortfall,null);
});
test('dated annual bill is paid only in its month and an end date stops future bills',()=>{
  const p=plan(); Object.assign(p.budget.lines[0],{amount:1200,frequency:'annual',nextDueDate:'2026-07-04',endDate:'2026-07-04'});
  p.household.planToAge=61;
  const r=projectMonthly(p); close(r.months[5].portfolio,10000); close(r.months[6].spending,1200); close(r.years[1].spending,0);
});
test('each owner transitions in their selected month and dated edits remain scoped',()=>{
  const p=plan(); Object.assign(p.household,{maritalStatus:'married',partnerAge:60,partnerRetirementAge:60});
  p.budget.timeline.retirementMonthYou='2026-04'; p.budget.timeline.retirementMonthPartner='2026-10';
  p.budget.lines=[{...bill(),owner:'you',retirement:{rule:'stop',amount:null,reason:''}},{...bill(),id:'partner',owner:'partner',retirement:{rule:'replace',amount:50,reason:''}}];
  p.budget.overrides=[{id:'edit',lineId:'partner',fromMonth:'2026-02',throughMonth:'2026-02',amount:0}];
  const ms=buildBudgetYear(p.budget,p.household,2026,2026);
  assert.deepEqual(ms.map(m=>m.spending),[200,100,200,100,100,100,100,100,100,50,50,50]);
  assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(p))).budget,p.budget);
});
test('net payroll reconciles contributions once, and retirement stops pay',()=>{
  const p=plan(); p.budget.timeline.retirementMonthYou='2026-07';
  p.accounts.push({id:'save',name:'Synthetic Savings',kind:'taxable',owner:'you',balance:0,costBasis:0,annualContribution:99999});
  p.budget.pay=[{id:'pay',name:'Synthetic Pay',owner:'you',amount:70,frequency:'monthly',nextPayDate:'',payroll:{gross:100,taxableWages:90,incomeTaxWithheld:10,otherDeductions:10,employeeSavings:10,employerSavings:5,accountId:'save'}}];
  assert.equal(payrollReconciliation(p.budget.pay[0],['save']).complete,true);
  const r=projectMonthly(p);
  close(r.years[0].income,420); close(r.years[0].savings,90); close(r.years[0].taxRefund,60);
  close(r.years[0].portfolio,9370); // 10000 + 420 + 90 + 60 - 1200
  for(const m of r.months) close(m.conservationResidual,0);
  p.budget.pay[0].amount=75;
  assert.equal(projectMonthly(p).months.length,0);
});
test('savings transfer is capped by available cash and never creates assets',()=>{
  const p=plan(); p.budget.timeline.retirementMonthYou='2027-01'; p.budget.lines[0].amount=0;
  p.accounts[0].balance=10;
  p.accounts.push({id:'save',name:'Synthetic Savings',kind:'taxable',owner:'you',balance:0,annualContribution:0});
  p.budget.savings=[{id:'s',name:'Synthetic Transfer',accountId:'save',amount:20,frequency:'monthly',owner:'you'}];
  const r=projectMonthly(p); close(r.months[0].savingsFunded,10); close(r.months[0].savingsUnfunded,10); close(r.years[0].portfolio,10);
});
test('tax-funded traditional withdrawals trigger additional tax and expose shortfalls',()=>{
  const p=plan(); p.accounts=[{id:'ira',name:'Synthetic IRA',kind:'traditional',owner:'you',balance:100000,annualContribution:0}];
  p.budget.lines[0].amount=3000;
  const r=projectMonthly(p); assert.ok(r.years[0].taxes>0);
  close(100000-r.years[0].portfolio,36000+r.years[0].taxes);
  for(const m of r.months) close(m.conservationResidual,0);
  p.accounts[0].balance=100;
  assert.equal(projectMonthly(p).firstShortfall,'2026-01');
});
test('cash receives cash interest only and a guardrail changes discretionary spending',()=>{
  const p=plan(); p.assumptions.cashReturn=12; p.assumptions.retirementReturn=90;
  p.budget.lines[0].essential=false; p.laboratory.settings.guardrailFloor=20000;p.laboratory.settings.discretionaryCutPercent=50;
  const r=projectMonthly(p); close(r.months[0].discretionary,50);close(r.months[0].cashInterest,99.5);close(r.months[0].portfolio,10049.5);
  for(const m of r.months)close(m.conservationResidual,0);
});
test('cash coverage looks forward to irregular bills without charging the reserve as spending',()=>{
  const p=plan();Object.assign(p.budget.lines[0],{amount:1200,frequency:'annual',nextDueDate:'2026-07-01'});
  p.laboratory.settings.cashCoverageMonths=6;
  const r=projectMonthly(p);close(r.months[0].spending,0);close(r.months[0].cashTarget,1200);close(r.months[0].portfolio,10000);close(r.months[6].spending,1200);close(r.months[6].cashTarget,0);
});
test('confirmed cash event occurs exactly once and missing tax treatment blocks it',()=>{
  const p=plan(); p.laboratory.events=[{id:'event',name:'Synthetic Receipt',month:'2026-06',kind:'cashReceipt',amount:100,taxableAmount:0,confirmedCashTreatment:true}];
  close(projectMonthly(p).years[0].portfolio,8900);
  p.laboratory.events[0].confirmedCashTreatment=false;
  assert.equal(projectMonthly(p).months.length,0);
});
test('conversions require confirmed source, preserve assets before tax, and create locked lots',()=>{
  const p=plan();p.accounts.push({id:'ira',name:'Synthetic IRA',owner:'you',kind:'traditional',balance:100,annualContribution:0,conversionEligiblePretax:true},{id:'roth',name:'Synthetic Roth',owner:'you',kind:'roth',balance:0,annualContribution:0,rothQualifiedFromYear:2026});
  Object.assign(p.rothConversionPlanning,{annualConversionYou:100,startAgeYou:60,endAgeYou:60});
  const r=projectMonthly(p);close(r.years[0].converted,100);close(r.years[0].portfolio,8900);
  p.accounts[1].conversionEligiblePretax=false;
  const blocked=projectMonthly(p);close(blocked.years[0].converted,0);assert.equal(blocked.supported,false);
});

test('scenario-only care costs repeat through the end month and reserve includes the upcoming shock once',()=>{
  const p=plan();p.laboratory.settings.cashCoverageMonths=6;
  const events=[{id:'care',name:'Synthetic Care',kind:'expense',month:'2026-04',throughMonth:'2026-06',amount:200,taxableAmount:null,confirmedCashTreatment:false}];
  const r=projectMonthly(p,{events});
  close(r.months[0].cashTarget,1200); // Six months of 100 ordinary bills + three care payments of 200.
  assert.deepEqual(r.months.map(m=>m.eventExpense),[0,0,0,200,200,200,0,0,0,0,0,0]);
  close(r.years[0].portfolio,8200);close(projectMonthly(p).years[0].portfolio,8800);
  p.laboratory.events=events;assert.equal(normalizePlan(JSON.parse(JSON.stringify(p))).laboratory.events[0].throughMonth,'2026-06');
});

test('guardrail restores spending after recovery and protects essential costs',()=>{
  const p=plan();p.budget.lines[0].essential=false;p.laboratory.settings.guardrailFloor=11000;p.laboratory.settings.discretionaryCutPercent=50;
  p.laboratory.events=[{id:'gift',name:'Synthetic Cash',month:'2026-02',kind:'cashReceipt',amount:5000,taxableAmount:0,confirmedCashTreatment:true}];
  const r=projectMonthly(p);close(r.months[0].discretionary,50);close(r.months[2].discretionary,100);
  p.budget.lines[0].essential=true;close(projectMonthly(p).months[0].essential,100);close(projectMonthly(p).months[0].discretionaryReduction,0);
});

test('benefit withholding changes deposit timing but is credited once against annual tax',()=>{
 const p=plan();p.income=[{id:'pension',name:'Synthetic Pension',owner:'you',kind:'pension',startAge:60,annualAmount:1200,cola:0,survivorPercent:0,withholdingPercent:10}];
 const r=projectMonthly(p);close(r.months[0].pension,90);close(r.months[0].withholding,10);close(r.years[0].income,1080);close(r.years[0].withholding,120);close(r.years[0].taxRefund,120);close(r.years[0].portfolio,10000);
 for(const m of r.months)close(m.conservationResidual,0);
 assert.equal(normalizePlan(JSON.parse(JSON.stringify(p))).income[0].withholdingPercent,10);
 p.income[0].withholdingPercent=101;assert.throws(()=>normalizePlan(p),/withholding/);assert.equal(projectMonthly(p).months.length,0);
});

test('dependable benefit coverage uses the deposited amount after withholding',()=>{
 const p=plan();p.income=[{id:'pension',name:'Synthetic Pension',owner:'you',kind:'pension',startAge:60,annualAmount:1200,cola:0,survivorPercent:0,withholdingPercent:10}];
 p.laboratory.settings.cashCoverageMonths=6;p.laboratory.settings.dependableIncomeSource='benefits';
 close(projectMonthly(p).months[0].cashTarget,60); // Six bills of 100 less six deposits of 90.
 p.household.maritalStatus='married';p.household.partnerAge=0;assert.equal(projectMonthly(p).months.length,0);
});

test('jointly labeled Roth assets do not inherit one spouses qualified-distribution status',()=>{
 const p=plan();p.accounts=[{id:'roth',name:'Synthetic Roth',kind:'roth',owner:'joint',balance:10000,annualContribution:0,rothQualifiedFromYear:2026}];
 const result=projectMonthly(p);assert.equal(result.months.length,0);assert.ok(result.issues.some(i=>i.includes('individual owner')));
});
