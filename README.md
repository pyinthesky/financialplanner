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
- Transparent withdrawal order with owner-specific RMDs, 2026 progressive federal brackets, and editable state/capital-gains estimates
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

This is an educational planning estimate, not tax, investment, legal, insurance, or medical advice. Values are nominal. Federal ordinary-income tax uses the published 2026 brackets and basic standard deductions for all four filing statuses, with planning-only inflation indexing in later years. It is not yet a complete tax-return engine; state and capital-gains inputs remain simplified estimates. Social Security and pension benefits are entered from official statements rather than inferred from earnings histories.

## Delivery roadmap

The work is organized into bounded batches so each batch can ship independently.

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

### Batch 2 — Federal tax engine (in progress)

- [x] 2026 federal brackets and basic standard deductions by filing status, with future-year planning indexation
- [x] Social Security taxation worksheet using provisional income, filing-status thresholds, tax-exempt interest, and the married-filing-separately lived-apart distinction
- [ ] RMDs, QCDs, early-withdrawal constraints, and taxable cost basis
  - [x] Account-level taxable adjusted basis, contribution basis tracking, proportional gain realization, and explicit tax-lot limitations
  - [x] Owner-specific non-inherited RMD projection using optional birth years, prior year-end balances, and the IRS Uniform Lifetime Table, with 1959 and special-rule review states
  - [ ] QCD rules and early-withdrawal constraints
- [ ] Roth conversion ladder and bracket-filling comparison
- [ ] Medicare IRMAA and ACA premium-tax-credit interactions
- [ ] Replace the manually entered flat capital-gains rate with an effective-dated federal long-term-capital-gains worksheet driven by filing status, ordinary income, realized gains, and applicable surtaxes; retain an explicit override for unmodeled cases
- [ ] Replace ambiguous labels such as **VA effective rate** with the full jurisdiction and **estimated effective state income-tax rate**, including a short explanation of what income the estimate applies to

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

- Side-by-side mortgage payoff versus investing
- Mortgage principal-and-interest versus escrow reconciliation so taxes, homeowners insurance, HOA, mortgage insurance, and other impounds are not mistaken for debt service or double-counted; connect the result to a dedicated housing view
- Move-state, retire-date, spending, and claiming-age comparisons
- Guardrails, cash buckets, and sequence-of-returns stress tests
- Recommended cash-buffer range on the plan overview, with an itemized explanation of which essential costs it covers, how many months it funds, and how the recommendation changes by income stability and retirement stage
- Inheritance, one-time income, home sale/downsize, and legacy goals
- A monthly plan-summary view connecting income sources, required and discretionary withdrawals, categorized expenses, tax set-asides, remaining margin, and annual/irregular obligations
- Plan-summary income views that include pensions without incorrectly capitalizing them into portfolio assets, plus a user toggle between combined household cash flow and individually split sources

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

## Contributing

Issues and pull requests are welcome. Financial-law changes must cite an authoritative source and include an effective date. Calculation changes should include tests and keep the result explainable in the UI.

## License

MIT
