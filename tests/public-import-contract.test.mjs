import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { buildPublicContract } from '../scripts/public-import-contract.mjs';
import { DEFAULT_PLAN, normalizePlan } from '../lib/planner.ts';
import { budgetTotals } from '../lib/budget.ts';

const schema=JSON.parse(readFileSync('public/schemas/plan-v2.schema.json','utf8'));
const validate=new Ajv({allErrors:true,strict:false}).compile(schema);
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));

test('published schema and blank template stay aligned with application types and onboarding', () => {
  for(const [path,content] of buildPublicContract())assert.equal(readFileSync(path,'utf8'),content,`${path}: regenerate using npm run schema:write`);
  const blank=readJson('public/examples/blank-plan-v2.json');
  assert.deepEqual(blank,DEFAULT_PLAN);
  assert.equal(validate(blank),true,JSON.stringify(validate.errors));
  assert.deepEqual(normalizePlan(blank),normalizePlan(DEFAULT_PLAN));
  assert.equal(validate(readJson('public/sample-plan.json')),true,JSON.stringify(validate.errors));
});

test('published strict schema rejects invented fields, string money, missing requirements and unknown account kinds', () => {
  const extra=structuredClone(DEFAULT_PLAN);extra.privateNotes='Unrecognized field';assert.equal(validate(extra),false);
  const missing=structuredClone(DEFAULT_PLAN);delete missing.household;assert.equal(validate(missing),false);
  const wrong=structuredClone(DEFAULT_PLAN);wrong.schemaVersion=3;assert.equal(validate(wrong),false);
  wrong.schemaVersion=2;wrong.assumptions.inflation='5%';assert.equal(validate(wrong),false);
  const account=structuredClone(DEFAULT_PLAN);account.accounts=[{id:'account-1',name:'Investment 1',kind:'401k',owner:'you',balance:100,annualContribution:0}];
  assert.equal(validate(account),false);account.accounts[0].kind='traditional';assert.equal(validate(account),true);
});

test('documented bill imports with distinct current and retirement amounts, then survives export/re-import', () => {
  const guide=readFileSync('public/import-guide.md','utf8');
  const bill=JSON.parse(guide.match(/```json\n([\s\S]*?)\n```/)[1]);
  const file=readJson('public/examples/blank-plan-v2.json');file.budget.lines=[bill];file.budget.retirementSpendingSource='worksheet';
  assert.equal(validate(file),true,JSON.stringify(validate.errors));
  const imported=normalizePlan(file);
  assert.equal(budgetTotals(imported.budget).spending,1200);
  assert.equal(budgetTotals(imported.budget,true).spending,960);
  assert.equal(imported.budget.reviewed,false);
  assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(imported))),imported);
  // Type-derived schemas do not replace the app's semantic constraints.
  file.budget.lines[0].amount=-1;
  assert.equal(validate(file),true);
  assert.throws(()=>normalizePlan(file),/Invalid budget cost/);
});

test('llms.txt links to real public resources without an upload endpoint or plan URL parameters', () => {
  const text=readFileSync('public/llms.txt','utf8');
  assert.match(text,/^# Open Retirement Planner\n/);
  const urls=[...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(m=>new URL(m[1]));
  for(const url of urls) {
    assert.equal(url.search,'');assert.equal(url.hash,'');
    if(url.hostname==='pyinthesky.github.io'&&url.pathname!=='/financialplanner/')assert.ok(readFileSync('public/'+url.pathname.replace('/financialplanner/','')).length);
  }
  assert.ok(urls.some(url=>url.pathname.endsWith('plan-v2.schema.json')));
  assert.ok(urls.some(url=>url.pathname.endsWith('blank-plan-v2.json')));
});
