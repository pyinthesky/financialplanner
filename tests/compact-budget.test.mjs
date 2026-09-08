import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PLAN,normalizePlan,debtPayoffSchedule} from '../lib/planner.ts';
import {suggestedBills,matchingReference} from '../lib/budget-catalog.ts';
import {budgetView,budgetViewMonth} from '../lib/budget-view.ts';
import {isBlankPlan,createSaveGuard} from '../lib/plan-lifecycle.ts';
import {projectMonthly} from '../lib/monthly-projection.ts';
import {summaryFlow} from '../lib/summary-flow.ts';
function fixture(){
 const p=structuredClone(DEFAULT_PLAN);Object.assign(p.household,{currentAge:60,retirementAge:61,planToAge:62,birthYear:1966});
 p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.budget.timeline={startYear:2026,retirementMonthYou:'2027-01',retirementMonthPartner:''};
 p.accounts=[{id:'cash',name:'Synthetic Cash',kind:'cash',owner:'you',balance:10000,annualContribution:0}];
 const l=suggestedBills([]).find(l=>l.id==='suggested-food-home');l.amount=100;l.essential=true;p.budget.lines=[l];
 p.debts=[{id:'a',name:'Synthetic A',kind:'other',balance:100,minimumPayment:50,interestRate:0},{id:'b',name:'Synthetic B',kind:'other',balance:400,minimumPayment:100,interestRate:0}];p.debtStrategy={method:'snowball',extraMonthlyPayment:50};
 return p;
}
test('catalog suggestions stay blank and do not alter onboarding; source follows the bill category',()=>{
 const p=structuredClone(DEFAULT_PLAN),rows=suggestedBills(p.budget.lines);
 assert.ok(rows.length>20);assert.ok(rows.every(l=>l.amount===null));assert.ok(isBlankPlan(p));
 const grocery=rows.find(l=>l.name==='Groceries');assert.ok(matchingReference(grocery,''));assert.equal(matchingReference(rows.find(l=>l.name==='Rent'),'VA'),null);
 p.budget.lines=[{...grocery,name:'Synthetic Weekly Shop',amount:0}];
 assert.equal(suggestedBills(p.budget.lines).some(l=>l.id===grocery.id),false);
 assert.equal(normalizePlan(JSON.parse(JSON.stringify(p))).budget.lines[0].name,'Synthetic Weekly Shop');assert.equal(p.budget.lines[0].amount,0);assert.equal(isBlankPlan(p),false);
});
test('linked debt rows use actual cascaded payments and disappear after payoff',()=>{
 const p=fixture(),ledger=debtPayoffSchedule(p);
 const feb=budgetView(p,'2026-02');assert.equal(feb.linked.find(l=>l.id==='a'),undefined);assert.equal(feb.linked.find(l=>l.id==='b').amount,ledger[2].payments.find(l=>l.id==='b').payment);assert.equal(feb.linked.find(l=>l.id==='b').amount,200);
 assert.equal(budgetViewMonth(p,true),'2027-01');assert.equal(budgetView(p,budgetViewMonth(p,true)).linked.length,0);
 assert.throws(()=>budgetView(p,'2025-12'),/valid month/);
});
test('current and retirement Sankeys reconcile by category, include debt, and never invent funding',()=>{
 const p=fixture(),r=projectMonthly(p);assert.equal(r.supported,true,JSON.stringify(r.issues));
 for(const row of r.months){const f=summaryFlow(p,row);assert.ok(Math.abs(f.residual)<.005,`${row.month}: ${f.residual}`);assert.equal(f.uses.find(l=>l.name==='Food')?.amount,100);}
 assert.ok(summaryFlow(p,r.months[0]).uses.some(l=>l.name==='Debt Payments'));
 assert.equal(summaryFlow(p,r.months[12]).uses.some(l=>l.name==='Debt Payments'),false);
 p.accounts[0].balance=20;const poor=projectMonthly(p).months[0],flow=summaryFlow(p,poor);assert.ok(flow.unfunded>0);assert.equal(flow.total,20);assert.ok(Math.abs(flow.residual)<.005);assert.equal(flow.uses.some(l=>l.name==='Food'),false);
});
test('reset invalidates both scheduled and in-flight encrypted saves',async()=>{
 const guard=createSaveGuard(),writes=[],queued=guard.lease();guard.cancel();assert.equal(queued(),false);
 let finish;const pending=guard.save(()=>new Promise(resolve=>{finish=resolve;}),v=>writes.push(v));guard.cancel();finish('old ciphertext');assert.equal(await pending,false);assert.deepEqual(writes,[]);
 assert.equal(await guard.save(async()=> 'new ciphertext',v=>writes.push(v)),true);assert.deepEqual(writes,['new ciphertext']);
});
