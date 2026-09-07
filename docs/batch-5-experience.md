# Batch 5 Experience Contract

Status: accepted design direction, September 7, 2026; implementation remains subject to the ledger dependencies in [the Batch 5 plan](batch-5-plan.md). This document refines that plan, not a separate product backlog. No screenshot content, personal financial facts, account details, or transactions are included here. Use independently invented synthetic fixtures for all implementation examples and rendered checks.

## Central journey

Help a person understand their current budget, deliberately change it for retirement, and compare the consequences. Keep Data & Privacy as the landing page and Plan Summary at the end of the menu. A useful summary is the result of entered facts; it must not require every advanced tax worksheet to be completed before basic budget entry works.

Current Budget and Retirement Budget remain views over shared facts. Put Today / Retirement / Change together in the budget workspace; keep existing menu entry points as focused views rather than creating duplicate data. Show monthly averages in today's dollars first, with explicit switches to a dated calendar or projected retirement dollars. Changes have an owner, effective date, and a visible source.

## Layout and information density

- Desktop: a restrained page header, compact summary strip, broad grouped budget rows, and a narrower contextual summary alongside. Use light dividers, aligned numeric columns, clear group totals, and small consistent gaps. Avoid a large padded card around every field.
- Expand a row for frequency, due dates, retirement behavior, source, and advanced options. Ordinary editing should remain possible from the compact row. Preserve keyboard focus when rows expand or totals recalculate.
- Mobile: show the summary first, followed by collapsible groups. Each row shows its label and primary amount with a secondary change/status line. Move the side summary into the normal document flow; avoid squeezing desktop columns or adding another fixed overlay. Maintain readable text, touch targets, dropdown height, and spacing at narrow widths and zoom.
- Keep one page-level period selector where relevant. Monthly, quarterly, and yearly views aggregate the same ledger. Longer planning horizons belong to projection views; do not mix an observed historical timeline with simulated future values without a visible boundary.
- Optional compact/comfortable density and remembered local group expansion are later polish. The default must work on a phone without a setting change.

## Budget structure and quick entry — remaining 5B

Offer two presentations over the same canonical costs:

| Presentation | Entry and behavior |
| --- | --- |
| Simple Budget | Fixed commitments, a flexible spending envelope, nonmonthly obligations/reserves, and savings. Allow fast aggregate entry without requiring every bill. |
| Category Budget | Expand groups into user-selected categories and individual bills, with subtotal reconciliation. |

Switching presentations must preserve amounts and retirement overrides. An aggregate envelope is not an additional expense on top of its detail: allocated detail plus the visible unallocated remainder equals the envelope. If detail exceeds it, show the discrepancy and an explicit resolution action. No silent proportional allocation, duplicate totals, or automatic overwrite when switching modes.

Fixed/flexible describes adjustability; essential/discretionary describes priority; frequency describes timing. Store and display them as independent dimensions. A fixed cost may be discretionary, and a variable cost may be essential. Keep debt service, taxes, consumption, and savings transfers separately identifiable.

Use a setup checklist with optional category chips and blank amounts. Offer a source preview and explicit Apply for suitable public references. A historical-average shortcut requires user-provided local history; without history, show it as unavailable. Never substitute a national average while calling it the user's historical average. Recalculate only selected eligible fields after a preview and preserve an undo snapshot.

The primary summary should explain income, planned consumption, debt service, savings allocation, irregular reserves, and unallocated margin. Each number opens its local explanation without becoming a second navigation menu. Unknown inputs remain visibly incomplete; no green success state based on missing values.

## Period edits and observation semantics — 5A.2 / 5B / 5E

- An edit can apply to this month, this month onward, or a selected scenario. Show the scope before applying; represent it as a dated override rather than rewriting historical facts. Offer Undo. Import/export must preserve scope and effective dates.
- Define whether an edit changes an obligation's scheduled amount, its reserve target, or an observed amount. The calendar's payment and the reserve allocation must never both become consumption. A reserve balance follows opening balance plus transfers minus payments.
- Planned, scheduled, projected, and actual are different states. The initial planner can show planned and projected amounts immediately. Add Actual / Remaining only when the user enters observations or explicitly imports supported local data. Missing observations are unknown, not zero spending.
- An actuals/import facility is a separate opt-in extension, not a prerequisite for retirement planning. No bank connection or transaction feed is implied. Local imports need date/amount/category review, transfer matching, and duplicate detection before affecting results. Do not ship a dashboard of empty transaction widgets just to resemble another product.
- Credit-card purchases and their later bill payment cannot both count as spending. Investment contributions are transfers, not consumption; debt payments split principal and interest; mortgage escrow remains linked to its housing obligations. Unclassified flows remain visible until resolved.
- Partial-month actuals and full-month budgets must be labeled as such. A previous-period comparison must disclose differing coverage, refunds, and incomplete records. Savings rate needs an explicit numerator/denominator and an unavailable state for zero or unknown income.

