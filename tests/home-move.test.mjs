import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_HOME_MOVE, calculateHomeMove } from '../lib/home-move.ts';
import { DEFAULT_PLAN } from '../lib/planner.ts';
import { projectMonthly } from '../lib/monthly-projection.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.005,`${a} versus ${b}`);
const move=()=>({...EMPTY_HOME_MOVE,month:'2026-01',salePrice:600,sellingCosts:10,adjustedBasis:400,standardCaseConfirmed:true,eligibilityConfirmed:true,exclusion:'standard',replacementPrice:350,replacementClosingCosts:10,newMonthlyHousing:0,newAnnualPropertyTax:0,newAnnualInsurance:0,mortgageId:'loan'});
test('mortgage reduces cash proceeds but not taxable gain; replacement purchase is not a gain deduction',()=>{
 const m=move();m.exclusion='none';const r=calculateHomeMove(m,'single',200);
 close(r.gain,190);close(r.taxableGain,190);close(r.netCash,30);
 m.exclusion='standard';close(calculateHomeMove(m,'single',200).taxableGain,0);
 m.salePrice=350;close(calculateHomeMove(m,'single',200).gain,0);
});
test('home move replaces the home, settles the loan, and conserves cash plus property',()=>{
 const p=structuredClone(DEFAULT_PLAN);Object.assign(p.household,{currentAge:60,retirementAge:60,planToAge:60});
 p.budget.reviewed=true;p.budget.retirementSpendingSource='worksheet';p.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};
 p.housing.homeValue=500;p.housing.annualInsurance=120;
 p.accounts=[{id:'cash',name:'Synthetic Cash',kind:'cash',owner:'you',balance:10000,annualContribution:0}];p.debts=[{id:'loan',name:'Synthetic Loan',kind:'mortgage',balance:200,interestRate:0,minimumPayment:10}];
 const r=projectMonthly(p,{homeMove:move()});close(r.months[0].homeProceeds,30);close(r.months[0].homeValue,350);close(r.months[0].liabilities,0);close(r.months[0].housing,0);
 close(r.years[0].portfolio,10030);close(r.years[0].totalNetWorth,10380); // Opening net worth 10300 + sale-price difference 100 - 20 transaction costs.
 for(const m of r.months)close(m.conservationResidual,0);
});
test('full exclusion needs confirmation and is limited by filing status',()=>{
 const m=move();m.salePrice=800000;m.adjustedBasis=100000;m.sellingCosts=0;
 close(calculateHomeMove(m,'single',0).taxableGain,450000);close(calculateHomeMove(m,'marriedJoint',0).taxableGain,200000);
 m.eligibilityConfirmed=false;assert.equal(calculateHomeMove(m,'single',0).supported,false);
});
