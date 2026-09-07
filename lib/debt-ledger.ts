export interface DebtInput {
  id: string; name: string; balance: number; interestRate: number;
  minimumPayment: number; customExtraPayment?: number;
}
export interface DebtPayment {
  id: string; name: string; openingBalance: number; interestAccrued: number;
  minimumPaid: number; rolledPayment: number; extraPayment: number;
  payment: number; interestPaid: number; principalPaid: number;
  unpaidInterest: number; closingBalance: number;
}
export interface DebtLedgerMonth {
  month: number; totalBalance: number; interestPaid: number; principalPaid: number;
  payments: DebtPayment[]; paymentBudget: number; unusedBudget: number;
  released: { id: string; name: string; minimum: number }[];
}
/** Monthly APR/12 interest, then minimums, rollover, then extra. No daily-interest
 * or changing card-minimum model is implied. All amounts are dollars; fractions
 * of cents are retained internally to preserve accounting identities. */
export function buildDebtLedger(input: DebtInput[], method: 'snowball' | 'avalanche' | 'custom', extraMonthly: number): DebtLedgerMonth[] {
  const debts = input.map(d => ({ ...d, balance: Math.max(0, d.balance) }));
  const originalMinimums = debts.reduce((sum, d) => sum + (d.balance > 0 ? Math.max(0, d.minimumPayment) : 0), 0);
  const extra = Math.max(0, extraMonthly);
  const rows: DebtLedgerMonth[] = [{ month: 0, totalBalance: debts.reduce((sum, d) => sum + d.balance, 0), interestPaid: 0, principalPaid: 0, payments: [], paymentBudget: 0, unusedBudget: 0, released: [] }];
  for (let month = 1; month <= 600 && debts.some(d => d.balance > 0.000001); month++) {
    const payments: DebtPayment[] = debts.map(d => {
      const openingBalance = d.balance;
      const interestAccrued = openingBalance * Math.max(0, d.interestRate) / 1200;
      const minimumPaid = Math.min(openingBalance + interestAccrued, Math.max(0, d.minimumPayment));
      d.balance = openingBalance + interestAccrued - minimumPaid;
      return { id: d.id, name: d.name, openingBalance, interestAccrued, minimumPaid, rolledPayment: 0, extraPayment: 0, payment: 0, interestPaid: 0, principalPaid: 0, unpaidInterest: 0, closingBalance: 0 };
    });
    const minimumsPaid = payments.reduce((sum, p) => sum + p.minimumPaid, 0);
    let paymentBudget = originalMinimums + extra;
    if (method === 'custom') {
      paymentBudget = debts.reduce((sum, d, i) => sum + (payments[i].openingBalance > 0 ? Math.max(0, d.minimumPayment) + Math.max(0, d.customExtraPayment ?? 0) : 0), 0);
      debts.forEach((d, i) => {
        const paid = Math.min(d.balance, Math.max(0, d.customExtraPayment ?? 0));
        d.balance -= paid; payments[i].extraPayment = paid;
      });
    } else {
      const targets = debts.map((d, i) => ({ d, i })).filter(({ d }) => d.balance > 0)
        .sort((a, b) => (method === 'snowball' ? a.d.balance - b.d.balance : b.d.interestRate - a.d.interestRate) || a.d.id.localeCompare(b.d.id));
      const apply = (budget: number, field: 'rolledPayment' | 'extraPayment') => {
        for (const { d, i } of targets) {
          const paid = Math.min(d.balance, budget);
          d.balance -= paid; budget -= paid; payments[i][field] += paid;
          if (budget <= 0) break;
        }
      };
      // Retain every original minimum for the lifetime of the strategy. This
      // includes debts closed by extra and unused capacity in this same month.
      apply(Math.max(0, originalMinimums - minimumsPaid), 'rolledPayment');
      apply(extra, 'extraPayment');
    }
    payments.forEach((p, i) => {
      p.payment = p.minimumPaid + p.rolledPayment + p.extraPayment;
      p.interestPaid = Math.min(p.payment, p.interestAccrued);
      p.principalPaid = p.payment - p.interestPaid;
      p.unpaidInterest = p.interestAccrued - p.interestPaid;
      p.closingBalance = debts[i].balance;
    });
    rows.push({ month, payments, paymentBudget,
      unusedBudget: Math.max(0, paymentBudget - payments.reduce((sum, p) => sum + p.payment, 0)),
      totalBalance: debts.reduce((sum, d) => sum + d.balance, 0),
      interestPaid: payments.reduce((sum, p) => sum + p.interestPaid, 0),
      principalPaid: payments.reduce((sum, p) => sum + p.principalPaid, 0),
      released: debts.filter((d, i) => payments[i].openingBalance > 0 && d.balance <= 0.000001).map(d => ({ id: d.id, name: d.name, minimum: Math.max(0, d.minimumPayment) })),
    });
  }
  return rows;
}
