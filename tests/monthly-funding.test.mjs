import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN } from '../lib/planner.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';
import { monthlyFunding } from '../lib/monthly-funding.ts';
test('cash funding display reconciles withdrawals, payroll transfers, refunds, and cash reserves',()=>{
 const p=structuredClone(DEFAULT_PLAN);Object.assign(p.household,{currentAge:60,retirementAge:61,planToAge:60,birthYear:1966});
 p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.budget.timeline={startYear:2026,retirementMonthYou:'2027-01',retirementMonthPartner:''};
 p.accounts=[{id:'cash',name:'Synthetic Cash',kind:'cash',owner:'you',balance:10,annualContribution:0},{id:'invest',name:'Synthetic Account',kind:'taxable',owner:'you',balance:10000,costBasis:10000,annualContribution:0}];
 p.budget.pay=[{id:'pay',name:'Synthetic Pay',owner:'you',amount:70,frequency:'monthly',nextPayDate:'',payroll:{gross:100,taxableWages:90,incomeTaxWithheld:10,otherDeductions:10,employeeSavings:10,employerSavings:5,accountId:'cash'}}];
 p.budget.lines=[{id:'bill',name:'Synthetic Bill',category:'Other',amount:100,frequency:'monthly',essential:true,owner:'household',nextDueDate:'',endDate:'',retirement:{rule:'continue',amount:null,reason:''}}];
 p.budget.savings=[{id:'save',name:'Synthetic Transfer',accountId:'invest',amount:10,frequency:'monthly',owner:'you'}];
 const r=projectMonthly(p);assert.equal(r.months.length,12);
 for(const m of r.months){const f=monthlyFunding(m);assert.ok(Math.abs(f.residual)<0.005,`${m.month}: ${f.residual}`);assert.equal(m.incomeByOwner.you.pay,70);assert.equal(m.incomeByOwner.partner.pay,0);}
 const jan=monthlyFunding(r.months[0]);assert.equal(jan.total,100);assert.equal(jan.sources.find(v=>v.name==='Opening Cash Used').amount,10);assert.equal(jan.sources.find(v=>v.name==='Investment Draws & RMDs').amount,5);
});
