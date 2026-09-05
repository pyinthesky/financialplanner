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
- Transparent withdrawal order with 2026 progressive federal brackets and editable state/capital-gains estimates
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

- [ ] Rebuild narrow-screen navigation, summaries, forms, tables, and charts around mobile task flows, with usable tap targets and no clipped or horizontally trapped content
- [ ] Render untouched numeric inputs as blank rather than `0`; make replacement predictable on focus while preserving intentional zero values
- [ ] Unify field, affix, and secondary-surface borders, backgrounds, and corner radii so compound inputs have no white seams or mismatched rounding

### Batch 2 — Federal tax engine (in progress)

- [x] 2026 federal brackets and basic standard deductions by filing status, with future-year planning indexation
- [ ] Social Security taxation worksheet
- [ ] RMDs, QCDs, early-withdrawal constraints, and taxable cost basis
- [ ] Roth conversion ladder and bracket-filling comparison
- [ ] Medicare IRMAA and ACA premium-tax-credit interactions

### Batch 3 — Social Security and pension decisions

- Benefit estimates from PIA or earnings records
- Early/delayed claiming adjustments
- Spousal and survivor rules
- Pension survivor-election and lump-sum comparison
- Household death-year scenarios
- Military and government retirement paths, including authoritative, effective-dated treatment for military retirement systems and survivor benefits, FERS/CSRS, TSP, FEGLI, FEHB retirement eligibility, and related tax distinctions

### Batch 4 — State, health, and long-term care data

- Versioned state and local income-tax and retirement-income rules
- Optional U.S. ZIP/locality assistance using authoritative, effective-dated data to suggest state/local tax assumptions, assessment conventions, and mill rates; keep every value reviewable and overridable, never require a ZIP, and retain a manual country-aware path for international users
- Guided state-exchange / HealthCare.gov workflow that helps users identify the correct marketplace, look up current plan-year premiums, and locally populate subsidy and net-premium inputs without transmitting the rest of the plan
- Medicare premium assumptions and state long-term-care cost references
- Property-tax presets while preserving user-entered assessed values and local mill rates

### Batch 5 — Scenario laboratory

- Side-by-side mortgage payoff versus investing
- Mortgage principal-and-interest versus escrow reconciliation so taxes, homeowners insurance, HOA, mortgage insurance, and other impounds are not mistaken for debt service or double-counted; connect the result to a dedicated housing view
- Move-state, retire-date, spending, and claiming-age comparisons
- Guardrails, cash buckets, and sequence-of-returns stress tests
- Recommended cash-buffer range on the plan overview, with an itemized explanation of which essential costs it covers, how many months it funds, and how the recommendation changes by income stability and retirement stage
- Inheritance, one-time income, home sale/downsize, and legacy goals

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
- HSA contribution, investing, receipt-retention, qualified-expense, Medicare-enrollment, and retirement-withdrawal strategy, with current limits and rules kept effective-dated
- Plain-language estate-planning education: why a will matters, common will/trust distinctions, when complexity may warrant an attorney, and a neutral checklist for evaluating providers—without referrals or affiliate links
- Fiduciary-advisor education: RIA and Form ADV basics, fee-only versus fee-based distinctions, reasonable fee structures by service and asset level, conflicts to watch for, and an easy path to check SEC or state registration using official sources
- A balanced self-directed alternative showing when a low-cost diversified index-fund portfolio may be sufficient, with guidance scaled to assets, complexity, confidence, and desired service—not a blanket recommendation
- Evidence-grounded healthy-living planning prompts that can illustrate potential health and longevity effects without predicting an individual's medical outcome or blaming users for health costs

### Product benchmark

The goal is to surpass CFIRESim, Empower, Monarch, Free Financial Plan, EveryDollar, Bankrate, and typical bank calculators on depth, synthesis, clarity, and privacy—not by collecting more data. Competitive reviews should focus on their public workflows and identify missing questions, shallow assumptions, opaque calculations, fragmented outputs, lock-in, and unnecessary data collection. The planner should ask only questions that materially change an explainable result, connect cash flow, debt, taxes, benefits, health, housing, and estate decisions, and keep every plan local by default.

## Calculation sources

- Federal tax year 2026 brackets and standard deductions: [IRS Revenue Procedure 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf), published October 9, 2025 and effective for taxable years beginning in 2026. Future projection years inflate these values for planning only; they are not predictions of future law.

## Contributing

Issues and pull requests are welcome. Financial-law changes must cite an authoritative source and include an effective date. Calculation changes should include tests and keep the result explainable in the UI.

## License

MIT
