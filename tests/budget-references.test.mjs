import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBudgetReference, canUndoBudgetReference, electricityReference, ELECTRICITY_BILLS, NATIONAL_BUDGET_REFERENCES, undoBudgetReference } from '../lib/budget-references.ts';
import { normalizeBudget, EMPTY_BUDGET } from '../lib/budget.ts';
const line=()=>({id:'b',name:'Synthetic Reference',category:'Other',amount:null,frequency:'annual',essential:false,owner:'household',nextDueDate:'',endDate:'',retirement:{rule:'replace',amount:50,reason:'Synthetic Override'}});
test('references preserve frequency and independent retirement choices with reversible source receipts',()=>{
 const original=line(),r=NATIONAL_BUDGET_REFERENCES.find(r=>r.id==='bls-2024-food-home');
 const applied=applyBudgetReference(original,r,'current');assert.equal(applied.amount,6224);assert.equal(applied.frequency,'annual');assert.equal(applied.retirement.amount,50);assert.equal(original.amount,null);
 assert.deepEqual(undoBudgetReference(applied),original);
 const imported=normalizeBudget({...structuredClone(EMPTY_BUDGET),lines:JSON.parse(JSON.stringify([applied]))});assert.equal(imported.lines[0].reference.reference.period,'2024');
 applied.amount=10;assert.equal(canUndoBudgetReference(applied),false);assert.equal(undoBudgetReference(applied).amount,10);
});
test('electric bill catalog covers states/DC with source scope and no guessed location',()=>{
 assert.equal(Object.keys(ELECTRICITY_BILLS).length,51);assert.equal(electricityReference('CT').monthly,199.66);assert.equal(electricityReference('ID').monthly,108.73);assert.equal(electricityReference('not-a-state'),null);
 assert.equal(electricityReference('DC').period,'2024');
});
