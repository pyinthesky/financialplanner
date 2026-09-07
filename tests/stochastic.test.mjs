import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN } from '../lib/planner.ts';
import { EMPTY_LAB } from '../lib/monthly-model.ts';
import { baselineSnapshot } from '../lib/scenarios.ts';
import { runSimulation, returnPaths, simulationError } from '../lib/stochastic.ts';
const plan=()=>{const p=structuredClone(DEFAULT_PLAN);Object.assign(p.household,{currentAge:60,retirementAge:60,planToAge:60});p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};p.accounts=[{id:'invest',name:'Synthetic Investment',kind:'taxable',owner:'you',balance:1000,costBasis:1000,annualContribution:0}];p.laboratory=structuredClone(EMPTY_LAB);return p;};
const settings={mean:10,volatility:0,fee:1,samples:3,seed:7};
test('zero-volatility path reproduces independently calculated net growth and identical scenario outcomes',()=>{
 const p=plan();p.laboratory.scenarios=[{id:'same',name:'Synthetic Equivalent',baseline:baselineSnapshot(p),overrides:{}}];
 const result=runSimulation(p,settings);
 assert.equal(result.length,2);assert.equal(result[0].fullyFunded,3);assert.ok(Math.abs(result[0].median-1089)<0.005);assert.equal(result[0].median,result[1].median);assert.equal(result[0].p10,result[0].p90);
 assert.equal(p.accounts[0].balance,1000);
});
test('same seed reproduces paths, different seeds differ, and cash does not earn simulated investment returns',()=>{
 const input={...settings,volatility:20};const a=returnPaths(input,2026,5);
 assert.deepEqual(a,returnPaths(input,2026,5));assert.notDeepEqual(a,returnPaths({...input,seed:8},2026,5));assert.ok(a.flat().every(r=>r.rate>-100));
 const p=plan();p.accounts[0].kind='cash';p.assumptions.cashReturn=12;
 const result=runSimulation(p,input);assert.ok(Math.abs(result[0].median-1000*Math.pow(1.01,12))<0.005);
 assert.ok(simulationError({...settings,seed:null}));
});
