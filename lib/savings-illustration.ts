/** Educational annuity model: zero starting assets, constant real income,
 * contributions at year end, constant spending and constant real returns.
 * Income is normalized to 1; no household data is read. */
export function savingsHorizon(savingsPercent: number, realReturnPercent: number, withdrawalPercent: number): number | null {
  if (![savingsPercent, realReturnPercent, withdrawalPercent].every(Number.isFinite)
    || savingsPercent < 0 || savingsPercent > 100 || realReturnPercent < 0 || realReturnPercent > 100
    || withdrawalPercent <= 0 || withdrawalPercent > 100) return null;
  const saving = savingsPercent / 100;
  if (saving === 1) return 0;
  if (saving === 0) return null;
  const target = (1 - saving) / (withdrawalPercent / 100);
  const growth = realReturnPercent / 100;
  return growth === 0 ? target / saving : Math.log1p(target * growth / saving) / Math.log1p(growth);
}
