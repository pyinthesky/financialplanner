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
- Transparent withdrawal order with editable effective tax assumptions
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

This is an educational planning estimate, not tax, investment, legal, insurance, or medical advice. Values are nominal. The current tax model uses editable effective rates rather than a tax-return engine. Social Security and pension benefits are entered from official statements rather than inferred from earnings histories.

## Delivery roadmap

The work is organized into bounded batches so each batch can ship independently.

### Batch 1 — Private planning foundation (complete)

- Core household, portfolio, income, expense, housing, healthcare, and debt data model
- Projection and debt engines
- Interactive charts and printable PDF report
- Encrypted local persistence and portable JSON
- GitHub Pages deployment

### Batch 2 — Federal tax engine

- Year-specific federal brackets and standard deductions by filing status
- Social Security taxation worksheet
- RMDs, QCDs, early-withdrawal constraints, and taxable cost basis
- Roth conversion ladder and bracket-filling comparison
- Medicare IRMAA and ACA premium-tax-credit interactions

### Batch 3 — Social Security and pension decisions

- Benefit estimates from PIA or earnings records
- Early/delayed claiming adjustments
- Spousal and survivor rules
- Pension survivor-election and lump-sum comparison
- Household death-year scenarios

### Batch 4 — State, health, and long-term care data

- Versioned state income-tax and retirement-income rules
- State exchange / HealthCare.gov links and locally calculated subsidy estimates
- Medicare premium assumptions and state long-term-care cost references
- Property-tax presets while preserving user-entered local mill rates

### Batch 5 — Scenario laboratory

- Side-by-side mortgage payoff versus investing
- Move-state, retire-date, spending, and claiming-age comparisons
- Guardrails, cash buckets, and sequence-of-returns stress tests
- Inheritance, one-time income, home sale/downsize, and legacy goals

### Batch 6 — Trust, accessibility, and optional AI

- Full calculation audit trail and downloadable year-by-year ledger
- Expanded automated tests, accessibility audit, and performance splitting
- Optional user-supplied AI provider connection that sends only a user-approved redacted summary
- No project-operated storage of credentials or financial data

## Contributing

Issues and pull requests are welcome. Financial-law changes must cite an authoritative source and include an effective date. Calculation changes should include tests and keep the result explainable in the UI.

## License

MIT
