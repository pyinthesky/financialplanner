import { FREQUENCIES, type BudgetLine } from './budget.ts';
export interface BudgetReference { id:string; label:string; category:string; monthly:number; geography:string; period:string; published:string; source:string; population:string; method:string }
const bls={geography:'United States',period:'2024',published:'2025-12-19',source:'https://www.bls.gov/news.release/pdf/cesan.pdf',population:'All consumer units, including units reporting no spending in this category',method:'Published annual mean divided by 12; not a personalized target or per-person amount'};
export const NATIONAL_BUDGET_REFERENCES:BudgetReference[]=[
 ['food-home','Food at Home','Food',6224],['food-away','Food away from Home','Food',3945],['gasoline','Gasoline','Transport',2411],['vehicle-insurance','Vehicle Insurance','Transport',1993],['apparel','Apparel & Services','Other',2001],['personal-care','Personal Care','Other',978],['entertainment','Entertainment','Travel & Leisure',3609],
].map(([id,label,category,annual])=>({...bls,id:`bls-2024-${id}`,label:String(label),category:String(category),monthly:Number(annual)/12}));
// EIA table 5A, 2024 residential averages; released October 7, 2025.
// Public data checked September 7, 2026. Values are dollars per account-month.
export const ELECTRICITY_BILLS:Record<string,number>={AL:173.50,AK:143.54,AZ:160.24,AR:129.13,CA:160.86,CO:100.57,CT:199.66,DE:150.87,DC:113.23,FL:156.09,GA:151.25,HI:212.12,ID:108.73,IL:109.99,IN:133.06,IA:111.54,KS:123.90,KY:133.81,LA:140.96,ME:133.60,MD:165.87,MA:167.20,MI:119.31,MN:110.06,MS:154.83,MO:129.18,MT:107.91,NE:110.28,NV:139.39,NH:144.87,NJ:128.13,NM:92.88,NY:139.53,NC:143.50,ND:118.38,OH:135.16,OK:132.05,OR:129.62,PA:145.17,RI:162.40,SC:149.51,SD:127.81,TN:143.32,TX:163.72,UT:94.57,VT:125.66,VA:148.77,WA:113.68,WV:154.76,WI:110.87,WY:107.65};
export function electricityReference(state:string):BudgetReference|null{
 if(!Object.hasOwn(ELECTRICITY_BILLS,state))return null;
 return {id:`eia-2024-${state}`,label:'Residential Electricity',category:'Utilities',monthly:ELECTRICITY_BILLS[state],geography:state,period:'2024',published:'2025-10-07',source:'https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf',population:'Residential electricity customer accounts in the selected state',method:'Published average monthly bill; not a current tariff, address-specific quote or usage-adjusted estimate'};
}
export interface BudgetReferenceReceipt { reference:BudgetReference; target:'current'|'retirement'; applied:number; frequency:BudgetLine['frequency']; previousAmount:number|null; previousRetirement:BudgetLine['retirement'] }
export function applyBudgetReference(line:BudgetLine,reference:BudgetReference,target:'current'|'retirement'):BudgetLine{
 const applied=reference.monthly*12/FREQUENCIES[line.frequency].payments;
 return {...line,...(target==='current'?{amount:applied}:{retirement:{...line.retirement,rule:line.retirement.rule==='retirementOnly'?'retirementOnly' as const:'replace' as const,amount:applied}}),reference:{reference,target,applied,frequency:line.frequency,previousAmount:line.amount,previousRetirement:structuredClone(line.retirement)}};
}
export function canUndoBudgetReference(line:BudgetLine){const r=line.reference;return !!r&&line.frequency===r.frequency&&(r.target==='current'?line.amount===r.applied:(line.retirement.rule==='replace'||line.retirement.rule==='retirementOnly')&&line.retirement.amount===r.applied);}
export function undoBudgetReference(line:BudgetLine):BudgetLine{
 if(!line.reference||!canUndoBudgetReference(line))return line;
 const {reference,...rest}=line;
 return {...rest,...(reference.target==='current'?{amount:reference.previousAmount}:{retirement:reference.previousRetirement})};
}
