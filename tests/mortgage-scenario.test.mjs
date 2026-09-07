import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN } from '../lib/planner.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.005,`${a} versus ${b}`);
const plan=()=>{const p=structuredClone(DEFAULT_PLAN);Object.assign(p.household,{currentAge:60,retirementAge:60,planToAge:61,birthYear:1966});p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};p.accounts=[{id:'cash',name:'Synthetic Cash',kind:'cash',owner:'you',balance:10000,annualContribution:0}];p.debts=[{id:'loan',name:'Synthetic Loan',kind:'mortgage',balance:1200,interestRate:0,minimumPayment:50}];return p;};
test('zero-rate payoff compares equal starting wealth and removes only debt principal',()=>{
 const p=plan(),base=projectMonthly(p),changed=projectMonthly(p,{mortgagePayoff:{debtId:'loan',month:'2026-03',destination:'cash',accountId:''}});
 close(changed.months[2].mortgagePayoff,1100);close(changed.months[2].liabilities,0);close(changed.years[0].financialNetWorth,base.years[0].financialNetWorth);close(changed.years[1].portfolio,base.years[1].portfolio);
 for(const m of changed.months)close(m.conservationResidual,0);
});
test('mortgage escrow continues after payoff and released payments are funded transfers',()=>{
 const p=plan();p.accounts.push({id:'invest',name:'Synthetic Investing',kind:'taxable',owner:'you',balance:0,costBasis:0,annualContribution:0});
 p.housing.statement={enabled:true,debtId:'loan',total:80,principalInterest:50,propertyTax:20,insurance:10,mortgageInsurance:0,otherEscrow:0};
 const r=projectMonthly(p,{mortgagePayoff:{debtId:'loan',month:'2026-01',destination:'invest',accountId:'invest'}});
 close(r.months[0].housing,30);close(r.months[0].releasedPaymentInvested,50);close(r.months[12].housing,30);close(r.years[1].portfolio,8080);
 for(const m of r.months)close(m.conservationResidual,0);
});
test('failed payoff restores assets and keeps the loan schedule',()=>{
 const p=plan();p.accounts[0].balance=10;
 const r=projectMonthly(p,{mortgagePayoff:{debtId:'loan',month:'2026-01',destination:'cash',accountId:''}});
 close(r.months[0].mortgagePayoff,0);assert.equal(r.supported,false);assert.ok(r.months[0].liabilities>0);close(r.months[0].conservationResidual,0);
});
