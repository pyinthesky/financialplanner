# Batch 5: Budgets, Decisions, and Development Continuity

Status: 5A.1, the 5B entry foundation, 5C, and the initial 5D inflation reference are delivered. The monthly ledger and remaining phases are incomplete. Original review used main commit `6328a5fe12fb5a160c75d7be23e93fecc583462d`; see development-state.md for September 7, 2026 release evidence and current limitations. Scheduled development remains disabled. This document supersedes the old delivery sequence, not the user's privacy or blank-onboarding requirements.

## Product outcome

A person should be able to answer: **What does my life cost today? What changes in retirement? Which decisions improve the plan, by how much, and why?**

The main journey is Data & Privacy → Household → Current Budget → Retirement Budget → Accounts & Benefits → Scenarios → Plan Summary. Housing and debt are connected detail editors. Taxes, advanced assumptions, and calculation worksheets are progressively disclosed supporting views. The menu remains the single navigation system; avoid redundant navigation buttons inside analysis cards.

Keep a quick entry route and a detailed route. Users may start with category totals or a statement-based retirement total, then refine them. They should never need to know provisional income, NIIT, or benchmark-premium terminology to begin. Already-retired users can use their current budget as the retirement starting point. Couples can have different retirement dates and a mixed working/retired period.

Completion is an end-to-end user outcome with calculation evidence. A worksheet, a checkbox, or a passing source-text test alone is not completion.

## Review findings and prerequisite repairs

These findings concern the inspected commit, not a later release. No application fixes were made during this planning pass.

| ID | Evidence in current code | Consequence | Required delivery |
| --- | --- | --- | --- |
| F01 | `IncomeStream.kind` only supports pensions and Social Security; ordinary baseline spending is included only when fully retired | No credible current budget, earnings-to-savings bridge, or staggered-retirement cash flow | 5A and 5B |
| F02 | `debtPayoffSchedule` records freed minimums only when a minimum payment finishes a debt; extra is applied to only one target | A debt paid off with extra loses its future minimum; leftover extra cannot cascade in the same month | 5C |
| F03 | Cash withdrawals reduce the cash balance but are excluded from reported withdrawals and `fundedRatio` | A cash-funded plan can be reported as unfunded | 5A |
| F04 | Taxes are computed before tax-payment asset draws; those draws do not feed back into realized gains, taxable distributions, or early-distribution tax | Tax-funded withdrawals and conversion comparisons can understate tax; tax shortfalls are not reconciled | 5A |
| F05 | Conversion sources are grouped by owner/tax treatment, with no basis/eligibility confirmation; converted dollars enter an undifferentiated Roth pool | Eligibility, five-year access, and conversion-tax funding need explicit supported behavior before scenario recommendations | 5A |
| F06 | ACA/IRMAA sensitivities use fixed 2026 assumptions, and the ladder summarizes conversion years only | They are not future premium forecasts or lifetime cost comparisons | 5A and 5E |
| F07 | Mobile tests inspect source/CSS strings; Pages workflow builds without running calculation tests or TypeScript checks | Green deployment is not proof of calculation correctness or browser usability | 5A and every later release |
| F08 | `taxableOrdinaryIncome` contains ordinary income before the standard deduction; contributions are credited without earnings-funding reconciliation | Labels and account growth can imply more completeness than the engine supports | 5A and 5B |

Reproduced with synthetic, zero-interest inputs: debt A balance 100/minimum 50, debt B balance 1,000/minimum 100, extra 50. Month 1 pays 200, but month 2 pays only 150 instead of maintaining the 200 budget. Separately, a one-year retired plan with cash 100 and spending 100 consumes the cash but reports withdrawals 0 and funded ratio 0.

Batch 2's individual worksheets are useful building blocks. Its integrated projection is **not yet validated as a complete decision engine**. Track the above as explicit reopened integration work; do not discard the sourced tax modules or silently treat their presence as proof that interactions are correct.

## Data and calculation contract

