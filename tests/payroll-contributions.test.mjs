import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ELECTION, contributionPreview, applyContributionElection, paycheckCount } from '../lib/payroll-contributions.ts';
import { payrollReconciliation, buildBudgetYear } from '../lib/budget-calendar.ts';
import { DEFAULT_PLAN, normalizePlan } from '../lib/planner.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';
import { EMPTY_LAB } from '../lib/monthly-model.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<.005,`${a} != ${b}`);
const accounts=[{id:'t',name:'Fictional Traditional',owner:'you',kind:'traditional',balance:0,annualContribution:0},{id:'r',name:'Fictional Roth',owner:'you',kind:'roth',balance:0,annualContribution:0}];
const pay=()=>({id:'pay',name:'Fictional Pay',owner:'you',amount:null,frequency:'monthly',nextPayDate:'',payroll:{gross:10000,taxableWages:null,incomeTaxWithheld:1500,otherDeductions:1000,employeeSavings:null,employerSavings:null,accountId:''}});
const election=()=>({...EMPTY_ELECTION,year:2026,mode:'maximum',otherDeferrals:0,employeeRothPercent:0,employerAmount:6000,employerRothPercent:0,otherPretax:200,traditionalAccountId:'t',rothAccountId:'r'});
test('maximum election uses the shared 2026 limit and separate employer funding',()=>{const e=election();e.otherDeferrals=5000;const r=contributionPreview(pay(),e,1980,accounts);assert.deepEqual(r.issues,[]);close(r.employee,19500);close(r.employer,6000);close(r.taxableWages,8175);});
test('fixed annual and percentage elections agree at equivalent amounts',()=>{const e={...election(),mode:'fixed',amount:12000},a=contributionPreview(pay(),e,1980,accounts),b=contributionPreview(pay(),{...e,mode:'percent',amount:10},1980,accounts);close(a.employee,b.employee);close(a.employee,12000);});
test('catch-up ages 49/50/59/60/63/64 and high-wage boundary are explicit',()=>{
 for(const [age,limit] of [[50,32500],[59,32500],[60,35750],[63,35750],[64,32500]]){const e={...election(),catchUp:true,priorYearWages:150000};const r=contributionPreview(pay(),e,2026-age,accounts);assert.deepEqual(r.issues,[]);close(r.employee,limit);close(r.employeeRoth,0);const high=contributionPreview(pay(),{...e,priorYearWages:150001},2026-age,accounts);close(high.mandatoryRoth,limit-24500);close(high.employeeRoth,limit-24500);}
 assert.ok(contributionPreview(pay(),{...election(),catchUp:true,priorYearWages:0},1977,accounts).issues.length);
 assert.ok(contributionPreview(pay(),{...election(),catchUp:true},0,accounts).issues.length);
});
test('over-limit, negative, missing or unsupported elections cannot be applied',()=>{
 for(const e of [{...election(),year:2027},{...election(),mode:'fixed',amount:50000},{...election(),mode:'fixed',amount:-1},{...election(),otherDeferrals:null},{...election(),employeeRothPercent:101},{...election(),employerAmount:80000},{...election(),otherPretax:2000}])assert.throws(()=>applyContributionElection(pay(),e,1980,accounts));
});
test('Roth employee and employer split preserves take-home and adds employer taxable income separately',()=>{
 const e={...election(),mode:'fixed',amount:12000,employeeRothPercent:50,employerRothPercent:50,employerRothConfirmed:true};const applied=applyContributionElection(pay(),e,1980,accounts);
 assert.equal(payrollReconciliation(applied,accounts.map(a=>a.id)).complete,true);close(applied.amount,6500);close(applied.payroll.taxableWages,9300);close(applied.payroll.employerTaxable,250);close(applied.payroll.allocations[0].employee,500);close(applied.payroll.allocations[1].employer,250);
 assert.throws(()=>applyContributionElection(pay(),{...e,employerRothConfirmed:false},1980,accounts));assert.throws(()=>applyContributionElection(pay(),e,1980,accounts.map(a=>({...a,owner:'partner'}))));
 applied.payroll.employeeSavings=2000;assert.equal(payrollReconciliation(applied,['t','r']).complete,false);
});
test('actual dated paycheck counts avoid 26-pay assumption in a 27-pay year',()=>{const p=pay();p.frequency='biweekly';p.nextPayDate='2026-01-01';assert.equal(paycheckCount(p,2026),27);const applied=applyContributionElection(p,election(),1980,accounts);close(applied.payroll.employeeSavings*27,24500);});
test('split contributions and employer Roth income reach monthly accounts/taxes exactly once',()=>{
 const p=normalizePlan(structuredClone(DEFAULT_PLAN));Object.assign(p.household,{maritalStatus:'single',filingStatus:'single',currentAge:46,birthYear:1980,retirementAge:65,planToAge:46});p.budget.timeline={startYear:2026,retirementMonthYou:'2045-01',retirementMonthPartner:''};p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.accounts=[...structuredClone(accounts),{id:'cash',name:'Fictional Cash',kind:'cash',owner:'you',balance:100000,annualContribution:0}];p.laboratory=structuredClone(EMPTY_LAB);
 const e={...election(),mode:'fixed',amount:12000,employeeRothPercent:50,employerRothPercent:50,employerRothConfirmed:true};p.budget.pay=[applyContributionElection(pay(),e,1980,p.accounts)];
 const result=projectMonthly(p);assert.equal(result.supported,true,JSON.stringify(result.issues));close(result.years[0].savings,18000);close(result.months.at(-1).accounts.t,9000);close(result.months.at(-1).accounts.r,9000);for(const m of result.months)close(m.conservationResidual,0);
 const calendar=buildBudgetYear(p.budget,p.household,2026,2026,p.accounts.map(a=>a.id));close(calendar.reduce((s,m)=>s+m.employerTaxable,0),3000);
 const noRoth=structuredClone(p);noRoth.budget.pay=[applyContributionElection(pay(),{...e,employerRothPercent:0},1980,p.accounts)];assert.ok(result.years[0].taxes>projectMonthly(noRoth).years[0].taxes);
 assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(p))).budget.pay,p.budget.pay);
 p.accounts.find(a=>a.id==='t').owner='partner';assert.equal(projectMonthly(p).supported,false);
});
