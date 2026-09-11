import test from 'node:test';
import assert from 'node:assert/strict';
import {FEHB,federalDraft,blankFederal,federalCandidates} from '../lib/federal-health.ts';
import {FEHB_BENEFITS,applyPublishedBenefits,withFederalBenefits,publishedCareRule} from '../lib/federal-benefits.ts';
import {EMPTY_ENROLLMENT,newPerson,normalizeEnrollment,compareHealth,EMPTY_RULE} from '../lib/enrollment.ts';
function option(id,tier='family'){const p=FEHB.plans.find(p=>p.id===id);return federalDraft(p,p.tiers.find(t=>t.tier===tier),'you');}
function setup(o,people){return {...structuredClone(EMPTY_ENROLLMENT),startMonth:'2026-01',processingMonths:0,dueMonths:0,reimbursementMonths:0,people,federal:{...blankFederal(),enabled:true,eligible:true,employee:'you',options:[o]}};}
function person(id,care=[]){return {...newPerson(id),annualMedical:0,hsaEligible:'yes',care};}
function care(id,service,allowed,count=1,kind='medical'){return {id,service,kind,label:'',allowed,count,timing:'spread',month:null};}
test('published family limits are sourced independently of self-only; aggregate never implies an unlimited person',()=>{
 const p=option('34-hdhp');assert.equal(p.deductibleMode,'aggregate');assert.equal(p.familyDeductible,3600);assert.equal(p.individualMax,6000);assert.equal(p.coinsurance,5);
 const b=option('11-basic-option');assert.equal(b.familyDeductible,0);assert.equal(b.individualDeductible,0);assert.equal(b.individualMax,7500);
 const f=option('13-fep-blue-focus');assert.equal(f.individualDeductible,750);assert.equal(f.familyDeductible,1500);assert.equal(f.individualMax,10000);
});
test('a high-use person hits the embedded OOP cap while the second person has independent room',()=>{
 const p={...option('34-hdhp'),ownHsa:0,openingHsa:0,contributionLimit:8750};const e=setup(p,[{...person('a'),annualMedical:100000,timing:'once',month:1},{...person('b'),annualMedical:10000,timing:'once',month:2}]);
 const r=federalCandidates(e)[0].result;assert.deepEqual(r.issues,[]);assert.equal(r.people[0].oop,6000);assert.equal(r.people[1].oop,500);assert.equal(r.medical,6500);
});
test('medical categories fill all selected plans, while prescription tiers stay specific to each option',()=>{
 const g=option('34-hdhp'),b=option('11-basic-option');const e=setup(g,[person('a',[care('office','primary',200),care('rx','',1000,12,'prescription')]),person('b')]);
 g.rules.rx={...EMPTY_RULE,service:'rx2'};b.rules.rx={...EMPTY_RULE,service:'rx1'};e.federal.options=[g,b];const out=withFederalBenefits(e);
 assert.equal(out.federal.options[0].rules.office.amount,5);assert.equal(out.federal.options[1].rules.office.amount,35);assert.equal(out.federal.options[0].rules.rx.amount,25);assert.equal(out.federal.options[1].rules.rx.amount,15);
 const normalized=normalizeEnrollment(JSON.parse(JSON.stringify(out)));assert.deepEqual(withFederalBenefits(normalized).federal.options[0].rules.office,out.federal.options[0].rules.office);
});
test('FEP Focus shares its first ten office/mental visits per person, then applies deductible and coinsurance',()=>{
 const p=option('13-fep-blue-focus');const e=setup(p,[person('a',[care('primary','primary',100,6),care('mental','mental',100,6)]),person('b',[care('other','specialist',100,1)])]);const r=federalCandidates(e)[0].result;
 assert.deepEqual(r.issues,[]);assert.equal(r.people[0].medical,300);assert.equal(r.people[1].medical,10);assert.equal(r.claims.filter(c=>c.person===0).reduce((s,c)=>s+c.deductible,0),200);
});
test('retail caps and longer-fill variants change costs without changing the combined OOP accounting',()=>{
 const p=option('11-basic-option','self'),rx=care('rx','',1000,1,'prescription');p.rules.rx={...EMPTY_RULE,service:'rx2'};let e=withFederalBenefits(setup(p,[person('a',[rx])]));assert.equal(compareHealth(e,e.federal.options[0]).prescriptions,150);
 p.rules.rx.service='rx2_90';e=withFederalBenefits(setup(p,[person('a',[rx])]));assert.equal(compareHealth(e,e.federal.options[0]).prescriptions,350);
});
test('GEHA High maintenance retail increases after two fills and never loses the ordinary higher price',()=>{
 const p=option('31-high-option','self');p.rules.rx={...EMPTY_RULE,service:'rx2_maintenance'};const e=withFederalBenefits(setup(p,[person('a',[care('rx','',1000,3,'prescription')])]));const r=compareHealth(e,e.federal.options[0]);assert.equal(r.prescriptions,1000);assert.equal(r.people[0].oop,1000);
});
test('saved editions and explicit manual rules survive hydration and round trips',()=>{
 const p=option('34-hdhp'),c=care('c','primary',500);p.rules.c={coverage:'covered',countsOop:'yes',amount:17,payment:'copay',deductible:'exempt',manual:true};
 assert.equal(publishedCareRule(p,c).amount,17);const old={...p,federalReference:{...p.federalReference,benefitVersion:undefined}};assert.equal(withFederalBenefits(setup(old,[person('a',[c])])).federal.options[0].rules.c.amount,17);
 p.ownHsa=123;p.taxRate=0;p.premium=44;const updated=applyPublishedBenefits(p);assert.equal(updated.ownHsa,123);assert.equal(updated.premium,44);assert.equal(updated.taxRate,0);assert.equal(publishedCareRule(updated,c).amount,17);
});
test('unmapped categories and unknown family structures remain incomplete instead of turning into zero costs',()=>{
 const p=option('11-basic-option'),c=care('c','inpatient',9000);assert.equal(publishedCareRule(p,c).coverage,'unknown');
 const e=setup({...p,deductibleMode:'unknown'},[person('a'),person('b')]);assert.ok(federalCandidates(e)[0].result.issues.some(x=>x.includes('deductible structure')));
 assert.match(FEHB_BENEFITS.version,/^2026-/);assert.equal(Object.keys(FEHB_BENEFITS.plans).length,132);
});

test('a shared medical category remains linked after saved hydration, unless explicitly overridden per plan',()=>{
 const p=option('11-basic-option'),c=care('office','primary',200);let e=withFederalBenefits(setup(p,[person('a',[c]),person('b')]));assert.equal(e.federal.options[0].rules.office.amount,35);
 e=normalizeEnrollment(JSON.parse(JSON.stringify(e)));e.people[0].care[0].service='specialist';e=withFederalBenefits(e);assert.equal(e.federal.options[0].rules.office.amount,50);
 e.federal.options[0].rules.office.service='primary';assert.equal(withFederalBenefits(e).federal.options[0].rules.office.amount,35);
});

test('applying published benefits to a legacy option preserves its already-entered service rules',()=>{
 const o=option('34-hdhp');delete o.federalReference.benefitVersion;
 o.rules.office={coverage:'covered',countsOop:'yes',payment:'copay',amount:23,deductible:'exempt'};
 const next=applyPublishedBenefits(o);assert.equal(next.rules.office.manual,true);assert.equal(publishedCareRule(next,care('office','primary',200)).amount,23);
 assert.equal(publishedCareRule(next,care('new','primary',200)).amount,5);
});
