import test from 'node:test';
import assert from 'node:assert/strict';
import { exportEmployerOptions, parseEmployerOptions, replaceEmployerOptions, lowestCostIndices } from '../lib/enrollment-sharing.ts';
import { newOption, newPerson, EMPTY_ENROLLMENT } from '../lib/enrollment.ts';
import { enrollmentFederalRate, withEnrollmentTax } from '../lib/enrollment-tax.ts';
import { DEFAULT_PLAN, normalizePlan } from '../lib/planner.ts';
import { calculateFederalIncomeTax } from '../lib/federal-tax.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('employer export excludes private labels, IDs, people, rules and all personal HSA/tax fields',()=>{
 const p={...newOption('PRIVATE-ID'),label:'PRIVATE-LABEL',premium:125,payPeriods:24,hsa:true,ownHsa:8765,openingHsa:54321,taxRate:23,premiumTaxRate:29,eligibilityConfirmed:true,contributionLimit:9999,rules:{'PRIVATE-RX':{label:'PRIVATE-RULE'}},unknownNested:{private:'SECRET'}};
 const pkg=exportEmployerOptions([p]),text=JSON.stringify(pkg);
 assert.ok(!/PRIVATE|SECRET|8765|54321|9999|taxRate|rules|eligibility|ownHsa/.test(text));assert.equal(pkg.options[0].premium,125);
 assert.deepEqual(Object.keys(pkg.options[0]).sort(),['premium','payPeriods','individualDeductible','familyDeductible','individualMax','familyMax','coinsurance','rxIndividualDeductible','rxFamilyDeductible','rxIndividualMax','rxFamilyMax','employerHsa','network','deductibleMode','employerTiming','hsa'].sort());
});
test('import preserves recipient care but resets option-specific private assumptions and ignores injected keys',()=>{
 const pkg=exportEmployerOptions([{...newOption('a'),premium:125,payPeriods:24}]);Object.assign(pkg.options[0],{id:'injected',label:'injected',ownHsa:999,rules:{x:{allowedOverride:999}},unknown:'injected'});
 const options=parseEmployerOptions(pkg),person={...newPerson('recipient'),annualMedical:1234},e={...EMPTY_ENROLLMENT,people:[person],startMonth:'2026-01',options:[newOption('old')]};
 const result=replaceEmployerOptions(e,options);assert.equal(result.people[0].annualMedical,1234);assert.equal(result.startMonth,'2026-01');assert.equal(result.options[0].premium,125);assert.equal(result.options[0].ownHsa,null);assert.deepEqual(result.options[0].rules,{});assert.ok(!JSON.stringify(result).includes('injected'));assert.equal(e.options[0].id,'old');
});
test('wrong format, unsupported version and corrupt terms are rejected before import',()=>{
 assert.throws(()=>parseEmployerOptions(DEFAULT_PLAN));const pkg=exportEmployerOptions([newOption('a')]);assert.throws(()=>parseEmployerOptions({...pkg,version:2}));assert.throws(()=>parseEmployerOptions({...pkg,options:[]}));for(const value of [-1,Infinity,'PII',{}])assert.throws(()=>parseEmployerOptions({...pkg,options:[{...pkg.options[0],premium:value}]}));assert.throws(()=>parseEmployerOptions({...pkg,options:[{...pkg.options[0],payPeriods:1.5}]}));
});
test('cost stars rank net cost, ties at cents, and never rank incomplete comparisons',()=>{
 assert.deepEqual(lowestCostIndices([{netCost:20,issues:[]},{netCost:10,issues:[]}]),[1]);assert.deepEqual(lowestCostIndices([{netCost:10.001,issues:[]},{netCost:10.002,issues:[]}]),[0,1]);assert.deepEqual(lowestCostIndices([{netCost:-1,issues:['unknown']},{netCost:10,issues:[]}]),[]);assert.deepEqual(lowestCostIndices([]),[]);
});
function wagePlan(){const p=normalizePlan(structuredClone(DEFAULT_PLAN));Object.assign(p.household,{maritalStatus:'single',filingStatus:'single',currentAge:40,birthYear:1986,retirementAge:65});p.budget.timeline={startYear:2026,retirementMonthYou:'2051-01',retirementMonthPartner:''};p.budget.pay=[{id:'pay',name:'Fictional Pay',owner:'you',amount:3500,frequency:'monthly',nextPayDate:'',payroll:{gross:5000,taxableWages:4500,incomeTaxWithheld:500,otherDeductions:500,employeeSavings:500,employerSavings:0,accountId:'t'}}];p.accounts=[{id:'t',name:'Fictional Traditional',owner:'you',kind:'traditional',balance:0,annualContribution:0}];p.enrollment={...EMPTY_ENROLLMENT,startMonth:'2026-01',options:[{...newOption('h'),hsa:true,ownHsa:4000}]};return p;}
test('HSA default uses wages after pretax savings, handles bracket crossings and preserves overrides',()=>{
 const p=wagePlan();close(enrollmentFederalRate(p),12);const e=withEnrollmentTax(p,p.enrollment);close(e.options[0].taxRate,12);assert.equal(p.enrollment.options[0].taxRate,null);
 p.budget.pay[0].payroll.taxableWages=5000;p.enrollment.options[0].ownHsa=20000;const r=withEnrollmentTax(p,p.enrollment),tax=calculateFederalIncomeTax(60000,'single').tax-calculateFederalIncomeTax(40000,'single').tax;close(r.options[0].taxRate,tax/20000*100);
 p.enrollment.options[0].taxRate=0;assert.equal(withEnrollmentTax(p,p.enrollment).options[0].taxRate,0);
});
test('HSA auto rate remains unknown for blank, net-only, wrong-year or complex household income',()=>{
 assert.equal(enrollmentFederalRate(DEFAULT_PLAN),null);for(const change of [p=>p.budget.pay[0].amount=4000,p=>p.enrollment.startMonth='2027-01',p=>p.budget.timeline.retirementMonthYou='2026-07',p=>p.household.currentAge=66,p=>p.income=[{annualAmount:1}],p=>p.rothConversionPlanning.annualConversionYou=1]){const p=wagePlan();change(p);assert.equal(enrollmentFederalRate(p),null);}
});

test('conditional waiver income disables a household-only HSA tax estimate',()=>{const p=wagePlan();p.enrollment.waivers=[{employer:'partner',amount:1200,basis:'net',taxRate:null,firstMonth:1,lastMonth:12,payment:'monthly',payoutMonth:null,confirmed:true}];assert.equal(enrollmentFederalRate(p),null);assert.equal(withEnrollmentTax(p,p.enrollment).options[0].taxRate,null);p.enrollment.options[0].taxRate=15;assert.equal(withEnrollmentTax(p,p.enrollment).options[0].taxRate,15);});
