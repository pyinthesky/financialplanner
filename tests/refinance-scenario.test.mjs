import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN, normalizePlan, activeMortgageStatement } from '../lib/planner.ts';
import { EMPTY_LAB } from '../lib/monthly-model.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';
import { baselineSnapshot, comparison, scenarioIsStale } from '../lib/scenarios.ts';
import { refinanceScenarioPlan } from '../lib/refinance-scenario.ts';
import { emptyRefinance, payment } from '../lib/refinance.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<.005,`${a} vs ${b}`);
const plan=()=>{const p=structuredClone(DEFAULT_PLAN);p.laboratory=structuredClone(EMPTY_LAB);Object.assign(p.household,{currentAge:60,retirementAge:60,planToAge:61,birthYear:1966});p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};p.accounts=[{id:'cash',name:'Synthetic Cash',kind:'cash',owner:'you',balance:50000,annualContribution:0}];p.debts=[{id:'loan',kind:'mortgage',name:'Synthetic Loan',balance:12000,interestRate:6,minimumPayment:payment(12000,6,24)}];return p;};
const offer=()=>({...emptyRefinance('loan'),years:2,rate:3,fees:120,horizon:24});
test('Opening refinance changes monthly debt and cash, retains baseline and counts upfront fees once',()=>{
 const p=plan(),before=JSON.stringify(p),c=offer(),r=projectMonthly(p,{refinance:c}),base=projectMonthly(p);
 assert.ok(r.supported,r.issues.join(';'));assert.equal(JSON.stringify(p),before);
 close(r.months[0].eventExpense,120);close(r.months.slice(1).reduce((n,m)=>n+m.eventExpense,0),0);
 close(r.months[0].debtInterest,30);close(r.months[0].debtPrincipal,payment(12000,3,24)-30);
 assert.ok(r.months.at(-1).portfolio>base.months.at(-1).portfolio);
 for(const m of r.months)close(m.conservationResidual,0);
});
test('Financed fees increase principal with no duplicate cash charge and preserve zero-rate payoff',()=>{
 const p=plan(),c={...offer(),financed:true,rate:0},r=projectMonthly(p,{refinance:c});assert.ok(r.supported,r.issues.join(';'));
 close(r.months[0].eventExpense,0);close(r.months[0].debtPrincipal,505);close(r.months[0].liabilities,11615);close(r.months.at(-1).liabilities,0);
 close(r.months.at(-1).portfolio,50000-12120);for(const m of r.months)close(m.conservationResidual,0);
 const zero=projectMonthly(p,{refinance:{...c,fees:0}});close(zero.months.at(-1).portfolio,38000);
});
test('Statement escrow is preserved and reconciled while only P&I changes',()=>{
 const p=plan(),pi=p.debts[0].minimumPayment;p.housing.statement={enabled:true,debtId:'loan',principalInterest:pi,total:pi+110,propertyTax:60,insurance:40,mortgageInsurance:10,otherEscrow:0};
 const next=refinanceScenarioPlan(p,offer()).plan,s=activeMortgageStatement(next);assert.ok(s);close(s.propertyTax,60);close(s.insurance,40);close(s.total-s.principalInterest,110);
 const r=projectMonthly(p,{refinance:offer()});assert.ok(r.supported,r.issues.join(';'));close(r.months[0].housing,110);close(r.months[0].debtPrincipal+r.months[0].debtInterest,payment(12000,3,24));
 p.housing.statement.total=1;assert.equal(projectMonthly(p,{refinance:offer()}).supported,false);
});
test('Refinance keeps cascading extras and adds closing cost alongside existing or overridden events',()=>{
 const p=plan();p.debtStrategy={method:'snowball',extraMonthlyPayment:50};p.debts.push({id:'small',kind:'other',name:'Synthetic Small Loan',balance:20,interestRate:0,minimumPayment:20});
 const event={id:'cost',name:'Synthetic Cost',kind:'expense',month:'2026-01',amount:7,taxableAmount:0,confirmedCashTreatment:true};p.laboratory.events=[event];
 const r=projectMonthly(p,{refinance:offer()});assert.ok(r.supported,r.issues.join(';'));close(r.months[0].eventExpense,127);assert.ok(r.months[1].debtPrincipal+r.months[1].debtInterest>=payment(12000,3,24)+69.99);
 close(projectMonthly(p,{refinance:offer(),events:[{...event,amount:9}]}).months[0].eventExpense,129);
});
test('Incomplete, invalid, rental and conflicting refinancing scenarios are gated',()=>{
 const p=plan();for(const c of [emptyRefinance('loan'),{...offer(),debtId:'missing'},{...offer(),horizon:1.5},{...offer(),fees:-1}])assert.equal(projectMonthly(p,{refinance:c}).supported,false);
 assert.equal(projectMonthly(p,{refinance:offer(),mortgagePayoff:{debtId:'loan',month:'2026-06',destination:'cash',accountId:''}}).supported,false);
 p.realEstate={properties:[{debtId:'loan'}]};assert.ok(refinanceScenarioPlan(p,offer()).issues.some(i=>i.includes('Rental')));
 delete p.realEstate;p.budget.timeline.startYear=null;assert.ok(refinanceScenarioPlan(p,offer()).issues.some(i=>i.includes('year')));
});
test('Saved refinance snapshots round-trip, compare against original debt, and become stale on loan edits',()=>{
 const p=plan(),s={id:'r',name:'Synthetic Refinance',baseline:baselineSnapshot(p),overrides:{refinance:offer()}};p.laboratory.scenarios=[s];
 const loaded=normalizePlan(JSON.parse(JSON.stringify(p)));assert.deepEqual(loaded.laboratory.scenarios[0].overrides,s.overrides);
 const result=comparison(loaded,loaded.laboratory.scenarios).scenarios[0];assert.ok(result.comparable);assert.ok(result.deltaPortfolio>0);assert.equal(scenarioIsStale(loaded,s),false);
 loaded.refinancing=[{...offer(),rate:9}];assert.equal(scenarioIsStale(loaded,s),false);loaded.debts[0].interestRate=9;assert.equal(scenarioIsStale(loaded,s),true);
 const bad=structuredClone(p);bad.laboratory.scenarios[0].overrides.refinance.fees=-1;assert.throws(()=>normalizePlan(bad));
});
