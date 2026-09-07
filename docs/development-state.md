# Development State

Updated: September 7, 2026. This is the starting point for the next implementation turn.

- Current reviewed application release: `6328a5fe12fb5a160c75d7be23e93fecc583462d`.
- Current work: 5A.1 funding repair implemented and verified with 84 tests, TypeScript, and production build. Cash draws count as funding, surplus is retained, tax-paying draws are reassessed, unpaid taxes are exposed, and gross/taxable ordinary income are separate. Pages now gates deployment on tests and type checking.
- Canonical product/development contract: [Batch 5 plan](batch-5-plan.md).
- Latest user direction: restore Current Budget and Retirement Budget, make entry easy with optional defensible reference choices, visibly cascade paid-off debt minimums, and plan continuity across model changes.
- Timed development was disabled after the last application release. Keep it disabled unless explicitly requested otherwise.
- Batch 2 worksheets have shipped; integration is reopened for findings F03–F06/F08 in the plan. Do not report a complete validated tax-return/scenario engine.
- Batch 5 has started. Next: the **5A.2/5B** budget and monthly-ledger contract, plus **5A.3** conversion eligibility/access. Debt cascade F02 remains open until 5C. Do not label the whole foundation complete.

### Funding repair evidence

- `tests/funding.test.mjs`: six independent fixtures for cash conservation, income surplus, traditional tax gross-up, exhausted assets, conversion tax from cash, and avoiding immediate reuse of conversions.
- Updated six legacy expectation groups that omitted tax funding or mislabeled gross income. Equations are recorded in the tests.
- `lib/planner.ts`: annual funding solver, maximum 128 iterations, residual tolerance $0.0001; unpaid residual remains in `unfundedTaxes` and reduces funded ratio. This is still an annual model, not a completed monthly transaction ledger.
- Tax rules unchanged: 2026 Rev. Proc. 2025-32 and existing sourced tax modules. Official IRS table and early-distribution page rechecked September 7, 2026.
- UI: unpaid tax notice and full-horizon conversion tax difference. No real-device/PDF verification claimed for this accounting slice.
- Unresolved: pre-retirement earnings/contribution funding, early Roth accessibility, source eligibility for conversions, monthly timing, state/benefit limitations. Tests are not proof of complete tax-return coverage.

## Evidence from this review

Inspected README and `lib/planner.ts` were verified against their exact blob hashes on remote main. The GitHub Pages workflow was also read. This was a targeted source review and two executable synthetic reproductions, not a complete audit or device-browser test.

- Debt A 100/minimum 50, debt B 1,000/minimum 100, extra 50, all at zero interest: first month pays 200; second month incorrectly pays 150 after extra retires A. Required result is continued budget 200 while debt remains.
- Cash 100, retirement spending 100, one-year horizon: cash becomes 0 but reported withdrawals and funded ratio are both 0. Required result counts the cash draw as funding.
- Tax-funding code calculates taxes before tax-paying asset draws; cash, basis, taxable income, penalties, and unpaid taxes need a reconciled feedback calculation.
- Current model lacks salary/current-budget inputs. Ordinary baseline spending activates only on full retirement.
- Existing Pages workflow runs the build without calculation tests/type-check gate. Existing mobile tests are source assertions, not rendered-browser proof.

## Next slice contract: 5A.1

1. Read the current remote main and product plan in a clean/verified checkout.
2. Add independent fixtures for cash-only funding, tax-paying appreciated sales, additional tax-deferred draws, insufficient tax funding, and the debt cascade. Keep synthetic fixtures out of onboarding.
3. Repair cash/tax reconciliation and clarify gross-versus-taxable labels. The full debt engine/visualization belongs to 5C; keep its failing acceptance case tracked until implemented rather than silently accepting the old result.
4. Add calculation/regression tests and TypeScript checks before Pages deployment. Do not weaken acceptance criteria to make CI green.
5. Record what was fixed, what remains pending, exact verification evidence, and next slice. Publish only the authorized logical slice, not unrelated accumulated local changes.

## Model handoff

Recommended: Astra High for foundation/schema and tax-interaction review; Sol 5.6 High for bounded implementation against settled contracts and independent fixtures. No repository-specific model comparison has been measured, and neither model guarantees first-pass correctness. Validate a Sol slice by the same gates before relying on it for broad autonomous implementation.

## Required handoff update after each future delivery

Record: requirement IDs/sub-slice; base and resulting commit; implementation/test/source paths; effective-dated data versions; checks performed and their outcomes; browser/PDF evidence and device limitations; remaining blockers and exact next action. Statuses must distinguish planned, implemented, verified, and blocked. Never promote an entire feature merely because a helper function or worksheet exists.
