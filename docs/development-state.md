# Development State

Updated September 7, 2026. Canonical scope: [Batch 5 plan](batch-5-plan.md). User authorized implementation in logical releases. Timed builds remain disabled; do not restart them without a new request. No delegated agents are authorized.

## Delivered and verified

| Release | Outcome | Evidence |
| --- | --- | --- |
| `ea22a0dab4a19f6c9b05f9cb6d35f722969be52c` | Cash withdrawal reporting, retained surplus, bounded tax-funding feedback, unpaid taxes, gross/taxable labels, full-horizon conversion tax difference; CI tests/typecheck | 84 tests, TypeScript/build; Pages `34079855430` succeeded |
| `256ccf9` + accessibility fix `76a2d71a37ee9529a1175bc81f4f9b082678540d` | Current Budget, linked Retirement Budget, frequencies/calendar, overrides, schema-2 migration, worksheet/legacy selection, projection and PDF table | 92 tests; Chromium/WebKit at 320/375/390/430/768/1280; export/import and PDF journey; Pages `34080864820` succeeded |
| `2ee711f2a64277fd84057e1ac1df0b69d6965da1` | Per-debt ledger and visible cascade; Snowball/Avalanche retain payment capacity; Custom uses assigned extras; unpaid interest grows balances | 98 tests, TypeScript/build; expanded browser journey including month-2 cascade; Pages `34081057074` succeeded |

The first budget CI run failed because implicit select names included option text. Explicit accessible names fixed it; the browser gate was retained. Local browser downloads time out; actual browser verification runs in GitHub CI, using only synthetic fixtures. CI artifacts contain screenshots and a synthetic PDF; no real plan data is used.

Visual inspection of the budget release: mobile WebKit screenshot fits the viewport and the populated one-page PDF has a rendered portfolio graph/table without clipping. This is automated WebKit on Linux, not a physical iPhone keyboard test. Inspection exposed cash inheriting market volatility and zero-series outlines; both are repaired in the next release.

## Current release work

Implementation commit: `7313579fe456ff8e7cbdc43cc63922714e5cfa31`; browser selector correction: `10ef9625aefaf3a62d4f9ecc52562da53abe203f`. Visual follow-up corrects short debt-chart month labels and an empty-card CSS specificity issue. The browser gate now checks computed empty-card label content. Debt tie-breaking uses locale-independent ID ordering.

- Primary-home mortgage statement reconciliation: `lib/housing.ts`, `components/mortgage-statement.tsx`, `tests/housing.test.mjs`. P&I drives amortization; escrow tax/home insurance replace manual housing values when enabled. Mortgage insurance/other loan-related escrow are separate cash costs while the loan remains in the schedule. Ongoing non-loan costs belong elsewhere. Incomplete active statements block readiness. Annual-dollar property tax bypasses mills.
- Separate cash interest (`assumptions.cashReturn`, blank/zero default), ordinary-income inclusion, isolation from market paths, and PDF readiness/zero-series repair. Covered in `tests/funding.test.mjs`.
- Optional historical inflation: `lib/references.ts`, `tests/references.test.mjs`, Household control. BLS CPI-U annual-average endpoints 188.9 (2004) and 313.689 (2024), compound change over 20 years. Source: BLS December 2024 historical table, verified September 7, 2026. October 2025 is missing; label the 2004–2024 window explicitly, never as the latest rolling window. Apply/Undo/manual override and exported receipt are supported; no runtime data query.
- 106 tests, TypeScript, production build and whitespace checks pass locally, including cash-interest NIIT and conservation. Browser journey extended to statement entry and reference Apply/Undo. Verify exact deployment outcome and inspect latest artifacts before promoting this release to rendered-verified.

## Important incomplete work — do not claim Batch 5 complete

1. **5A.2 / 5B integration:** shared monthly account/tax ledger, payroll-to-savings bridge, spouse/month transitions, and dated-cost projection. Current net pay informs the current worksheet only; it is not fabricated gross taxable pay. The retirement worksheet feeds the annual projection at full household retirement. Bill calendar dates affect that calendar; long-range spending still uses annual averages. Current margin excludes pension net withholding, payroll savings, and timed costs; UI says so.
2. **5A.3:** explicit conversion source eligibility/basis and Roth access/lot constraints. The solver prevents immediate use of this year's conversion for its own tax, but that is not complete five-year access modeling. Do not rank unrestricted conversions as recommendations.
3. **5C/5E.2:** the legacy mortgage-at-retirement flag is not a validated equal-budget payoff-versus-investing comparison. It needs balance-at-event scheduling, liquidity, tax funding, and freed-payment destination. Do not infer completion from the statement/cascade helpers.
4. **5D:** broader BLS spending/EIA state-electricity references, locally resolved ZIP assistance, effective-dated updates. Never guess local tax/ACA/property quotes from ZIP alone.
5. **5E–5G:** saved baseline/override scenarios, monthly summaries, explainable buffers, guardrails, stress paths and supported life events. Automatic claiming/death/state scenarios require the relevant Batch 3/4 rules first.
6. Legacy account contributions are still credited without a payroll-funding bridge; state tax is a user-entered estimate; ACA/IRMAA are fixed-law sensitivities. Individual sourced worksheets are not a complete tax-return engine.

## Next implementation contract

Complete **5A.2 with the remaining 5B bridge**, then **5A.3**, before adding scenario rankings. Specify gross versus net payroll, entered withholding/payroll deductions, contribution funding sources, monthly transaction order, retirement/due-date convention, annual tax settlement and residuals. Preserve migrated aggregate spending until explicitly replaced. Verify monthly/annual cash-and-balance identities, actual versus average bill timing, missing-versus-zero, contribution funding, and partial-retirement behavior with independent fixtures.

Read current remote main and this file before editing. Working checkout: `/workspace/scratch/48c58b36b93c/financialplanner`; initialized from blob-verified main because the older checkout's git index was stale. Release commits use explicit remote trees. Never blindly push the local synthetic snapshot history; use a fresh clone or verified file/tree publication. Preserve synthetic-only CI artifacts and no plan-data transmission.

Model allocation remains engineering judgment: Astra High for ledger/schema and cross-rule review; Sol High for bounded work once contracts and independent tests exist. Neither has a measured repository-specific first-pass guarantee. Record exact release, test and browser evidence here; keep unsupported cases visible.
