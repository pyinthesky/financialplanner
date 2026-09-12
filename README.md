# Open Retirement Planner

A free retirement planner that connects today's budget, retirement spending, assets, benefits and financial decisions. No ads, marketing, tracking, accounts, names or email addresses.

**[Open the Planner](https://pyinthesky.github.io/financialplanner/)** · [Shipped Features](#shipped-features) · [Remaining Work](#delivery-roadmap) · [Calculation Boundaries](#calculation-boundaries) · [Run Locally](#run-locally)

Start with blank inputs or explicitly load the fictional sample. Enter shared facts once, then see them flow into budgets, scenarios, charts and reports. All calculations run on your device.

## Shipped Features

This is the current product inventory. Every item below is implemented within the stated scope. Future enhancements appear only in [Remaining Work](#delivery-roadmap); release narratives live in [Delivery History](docs/delivery-history.md).

### Welcome, Data & Privacy

- A plain-language Welcome homepage with locally bundled harbor photography, softly shaded journey cards and an illustrated planning journey. Start My Plan opens Household directly; returning users can continue, unlock or open a saved plan. Sample loading opens Plan Summary.

- Session-only use or optional password-protected saving on this device, with visible saving/locked/error states. Technical encryption details sit behind an expandable disclosure.
- Download My Plan and Open a Saved Plan use portable JSON files, including compatibility with earlier saved plans. Opening a different file prompts before file selection when a plan or saved copy already exists.
- Public [llms.txt](https://pyinthesky.github.io/financialplanner/llms.txt), [import guide](https://pyinthesky.github.io/financialplanner/import-guide.md), generated version-2 JSON Schema and blank template for user-controlled file generation. CI checks schema drift and import examples; no plan-receiving endpoint or data-bearing links.
- One-button fictional sample loading and confirmed Create New Plan, with an opportunity to download the current plan before replacement.
- No bank connections or server storage of plan data. Google Search Console ownership verification is a meta tag, not analytics.

### Household, Cash & Investments

- Anonymous self, partner and dependents; retirement timing, college goals and optional local ZIP/state inputs.
- Payroll contribution previews using a fixed amount, pay percentage or supported 2026 maximum, with traditional/Roth splits, age catch-up, employer contributions and owner-matched destinations. Explicit Apply reconciles the payroll allocation.
- Cash, taxable investments, traditional retirement accounts, Roth accounts and HSAs, with ownership and aggregate taxable cost basis.
- Beneficiary-linked 529 accounts and college-cost projections. Multiple accounts fund one beneficiary goal; explicit saving provisions connect to the household budget. Education assets remain separate from retirement withdrawals.
- Optional dated inflation, portfolio-return and cash-rate references with explicit application. These are illustrations, not automatic personal assumptions or a universal national average.

### Benefits, Health & Taxes

- Entered pension and Social Security amounts, start ages, COLAs and withholding, linked to budget deposits and projections.
- Healthcare before/after Medicare age, healthcare inflation and long-term-care cost assumptions.
- 2026 progressive federal-income-tax worksheets; Social Security taxable-benefit calculation; owner-specific RMD/QCD estimates and early-distribution checks.
- Roth-conversion bracket comparisons and owner-specific conversion schedules; taxable basis, long-term-gain stacking and NIIT estimates.
- Effective-dated ACA premium-tax-credit and Medicare IRMAA worksheets, with labeled conversion sensitivities and an entered effective state-income-tax estimate.

### Loans, Housing & Real Estate

- Snowball and Avalanche payment cascading: paid-off minimums stay in the payment budget and flow to the next target. Custom uses assigned extra payments without rollover.
- Mortgage-statement reconciliation separates principal/interest, escrow, insurance and other charges. Home property tax can use an annual dollar amount or assessed value and mill rate.
- Total/per-loan payoff charts, principal/interest bars, payoff milestones and a payment-transfer ledger.
- Fee-, term- and holding-period-aware refinance comparisons with break-even information. Save an eligible offer as a separate household scenario and view its monthly result.
- Dated public mortgage-reference indicators with local comparison, snooze and stale-data suppression.
- Existing rental records with linked loans, collected rent, operating costs, separately confirmed taxable profit, reserves and equity. Shared flows reach budgets, monthly projections, Sankeys and reports once.
- Isolated pre-tax rental buy-versus-invest and keep-versus-sell comparisons. These are educational experiments, not tax-complete property recommendations.

### Current & Retirement Budgets

- Compact expandable categories, editable bill names, payment frequency, due dates and explicit month-only or continuing changes.
- A separate retirement worksheet that carries forward current costs and records changes without duplicating entries.
- Linked take-home pay, benefits, healthcare, primary-home costs, rental activity and actual scheduled debt payments. Paid-off debts stop contributing loan payments; continuing property taxes and insurance remain.
- Shared timed expenses for costs with a start and end. Recurring expenses are not automatically treated as loans.
- Income, spending and margin views; average planning amounts remain distinct from the cash due in a specific month.

### Plan Summary & Reports

- An input-aware Outlook with funding-gap reasons and explicit, reproducible spending/inflation comparisons.
- Cash & Investments and Real Estate starting-position panels, plus a separate College/529 outlook.
- Current/in-retirement Sankeys, a compact month picker and linked monthly funding details.
- Debt payoff and cascade views, cash-coverage targets, annual or monthly portfolio projections and visible unfunded obligations.
- Browser Save as PDF reports with populated projection/scenario charts, budgets, Sankeys, assumptions, accounts, benefits, housing and care costs.

### Explore: Scenario Laboratory

- Local saved baseline snapshots, named overrides, duplicate/reset/rebase controls, change lists and common-axis comparisons.
- A monthly funding ledger that reconciles income, spending, saving, withdrawals, debt and annual tax settlement.
- Retirement timing, everyday spending, inflation, longevity, cash coverage, spending guardrails and dated care/cash events.
- Isolated debt-strategy experiments, funded mortgage payoff comparisons, eligible refinance scenarios and supported home-sale/cash-funded-downsize comparisons.
- Explicit return-stress years and seeded hypothetical uncertainty paths, with visible assumptions and funding shortfalls.

### Explore: Open Enrollment

- Anonymous per-person medical use and prescriptions, compared across private health options and selected federal options.
- Individual/family deductibles and out-of-pocket accumulators, embedded/aggregate family structures, shared/separate/exempt Rx deductible treatment, copays, coinsurance, per-fill caps and supported stepped prices.
- Lower/expected/higher/stress-use comparisons, component charts, per-person ledgers and a gold star for the lowest complete modeled cost, including ties.
- HSA funding, employer HRA allowances, optional tax savings, service/bill/reimbursement timing and near-term cash needs.
- Employer waiver stipends, spousal surcharges and two independent household coverage groups, each with its own accumulators.
- Employer-option-only JSON sharing/import that excludes personal utilization, household data, tax inputs, incentives and coverage-group assignments.
- A 2026 FEHB directory with 132 options / 396 enrollment codes. Published premiums and supported benefits fill on selection. Nine nationwide options have detailed profiles; 895 service rules and 30 family-limit structures are mapped. Missing mappings remain explicit inputs. Eligible completed federal choices can be shortlisted alongside private options.
- Standalone comparison PDFs and local employer-versus-individual **term-life** quote comparisons for 10-, 15- and 30-year horizons.

[Enrollment calculation contract](docs/open-enrollment.md) · [Federal coverage and yearly refresh](docs/fehb-refresh.md) · [Employer incentives and coverage arrangements](docs/federal-health-options.md)

### Explore: Knowledge Center

- Graduation-cap navigation icon, local search and topic filters with compact expandable guides.
- An opt-in interactive savings-rate curve inspired by the [2012 Mr. Money Mustache article](https://www.mrmoneymustache.com/2012/01/13/the-shockingly-simple-math-behind-early-retirement/), independently calculated and drawn. Adjust saving, real returns and a withdrawal assumption; the illustration never fills or changes a personal plan. [Model and boundaries](docs/savings-illustration.md).
- Nine guides covering budgets/cash reserves, debt cascading, advisor registration and fees, diversified investing, health-plan comparisons, HSAs, benefit start dates, estate preparation and healthy aging.
- Each guide provides a practical next step, identifies the relevant planner area, and links to official sources with a review date and scope.
- Neutral provider-selection guidance without referrals, advertising, an advisor directory or automated personalized recommendations. Reading requires no plan data.

### Interface & Accessibility

- Flat navigation grouped into Your Plan, Results and Explore, with Welcome first and Data & Privacy at the bottom. Back/Next controls connect every setup section; mobile controls remain visible without opening the sidebar.
- Shared Tailwind page/card/form/action components, container-aware grids, consistent spacing, blank numeric entry, visible units, responsive table cards and locally bundled Lucide icons.
- Keyboard-accessible controls and a mobile drawer. Chromium/WebKit journeys cover six widths, dialogs, form containment, card spacing and report output.

## Calculation Boundaries

The planner provides educational estimates. A worksheet or comparison being available does not mean every tax, eligibility or financial-law case is modeled.

- Annual worksheets and the monthly engine have different scopes. State tax is an entered effective estimate; ZIP entry does not establish local tax law. Separate-return allocation, detailed IRA basis/pro-rata, inherited-account rules, special RMD tables/delays and lot-level tax accounting are not fully modeled.
- Benefits use entered amounts and age-based timing conventions. Automated Social Security claiming/spousal/survivor transitions and specialized government pension calculations are not supplied by these entries.
- ACA/IRMAA worksheets and conversion sensitivities use specified rule years; they do not automatically forecast future premiums or eligibility. Enrollment comparisons do not establish HSA eligibility.
- Enrollment uses modeled service order and monthly timing, not insurer adjudication. Separate Rx deductibles currently share the medical embedded/aggregate family structure. Changing membership, complex free-text exclusions, networks and formularies can require further review.
- Existing rentals use nominal inputs and separately confirmed nonnegative taxable profit. Losses, depreciation, recapture and rental-sale tax are not calculated. Property trials remain separate from tax-complete household rankings.
- Home moves exclude new mortgage financing, multiple liens and specialized gain exclusions. Refinance scenarios exclude rental loans, changed escrow/PMI, mid-plan closing and combined refinance/home-move/payoff transactions.
- 529 projections assume deposits are funded; college shortfalls are not automatically charged to retirement spending. Cash reserves are pooled; avoid counting the same future expense in multiple reserves.
- Hypothetical return paths and percentiles are not calibrated retirement-success probabilities. Long-term health cost reductions are not inferred from lifestyle choices.

[Calculation sources and reference methodology](docs/calculation-sources.md) · [Detailed implementation contracts](docs/development-state.md)

## Privacy and Security

The optional vault uses Web Crypto AES-256-GCM and PBKDF2-SHA-256 before saving to browser local storage. The passphrase stays in memory and is never stored or transmitted. Raw JSON exports are readable and unencrypted.

Encryption protects stored data against casual browser-profile access and offline inspection. It cannot protect an unlocked plan against malware, malicious extensions, keylogging or a compromised operating system. See [SECURITY.md](SECURITY.md).

Plan data, credentials and private screenshots must never enter repository assets, logs, fixtures or CI artifacts. Tests use independently invented fictional data. Public datasets are bundled; Knowledge Center source links open external sites only when selected, without attaching search text or plan data.

## Delivery Roadmap

**Unfinished work only.** This is the sole active backlog; shipped foundations are documented above. The ordering below favors connected planning value. These are future priorities, not scheduled builds or work already underway.

| Priority | Unbuilt enhancement | What it would add |
| --- | --- | --- |
| 1 | Automated benefit decisions (Batch 3) | Statement/PIA-based claiming estimates; spousal, survivor and death-year transitions; pension survivor/lump-sum choices; sourced FERS/CSRS, military, TSP and FEGLI/retirement-FEHB rules |
| 2 | State/local and health-cost assistance (Batch 4) | Versioned state-tax rules, locality resolution beyond ZIP alone, exchange-premium lookup assistance, Medicare/LTC references, property-tax assistance and a clear international/manual path |
| 3 | Retirement HSA integration | Effective-dated eligibility/contribution limits, Medicare timing, investing/receipt/reimbursement rules and funded qualified withdrawals in retirement projections |
| 4 | Carry enrollment decisions into the plan | Explicit selection into payroll, budgets and HSA funding with reconciliation; richer FSA/HRA choices, changing covered membership, independently configured medical/Rx family deductible structures, exact claim timing and manufacturer-assistance rules |
| 5 | Advanced account/tax coverage (Batches 2/5 follow-on) | Separate-return household allocation, special RMD cases, IRA basis/pro-rata, inherited accounts, lot accounting and quarterly-tax conventions; cross-engine scope/conservation audit before exposing additional rankings |
| 6 | Advanced scenario and property cases (Batch 5 follow-on) | Financed replacement housing, dated property transactions, additional lien/loan structures, tax-supported rental transactions and safe composition of currently incompatible scenario actions |
| 7 | Research-dependent public references | Broader reviewed FEHB mappings; refreshed economic/cohort references; a rights-cleared term-life price dataset with age/term/coverage/underwriting assumptions and stale-data suppression; employer age-band term schedules |
| 8 | Evidence and accessibility depth (Batch 6) | More detailed audit trails and downloadable ledgers, physical-device/assistive-technology checks, performance work and sourced knowledge expansion; historical replay/calibrated uncertainty only with suitable data |

A separate import follow-up is a strict allowed-field validation boundary and a local preview/confirmation before replacing the active plan with an arbitrary generated file. The public schema documents structure; the existing legacy importer has broader compatibility and no such preview yet.

Optional AI and cloud connections remain deferred until the core calculation dependencies are resolved and a separate privacy design is approved. No timed feature builds are enabled.

The product benchmark remains connected reasoning, clear assumptions, useful answers and easy entry without data collection. Compare against CFIRESim, Empower, Monarch, Free Financial Plan, EveryDollar, Bankrate and bank tools on those dimensions; no superiority claim is implied.

## Public Reference Maintenance

These are maintenance processes for shipped data, not backlog features:

- **Mortgage references:** the weekly [public-data workflow](.github/workflows/refresh-mortgage-rates.yml) validates the source and opens a reviewable update PR. It preserves the last good file on failure; stale data suppresses indicators. Visitors do not contact the rate source.
- **Federal health options:** the existing November 1 yearly refresh task prepares the upcoming-year data for review. The [repeatable FEHB process](docs/fehb-refresh.md) pins sources, hashes and brochure evidence, validates joins/mappings, and produces a change report. A new year requires a reviewed manifest and draft PR, not automatic publication.
- **Knowledge:** sources reviewed September 12, 2026. Changes to rules require an editorial review of affected guides and scope labels; dates are never automatically advanced.

## Development Continuity

Read this README and the [current technical handoff](docs/development-state.md) before choosing a slice. Keep capabilities, limitations and unfinished enhancements distinct. Move release narratives to [history](docs/delivery-history.md), update the feature inventory when behavior ships, and remove only the delivered scope from the backlog.

Every release preserves local-only privacy, blank onboarding, explicit references/overrides, saved-plan compatibility and reconciliation of shared facts. Calculation changes need meaningful boundary/conservation tests and authoritative effective-dated sources. UI releases must pass the Pages browser/PDF gates and include visual inspection of relevant synthetic captures.

The preceding verified baseline is [the September 12 layout release](https://github.com/pyinthesky/financialplanner/commit/e0c89890806c41f875f64cd23453077c5f56cb4b), with [successful Pages validation](https://github.com/pyinthesky/financialplanner/actions/runs/34667774571): 236 tests, TypeScript/build and Chromium/WebKit at six widths. For the current release, inspect [the workflow history](https://github.com/pyinthesky/financialplanner/actions/workflows/pages.yml). Evidence is release-specific, not a guarantee of every physical device.

The pre-layout rollback tag is [`pre-tailwind-layout-2026-09-12`](https://github.com/pyinthesky/financialplanner/releases/tag/pre-tailwind-layout-2026-09-12). [Layout contract and rollback procedure](docs/ui-layout.md).

## Run Locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Validate a release:

```bash
npm test
npm run schema:check
npx tsc --noEmit
npm run build:pages
```

Regenerate public import contracts after changing plan types or defaults: `npm run schema:write`. Commit the reviewed schema/template diff; the test suite fails on drift. These are development-only dependencies, not browser or network services.

## Deployment & Contributing

[The Pages workflow](.github/workflows/pages.yml) builds `dist-pages`, runs its gates and deploys through GitHub Pages. Repository Pages settings use GitHub Actions as the source.

Issues and pull requests should explain the user problem, supported behavior, assumptions and validation. Preserve clear boundaries and avoid duplicating shared financial facts. No personal data belongs in examples or issue attachments.

## License

MIT
