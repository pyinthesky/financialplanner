# Open Retirement Planner

Free retirement planning that runs in your browser: no ads, marketing, tracking, accounts, names or email addresses.

**[Open the planner](https://pyinthesky.github.io/financialplanner/)** · [Delivery roadmap](#delivery-roadmap) · [Calculation boundaries](#calculation-boundaries) · [Run locally](#run-locally)

Start with blank inputs or explicitly load the fictional sample plan. Build a current budget, describe what changes in retirement, and explore the consequences using your own assumptions. The experience should be comforting, informative and practical, without shame or false certainty.

## What Works Today

| Area | Supported experience |
| --- | --- |
| Data & Privacy | Session-only planning, optional encrypted local vault, raw JSON export/import, fictional sample loading and confirmed plan reset |
| Household | Individual/partner timelines, payroll details, optional local ZIP and state selection, explicit Apply/Undo for dated public references |
| Cash & Investments | Account balances, tax treatment, ownership, aggregate taxable basis and supported account-access assumptions |
| Pensions & Social Security | Entered benefit amounts, ages, COLAs and withholding; automatic benefit optimization remains planned |
| Loans & Debts | Loan entry, cascade strategy and local fee/term-aware refinance comparisons with dated public mortgage indicators |
| Real Estate | Primary-home carrying costs and escrow reconciliation; existing rental records linked to loans, budgets and monthly cash flow; isolated pre-tax property comparisons |
| Current and Retirement Budgets | Compact expandable categories, editable bill names, timing controls, retirement changes and shared timed costs; linked pay, benefits, healthcare, housing and scheduled loan payments |
| Taxes & Withdrawals | Dated federal worksheets, owner-specific RMD/QCD and distribution checks, conversion comparisons, LTCG/NIIT and an entered state-tax estimate, subject to the boundaries below |
| Scenario Laboratory | Saved baseline snapshots, explicit overrides, compare/duplicate/reset/rebase, isolated debt-strategy experiments, funded mortgage payoff, supported home-sale/downsize comparisons, cash coverage and hypothetical stresses |
| Plan Summary | Current/retirement Sankeys and funding details, input-aware Outlook, compact month picker, total/per-loan debt charts with principal/interest and cascade details and annual or monthly projection results |
| PDF Report | Printable projection/scenario charts, budgets, both Sankeys, assumptions, accounts, benefits, housing, care costs and policy details |

Snowball and Avalanche retain paid-off minimums and roll available payments into the next debt. Custom uses assigned extra payments without rollover. Property tax and insurance continue after a mortgage is paid; escrow cannot become extra principal. A timed expense is not converted into a loan just because it recurs.

Inputs remain blank until entered or a reference is explicitly applied. References are dated illustrations, not personalized forecasts. Imported legacy spending amounts remain available until users select the retirement worksheet; the disabled envelope-breakdown editor is not part of the current compact entry flow.

## Privacy and Security

All plan calculations run locally. The optional vault uses Web Crypto AES-256-GCM and PBKDF2-SHA-256 before saving to browser local storage. Its passphrase stays in memory for the open session and is never stored or transmitted. Raw JSON exports are readable and unencrypted.

Encryption protects saved data against casual browser-profile access and offline inspection. It cannot protect an unlocked plan against malware, malicious extensions, keylogging, screenshots or a compromised operating system. See [SECURITY.md](SECURITY.md).

No plan data, credentials or personal screenshots belong in the repository, logs, test fixtures or CI artifacts. Tests use independently invented fictional data. The app has no runtime third-party plan-data requests. Proposed public-reference updates must preserve that boundary.

## Calculation Boundaries

These are educational estimates, not a complete tax return or a guarantee of retirement success. Annual worksheets and the monthly funding engine have different supported scopes; improvements to one do not establish correctness of every other path.

- Federal ordinary-income and long-term-gain calculations use published 2026 rules with labeled planning indexation in future years. State tax remains an entered effective estimate. Do not infer jurisdiction-specific deductions, credits or gain treatment.
- Benefits are entered from statements. Automatic claiming, spousal/survivor, death-year and specialized pension transitions remain open.
- ACA/IRMAA worksheets and conversion sensitivities use dated rules; they are not automatic forecasts of future premiums or eligibility.
- Monthly account access is conservative. Inherited accounts, detailed IRA basis, tax lots, special home-sale cases and automatic qualified HSA reimbursements remain unsupported dependencies.
- The supported home-move comparison covers specified personal-home sales and cash-funded replacement housing. Existing passive rentals require user-confirmed nonnegative taxable profit; operating cash is calculated separately. Rental losses, depreciation and sale tax are not calculated. Property experiments are explicitly pre-tax and excluded from household scenario rankings.
- Hypothetical investment paths are not calibrated probabilities or historical replay. Unsupported rules, missing inputs and unfunded obligations must remain visible; no recommendation should hide them.

[Calculation sources and reference methodology](docs/calculation-sources.md) preserve effective dates, exclusions and the methods behind the inflation, portfolio and cash shortcuts. A historical arithmetic portfolio return is not a compound-growth forecast; the existing two-bank cash reference is not a national HYSA average.

## Delivery Roadmap

This section is the authoritative priority list. Historical checkboxes are retained in [delivery history](docs/delivery-history.md), not used as the current work queue. Status terms are **Planned**, **In Progress**, **Supported with Limits**, and **Complete**. Complete applies only to the stated scope and its acceptance evidence.

The shared entry journey is **Data & Privacy → Household → Cash & Investments → Pensions & Social Security → Loans & Debts → Real Estate → Health → Current Budget → Retirement Budget → Taxes → Scenario Laboratory → Plan Summary**. Enter a fact once; budgets, scenarios, charts and reports should reuse it without double counting.

### Next Priorities

| Order | Work | Status | Completion criteria |
| --- | --- | --- | --- |
| 1 | Documentation consolidation | Complete | One visible roadmap; history and calculation methodology linked separately; Real Estate and remaining dependencies retained |
| 2 | Outlook assessment and compact month navigation | Supported with Limits | Summary opens with explainable, input-aware assessment and tested next actions; accessible month/year picker replaces the long dropdown |
| 3 | Explainable debt visualization | Complete | Total/per-loan balances, principal/interest payment bars, payoff markers and visible minimum-payment transfers use the actual monthly ledger |
| 4 | Refinancing opportunity indicators | Supported with Limits | Fresh, user-confirmed comparable mortgage references; local badges/snooze and fee/term comparison; no rate qualification claims |
| 5 | Real Estate | Supported with Limits | Existing rentals in the monthly engine; linked mortgages; isolated pre-tax buy/invest and keep/sell comparisons; unsupported rental tax and transaction timing remain excluded |

### Current Priority Delivery

Implemented September 8, 2026, in the requested order (refinancing before Real Estate). 153 calculation/regression tests and type/build checks pass locally; the required Chromium/WebKit and PDF release checks run in the Pages workflow.

- **Outlook:** readiness and funding-gap reasons, full-retirement timing, first shortfall, cash-target gaps and legacy gaps. Two explicit comparisons show the effect of 5% lower everyday spending and one percentage point higher inflation on the same baseline and horizon. Reserve review is a third action when relevant. These are conditional illustrations, not personalized investment advice or probabilities. The PDF includes the same assessment.
- **Month navigation and debt:** calendar month input, bounded previous/next and retirement/payoff jumps; every debt month retained, per-loan view, principal/interest bars and payoff markers. Existing payment-transfer details remain available. Linear zero-interest payoff is deliberately preserved.
- **Refinancing:** fixed-rate P&I comparison, upfront/financed fees, remaining balances, common holding period, interest, break-even and term-extension warnings. The optional benchmark requires explicit product/cohort confirmation and a 15/30-year comparison term; it is not a refinance offer. Indicators expire after 21 days and can be snoozed. A weekly public-data-only workflow runs after Freddie Mac's usual Thursday PMMS release, validates the source and opens a reviewable pull request; it never writes directly to `main`. The manual equivalent is `node --experimental-strip-types scripts/refresh-mortgage-rates.mjs`. Failed or changed source parsing preserves the last good file; stale files suppress badges. Visitors never contact the rate source, and timed feature builds remain disabled.
- **Real Estate:** the primary home's existing fields now live here. Existing rental records use distinct canonical mortgages from Loans & Debts; no second mortgage balance is created. Collected rent, operating costs, confirmed taxable profit and property value feed both budgets and the monthly engine, Sankeys, reserves, net worth and PDF. Reserve targets add to the cash target without becoming a second expense or asset; entered repair allowances are actual modeled spending. Enter explicit zeros and confirm taxable profit to unblock projections. Rental records select monthly Summary/PDF output because the legacy annual engine does not model rentals.
- **Complete fictional sample:** Load Sample Plan now exercises cash and five investment tax treatments, linked payroll and benefits, current/retirement budgets, debt cascading, refinance inputs, a primary home, a linked rental and mortgage, property comparison, tax/health worksheets, life events and three saved scenarios. Plan Summary retains dedicated Cash & Investments and Real Estate starting-position panels when monthly results are selected, followed by reconciled current and retirement Sankeys.
- **Property experiments:** buy versus same-cash investing and keep versus immediate sale/investing; opening purchase or sale, monthly constant nominal rent/costs, fixed-rate amortization and liquidation at the entered horizon. Both alternatives receive identical additional outside funding; positive rent is reinvested. Selling fees and outstanding debt reduce terminal proceeds. An explicit copy action brings an existing rental into the keep comparison. Inputs remain separate from the household baseline and all tax-complete rankings. Underwater sale-now cases are blocked. This is not a rental acquisition recommendation.

Remaining boundaries: dated mid-plan rental purchases/sales, multiple liens, variable-rate financing, tax losses/depreciation/recapture, return-risk equivalence, exact credit-score pricing and automated personal refinancing recommendations are not supported. Existing-property value and costs remain nominal; changes require explicit edits. Keep-mode payment is estimated from the entered balance/rate/remaining term. Do not duplicate primary-home tax/insurance or rental repairs in another entry section. Rental cash cannot automatically fund a hypothetical purchase; experiments show required cash separately.

### Outlook Assessment

Lead Plan Summary with an answer to “How does my plan look?” Use age, retirement timing, assets and account accessibility together with current/retirement budgets, benefits, debt, cash reserves and modeled funding needs. Do not grade people by age and wealth alone.

- Show “On Track Under These Assumptions,” “Potential Gap,” or “More Inputs Needed,” with the main reasons. Explain unsupported cases rather than generating a reassuring score from partial data.
- Show time to retirement, the retirement spending gap, cash coverage and any projected shortfall. Separate input completeness and model limitations from financial outcomes.
- Offer at most three prioritized actions. Where the model supports it, compare explicit changes such as additional saving, lower spending or later retirement and show their quantified effects and trade-offs.
- Use the same baseline, horizon and assumptions for each comparison. Recommendations must be reproducible from the ledger and must not silently apply edits. Clearly label untested educational suggestions.
- Use local calculation rules; AI is not a prerequisite. Retain transparent debt-payment burden/resilience components rather than presenting an opaque credit-like score or guaranteed success probability.
- Keep the assessment and its assumptions consistent in the PDF. Acceptance includes blank/incomplete plans, high assets with high spending, low assets with dependable benefits, inaccessible assets and funding shortfalls.

### Compact Sankey Month Navigation

Replace the long month dropdown with a calendar icon, readable selected month and accessible month/year picker. Add previous/next-month controls and supported milestone jumps such as retirement and final scheduled debt payoff. Keep Current / In Retirement shortcuts, constrain dates to the modeled horizon, and make adjacent cash-flow details use the same selection. Include keyboard, screen-reader, mobile and empty-horizon acceptance; a day picker would imply precision the monthly engine does not have.

### Explainable Debt Visualization

The ledger and baseline/scenario strategy controls are already supported; this priority improves their presentation.

- Show total balance or balances by loan, with every monthly observation and payoff milestone retained.
- Add principal-versus-interest payment bars and payoff markers explaining which minimum payment became available to the next loan. Keep the existing per-debt payment ledger available.
- Compare strategies using the same starting debts and an explicitly comparable payment budget. Surface unpaid interest and unfunded scheduled payments.
- Do not force an exponential shape. With zero interest and a constant total payment budget, aggregate debt falls linearly until paid. At positive rates, declining interest can increase principal repayment even when the total payment budget stays constant. Individual loans can show a sharper change when they receive rolled payments.
- Acceptance includes zero-interest linear payoff, positive-interest amortization, mixed rates, same-month rollovers, Custom without rollover and a loan not repaid within the horizon.

### Real Estate

Make Real Estate a first-class planning area with **existing property records** and **Scenario Laboratory experiments**. Build the shared property model and a bounded comparison before exposing a dedicated tab; do not imply rental support by renaming the current home-only form.

- Record primary-residence and income-property value, linked financing, property tax, insurance and operating costs. Rental inputs include gross rent, vacancy, management, maintenance and capital-replacement reserves. No tenant identity, address, listing or bank connection is required.
- Link each mortgage to its property without duplicating the loan. Feed income, expenses, debt service, equity and net worth into the shared plan once. Reserves, transfers and actual expenditure need distinct treatment to avoid charging the same repair twice.
- Compare buying a rental against investing the same starting cash; keep versus sell; and changes in rent, vacancy, financing or major repairs. Include down payment, purchase/closing costs, initial liquidity needs and the same comparison horizon.
- Separate operating cash flow, interest, principal reduction, cash invested, equity and net sale proceeds. Handle purchase/sale timing, financing shortfalls and retained costs explicitly.
- Require supported, sourced rental tax treatment before presenting tax-complete retirement outcomes. A bounded pre-tax comparison may ship first if clearly labeled and excluded from tax-complete rankings. Do not guess depreciation, passive-loss limits, recapture or sale exclusions.
- Acceptance includes financed and unfinanced properties, zero rent/vacancy stress, maintenance costs, sale-loan settlement and conservation of cash/assets/debt across the comparison.

### Refinancing Opportunity Indicators

Use a restrained notification count on Loans & Debts and a marker on each relevant loan, labeled “Worth Comparing.” Provide a reason, source date and dismiss/snooze behavior; do not imply qualification or a lender offer.

- Start with loan types for which a suitable benchmark exists. Match term/product and disclose population differences. A mortgage benchmark must not be reused for auto, student or credit-card debt.
- Prefer regularly refreshed public snapshots served with the app; compare against the user's debt entirely locally. The approved weekly updater validates public data and proposes snapshot changes by pull request, leaving review and merge explicit.
- Validate source schema, values, observation date and usage rights. Preserve the last valid snapshot on failure, show stale data, and suppress fresh-opportunity claims when the benchmark is stale or unsuitable.
- [Freddie Mac PMMS](https://www.freddiemac.com/pmms) is a candidate weekly mortgage reference, not a personalized refinance quote. Check its methodology and supported borrower/product population before implementation.
- Credit bands are optional and remain local. Use them only where a source supports meaningful comparisons; never manufacture an exact credit-score rate adjustment.
- Compare closing costs/points, financed fees, remaining and proposed terms, expected holding period, payment changes, total interest and remaining balance at a common horizon. Expose term extension and break-even assumptions; rate spread alone is not enough.
- Acceptance includes small balances, short remaining terms, longer replacement terms, no-cost/financed-fee offers, stale or missing data and an attractive headline rate that does not justify refinancing.

### Continuing Feature Development

| Area | Status | Remaining scope |
| --- | --- | --- |
| Private foundation and portability (Batch 1) | Supported with Limits | Preserve blank onboarding, vault safety and raw export/import; continue real-device/keyboard-open accessibility and mobile checks |
| Federal worksheets and monthly integration (Batches 2 / 5A) | Supported with Limits | Audit each supported path; retain explicit tax/account-access exclusions and avoid declaring the full annual engine repaired solely from monthly tests |
| Benefits (Batch 3) | Planned | PIA/earnings-based estimates, early/delayed claiming, spousal/survivor and death-year transitions, pension survivor/lump-sum comparisons; military systems, FERS/CSRS, TSP, FEGLI and FEHB |
| State, health and references (Batch 4) | Planned | Versioned state/local rules, optional ZIP/locality assistance and international/manual path, exchange-premium lookup guidance, Medicare/LTC references, property-tax assistance and refreshed economic/cohort references |
| Budgets and scenarios (Batch 5) | Supported with Limits | Preserve compact bill editing, shared current/retirement facts, funded comparisons, cash policies and dated events; add the next priorities above and retain specialized-rule exclusions |
| HSA planning | Planned | Effective-dated contribution, investing, receipt, qualified-expense, Medicare-enrollment and reimbursement treatment |
| Education and guidance | Planned | Neutral will/trust/provider education; fiduciary/RIA/Form ADV and official SEC/state registration checks; sourced fee guidance; appropriate diversified-index alternatives; evidence-grounded health/longevity prompts |
| Trust and accessibility (Batch 6) | Planned | Expanded audit trail, calculation explanations, accessibility, performance and downloadable ledgers; improve household/owner entry and progressively reveal relevant questions |
| Optional AI or cloud connections | Planned, deferred | Only after core tax, benefits, health/state and scenario dependencies are complete; separate explicit design/authorization, no project storage of credentials or financial data |

The goal is to improve on CFIRESim, Empower, Monarch, Free Financial Plan, EveryDollar, Bankrate and typical bank tools through connected reasoning, clear assumptions and privacy. Benchmark public workflows for missing questions, fragmented results, opaque estimates and unnecessary data collection. Budget usability and helpful sourced shortcuts are core requirements, not end-stage polish.

## Development Continuity and Release Gates

Before implementing, read this roadmap, [development state](docs/development-state.md) and the relevant [Batch 5 contract](docs/batch-5-plan.md), [experience contract](docs/batch-5-experience.md) or [compact-budget revision](docs/compact-budget-round.md). This roadmap governs priority; older documents retain design detail and historical context. Resolve conflicts against the latest agreed user requirements and verified code. Do not infer completion from an old batch label.

Work in coherent, reviewable slices. Mark only work actually underway as In Progress, attach evidence when updating status, and move release narratives to [delivery history](docs/delivery-history.md). Keep original batch identifiers for continuity without scattering duplicate active checklists across documents. Timed feature builds remain disabled.

Every relevant release must preserve local-only privacy, blank onboarding, explicit references/overrides, saved-plan compatibility and reconciliation of shared facts. Calculation changes need meaningful boundary/conservation tests and authoritative effective-dated sources. UI changes need mobile/keyboard checks; print changes need populated charts and visual PDF inspection. Never hide unsupported outcomes behind success percentages.

Latest application verification before this documentation cleanup: [September 8 release](https://github.com/pyinthesky/financialplanner/commit/e3829160d62a5e4c07ff32943354207c4f8fe8a3), [Pages workflow](https://github.com/pyinthesky/financialplanner/actions/runs/34265147085): 144 tests, TypeScript/build, Chromium and WebKit at six widths, and an eight-page fictional PDF visually inspected. WebKit passed on retry after a renderer crash. This evidence describes that release, not future roadmap work or universal real-device compatibility.

## Run Locally

Requires Node.js 22 or newer.

```bash
npm ci
npm run build:pages
npm run test:planner
```

For local development:

```bash
npx vite --config vite.github.config.ts
```

## Deployment

[The Pages workflow](.github/workflows/pages.yml) builds `dist-pages`, runs its gates and deploys through GitHub's official Pages actions. Repository Pages settings must use GitHub Actions as the source. Public-reference updates and new feature work remain separate concerns.

## Contributing

Issues and pull requests are welcome. Explain the user problem, supported behavior, assumptions and validation. Financial-law changes require authoritative sources and effective dates. Preserve privacy, accessibility and clear calculation boundaries.

## License

MIT
