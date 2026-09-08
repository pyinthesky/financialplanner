# Compact Budgets and Guided Entry — September 8, 2026

Build order: safe sample/new-plan controls; household/payroll and assumption shortcuts; compact editable budget rows and linked monthly costs; Summary Current/In Retirement Sankeys; calculation, import/reset, browser and PDF validation.

- Data & Privacy: bundled fictional sample, replacement confirmation on dirty data, and confirmed Create New Plan clearing current data and the local vault. Asynchronous encrypted saves must not resurrect erased data.
- Entry order: Household → Accounts → Benefits → Housing → Debts → Health → Budgets → Taxes → Scenarios → Summary. Pay belongs in Household; budgets consume it.
- Category suggestions have blank amounts and are not serialized until edited. Expand categories, rename rows inline, edit amounts, use calendar/settings icons. Remove the envelope-breakdown editor while retaining imported allocations without counting them twice. One applicable source button per recognized bill; no source chooser for unrelated categories.
- The selected month drives linked payments, timing, benefit deposits and savings. Debt rows include their cascaded payments and disappear after payoff. Housing/health/timed items stay read-only in budgets and identify their source. Retirement starts at full household retirement, with a month selector for staggered changes. Budget amount entries remain base-year values; projected monthly totals label inflation.
- Summary: Current/In Retirement switch on a cash-funding Sankey using the monthly engine. Withdrawals are funding, savings are transfers, and unfunded expenses are explicit. No portfolio-return percentage is mistaken for spendable income.
- Remove duplicate annual-spending inputs; preserve old aggregate plans behind an explicit retirement-budget migration choice. Financial onboarding stays blank.
- ZIP is optional and local-only; state selection remains available until a verified offline ZIP crosswalk can safely supply it. ZIP alone cannot establish taxing jurisdiction. Do not fabricate local rates.
- Reference shortcuts show the rate, period and estimate label; derivations and authoritative links belong in README. Historical portfolio returns and observed bank APYs are not forecasts.

Acceptance: named subcategory edits survive import; suggestions do not create missing amounts; current/retirement linked debts reconcile to the payoff ledger; blank and explicit zero stay distinct; reset cancels queued saves; sample is normalized and contains fresh named scenarios; Sankey totals reconcile; all required browser widths pass without hidden overflow.
