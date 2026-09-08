import type { BudgetLine } from './budget.ts';
import { electricityReference, NATIONAL_BUDGET_REFERENCES } from './budget-references.ts';

/** Suggestions are view-only until edited. No amounts are filled on onboarding. */
export const BILL_CATALOG = [
  ['Housing','rent','Rent'],['Housing','maintenance','Home Maintenance'],['Housing','hoa','HOA'],
  ['Utilities','electricity','Electricity'],['Utilities','water','Water & Sewer'],['Utilities','gas','Natural Gas'],['Utilities','internet','Internet'],['Utilities','phones','Phones'],
  ['Food','food-home','Groceries'],['Food','food-away','Dining Out'],
  ['Transport','gasoline','Fuel'],['Transport','vehicle-insurance','Vehicle Insurance'],['Transport','vehicle-care','Vehicle Maintenance'],['Transport','transit','Public Transit'],
  ['Health','health-extra','Additional Out-of-Pocket Health'],['Health','fitness','Fitness'],
  ['Dependents','childcare','Childcare'],['Dependents','education','Education'],['Dependents','pets','Pets'],
  ['Travel & Leisure','travel','Travel'],['Travel & Leisure','entertainment','Entertainment'],['Travel & Leisure','hobbies','Hobbies'],
  ['Subscriptions','subscriptions','Subscriptions'],['Giving','giving','Giving'],
  ['Other','apparel','Clothing'],['Other','personal-care','Personal Care'],['Other','other','Other Costs'],
] as const;
export function suggestedBills(existing: BudgetLine[], retirement=false): BudgetLine[] {
  return BILL_CATALOG.filter(([category,key,name])=>!existing.some(l=>l.id===`suggested-${key}`||l.category===category&&l.name.toLowerCase()===name.toLowerCase()))
    .map(([category,key,name])=>({id:`suggested-${key}`,name,category,amount:null,frequency:'monthly',essential:false,owner:'household',nextDueDate:'',endDate:'',retirement:{rule:retirement?'retirementOnly':'continue',amount:null,reason:''}}));
}
export function matchingReference(line: BudgetLine, state:string) {
  const entry=BILL_CATALOG.find(([category,,name])=>line.category===category&&line.name.toLowerCase()===name.toLowerCase());
  if(!entry)return null;
  return entry[1]==='electricity'?electricityReference(state):NATIONAL_BUDGET_REFERENCES.find(r=>r.id===`bls-2024-${entry[1]}`)??null;
}
