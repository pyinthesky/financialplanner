import { buildDebtLedger, type DebtLedgerMonth } from './debt-ledger.ts';
import { activeMortgageStatement, type PlannerData } from './planner.ts';

/** Start-of-month payoff; no unentered daily interest or prepayment fee inferred. */
export function mortgagePayoffSchedule(plan: PlannerData, schedule: DebtLedgerMonth[], monthIndex: number, debtId: string) {
  const loan=plan.debts.find(d=>d.id===debtId&&d.kind==='mortgage');
  const row=schedule[monthIndex+1];
  const opening=row?.payments.find(p=>p.id===debtId)?.openingBalance??0;
  if(!loan||!row||opening<=0)return {payoff:0,schedule};
  const statement=activeMortgageStatement(plan);
  const minimum=(id:string,fallback:number)=>statement?.debtId===id?statement.principalInterest!:fallback;
  const remaining=plan.debts.filter(d=>d.id!==debtId).map(d=>({...d,balance:row.payments.find(p=>p.id===d.id)?.openingBalance??0,minimumPayment:minimum(d.id,d.minimumPayment)}));
  // Remove only the paid mortgage's original minimum. Minimums already freed
  // by other debts remain in the strategy instead of disappearing on rebuild.
  const budget=Math.max(0,row.paymentBudget-minimum(loan.id,loan.minimumPayment));
  const minimums=remaining.reduce((n,d)=>n+(d.balance>0?d.minimumPayment:0),0);
  const rebuilt=buildDebtLedger(remaining,plan.debtStrategy.method,Math.max(0,budget-minimums));
  const future=rebuilt.length>1?rebuilt.slice(1):[{...rebuilt[0],month:1}];
  return {payoff:opening,schedule:[...schedule.slice(0,monthIndex+1),...future.map(r=>({...r,month:r.month+monthIndex}))]};
}
export function mortgagePaymentReleased(baseline: DebtLedgerMonth[], changed: DebtLedgerMonth[], index:number) {
  const paid=(row:DebtLedgerMonth|undefined)=>(row?.principalPaid??0)+(row?.interestPaid??0);
  return Math.max(0,paid(baseline[index+1])-paid(changed[index+1]));
}
