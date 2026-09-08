// Fictional public demonstration only. Never ingest private plans or screenshots here.
import fs from 'node:fs';
import {normalizePlan} from '../lib/planner.ts';
import {baselineSnapshot} from '../lib/scenarios.ts';
const path=new URL('../public/sample-plan.json',import.meta.url);
const p=normalizePlan(JSON.parse(fs.readFileSync(path,'utf8')));
p.laboratory.scenarios=[];
Object.assign(p.rothConversionPlanning,{baselineGrossOrdinaryIncome:50000,taxableConversionAmount:20000,targetBracketRate:22,annualConversionYou:12000,startAgeYou:62,endAgeYou:66});
Object.assign(p.medicareIrmaaPlanning,{magi2024:220000,filingCategory:'marriedJoint',partBEnrollees:2,partDEnrollees:2});
Object.assign(p.acaPlanning,{householdMagi:60000,taxFamilySize:2,location:'contiguous',annualEnrollmentPremium:18000,annualBenchmarkPremium:20000});
Object.assign(p.capitalGainsPlanning,{grossOrdinaryIncome:50000,netLongTermCapitalGain:20000,modifiedAdjustedGrossIncome:70000,netInvestmentIncome:20000});
p.debts=[...p.debts.filter(d=>d.id!=='rental-mortgage'),{id:'rental-mortgage',name:'Rental Mortgage',kind:'mortgage',balance:180000,interestRate:5.75,minimumPayment:1250}];
p.refinancing=[
 {debtId:'mortgage',years:30,rate:5.9,fees:6500,financed:false,horizon:84,benchmarkEligible:true,snoozeUntil:''},
 {debtId:'rental-mortgage',years:30,rate:5.5,fees:5000,financed:true,horizon:60,benchmarkEligible:false,snoozeUntil:''},
];
p.realEstate={
 properties:[{id:'sample-rental',name:'Maple Street Rental',debtId:'rental-mortgage',value:420000,rent:3200,vacancy:5,management:8,tax:6000,insurance:2400,maintenance:3600,repairs:3000,reserveTarget:15000,taxableProfit:12000,taxConfirmed:true}],
 trial:{mode:'keep',value:420000,equity:240000,buyingCosts:0,rate:5.75,years:24,holdingYears:10,rent:3200,vacancy:5,costs:1200,repairs:3000,appreciation:3,investmentReturn:6,saleCostPercent:6},
};
const baseline=baselineSnapshot(p);
p.laboratory.scenarios=[
 {id:'demo-retire-later',name:'Work One More Year',baseline,overrides:{retirementMonthYou:'2029-01',retirementMonthPartner:'2031-01'}},
 {id:'demo-spend-less',name:'Trim Everyday Spending by 10%',baseline,overrides:{spendingChangePercent:-10}},
 {id:'demo-payoff',name:'Pay Off the Mortgage at Retirement',baseline,overrides:{mortgagePayoff:{debtId:'mortgage',month:'2030-01',destination:'cash',accountId:''}}},
];
fs.writeFileSync(path,JSON.stringify(normalizePlan(p),null,2)+'\n');
