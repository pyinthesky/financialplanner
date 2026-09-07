import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetAllocation, budgetTotals, normalizeBudget, EMPTY_BUDGET } from '../lib/budget.ts';
import { DEFAULT_PLAN } from '../lib/planner.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';
test('envelope allocations explain a total without increasing spending and preserve retirement overrides',()=>{
 const line={id:'envelope',name:'Synthetic Envelope',category:'Other',amount:100,frequency:'monthly',essential:false,owner:'household',nextDueDate:'',endDate:'',retirement:{rule:'replace',amount:80,reason:''},allocations:[{id:'a',name:'Synthetic Bill',amount:30,retirement:{rule:'continue',amount:null}},{id:'b',name:'Synthetic Bill',amount:20,retirement:{rule:'replace',amount:10}}]};
 const budget={...structuredClone(EMPTY_BUDGET),lines:[line]};
 assert.equal(budgetTotals(budget).spending,1200);assert.equal(budgetTotals(budget,true).spending,960);
 assert.equal(budgetAllocation(line).remaining,50);assert.equal(budgetAllocation(line,true).remaining,40);
 assert.deepEqual(normalizeBudget(JSON.parse(JSON.stringify(budget))),budget);
 line.amount=40;assert.equal(budgetAllocation(line).overallocated,true);
 const p=structuredClone(DEFAULT_PLAN);p.budget=budget;
 assert.ok(projectMonthly(p).issues.some(v=>v.includes('breakdown exceeds')));
});
