import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN, normalizePlan } from '../lib/planner.ts';
import { EMPTY_LAB } from '../lib/monthly-model.ts';
import { baselineSnapshot, comparison, scenarioIsStale, scenarioChanges } from '../lib/scenarios.ts';
const plan=()=>{
  const p=structuredClone(DEFAULT_PLAN);
  Object.assign(p.household,{currentAge:60,retirementAge:60,planToAge:61});
  p.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};
  p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';
  p.budget.lines=[{id:'b',name:'Synthetic Cost',category:'Other',amount:10,frequency:'monthly',essential:true,owner:'household',nextDueDate:'',endDate:'',retirement:{rule:'continue',amount:null,reason:''}}];
  p.accounts=[{id:'a',name:'Synthetic Account',kind:'taxable',owner:'you',balance:1000,costBasis:1000,annualContribution:0}];
  p.laboratory=structuredClone(EMPTY_LAB);return p;
};
test('identical snapshots produce exact zero deltas without mutating the plan',()=>{
  const p=plan(),before=JSON.stringify(p),s={id:'s',name:'',baseline:baselineSnapshot(p),overrides:{}};
  const c=comparison(p,[s]).scenarios[0];assert.equal(c.deltaPortfolio,0);assert.equal(c.deltaTax,0);assert.equal(JSON.stringify(p),before);
});
test('a stale scenario keeps its own baseline and refresh is explicit',()=>{
  const p=plan(),s={id:'s',name:'',baseline:baselineSnapshot(p),overrides:{spendingChangePercent:50}};
  p.laboratory.scenarios.push(s);assert.equal(scenarioIsStale(p,s),false);
  p.budget.lines[0].amount=20;assert.equal(scenarioIsStale(p,s),true);assert.deepEqual(scenarioChanges(p,s),['Budgets & Payroll']);
  assert.equal(Math.round(comparison(p,[s]).scenarios[0].deltaPortfolio),-120);
  const imported=normalizePlan(JSON.parse(JSON.stringify(p)));assert.equal(imported.laboratory.scenarios[0].baseline,s.baseline);
  const fresh=plan();fresh.laboratory.scenarios=[{id:'fresh',name:'',baseline:baselineSnapshot(fresh),overrides:{}}];
  const roundTrip=normalizePlan(JSON.parse(JSON.stringify(fresh)));assert.equal(scenarioIsStale(roundTrip,roundTrip.laboratory.scenarios[0]),false);
});
test('explicit sequence stresses use the same returns and expose order effects',()=>{
  const p=plan(),base=baselineSnapshot(p);
  const a={id:'a',name:'',baseline:base,overrides:{returnYears:[{year:2026,rate:-20},{year:2027,rate:25}]}};
  const b={id:'b',name:'',baseline:base,overrides:{returnYears:[{year:2026,rate:25},{year:2027,rate:-20}]}};
  const c=comparison(p,[a,b]);
  assert.ok(c.scenarios[0].result.years.at(-1).portfolio<c.scenarios[1].result.years.at(-1).portfolio);
  for(const s of c.scenarios)for(const m of s.result.months)assert.ok(Math.abs(m.conservationResidual)<0.005);
});
test('draft dated edits and stress controls survive local export without fabricated zero values',()=>{
  const p=plan();p.budget.overrides=[{id:'draft',lineId:'b',fromMonth:'',throughMonth:'',amount:null}];
  p.laboratory.scenarios=[{id:'s',name:'',baseline:baselineSnapshot(p),overrides:{returnYears:[{year:null,rate:null}]}}];
  const imported=normalizePlan(JSON.parse(JSON.stringify(p)));
  assert.equal(imported.budget.overrides[0].amount,null);
  assert.equal(comparison(imported,imported.laboratory.scenarios).scenarios[0].result.months.length,0);
});

test('debt strategy experiments cascade real payments without mutating their saved baseline', async()=>{
  const {debtScenarioPlan}=await import('../lib/debt-scenario.ts');
  const {debtPayoffSchedule}=await import('../lib/planner.ts');
  const p=plan();
  p.debts=[{id:'zero',name:'Zero APR',kind:'other',balance:100,interestRate:0,minimumPayment:25},{id:'interest',name:'Interest Loan',kind:'other',balance:300,interestRate:12,minimumPayment:25}];
  p.debtStrategy={method:'snowball',extraMonthlyPayment:50};
  const before=JSON.stringify(p),baseline=baselineSnapshot(p);
  const scenarios=['snowball','avalanche','custom'].map(method=>({id:method,name:'',baseline,overrides:{debtStrategy:{method,extraMonthlyPayment:50,customExtraPayments:{zero:0,interest:50}}}}));
  const schedules=scenarios.map(s=>debtPayoffSchedule(debtScenarioPlan(p,s.overrides)));
  assert.equal(schedules[0][1].payments[0].payment,75);
  assert.equal(schedules[1][1].payments[1].payment,75);
  assert.equal(schedules[2][1].payments[1].payment,75);
  const result=comparison(p,scenarios).scenarios;
  for(let i=0;i<result.length;i++){
    assert.equal(result[i].comparable,true);
    assert.equal(result[i].result.months[0].debtPrincipal,schedules[i][1].principalPaid);
    assert.equal(result[i].result.months[1].debtInterest,schedules[i][2].interestPaid);
    for(const month of result[i].result.months)assert.ok(Math.abs(month.conservationResidual)<.005);
  }
  assert.equal(result[0].deltaPortfolio,0);
  assert.ok(result[1].deltaPortfolio>0,'Earlier payments to the interest-bearing loan save interest');
  assert.equal(JSON.stringify(p),before);
  p.laboratory.scenarios=scenarios;
  const restored=normalizePlan(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(restored.laboratory.scenarios.map(s=>s.overrides),scenarios.map(s=>s.overrides));
});

test('scenario debt overrides reject negative and malformed payments while retaining explicit zero',()=>{
  for(const debtStrategy of [{method:'invalid'},{extraMonthlyPayment:-1},{extraMonthlyPayment:'10'},{customExtraPayments:{x:-1}},{customExtraPayments:[]},null]){
    const p=plan();p.laboratory.scenarios=[{id:'s',name:'',baseline:baselineSnapshot(p),overrides:{debtStrategy}}];
    assert.throws(()=>normalizePlan(p),/scenario debt strategy/);
  }
  const p=plan();p.laboratory.scenarios=[{id:'s',name:'',baseline:baselineSnapshot(p),overrides:{debtStrategy:{extraMonthlyPayment:0}}}];
  assert.equal(normalizePlan(p).laboratory.scenarios[0].overrides.debtStrategy.extraMonthlyPayment,0);
});
