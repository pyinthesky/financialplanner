import test from 'node:test';
import assert from 'node:assert/strict';
import {healthInputErrors} from '../lib/enrollment-validation.ts';
import {compareHealth, EMPTY_ENROLLMENT, newPerson, newOption} from '../lib/enrollment.ts';
const fixture=()=>{const p={...newOption('option'),premium:100,payPeriods:12,individualDeductible:0,individualMax:5000,coinsurance:20};const e={...structuredClone(EMPTY_ENROLLMENT),startMonth:'2026-01',processingMonths:0,dueMonths:0,reimbursementMonths:0,people:[{...newPerson('person'),annualMedical:1000,hsaEligible:'yes'}],options:[p]};return {e,p};};
test('missing and inconsistent amounts map to the exact input and explicit zero resolves them',()=>{
 const {e,p}=fixture();p.premium=null;assert.deepEqual(Object.keys(healthInputErrors(e,p)),['options.option.premium']);p.premium=0;assert.deepEqual(healthInputErrors(e,p),{});
 e.people.push({...newPerson('second'),annualMedical:0});p.familyDeductible=100;p.familyMax=1000;
 assert.ok(healthInputErrors(e,p)['options.option.individualMax']);p.individualMax=1000;assert.deepEqual(healthInputErrors(e,p),{});
});
test('nested missing care, price, timing and OOP fields retain stable person/option paths',()=>{
 const {e,p}=fixture();e.startMonth='';e.processingMonths=null;e.people[0].care=[{id:'rx',kind:'prescription',label:'',allowed:null,count:null,timing:'once',month:null}];
 const keys=Object.keys(healthInputErrors(e,p));for(const key of ['startMonth','processingMonths','people.person.care.rx.allowed','people.person.care.rx.count','people.person.care.rx.month','options.option.rules.rx.coverage'])assert.ok(keys.includes(key));
 p.rules.rx={coverage:'covered',deductible:'shared',payment:'copay',amount:null,countsOop:'unknown'};
 const errors=healthInputErrors(e,p);assert.ok(errors['options.option.rules.rx.amount']);assert.ok(errors['options.option.rules.rx.countsOop']);
});
test('optional HSA tax rate and old certification flags do not prevent actual reimbursements',()=>{
 const {e,p}=fixture();Object.assign(p,{hsa:true,employerHsa:0,ownHsa:0,openingHsa:1500,contributionLimit:null,taxRate:null,eligibilityConfirmed:false});e.qualifiedConfirmed=false;
 const result=compareHealth(e,p);assert.deepEqual(result.issues,[]);assert.equal(result.taxSavings,0);assert.ok(Math.abs(result.endingHsa-1300)<0.000001);assert.ok(Math.abs(result.timeline.reduce((n,m)=>n+m.reimbursement,0)-200)<0.000001);
 e.people[0].hsaEligible='no';assert.equal(compareHealth(e,p).endingHsa,1500);
});
test('zero HRA is harmless beside an HSA, while positive combined arrangements identify the allowance',()=>{
 const {e,p}=fixture();Object.assign(p,{hsa:true,employerHsa:0,ownHsa:0,openingHsa:0,hraAnnual:0});assert.deepEqual(healthInputErrors(e,p),{});p.hraAnnual=1;assert.ok(healthInputErrors(e,p)['options.option.hraAnnual']);
});
test('waiver source and timing gaps point to employer and incentive inputs',()=>{
 const {e,p}=fixture();e.waivers=[{employer:'you',amount:1200,basis:'gross',taxRate:null,firstMonth:null,lastMonth:null,payment:'annual',payoutMonth:null,confirmed:false}];
 assert.ok(healthInputErrors(e,p)['options.option.employer']);p.employer='partner';const errors=healthInputErrors(e,p);for(const field of ['taxRate','firstMonth','lastMonth','payoutMonth'])assert.ok(errors[`waivers.you.${field}`]);
});
