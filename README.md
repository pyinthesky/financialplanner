# Open Retirement Planner

A free, ad-free, marketing-free, tracking-free retirement planning application that runs entirely in the browser.

The live site is published at <https://pyinthesky.github.io/financialplanner/>. No account is required, and the application never asks for a name or email.

## What works today

- Interactive annual retirement projection through age 120
- Taxable, 401(k)/403(b)/traditional IRA, Roth, cash, and HSA account treatment
- Pension and Social Security income streams with claiming ages and COLAs
- Married and single household timelines
- Baseline spending plus time-bounded large recurring expenses
- Healthcare, Medicare-years, healthcare inflation, and a long-term-care stress reserve
- Home value, assessment percentage, mill rate, home insurance, and a mortgage-payoff scenario
- Debt avalanche and debt snowball schedules with payment rollover
- Transparent withdrawal order with owner-specific RMDs/QCDs, early-distribution checks, 2026 progressive federal and long-term-capital-gains tax, NIIT, and an editable state estimate
- Owner-specific Roth conversion ladder with taxable Social Security, LTCG/NIIT, and clearly labeled 2026-rule ACA/IRMAA sensitivities
- Deterministic projections and a seeded 240-path Monte Carlo planning range
- Interactive Recharts visualizations
- Print-optimized PDF report through the browser's **Save as PDF** flow
- Raw JSON download and re-upload
- Optional encrypted local vault using Web Crypto AES-256-GCM and PBKDF2-SHA-256
- Responsive layout with no analytics, trackers, ads, cookies for plan data, or remote API calls

## Privacy and security

Plan calculations happen locally. The optional vault encrypts the plan before storing it in browser local storage. The passphrase is held only in memory for the current page session and is never stored or transmitted.

Encryption protects saved data from casual browser-profile access, unencrypted backups, and offline disk inspection. It cannot protect an unlocked plan from malware, a malicious browser extension, keylogging, screen capture, or a compromised operating system. See [SECURITY.md](SECURITY.md).

Raw JSON exports are intentionally readable and are **not encrypted**. Store them accordingly.

## Run locally

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

The workflow in `.github/workflows/pages.yml` builds `dist-pages` and deploys it with GitHub's official Pages actions. In the repository settings, Pages must use **GitHub Actions** as its source.

## Calculation boundaries

This is an educational planning estimate, not tax, investment, legal, insurance, or medical advice. Values are nominal. Federal ordinary-income and long-term-capital-gains tax use published 2026 thresholds for all four filing statuses, with planning-only inflation indexing of indexed amounts in later years. It is not a complete tax-return engine: state tax remains a user-entered effective estimate, and the federal worksheets explicitly identify excluded forms, elections, special gain categories, credits, deductions, and eligibility rules. Social Security and pension benefits are entered from official statements rather than inferred from earnings histories.

## Delivery roadmap

The work is organized into bounded batches so each batch can ship independently.

### Priority delivery sequence

The primary journey is **Current Budget → Retirement Budget → Scenarios → Plan Summary**, beginning with Data & Privacy and a shared household model. The detailed [Batch 5 plan](docs/batch-5-plan.md) is the canonical delivery contract: reconcile the existing engine first, build linked budgets, correct and expose debt-payment cascading, provide optional sourced assumptions, then ship meaningful scenario comparisons. Pull in specific Batch 3/4 benefit, health, and state-data dependencies when needed; do not imply they work merely because a scenario selector exists.

Read [development state](docs/development-state.md) before resuming. Timed builds are disabled. Budget usability, source shortcuts, and mobile acceptance are core delivery requirements, not optional polish left at the end of the backlog.

### Batch 1 — Private planning foundation (complete)

- Core household, portfolio, income, expense, housing, healthcare, and debt data model
- Projection and debt engines
- Interactive charts and printable PDF report
- Encrypted local persistence and portable JSON
- GitHub Pages deployment

### Batch 1A — Immediate usability corrections

