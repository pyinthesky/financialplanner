import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEHB, federalDraft, federalLocation, tiersForPeople, blankFederal, careSignature, federalReviewIssues, comparisonEnrollment, suggestRule } from '../lib/federal-health.ts';
import { EMPTY_ENROLLMENT, newOption, newPerson, normalizeEnrollment, compareHealth, compareArrangement } from '../lib/enrollment.ts';
import { employerAdjustments, newWaiver } from '../lib/enrollment-incentives.ts';
import { exportEmployerOptions } from '../lib/enrollment-sharing.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture(){const e={...structuredClone(EMPTY_ENROLLMENT),startMonth:'2026-01',processingMonths:0,dueMonths:0,reimbursementMonths:0,people:[{...newPerson('p1'),annualMedical:1000},{...newPerson('p2'),annualMedical:1000}]};const p={...newOption('private'),employer:'partner',premium:100,payPeriods:12,coinsurance:20,individualDeductible:500,familyDeductible:1000,individualMax:3000,familyMax:6000};e.options=[p];return {e,p};}
function waiver(){return {...newWaiver('you'),amount:2400,firstMonth:1,lastMonth:12,confirmed:true};}
test('public catalog retains exact source inventory, enrollment joins and independent tiers',()=>{
 assert.equal(FEHB.year,2026);assert.equal(FEHB.plans.length,132);assert.equal(FEHB.counts.enrollmentCodes,396);assert.equal(FEHB.sources.length,4);assert.equal(new Set(FEHB.plans.map(p=>p.id)).size,132);
 const codes=FEHB.plans.flatMap(p=>p.tiers.map(t=>t.code));assert.equal(new Set(codes).size,396);
 for(const source of FEHB.sources){assert.match(source.url,/^https:\/\/www.opm.gov\//);assert.match(source.sha256,/^[a-f0-9]{64}$/);}
 const p=FEHB.plans.find(p=>p.id==='34-hdhp');close(p.tiers.find(t=>t.tier==='self').biweekly,81.62);assert.equal(p.account,'Health Savings Account');assert.equal(p.terms['Primary Care Office Visit'],'5% Coinsurance');
 assert.deepEqual(tiersForPeople(p,2).map(t=>t.tier),['family','plusOne']);assert.deepEqual(tiersForPeople(p,1).map(t=>t.tier),['self']);assert.equal(tiersForPeople(p,0).length,0);
});
test('location matches nationwide, state, county and explicit ZIP without treating missing data as ineligible',()=>{
 const f={...blankFederal(),state:'XY',county:'99001',zip:'01234'},base={nationwide:false,regions:[]};
 assert.equal(federalLocation({...base,nationwide:true},blankFederal()),'match');assert.equal(federalLocation(base,f),'unknown');
 assert.equal(federalLocation({...base,regions:[['XY',false,'99001','County',true,'']]},f),'match');
 assert.equal(federalLocation({...base,regions:[['XY',false,'99001','County',false,'01234']]},f),'match');
 assert.equal(federalLocation({...base,regions:[['XY',true,'','',false,'']]},f),'match');
 assert.equal(federalLocation({...base,regions:[['ZZ',true,'','',false,'']]},f),'outside');
 assert.equal(federalLocation({...base,regions:[['XY',false,'99002','Other',true,'']]},{...f,county:''}),'unknown');
});
test('explicit federal selection copies published tier amounts without inventing embedded family limits',()=>{
 const plan=FEHB.plans.find(p=>p.id==='34-hdhp'),t=plan.tiers.find(t=>t.tier==='family');const p=federalDraft(plan,t,'you');
 close(p.premium,t.biweekly);assert.equal(p.payPeriods,26);assert.equal(p.individualMax,null);assert.equal(p.individualDeductible,null);assert.equal(p.familyMax,t.maximum);assert.equal(p.federalReference.reviewed,false);assert.equal(p.coinsurance,null);
 const self=federalDraft(plan,plan.tiers.find(t=>t.tier==='self'),'you');assert.notEqual(self.individualMax,null);
});
test('federal ranking excludes stale, ineligible, wrong-year, wrong-group plans without certification gates',()=>{
 const {e}=fixture();e.federal={...blankFederal(),enabled:true,employee:'you',eligible:true};const plan=FEHB.plans.find(p=>p.id==='10-standard-option');const p={...federalDraft(plan,plan.tiers.find(t=>t.tier==='family'),'you'),coinsurance:20,individualDeductible:350,individualMax:6000};e.federal.options=[p];
 assert.deepEqual(federalReviewIssues(e,p),[]);assert.equal(comparisonEnrollment(e).options.length,2);
 p.federalReference.reviewed=true;p.federalReference.careSignature=careSignature(e);assert.deepEqual(federalReviewIssues(e,p),[]);assert.equal(comparisonEnrollment(e).options.length,2);
 const normalized=normalizeEnrollment(JSON.parse(JSON.stringify(e)));assert.equal(normalized.federal.options.length,1);assert.deepEqual(federalReviewIssues(normalized,normalized.federal.options[0]),[]);
 assert.ok(federalReviewIssues({...e,startMonth:'2027-01'},p).length);assert.ok(federalReviewIssues({...e,people:[e.people[0]]},p).length);
 assert.ok(federalReviewIssues({...e,federal:{...e.federal,eligible:false}},p).length);
 assert.ok(federalReviewIssues(e,{...p,federalReference:{...p.federalReference,version:'old'}}).length);
 e.people[0].annualMedical++;assert.deepEqual(federalReviewIssues(e,p),[]);
});
test('top-three rank uses total modeled cost, preserves every private option and re-ranks on medical stress',()=>{
 const {e,p}=fixture();e.options=Array.from({length:4},(_,i)=>({...p,id:`private-${i}`}));e.federal={...blankFederal(),enabled:true,employee:'you',eligible:true};
 const plans=FEHB.plans.filter(p=>p.nationwide&&p.account==='Not Applicable').slice(0,4);e.federal.options=plans.map((plan,i)=>{const o={...federalDraft(plan,plan.tiers.find(t=>t.tier==='family'),'you'),hsa:false,hraAnnual:null,employerHsa:null,premium:[0,100,200,300][i],payPeriods:12,coinsurance:[100,0,0,0][i],individualDeductible:0,familyDeductible:0,individualMax:99999,familyMax:999999};o.federalReference.reviewed=true;o.federalReference.careSignature=careSignature(e);return o;});
 const normal=comparisonEnrollment(e);assert.equal(normal.options.length,7);assert.deepEqual(normal.options.slice(0,4),e.options);assert.equal(normal.options[4].id,e.federal.options[1].id);assert.ok(normal.options.some(p=>p.id===e.federal.options[0].id));
 const stressed=comparisonEnrollment(e,5);assert.ok(!stressed.options.some(p=>p.id===e.federal.options[0].id));e.federal.options[0].federalReference.pinned=true;assert.equal(comparisonEnrollment(e,5).options.length,8);e.federal.options[0].federalReference.pinned=false;e.federal.showAll=true;assert.equal(comparisonEnrollment(e,5).options.length,8);
});
test('scalar price suggestions never silently confirm coverage or parse ambiguous price ranges',()=>{
 assert.deepEqual(suggestRule('$25 Copayment'),{payment:'copay',amount:25});assert.deepEqual(suggestRule('25% Coinsurance'),{payment:'coinsurance',amount:25});assert.equal(suggestRule('25% up to $200'),null);assert.equal(suggestRule('Member Pays Nothing').amount,0);
});
test('waiver is counted once for the declined employer and never for the enrolled employer',()=>{
 const {e,p}=fixture();e.waivers=[waiver()];const baseline=compareHealth({...e,waivers:[]},p),r=compareHealth(e,p);assert.deepEqual(r.issues,[]);close(r.waiverIncome,2400);close(r.netCost,baseline.netCost-2400);close(r.premiums,baseline.premiums);close(r.people[0].oop,baseline.people[0].oop);
 close(compareHealth(e,{...p,employer:'you'}).waiverIncome,0);assert.ok(compareHealth(e,{...p,employer:''}).issues.length);
});
test('gross waiver needs a combined tax estimate; proration and payment timing stay separate',()=>{
 const {e,p}=fixture();e.waivers=[{...waiver(),basis:'gross',taxRate:null}];assert.ok(compareHealth(e,p).issues.some(x=>x.includes('tax estimate')));
 e.waivers[0]={...e.waivers[0],taxRate:25,firstMonth:3,lastMonth:8,payment:'annual',payoutMonth:12};const r=compareHealth(e,p);close(r.waiverIncome,900);close(r.timeline[0].waiverIncome,0);close(r.timeline[11].waiverIncome,900);assert.ok(r.timeline.slice(0,11).every(m=>m.waiverIncome===0));
 e.waivers[0].payment='quarterly';const a=employerAdjustments(e,[p]);close(a.months[2],150);close(a.months[5],450);close(a.months[8],300);
 e.waivers[0].payment='annual';e.waivers[0].payoutMonth=5;assert.ok(employerAdjustments(e,[p]).issues.length);
});
test('entered waiver and surcharge apply directly; surcharge does not consume OOP maximum',()=>{
 const {e,p}=fixture();e.waivers=[{...waiver(),confirmed:false}];assert.deepEqual(compareHealth(e,p).issues,[]);close(compareHealth(e,p).waiverIncome,2400);e.waivers=[];
 const r=compareHealth(e,{...p,spouseSurcharge:600,surchargeConfirmed:true});close(r.surcharge,600);close(r.netCost,compareHealth(e,p).netCost+600);close(r.people[0].oop,compareHealth(e,p).people[0].oop);assert.deepEqual(compareHealth(e,{...p,spouseSurcharge:600}).issues,[]);
});
test('split household groups have independent deductibles and suppress both full waivers',()=>{
 const {e,p}=fixture();const a={...p,id:'a',employer:'you'},b={...p,id:'b',employer:'partner'};e.waivers=[waiver(),{...waiver(),employer:'partner'}];const arrangement={id:'split',label:'',confirmed:true,groups:[{optionId:'a',personIds:['p1']},{optionId:'b',personIds:['p2']}]};const r=compareArrangement(e,arrangement,[a,b]);assert.deepEqual(r.issues,[]);close(r.waiverIncome,0);close(r.groups[0].result.medical,600);close(r.groups[1].result.medical,600);close(r.netCost,3600);
 assert.ok(compareArrangement(e,{...arrangement,groups:[{optionId:'a',personIds:['p1']},{optionId:'b',personIds:['p1']}]},[a,b]).issues.length);
 assert.ok(compareArrangement(e,{...arrangement,groups:[{optionId:'missing',personIds:['p1']},{optionId:'b',personIds:['p2']}]},[a,b]).issues.length);
 assert.deepEqual(compareArrangement(e,{...arrangement,confirmed:false},[a,b]).issues,[]);
});
test('HRA benefit is capped at actual covered reimbursements and never creates retained HSA assets',()=>{
 const {e,p}=fixture();const r=compareHealth(e,{...p,hraAnnual:5000,hraConfirmed:true});close(r.hraReimbursement,1200);close(r.netCost,r.premiums);close(r.endingHsa,0);close(r.employerFunds,0);
 const capped=compareHealth(e,{...p,hraAnnual:500,hraConfirmed:true});close(capped.hraReimbursement,500);assert.deepEqual(compareHealth(e,{...p,hraAnnual:500}).issues,[]);close(compareHealth(e,{...p,hraAnnual:500}).hraReimbursement,500);
});
test('per-fill min/max cost sharing applies after deductible and cannot exceed allowed charges or OOP cap',()=>{
 const {e,p}=fixture();e.people=[{...newPerson('p1'),annualMedical:0,care:[{id:'rx',kind:'prescription',label:'',allowed:1000,count:1,timing:'once',month:1}]}];p.rules.rx={coverage:'covered',deductible:'shared',payment:'coinsurance',amount:50,countsOop:'yes',maximum:100};const r=compareHealth(e,p);close(r.prescriptions,600);
 p.rules.rx.minimum=200;assert.ok(compareHealth(e,p).issues.length);p.rules.rx.minimum=80;p.rules.rx.maximum=100;p.individualDeductible=0;e.people[0].care[0].allowed=50;close(compareHealth(e,p).prescriptions,50);p.individualMax=20;close(compareHealth(e,p).prescriptions,20);
});
test('local round trip preserves incentives and arrangements; coworker export excludes them and person links',()=>{
 const {e,p}=fixture();e.waivers=[waiver()];e.arrangements=[{id:'s',label:'Private Label',confirmed:true,groups:[{optionId:p.id,personIds:['p1','p2']}]}];p.coveredPersonIds=['p1'];p.employer='you';p.spouseSurcharge=123;const normalized=normalizeEnrollment(JSON.parse(JSON.stringify(e)));assert.equal(normalized.waivers[0].amount,2400);assert.equal(normalized.arrangements[0].groups[0].personIds[0],'p1');
 const text=JSON.stringify(exportEmployerOptions(e.options));for(const key of ['employer','coveredPersonIds','spouseSurcharge','waivers','arrangements','Private Label','p1'])assert.ok(!text.includes(`"${key}"`));
 assert.equal(normalizeEnrollment({...e,waivers:[{...waiver(),taxRate:200,firstMonth:-1}]}).waivers[0].taxRate,null);
 assert.equal(normalizeEnrollment({...e,waivers:[{...waiver(),taxRate:200,firstMonth:-1}]}).waivers[0].firstMonth,null);
});
test('onboarding stays empty and Google ownership verification adds no analytics script',()=>{
 assert.equal(EMPTY_ENROLLMENT.federal,undefined);assert.equal(blankFederal().enabled,false);assert.equal(newWaiver('you').amount,null);const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<meta name="google-site-verification" content="0c6rIGtsi0vIXaNJcUnNhDZHn7Hlev-DG2C3p_K-8GA" \/>/);assert.ok(!/googletagmanager|google-analytics|gtag\(/.test(html));
});