1. A household fact has one canonical owner. Income, accounts, debts, housing obligations, budget lines, and life events have stable IDs. Screens and scenarios reference these IDs rather than copying financial amounts between forms.
2. Represent missing amounts distinctly from an intentional zero. No example household, salary, debt, return, or budget is prefilled. Empty category names and opt-in strategy choices are acceptable. An average is applied only after a user action.
3. A budget line records category, amount, frequency, essential/discretionary classification, active dates or age triggers, inflation treatment, and links to its underlying obligation. Annual totals, monthly averages, and actual due-month amounts are separate views of the same line.
4. A retirement budget is an overlay on the current budget: continue, stop, replace with amount, change by percentage, or add a retirement-only cost. Each override shows its reason and remains editable. Updating a linked current value updates dependent values; explicit retirement overrides remain intact and visibly different.
5. Separate consumption, debt principal, interest, taxes, payroll deductions, and transfers to savings. A transfer is not consumption; mortgage principal reduces debt; Roth conversion is not spendable income. Employer contributions do not appear in take-home pay.
6. Current pay has two modes: actual take-home pay with an optional payroll breakdown, or a reconciled gross-pay breakdown. Never subtract withholding/contributions again from a net paycheck. Until payroll-law modeling is sourced, use entered deductions rather than pretending that federal income tax alone produces net pay. Future tax projections require sufficient gross-income details or a visibly limited cash-flow-only mode.
7. A monthly cash ledger feeds a shared annual tax calculation, not twelve independent annual tax calculations. Specify transaction ordering, month of retirement, debt interest conventions, income timing, and tax settlement. Use exact amounts/rounding rules with documented tolerances.
8. Tax-funding calculations must include taxes created by selling investments or withdrawing additional retirement funds. Use a bounded convergent solver with explicit residual, iteration limit, and unfunded-tax result; never hide failure or manufacture assets to pay a tax bill.
9. Track income surplus and cash withdrawals explicitly. Every annual total and graph must reconcile to monthly transactions. Define success using funded expenses **and taxes**, separating essential and discretionary needs. Exclude account transfers from resources available for spending.
10. Scenarios reference a versioned baseline and explicit overrides. Comparison uses the same engine, dates, source versions, and random paths. Editing a scenario cannot mutate the baseline. Baseline edits mark saved scenarios stale and offer an explicit refresh/rebase with a change list.
11. Version plan schema and write tested migrations. Preserve old aggregate spending as a visible legacy total until the user allocates it; do not add new category rows on top. Legacy zero values cannot be universally relabeled as missing. Export/import preserves scenarios, units, provenance, and overrides.
12. Each reported figure exposes its inputs and calculation explanation. Represent supported estimate, missing data, unsupported rule, and unavailable source separately. Do not add an advanced assumption to a summary silently.

Suggested module boundaries: budget normalization, household income, housing reconciliation, per-debt payment ledger, scenario overrides, monthly projection ledger, annual tax settlement, assumptions catalog, and report selectors. Keep the existing sourced tax modules behind a common calculation interface. Do not build another independent tax implementation in the scenario UI.

## Ordered delivery slices

Each slice can be split into the named sub-slices below. Ship one coherent tested user outcome per commit; never mark the entire phase done merely because its first screen exists.

### 5A — Reconcile the engine before comparing plans

- **5A.1:** Write independent failing fixtures for F02–F04; repair cash-withdrawal reporting, surplus treatment, funded taxes, tax-draw feedback, and gross-versus-taxable labels. Record all asset transfers and unfunded obligations. Add calculation tests and TypeScript checking to CI before deployment.
- **5A.2:** Specify the monthly/annual ledger contract and migration approach. Integrate annual tax settlement with monthly funding, with cash-flow identities and account-balance reconciliation tests.
- **5A.3:** Restrict conversions to an explicitly confirmed supported source/tax treatment, show requested versus available versus converted amounts, exclude RMDs, and track conversion lots/access constraints or block unsupported access. Include taxes after the conversion years in comparisons. Make missing payroll income, foreign adjustments, unsupported IRA basis, and premium eligibility visible rather than inferred.
- **Gate:** A cash-only plan funds its spending; taxes paid from appreciated investments trigger the expected additional gains; insufficient assets report unfunded tax; conversions conserve assets before tax and cannot be spent twice. Baseline without overrides exactly reproduces itself. No scenario ranking until these pass.

### 5B — Current Budget and Retirement Budget