- [x] Rebuild narrow-screen navigation, summaries, forms, tables, and charts around mobile task flows, with usable tap targets, print-report isolation, and no clipped or horizontally trapped content
- [x] Render untouched numeric inputs as blank rather than `0`; select existing values on focus for predictable replacement while preserving intentional zero values
- [x] Unify field, affix, and secondary-surface borders, backgrounds, and corner radii so compound inputs have no white seams or mismatched rounding

### Batch 1B — Review-driven experience corrections

- [x] Reorder the guided journey so **Data & Privacy** is the welcoming start, explains and offers the encrypted vault before sensitive entry, and **Plan Summary** is the final destination
- [x] Apply consistent title case to page headings, panel titles, navigation labels, chart labels, and legends; replace internal keys such as `hsaWithdrawal` with human-readable labels
- [x] Give every quantitative input a visible, unambiguous unit or currency affix where applicable, while preserving blank zero-value onboarding
- [x] Add a restrained save-state animation to the unlocked-vault indicator, with reduced-motion support and distinct saving/saved/failed states
- [x] Fix the missing separation above Timed Expenses and audit vertical rhythm between every card and section
- [x] Restore the portfolio-projection chart in printed/PDF output with deterministic SVG geometry and regression checks that verify finite, non-degenerate stacked areas rather than merely chart markup
- [ ] Repeat the mobile audit on real narrow Safari/Chrome viewports: eliminate page-level horizontal scrolling, reduce excessive padding, stack remaining hostile controls, restore missing inter-card gaps, and test long labels and keyboard-open states
- [x] Prevent descenders and focus rings from clipping in native selects; constrain long option labels and affixed controls so they cannot widen narrow pages
- [x] Remove redundant in-content navigation actions such as **Review Assumptions** when the primary menu already provides the destination
- [x] Reshape rough Planning Signals cards into a calm, prioritized summary with a plain-language reason and next useful action for each signal; never label an untouched plan as funded

### Batch 2 — Federal tax worksheets delivered; integration repairs required

