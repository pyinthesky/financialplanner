# Connected Refinance Comparisons

Delivered September 9, 2026. Local-only; no new runtime requests or defaults.

## User Flow

1. Current balance, note interest rate and P&I come from the existing loan and, when enabled, a fully reconciled mortgage statement.
2. Enter replacement term, note rate, fees (explicit zero accepted), and whole-month holding period. Result cards and a keep/refinance table update immediately; an optional native SVG shows remaining debt. The collapsed loan row also shows completion/results.
3. Save Refinance Scenario validates the household monthly projection and preserves its original baseline. Missing inputs appear inline instead of producing an unsupported comparison. Saved scenarios are inserted first so they appear in the existing three-scenario shared chart.
4. View Saved Refinance Scenario selects the new scenario in the Laboratory, showing monthly spending/funding, liabilities, taxes, asset outcomes, and baseline deltas. The current budget and Plan Summary baseline are intentionally preserved; this is an experiment, not an instruction to refinance.
5. Edit the quote and save another scenario to compare alternatives. Quote changes do not rewrite previously saved offers. Baseline loan changes trigger the existing stale/rebase review. Remove Refinance Override restores that scenario's baseline loan.

## Calculation Contract

A saved `overrides.refinance` reuses the validated refinance-offer schema. Replacement occurs against the opening January balance. Financed fees increase principal; cash fees append one January expense independently of other life events. The standard cash-flow/withdrawal engine funds expenses and reports shortfalls. There is no assumed free cash or fee tax deduction.

Reconciled escrow components remain unchanged and the statement total is recomputed from replacement P&I plus those components. Only P&I enters the debt cascade. Existing extra-payment amounts remain fixed; a reduction in minimum payment is not automatically converted into extra payment. Freed minimum payments from later paid-off debts still cascade according to the selected strategy.

The standalone comparison excludes extra payments and uses the entered holding period; household results include extras and use the full plan horizon. This distinction is displayed. Net saving equals old payments plus old remaining debt minus new payments, new remaining debt and upfront fees. A longer term can lower payments without saving money. Break-even means the first nonnegative month, not a guarantee of savings at every later month.

Only fixed-rate, no-cash-out loans are modeled. Rental-linked loans retain standalone comparisons but cannot create this household override. Future closing dates, changed mortgage insurance/escrow, penalties, rate resets, balloon terms, special tax deductions and combined home move/lump-sum payoff overrides need separate modeling. Do not treat prepaid escrow deposits as fees if already included in housing cash flow.

## Source and Validation

[CFPB Loan Estimate Explainer](https://www.consumerfinance.gov/owning-a-home/loan-estimate/), page last modified October 29, 2025, verified September 9, 2026: separates note rate/P&I, escrow, closing costs, APR, penalties and adjustable terms. This release adds no tax-law assumptions or public-rate dataset changes.

Calculation tests cover upfront/financed/zero fees, zero interest, escrow reconciliation, cascade retention, independent events, unsupported cases, snapshot round trips and staleness, cash conservation and baseline preservation. The existing Chromium/WebKit journey now changes a quote, verifies a live result change, opens its chart, saves a scenario, and opens its monthly results at all six viewport widths.
