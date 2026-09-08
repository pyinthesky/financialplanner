import type { MonthlyRow } from './monthly-projection.ts';
export interface FundingPart {name:string;amount:number}
/** Cash-account identity, excluding transfers that never touch spendable cash. */
export function monthlyFunding(row:MonthlyRow){
 const sources:FundingPart[]=[
  {name:'Collected Rent',amount:row.rentalIncome??0},
  {name:'Take-Home Pay',amount:row.pay},{name:'Pensions',amount:row.pension},
  {name:'Social Security',amount:row.socialSecurity},{name:'Cash Events',amount:row.eventIncome},
  {name:'Cash Interest',amount:row.cashInterest},{name:'Tax Refund',amount:row.taxRefund},
  {name:'Investment Draws & RMDs',amount:row.withdrawals+row.rmd},
  {name:'Net Home Proceeds',amount:Math.max(0,row.homeProceeds)},
  {name:'Payroll Savings into Cash',amount:row.cashPayrollSavings},
  {name:'Opening Cash Used',amount:Math.max(0,row.openingCash-row.cash)},
 ].filter(v=>v.amount>0);
 const uses:FundingPart[]=[
  {name:'Funded Spending & Debt Payments',amount:row.spendingPaid},
  {name:'Income-Tax Settlement',amount:row.taxSettlement},
  {name:'Transfers into Investments',amount:row.savingsToInvestments+row.releasedPaymentInvested},
  {name:'Home Move Cash Required',amount:Math.max(0,-row.homeProceeds)},
  {name:'Cash Added to Reserves',amount:Math.max(0,row.cash-row.openingCash)},
 ].filter(v=>v.amount>0);
 const total=sources.reduce((n,v)=>n+v.amount,0),used=uses.reduce((n,v)=>n+v.amount,0);
 return {sources,uses,total,residual:total-used,unfunded:row.unfundedSpending+row.unfundedTax};
}