- **5B.1:** Build a mobile-first Current Budget worksheet: recurring pay/other income; housing; utilities; groceries/dining; transport; health; dependents/education; travel/leisure; subscriptions; giving; debt; irregular obligations. Enter totals quickly or expand to bills. Support weekly, biweekly, twice-monthly, monthly, quarterly, and annual frequencies and due dates. Show current monthly inflow, essential costs, discretionary costs, debt service, savings transfers, and remaining margin.
- **5B.2:** Build the linked Retirement Budget beside/below it. Offer explicit actions to carry over current costs, stop work expenses, end time-limited bills, change travel, and enter new retirement costs. Show Today / Retirement / Change by category in today's dollars; separately show projected dollars at retirement. Support one spouse retiring first and an already-retired starting point.
- **5B.3:** Connect budgets to the reconciled projection and printable report. Derived tax/premium/budget fields show their source with a local override; do not make the user repeatedly enter the same income. Keep technical worksheets in an advanced drawer.
- **Gate:** An annual bill of 1,200 shows a 100 monthly reserve and 1,200 in its actual payment month, never both as expenditure. A biweekly paycheck uses 26 payments, not 24. A current cost set to stop at retirement disappears at the correct household event. An existing housing/debt entry is linked, never added twice. Unknown costs produce a completeness prompt, not a confident success score.

### 5C — Housing, Debt Payoff, and the Visible Cascade

- **5C.1:** Housing reconciliation accepts a statement's total payment and breaks it into principal-and-interest, property-tax escrow, insurance escrow, mortgage insurance, and other impounds. HOA and maintenance stay separately visible. Allow property tax by annual dollars OR assessment/mill rate. Show discrepancies and let the user resolve them; do not guess an unknown escrow split. P&I drives amortization; taxes/insurance continue after payoff.
- **5C.2:** Replace aggregate-only debt math with a per-debt monthly ledger. Snowball is the first option and the default for new strategy selection; preserve imported choices. Snowball prioritizes the smallest current balance, Avalanche the highest APR, and Custom uses explicitly assigned extra amounts without automatic rollover. Use stable tie-breaking. Describe motivation versus interest-cost tradeoffs; do not claim universal superiority.
- **5C.3:** Show a payoff timeline and selectable month with each debt's minimum, rolled payment, user extra, interest, principal, and balance. Add explanations such as “A is paid off; its 50 minimum now goes to B.” Keep the overall debt budget constant while targeted debt remains, including when a minimum or extra payment closes a debt. Reallocate unused current-month payment capacity immediately, and persist freed minimums in later months. Cap the last payment at the balance plus interest.
- **Gate:** Replicate the synthetic schedule below exactly; test multiple payoffs in one month, zero APR, already-paid debts, equal-priority ties, no-extra, final overpayment, and payments below interest. Negative amortization grows balance or is explicitly unsupported; it cannot silently discard unpaid interest. Mortgage escrow is excluded from debt rollover.

Synthetic acceptance example only; never onboarding data. All APRs are 0. A starts at 100 with minimum 50, B at 400/minimum 100, C at 1,000/minimum 100, and user extra is 50. The fixed debt budget is 300 per month.

| Month | Pay A | Pay B | Pay C | End balances A / B / C | Explanation |
| --- | ---: | ---: | ---: | --- | --- |
| 1 | 100 | 100 | 100 | 0 / 300 / 900 | A receives its minimum plus extra |
| 2 | 0 | 200 | 100 | 0 / 100 / 800 | B receives its minimum + A's 50 + extra 50 |
| 3 | 0 | 100 | 200 | 0 / 0 / 600 | B needs only 100; unused capacity goes to C immediately |
| 4 | 0 | 0 | 300 | 0 / 0 / 300 | C receives all three original minimums + extra |
| 5 | 0 | 0 | 300 | 0 / 0 / 0 | Final payoff; later freed cash follows the user's savings/budget choice |

### 5D — Optional Sourced Assumptions

- **5D.1:** Build reusable “Enter my amount / Use a reference” controls and a bundled source catalog. A reference card shows value, units, geography, population, observation period, publication date, method, and limitations before application. Applied values show “From …”, Undo, and Override. References never populate automatically on first visit.
- **5D.2:** Ship a small verified starter catalog: historical inflation, national/cohort household-spending references, and state residential electricity references where data supports the label. Reference values are optional inputs, not judgments about what a household should spend. Implement focused Batch 4 dependencies here rather than postponing all convenience until Batch 4 is complete.
- **5D.3:** Add optional ZIP assistance when a distributable authoritative mapping is available. Resolve locally, show ambiguous jurisdictions, and retain a manual/international route. ZIP alone cannot determine a property's taxing district, assessment, mill rate, insurance premium, or ACA quote. Where no defensible average exists, explain which statement or official lookup supplies the value instead.
- **Gate:** Selecting a reference is one action, can be undone, persists its source on export/import, and never overwrites a manual edit. Offline use works. Expired/missing geographic data cannot be relabeled as current/local. No browser request includes plan values or ZIP.

