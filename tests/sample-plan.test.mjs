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
 for(const m of r.months)assert.ok(Math.abs(summaryFlow(p,m).residual)<.005,`Cash flow ${m.month}`);
 assert.equal(p.laboratory.scenarios.length,3);
 for(const s of p.laboratory.scenarios){assert.equal(scenarioIsStale(p,s),false);const c=evaluateScenario(s);assert.equal(c.supported,true,JSON.stringify(c.issues));}
});