## Cash-flow explanations and charts — 5E.3

Use a compact strip for income/resources, expenses, transfers to savings, and remaining cash, then a chart with a reconciled detail table. Users can group or split income by owner and source, including pensions. Chart filters affect the displayed selection and explain whether the total is filtered or household-wide.

- Add a period cash-flow chart: inflows and outflows with a net line, identical period boundaries, and clear planned/observed/projected labels. Never invent balance history from one current snapshot.
- Add sorted horizontal category bars for easy comparison. Show amount and share of a named denominator; positive values, refunds, and net-negative categories need distinct handling rather than negative-width bars.
- Offer an optional money-flow (Sankey) view on sufficiently wide screens, backed by the same ledger. Group small categories with an expandable Other bucket. Use a readable stacked list/table on mobile and an accessible text equivalent everywhere.
- Money flow must conserve value. Income alone cannot feed outflows larger than income: explicitly identify cash drawdown, investment withdrawals, borrowing, or an unfunded shortfall. Conversions/account transfers are separate linked flows, not income available for consumption. Preserve gross/net payroll and withholding boundaries to avoid subtracting deductions twice.
- Distinguish net worth, liquid reserves, investable portfolio, liabilities, and home equity. Group account rows by type/tax treatment with totals; owner/filter controls do not duplicate underlying accounts. Trend lines require actual local snapshots or clearly labeled projections.
- The PDF uses these same selectors, labels, units, and ledger totals. A wide interactive diagram must have a printable alternative with readable type, not a shrunken screenshot.

## Progress, resilience, and debt — 5C / 5F

Progress bars are useful when their denominator is explicit: category allocation, reserve funding, or debt principal retired. Do not treat incomplete monthly actuals as an all-clear signal. Combine text with color, and retain visible overages instead of clipping them away.

Connect the existing payment cascade to the monthly budget: show when a payment is released, which debt receives it, and what happens to the payment budget after the final debt is paid. Savings, a cash reserve, or increased spending must be an explicit destination; do not create savings automatically or lose the released money. A funded reserve goal must reference real balances/allocations so the same cash cannot fully fund several goals at once.

The summary should prioritize near-term uncovered obligations, the essential spending gap, reserve duration, and the next consequential input or decision. Keep explanations calm and specific. Do not add a credit-score widget, market ticker, product recommendation, or generic grade merely as visual decoration.

## Acceptance and continuity

1. A blank-start user can enter income and a few category totals, see a clearly scoped current margin, and change one retirement cost without opening a tax worksheet. No personal amounts are prefilled.
2. Simple/category presentation round-trips preserve totals, explicit zero, missing values, and retirement overrides. Aggregate/detail reconciliation prevents double counting.
3. A scoped edit changes only its selected months/scenario, survives import/export, and can be undone. Baseline changes and scenario staleness remain visible.
4. Nonmonthly reserve accumulation and actual bill payment reconcile cash and reserve balances. The monthly ledger remains the source for quarterly/annual views.
5. Cash-flow diagram totals equal the detail table and report. Deficits, unclassified transfers, and missing observations remain explicit. A transfer or credit-card settlement cannot inflate consumption.
6. Dense rows, expanded editors, the summary, and any chart fallback work at the existing six browser-test widths with keyboard navigation and no page-level horizontal scrolling. Do not reduce font size to force desktop layout onto mobile.
7. Use synthetic-only test inputs/screenshots/PDFs. Do not commit, upload, transcribe, embed, or link private reference images or their financial content into code, documents, logs, fixtures, issues, or CI artifacts.

Execution stays dependency-led: the monthly ledger and payroll/budget bridge come next, incorporating these semantics now. Deliver grouped entry and Today/Retirement comparison alongside that integration, then conversion safeguards and saved scenarios. Add cash-flow visualizations and resilience controls only once their totals reconcile. Actual transaction tracking and broad dashboard customization remain optional later work; neither should delay the core planning journey. Timed builds remain disabled.
