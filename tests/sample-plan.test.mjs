import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizePlan} from '../lib/planner.ts';
import {projectMonthly} from '../lib/monthly-projection.ts';
import {scenarioIsStale,evaluateScenario} from '../lib/scenarios.ts';
import {summaryFlow} from '../lib/summary-flow.ts';
test('fictional sample and fresh comparisons are supported; every sample Sankey balances',()=>{
 const p=normalizePlan(JSON.parse(fs.readFileSync(new URL('../public/sample-plan.json',import.meta.url),'utf8')));
 const r=projectMonthly(p);assert.equal(r.supported,true,JSON.stringify(r.issues));
 assert.ok(p.accounts.length>=6,'Sample exercises the investment summary');
 assert.ok((p.realEstate?.properties.length??0)>0,'Sample exercises the real-estate summary');
 assert.ok(p.realEstate?.properties.every(v=>v.taxConfirmed&&v.value!==null&&v.rent!==null),'Sample rentals are projection-ready');
 assert.ok(p.refinancing?.some(v=>v.benchmarkEligible),'Sample exercises refinancing');
 for(const m of r.months)assert.ok(Math.abs(summaryFlow(p,m).residual)<.005,`Cash flow ${m.month}`);
 assert.equal(p.laboratory.scenarios.length,3);
 for(const s of p.laboratory.scenarios){assert.equal(scenarioIsStale(p,s),false);const c=evaluateScenario(s);assert.equal(c.supported,true,JSON.stringify(c.issues));}
});