Reference plan, verified at the source-family level September 7, 2026; individual dataset values must be checked at implementation:

| Input | Appropriate shortcut | Source / guardrail |
| --- | --- | --- |
| General inflation | Rolling 20 completed years of CPI-U, all items, U.S. city average | [BLS CPI](https://www.bls.gov/cpi/). Specify annual-average index series, end year, and compound annual growth `(index_end / index_start)^(1/20) - 1`; requires endpoints 20 years apart. Label this historical, not a forecast. Do not mix with the arithmetic mean of annual changes. |
| Household categories | Published age/household/income cohort or national reference, only where published | [BLS Consumer Expenditure Surveys](https://www.bls.gov/cex/). Household averages are not personalized targets, state estimates, or per-person costs; do not linearly multiply a household total by family size. |
| Electricity | State residential price, optionally combined with entered consumption | [EIA Electricity Data Browser](https://www.eia.gov/electricity/data/browser/). Price per kWh is not a monthly bill; standing charges, usage, and observation period matter. |
| Mortgage | Existing statement; separately sourced market reference only for a new-loan scenario | Do not replace an existing contractual APR with a national current rate. |
| Property tax / insurance | Actual annual statement, or a defensible local rule/qualified quote | No ZIP-only precise claim. A national insurance average cannot be treated as this house's quote. |
| ACA / Medicare | Published plan-year rules plus actual coverage assumptions | Use existing effective-dated sources; ACA benchmark premiums are not general healthcare spending averages. Future values remain scenarios unless published. |
| Returns / long-term care | Optional sourced historical/scenario ranges with assumptions | Do not invent a national “safe return,” treat cash as equities, or represent average care cost as individual utilization. |

Build-time updates may retrieve public reference data without household data. Runtime uses same-origin bundled files and local calculation. External official lookups are user-initiated generic links with no plan-bearing URL parameters; no quote scraping or embedded third-party analytics.

### 5E — Comparable Scenarios and Monthly Summary

- **5E.1:** Save named local scenarios as baseline-plus-overrides, duplicate/reset, and compare two or three scenarios. Default comparisons: retirement date and spending changes, because they depend on the connected budgets now built. Show exactly what changed and which assumptions remain shared. Charts use common axes, real/nominal labels, and the same seeded return paths.
- **5E.2:** Mortgage payoff versus keeping the loan/investing. Reconcile payoff source, taxes, loss of liquidity, remaining P&I, continuing taxes/insurance, and reinvestment of freed payment. Compare equal external cash budgets and starting wealth. Debt principal affects liability/net worth, not consumption; home equity is not spendable portfolio. Do not declare a universal winner.
- **5E.3:** Plan Summary includes actual monthly cash flow, a separate monthly-average view, income grouped/split by owner and source (including pensions), essential/discretionary costs, irregular reserves, debt principal/interest, tax set-asides, withdrawals, and remaining margin. Show first shortfall, cumulative taxes over the full horizon, liquid reserves, spendable assets, and ending legacy. Every chart and PDF uses the same ledger.
- **5E.4:** Move-state and claiming-age comparison depend on their respective engines. A manual destination-cost comparison must be labeled manual; delay automatic state-law claims until applicable Batch 4 rules exist. Claiming age must recompute the benefit using Batch 3 rules or require a fresh user-entered estimate, not simply move an unchanged stream. Surface dependency-blocked status explicitly.
- **Gate:** Identical scenarios produce zero deltas. Changing one budget line updates spending, tax funding, portfolio, summary, and PDF consistently. Same market paths isolate the decision's effect. Comparisons include later-year consequences of conversions and are not limited to years with transactions.

### 5F — Cash Buffer, Guardrails, and Stress

- **5F.1:** Build an explainable cash target from the uncovered essential spending gap, near-term irregular obligations, and user-selected coverage duration. Distinguish gross expense coverage from coverage after dependable income. Show what is covered and for how long; avoid counting the same medical/home reserve twice. Default duration is a suggestion only after household context is available, with a cited rationale; no universal score.
- **5F.2:** Add cash buckets with separate cash/investment return assumptions and explicit refill policy, followed by configurable spending guardrails. Identify which discretionary costs would be reduced, timing, magnitude, and recovery conditions; protect essential costs from silent cuts.
- **5F.3:** Add early-market-loss, prolonged inflation, care shock, and longevity stress scenarios. Historical replay requires a licensed/versioned data source and clear treatment of missing asset histories. Keep distributions, correlations, fees, volatility, inflation, and sample size visible. Show ranges and cost of failure; a Monte Carlo percentage is conditional on the model, not a forecast.
- **Gate:** Reordering the same annual returns produces the expected sequence-risk differences under withdrawals. Cash buckets do not earn the portfolio's equity return by accident. Guardrails alter actual cash flows and report every cut. Essential shortfall and discretionary reduction are separate outcomes.

### 5G — Life Events and Legacy

- **5G.1:** Date-based one-time income/expenses and cash gifts/inheritance with explicit tax treatment. Distinguish taxable assets from inherited retirement accounts; do not model inherited IRA rules by pretending it is cash. Unsupported inherited-account cases remain visibly gated behind authoritative rule coverage.
- **5G.2:** Home sale/downsize: selling costs, debt repayment, basis, supportable exclusion eligibility, replacement housing and ongoing costs, cash released, and resulting investable assets. Never add gross sale proceeds to a balance that still includes the old house.
- **5G.3:** Legacy target in today's/projected dollars, optional reserve goals, and scenario/PDF explanations. Household death/survivor transitions depend on Batch 3; do not stop a spouse's expenses/benefits via arbitrary percentage defaults.
- **Gate:** Every event balances cash, assets, liabilities, and taxes; cannot occur twice after edits/import; does not use unimplemented tax rules as zero tax.

## Shared usability and release acceptance

- Blank-start success: a user can enter net pay and five common bills, see a current margin, carry selected lines to retirement, alter a cost, and explain the resulting delta without visiting an advanced tax worksheet.
- No forced name/email/account, telemetry, server-held plan, third-party transmission, AI/cloud sync, or personal example data. All saved scenarios live in the encrypted vault or intentional local export.
- Use progressive disclosure, clear units, frequency selectors, calm factual copy, reversible actions, and one explanation per relevant decision. Avoid an ever-growing Taxes page of mandatory worksheets.
- Missing data gets a next useful question; intentional zero stays zero. A custom label may contain personal information, so tests, screenshots, logs, and public fixtures use synthetic values only.
- Run actual browser journeys at 320, 375, 390, 430, 768, and desktop widths, including Firefox/Chromium/WebKit as available. Check page-level overflow, dropdown clipping, table cards, focus, zoom, long labels, touch targets, and open/closed navigation. Automated WebKit emulation is useful but is not proof of real iOS Safari keyboard behavior; record that limitation and the eventual device check.
- Render and inspect PDFs using populated synthetic budgets and scenarios, including charts, page breaks, legends, and long labels. A chart tag existing in source is insufficient.
- Independent fixture oracles cover budget annualization, cash conservation, tax settlement, import round trips, owner/date boundaries, debt rollover, and identical-scenario equivalence. Property/invariant tests complement sourced example calculations. Do not inflate test counts with implementation-mirroring assertions.
- CI must run calculation/regression tests, type checks, and the static build. Record the actual commit and Pages outcome. Browser/PDF evidence belongs with the relevant slice; list unverified device behavior honestly.

## Requirement continuity and remaining roadmap

| User requirement | Primary delivery home | Dependencies / later continuation |
| --- | --- | --- |
| Current budget, monthly bills, retirement worksheet | 5B | 5A income/ledger foundation |
| Easy entry, units, mobile, guided downstream population | Every slice; first acceptance in 5B | Existing 1B real-device audit remains open |
| National/state/historical quick choices and ZIP | 5D | Focused Batch 4 datasets; no fabricated locality precision |
| Visible Snowball/Avalanche cascade and Custom extra | 5C | Per-debt ledger and housing reconciliation |
| Mortgage escrow, mill rate or annual tax | 5C | Full state/local rule automation later in Batch 4 |
| Monthly summary, split pensions, printable graphs | 5E | One canonical ledger; pensions are income, not capitalized assets |
| Cash-buffer recommendation, itemized coverage | 5F | Current/retirement essential budgets and income stability |
| HSA before/during retirement | Accounts/health continuation after 5B–5E | Batch 2 account rules and Batch 4 Medicare/health; receipt and eligibility treatment needs sourced implementation |
| Universal Social Security, spousal/survivor, pensions | Batch 3 dependency before automatic claiming/death comparisons | Keep provider statement entry available |
| Military, FERS/CSRS, TSP, FEGLI, FEHB | Specialized Batch 3 path after universal benefits | Preserve all original requested systems in backlog |
| ACA exchange assistance, state law, health/LTC data | Focused 5D integration then Batch 4 | Data availability and effective dates are explicit |
| Will/estate education, advisor vetting/fees, index alternatives | Guidance continuation after the core journey works | No will-provider referrals; clarify SEC versus state registration, no endorsements/affiliate links |
| Comforting tips, transparent resilience assessment | Contextual explanations in 5B–5F; deeper guidance later | Distinguish debt-service burden, liquidity, and retirement funding; do not reduce all success to DTI |
| Healthy-living education | Later health guidance | Evidence-based, no personalized cost guarantees or blame |
| Competitive quality | Journey-based review after 5E | Benchmark public tasks and reasoning; no unsupported “better than” claims |
| Optional AI/cloud sync | Deferred | User's local-only constraints and core-engine completion remain prerequisites |

Execution order: 5A → 5B → 5C → 5D starter catalog → 5E.1–5E.3 → 5F → 5G supported events, pulling in Batch 3/4 dependencies before making their associated claims. 5E.4 and complex 5G cases may remain explicitly blocked until those dependencies ship. Finish broader benefit/health/state coverage and guidance after the core journey; optional AI remains deferred. This is product priority, not permission to call incomplete phases complete.

## Handoff and model choice

Recommended allocation is an engineering judgment, not a measured guarantee of either model's success on this repository. Official docs describe [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) as the most capable model for difficult end-to-end work and [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) as a flagship for professional work. Both support High reasoning. [OpenAI's model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection) prioritizes demonstrating accuracy before optimizing model cost. No repository-specific first-pass success rate has been measured.

- Use Astra High for 5A's ledger/tax reconciliation and the shared data contract, then for cross-module reviews of mortgage comparisons, conversion access, and stochastic/guardrail behavior.
- Use Sol 5.6 High for bounded implementation after contracts and independent fixtures exist: budget editors, linked retirement overrides, source cards, cascade visualization, report layout, and scenario controls. Sol may implement calculation work too when the supported rule and oracle are unambiguous; escalate when two valid interpretations materially change outcomes.
- Evaluate Sol on 5B.1 or 5C.3 with the same written requirements, fixtures, and browser acceptance journey. Continue if the result meets the gates without requirement loss; otherwise have Astra review the failure and adjust the contract. Do not choose by test count or assume High reasoning guarantees correctness.
- If selecting only one model for the next substantial implementation, prefer Astra High until 5A and the budget contract are settled. The observed problems involve cross-feature reasoning and acceptance discipline; changing model alone cannot fix that process.

For each new implementation turn:

1. Fetch current main; read this document, README status, and the latest handoff. Use a clean checkout or a verified isolated copy, not a stale checkout with accumulated prior releases.
2. Select one named sub-slice whose dependencies pass. State its user outcome and acceptance criteria before coding. Do not weaken a criterion to match existing code.
3. Preserve source dates, schema migration, blank onboarding, and the shared facts contract. If a rule/data source is unavailable, keep the dependency visible and implement only the supported path.
4. Run independent calculation cases and the real browser/PDF journey that the slice affects. Record failures and remaining risks; a green static build is only one gate.
5. Publish the authorized slice, verify Pages, and update README plus `docs/development-state.md` with commit, test evidence, source versions, known limits, and the exact next sub-slice. Do not advance because an hourly interval elapsed.
6. No timed work is active. Resume automation only on a new explicit request. No delegated agents unless the user explicitly requests them.

## Next implementation handoff

Continue with **5A.2 and the remaining 5B bridge**: the entry schema, debt ledger, annual funding repair, and browser CI now exist. Specify and integrate payroll funding, actual monthly timing, staggered retirement, and annual tax settlement with independent cash/balance identities. Then complete 5A.3 conversion source/access constraints before scenario rankings. See development-state.md for the exact next implementation contract. Do not begin by adding another independent worksheet.