The items below record delivered functionality. A September 7, 2026 review found tax-funding feedback, cash-withdrawal reporting, and conversion integration gaps. These are explicitly reopened prerequisites in [5A](docs/batch-5-plan.md#5a--reconcile-the-engine-before-comparing-plans); the earlier “complete” label did not establish that the full projection was validated for decision comparisons.

- [x] 2026 federal brackets and basic standard deductions by filing status, with future-year planning indexation
- [x] Social Security taxation worksheet using provisional income, filing-status thresholds, tax-exempt interest, and the married-filing-separately lived-apart distinction
- [x] RMDs, QCDs, early-withdrawal constraints, and taxable cost basis
  - [x] Account-level taxable adjusted basis, contribution basis tracking, proportional gain realization, and explicit tax-lot limitations
  - [x] Owner-specific non-inherited RMD projection using optional birth years, prior year-end balances, and the IRS Uniform Lifetime Table, with 1959 and special-rule review states
  - [x] Effective-dated QCD source, age, annual-limit, and RMD-capacity check, without guessing through age-70 distribution dates or ongoing SEP/SIMPLE status
  - [x] Apply owner-specific intended QCDs and entered post-70½ deductible-contribution offsets to IRA balances, RMD satisfaction, taxable income, Social Security provisional income, and distribution charts without treating gifts as spendable cash; hold the known 2026 ceiling flat in later planning years
  - [x] Owner-specific pre-59½ traditional-account distribution check with a 10% additional-tax estimate, user-confirmed annual exception amounts, age-59 date review, and explicit unassigned-account/Roth review states; exception eligibility is never inferred
- [x] Roth conversion ladder and bracket-filling comparison
  - [x] Current-year 2026 bracket-fill comparison showing gross-income capacity, incremental federal tax, resulting marginal rate, and explicit IRA-basis and interaction limitations
  - [x] Apply owner-specific conversions to account balances and a year-by-year ladder that recomputes taxable Social Security, ordinary tax, LTCG/NIIT, and the entered state estimate, with separately labeled 2026-rule ACA PTC and IRMAA sensitivities rather than forecasts
- [x] Medicare IRMAA and ACA premium-tax-credit interactions
  - [x] Exact 2026 Medicare Part B and Part D IRMAA worksheet using 2024 Medicare MAGI, filing-category boundaries, separate enrollee counts, annual household costs, and next-tier distance
  - [x] Integrate published 2026 IRMAA tiers into the conversion ladder as a clearly labeled current-law sensitivity; actual future thresholds, premiums, and two-year lookback results are not projected as law
  - [x] Add an effective-dated 2026 ACA premium-tax-credit worksheet using 2025 poverty guidelines, household MAGI, tax-family size, location, enrolled and benchmark premiums, standard 100%–400% FPL eligibility limits, and the planned taxable Roth conversion's estimated subsidy impact; do not infer non-income eligibility
- [x] Replace the manually entered flat capital-gains rate with an effective-dated 2026 federal long-term-capital-gains worksheet that stacks realized gains above ordinary taxable income, applies unused standard deduction and the 0% / 15% / 20% bands, separately calculates the 3.8% NIIT, feeds projections, and retains an explicit override for unmodeled regular-gain cases
- [x] Replace ambiguous labels such as **VA effective rate** with **estimated effective state income-tax rate** and explain that the input applies only to modeled ordinary taxable income, not jurisdiction-specific deductions, credits, exclusions, capital gains, or conversion rules

### Batch 3 — Social Security and pension decisions

- Benefit estimates from PIA or earnings records
- Early/delayed claiming adjustments
- Spousal and survivor rules
- Pension survivor-election and lump-sum comparison
- Household death-year scenarios
- Military and government retirement paths, including authoritative, effective-dated treatment for military retirement systems and survivor benefits, FERS/CSRS, TSP, FEGLI, FEHB retirement eligibility, and related tax distinctions

### Batch 4 — State, health, and long-term care data

- Versioned state and local income-tax and retirement-income rules
- Optional U.S. ZIP/locality assistance, replacing the free-form State field, using authoritative, effective-dated data to suggest state/local tax assumptions, assessment conventions, and mill rates; keep every derived jurisdiction visible, reviewable, and overridable, never require a ZIP, and retain a manual country-aware path for international users
- Guided state-exchange / HealthCare.gov workflow that helps users identify the correct marketplace, look up current plan-year premiums, and locally populate subsidy and net-premium inputs without transmitting the rest of the plan
- Medicare premium assumptions and state long-term-care cost references
- Property-tax presets while preserving user-entered assessed values; allow entry by either mill rate or annual tax from a statement, derive the other value when possible, and avoid double counting
- Effective-dated economic defaults, beginning with a clearly sourced rolling 20-year historical inflation average that users can review and override

### Batch 5 — Scenario laboratory

See [the implementation plan and acceptance examples](docs/batch-5-plan.md). All original scenario requirements are retained there alongside the missing current/retirement-budget journey.

- [ ] **5A — Reliable foundation:** cash and tax-funding reconciliation, monthly/annual ledger, conversion constraints, independent fixtures, and CI verification
  - [x] **5A.1 annual funding repair:** cash withdrawals, retained surplus, iterative tax funding and unpaid-tax results; gross/taxable labels; full-horizon conversion tax comparison; tests and type checks in Pages CI. Verified with 84 tests and production build. Monthly timing and conversion access remain open.
  - Published as `ea22a0d`; Pages run `34079855430` succeeded.
  - [x] **5B entry foundation:** blank Current Budget and linked Retirement Budget, six payment frequencies, due-date calendar, explicit retirement overrides, linked housing/debt/health amounts, schema-2 migration, worksheet-to-retirement-projection selection, and PDF budget table. Verified locally with 92 tests, type checks, and build. Browser/PDF checks are now a required CI gate.
  - [ ] **5A.2 / remaining 5B integration:** monthly account/tax ledger, earnings-to-savings reconciliation, spouse/month transitions, timed-cost integration, and full current-budget coverage. Net pay currently belongs to the current worksheet, not a fabricated gross-income tax estimate. Do not mark 5B complete.
  - [x] **5C.2 / 5C.3 debt cascade:** per-debt monthly ledger, persistent and same-month rollover, Snowball first/new default, Avalanche, assigned Custom extras without rollover, interest shortfalls, and a selectable-month payment breakdown. The independent three-debt acceptance schedule and five additional boundary/invariant tests pass. Mortgage minimums are P&I only; use the reconciled statement source in 5C.1 for escrow.
  - Debt release `2ee711f` passed all browser gates and deployed in Pages run `34081057074`.
  - [x] **5C.1 primary-home statement:** opt-in, reconciled P&I/tax/insurance/mortgage-insurance/other-escrow fields; one shared source for debt and housing; tax/insurance persist after payoff; optional annual-dollar property tax. Unknown/mismatched active statements block readiness. Multi-property rules and lender insurance-cancellation changes remain manual.
  - [x] **5D starter reference:** opt-in BLS CPI-U compound inflation for 2004–2024, source/period/method, Undo, manual override, exportable provenance. Explicitly not the latest rolling window because of the missing October 2025 observation. National category/state electricity catalogs and ZIP assistance remain pending.
  - [x] **Cash-return/report repair:** cash has a separate entered interest rate and no simulated market volatility; interest enters income once. PDF readiness matches missing-input checks and zero-balance series no longer draw misleading colored outlines.
- [ ] **5B — Linked budgets:** current earnings and monthly bills, retirement changes by category and owner timeline, quick/detail entry, shared inputs, and a reconciled summary
- [x] **5C — Housing and debt:** P&I/escrow reconciliation, mill rate or annual tax, correct Snowball/Avalanche rollover and Custom extra, per-debt ledgers and a visible minimum-payment cascade. The separate payoff-versus-investing comparison remains in 5E.
- [ ] **5D — Optional reference choices:** sourced historical/national/cohort/state values where appropriate, local ZIP assistance when defensible, provenance, undo, and overrides; zero prefilled financial values
- [ ] **5E — Scenario comparisons:** baseline-plus-overrides, retire-date/spending comparisons, equal-budget mortgage payoff versus investing, monthly cash flow, split pension/benefit sources, and matching PDF output; claiming-age/state automation depends on relevant Batch 3/4 engines
- [ ] **5F — Resilience:** itemized cash-buffer coverage, cash buckets, configurable spending guardrails, and sequence/inflation/care/longevity stress with explicit assumptions
- [ ] **5G — Life events and legacy:** one-time income, inheritance with supported tax treatment, home sale/downsize, and legacy goals; complex inherited-account and survivor cases retain explicit dependencies

Latest verified release: [`991f607`](https://github.com/pyinthesky/financialplanner/commit/991f6072ab81695e19da2cf2fa94cbb0db156cef), [successful Pages run](https://github.com/pyinthesky/financialplanner/actions/runs/34082716003). All 106 tests, TypeScript/build, Chromium/WebKit journeys at six widths, export/import, and populated PDF generation pass. Mobile screenshots and the rendered PDF were visually inspected. Physical iPhone keyboard and Firefox checks remain open. See [development state](docs/development-state.md) for exact limitations and the next monthly-ledger/budget integration contract.

Mobile/browser acceptance, printable charts, blank onboarding, migrations, and local-only privacy apply to every slice. A phase is not complete until its user journey and calculation criteria pass.

### Batch 6 — Trust, accessibility, and optional AI

- Full calculation audit trail and downloadable year-by-year ledger
- Expanded automated tests, accessibility audit, and performance splitting
- Optional user-supplied AI provider connection that sends only a user-approved redacted summary
- No project-operated storage of credentials or financial data

### Experience and guidance backlog

- A calm, comforting, informative, and inspirational experience that explains uncertainty without using fear, shame, or false precision
- Prioritized, explainable suggestions that show which changes could most improve the plan and why
- A simple financial-resilience score that combines retirement funding with income-to-required-debt-payment burden; show the components and never present it as a credit score or guarantee
- A guided monthly-bills worksheet with common categories, annual/irregular expense prompts, and a clear bridge from current cash flow to retirement spending
- A dedicated retirement-spending worksheet, separate from general economic assumptions, that can be populated from the monthly-bills worksheet and reconciles current, retirement-only, and separately modeled costs
- HSA contribution, investing, receipt-retention, qualified-expense, Medicare-enrollment, and retirement-withdrawal strategy, with current limits and rules kept effective-dated
- Plain-language estate-planning education: why a will matters, common will/trust distinctions, when complexity may warrant an attorney, and a neutral checklist for evaluating providers—without referrals or affiliate links
- Fiduciary-advisor education: RIA and Form ADV basics, fee-only versus fee-based distinctions, reasonable fee structures by service and asset level, conflicts to watch for, and an easy path to check SEC or state registration using official sources
- A balanced self-directed alternative showing when a low-cost diversified index-fund portfolio may be sufficient, with guidance scaled to assets, complexity, confidence, and desired service—not a blanket recommendation
- Evidence-grounded healthy-living planning prompts that can illustrate potential health and longevity effects without predicting an individual's medical outcome or blaming users for health costs
- Household entry grouped into clear **You** and **Partner** rows/sections so ages, birth years, retirement timing, benefits, and individually owned accounts remain visually and logically aligned
- Debt strategies with explicit behavior: Snowball first by default (smallest balance, freed minimums cascade, optional extra); Avalanche (highest APR, freed minimums cascade, optional extra); and Custom (user-directed extra payments without an implied cascade). Explain the behavioral versus interest-cost tradeoff without claiming one method is universally best

### Guided-input architecture

- Treat user-entered facts as a shared local data graph: capture each fact once, record its source/effective date when derived, and use it to populate every dependent worksheet, chart, scenario, and report
- Distinguish entered, calculated, suggested, and overridden values visually; expose the dependency or formula and let the user change any suggestion without silently overwriting it later
- Use earlier answers to reveal only materially relevant follow-up questions and prefill downstream fields, while preserving an international/manual path and never transmitting plan data
- Reconcile duplicated concepts—especially spending, mortgage escrow, property tax, insurance, healthcare, income, and tax rates—so one update flows through the plan without double counting

### Product benchmark

The goal is to surpass CFIRESim, Empower, Monarch, Free Financial Plan, EveryDollar, Bankrate, and typical bank calculators on depth, synthesis, clarity, and privacy—not by collecting more data. Competitive reviews should focus on their public workflows and identify missing questions, shallow assumptions, opaque calculations, fragmented outputs, lock-in, and unnecessary data collection. The planner should ask only questions that materially change an explainable result, connect cash flow, debt, taxes, benefits, health, housing, and estate decisions, and keep every plan local by default.

## Calculation sources

- Federal tax year 2026 brackets and standard deductions: [IRS Revenue Procedure 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf), published October 9, 2025 and effective for taxable years beginning in 2026. Future projection years inflate these values for planning only; they are not predictions of future law.
- Social Security benefit taxation: [IRS Publication 915 (2025)](https://www.irs.gov/pub/irs-pdf/p915.pdf), the latest completed edition checked September 5, 2026 and effective for tax year 2025. The planner applies Worksheet 1's statutory thresholds without inflation indexing and labels unmodeled exceptions.
- Taxable investment basis and realized gains: [IRS Publication 550 (2025)](https://www.irs.gov/pub/irs-pdf/p550.pdf), dated March 5, 2026 for use in preparing 2025 returns. The projection uses account-level aggregate adjusted basis with proportional allocation; it does not claim to reproduce specific-lot accounting.
- Required minimum distributions: [IRS Publication 590-B (2025)](https://www.irs.gov/pub/irs-pdf/p590b.pdf), published January 21, 2026, and the [2024 final Treasury regulations](https://www.irs.gov/irb/2024-33_IRB). The projection uses each named owner's prior year-end non-inherited tax-deferred balance and Table III. It does not guess the reserved 1959 applicable-age rule or silently apply IRA rules to joint, inherited, current-employer, 5%-owner, or younger-spouse cases.
- Qualified charitable distributions: [IRS Publication 590-B (2025)](https://www.irs.gov/pub/irs-pdf/p590b.pdf) for source, direct-transfer, age, contribution-offset, and RMD rules, plus [IRS Notice 2025-67](https://www.irs.gov/pub/irs-drop/n-25-67.pdf), effective January 1, 2026, for the $111,000 annual exclusion limit. Owner elections reduce eligible IRA balances, satisfy applicable RMDs, and exclude only the portion remaining after the user-entered contribution offset. The known 2026 ceiling is held flat in later projection years rather than forecasting future indexing.
- Early retirement-account distributions: the IRS [Retirement Topics exception table](https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions), updated December 11, 2025; [Topic 558](https://www.irs.gov/taxtopics/tc558), updated May 27, 2026; and [Publication 590-B (2025)](https://www.irs.gov/pub/irs-pdf/p590b.pdf). The projection estimates the 10% additional tax on taxable, owner-assigned traditional withdrawals before age 59½ after a user-entered confirmed exception amount. It does not infer exception eligibility, resolve date-sensitive age 59, or apply IRA rules to unassigned and Roth withdrawals.
- Roth conversions: [IRS Publication 590-A (2025)](https://www.irs.gov/pub/irs-pdf/p590a.pdf), published January 15, 2026, for conversion inclusion, IRA basis, and recharacterization rules, combined with [IRS Revenue Procedure 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) for 2026 brackets. The current-year worksheet accepts a user-determined taxable amount. The ladder transfers only available owner-assigned tax-deferred balances after RMDs, includes the conversion in taxable income and related calculations, and does not determine Form 8606 basis, pro-rata taxability, eligibility, five-year rules, withholding, or future law.
- Medicare IRMAA: the [SSA 2026 Medicare premium tables](https://www.ssa.gov/benefits/medicare/medicare-premiums.html) and [CMS 2026 premium fact sheet](https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-deductibles), released November 14, 2025. The worksheet uses the published 2026 Part B and Part D tiers with 2024 MAGI, defined by SSA as adjusted gross income plus tax-exempt interest. The conversion ladder reuses those tiers only as a current-law income sensitivity; it does not extrapolate future thresholds, premiums, two-year lookback determinations, or Part D plan premiums.
- ACA premium tax credit: [IRS Revenue Procedure 2025-25](https://www.irs.gov/pub/irs-drop/rp-25-25.pdf), effective for taxable and plan years beginning in 2026, for the applicable-percentage table; [2025 HHS poverty guidelines](https://www.federalregister.gov/documents/2025/01/17/2025-01377/annual-update-of-the-hhs-poverty-guidelines), which CMS continues using for all 2026 Marketplace applications; and [HealthCare.gov's 2026 premium guidance](https://www.healthcare.gov/lower-costs/save-on-monthly-premiums/), confirming the enhanced pandemic-era credits ended December 31, 2025. The worksheet calculates only a potential credit within the standard 100%–400% FPL range and does not infer Marketplace eligibility or fetch location-specific premiums.
- Long-term capital gains and NIIT: [IRS Revenue Procedure 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf), effective for taxable years beginning in 2026, for the 0% / 15% / 20% taxable-income ceilings, and the IRS [Net Investment Income Tax guidance](https://www.irs.gov/individuals/net-investment-income-tax), updated July 1, 2026, for the 3.8% surtax and fixed filing-status thresholds. The planner applies unused basic standard deduction, stacks net long-term gain above ordinary taxable income, and separately estimates NIIT. It excludes qualified dividends, special 25%/28% gain categories, detailed loss/basis rules, itemized deductions, and state treatment.

## Contributing

Issues and pull requests are welcome. Financial-law changes must cite an authoritative source and include an effective date. Calculation changes should include tests and keep the result explainable in the UI.

## License

MIT
