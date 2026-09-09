import test from 'node:test';
import assert from 'node:assert/strict';
import { newDependent, newEducationAccount, projectEducation, linkEducationBudget, normalizeDependents, normalizeEducation } from '../lib/education.ts';
import { normalizePlan, DEFAULT_PLAN, totalPortfolio } from '../lib/planner.ts';
import { buildBudgetYear } from '../lib/budget-calendar.ts';
import { baselineSnapshot } from '../lib/scenarios.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(){const p=normalizePlan(structuredClone(DEFAULT_PLAN));p.budget.timeline={startYear:2026,retirementMonthYou:'2027-01',retirementMonthPartner:''};p.household.dependents=[{...newDependent('d'),birthYear:2010,collegeStartYear:2028,collegeYears:2,annualCost:10000,costGrowth:0}];p.education={accounts:[{...newEducationAccount('a'),beneficiaryId:'d',balance:5000,monthlyContribution:100,returnRate:0}]};return p;}
test('new household/529 inputs are blank and normalization strips unknown personal fields',()=>{assert.equal(newDependent('d').birthYear,null);assert.equal(newEducationAccount('a').balance,null);assert.equal(normalizeDependents([{id:'x',name:'not retained',collegeYears:1.5}])[0].collegeYears,null);assert.ok(!JSON.stringify(normalizeEducation({accounts:[{id:'a',name:'not retained',balance:Infinity}]})).includes('not retained'));});
test('529 saving, tuition withdrawals and funding gaps reconcile without retirement assets',()=>{
 const p=fixture(),before=totalPortfolio(p),g=projectEducation(p).goals[0];assert.deepEqual(g.issues,[]);close(g.collegeOpening,7400);close(g.totalCost,20000);close(g.totalGap,12600);close(g.rows[2].withdrawal,7400);close(g.rows[3].withdrawal,0);for(const r of g.rows)close(r.ending,r.opening+r.contributions+r.growth-r.withdrawal);close(totalPortfolio(p),before);
});
test('multiple 529 accounts share one goal; cost growth is applied once and stops saving at college',()=>{
 const p=fixture();p.household.dependents[0].costGrowth=10;p.education.accounts.push({...p.education.accounts[0],id:'b',balance:5000});const g=projectEducation(p).goals[0];close(g.collegeOpening,14800);close(g.rows[2].cost,12100);close(g.rows[2].contributions,0);close(g.totalCost,25410);
});
test('each beneficiary retains separate goals and accounts; missing or removed links never produce a complete result',()=>{
 const p=fixture();p.household.dependents.push({...p.household.dependents[0],id:'e'});p.education.accounts.push({...p.education.accounts[0],id:'b',beneficiaryId:'e'});assert.equal(projectEducation(p).goals.length,2);p.household.dependents.shift();assert.ok(projectEducation(p).issues.some(s=>s.includes('Assign')));p.household.dependents[0].collegeYears=null;assert.ok(projectEducation(p).goals[0].issues.length);
});
test('negative assumed returns reduce education assets but conserve each row',()=>{const p=fixture();p.education.accounts[0].returnRate=-10;const g=projectEducation(p).goals[0];assert.ok(g.collegeOpening<7400);for(const r of g.rows)close(r.ending,r.opening+r.contributions+r.growth-r.withdrawal);});
test('budget link is explicit/idempotent, carries into retirement and stops before college',()=>{
 const p=fixture(),before=baselineSnapshot(p);let linked=linkEducationBudget(p,'a');assert.equal(p.budget.lines.length,0);linked=linkEducationBudget(linked,'a');assert.equal(linked.budget.lines.length,1);assert.notEqual(baselineSnapshot(linked),before);
 close(buildBudgetYear(linked.budget,linked.household,2027,2026).reduce((s,r)=>s+r.spending,0),1200);close(buildBudgetYear(linked.budget,linked.household,2028,2026).reduce((s,r)=>s+r.spending,0),0);
 assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(linked))).education,linked.education);assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(linked))).household.dependents,linked.household.dependents);
});
test('education-only comparisons do not stale retirement scenarios until a budget provision changes',()=>{const p=fixture(),before=baselineSnapshot(p);p.education.accounts[0].monthlyContribution=999;assert.equal(baselineSnapshot(p),before);assert.notEqual(baselineSnapshot(linkEducationBudget(p,'a')),before);});
