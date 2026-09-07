import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDebtLedger } from '../lib/debt-ledger.ts';
const debt = (id, balance, minimumPayment, interestRate = 0, customExtraPayment = 0) => ({ id, name: id, balance, minimumPayment, interestRate, customExtraPayment });
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, `${a} != ${b}`);
test('three-debt cascade matches the independent five-month acceptance schedule', () => {
  const rows = buildDebtLedger([debt('A',100,50), debt('B',400,100), debt('C',1000,100)], 'snowball', 50);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.slice(1).map(r => r.payments.map(p => p.payment)), [[100,100,100],[0,200,100],[0,100,200],[0,0,300],[0,0,300]]);
  assert.deepEqual(rows.slice(1).map(r => r.totalBalance), [1200,900,600,300,0]);
  assert.equal(rows[2].payments[1].rolledPayment, 50);
  assert.equal(rows[2].payments[1].extraPayment, 50);
});
test('minimums freed by extra persist and unused extra closes several debts in one month', () => {
  const rows = buildDebtLedger([debt('A',100,50), debt('B',1000,100)], 'snowball', 50);
  assert.equal(rows[2].principalPaid, 200);
  const one = buildDebtLedger([debt('A',10,1), debt('B',20,1), debt('C',30,1)], 'snowball', 100);
  assert.equal(one.length, 2); assert.equal(one[1].totalBalance, 0); assert.equal(one[1].unusedBudget, 43);
});
test('avalanche selects APR and equal-priority debts have stable IDs', () => {
  const rows = buildDebtLedger([debt('A',100,10,1), debt('B',1000,10,12)], 'avalanche', 50);
  assert.equal(rows[1].payments[1].extraPayment, 50);
  const tie = buildDebtLedger([debt('B',100,10,12), debt('A',100,10,12)], 'avalanche', 50);
  assert.equal(tie[1].payments[1].extraPayment, 50);
});
test('custom pays assigned extra and never cascades minimums or another debt’s extra', () => {
  const rows = buildDebtLedger([debt('A',20,10,0,50), debt('B',100,10,0,5)], 'custom', 999);
  assert.deepEqual(rows[1].payments.map(p => p.payment), [20,15]);
  assert.deepEqual(rows[2].payments.map(p => p.payment), [0,15]);
  assert.equal(rows[2].payments[1].rolledPayment, 0);
});
test('interest shortfalls grow balances and payment and balance identities reconcile', () => {
  const rows = buildDebtLedger([debt('A',100,0,12)], 'snowball', 0);
  assert.equal(rows[1].totalBalance, 101); assert.equal(rows[1].interestPaid, 0);
  for (const row of rows.slice(1)) for (const p of row.payments) {
    close(p.payment, p.minimumPaid + p.rolledPayment + p.extraPayment);
    close(p.payment, p.interestPaid + p.principalPaid);
    close(p.closingBalance, p.openingBalance + p.interestAccrued - p.payment);
  }
});
test('already-paid debts do not donate phantom minimums; no-extra plans still cascade', () => {
  const rows = buildDebtLedger([debt('closed',0,1000),debt('A',10,10),debt('B',100,10)], 'snowball', 0);
  assert.equal(rows[1].principalPaid,20); assert.equal(rows[2].principalPaid,20);
  assert.equal(rows[1].paymentBudget,20);
});
