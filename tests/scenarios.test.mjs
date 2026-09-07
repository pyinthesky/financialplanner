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
