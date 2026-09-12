# Current Technical Handoff

Updated September 12, 2026 for the Welcome and guided setup flow. The [README](../README.md#delivery-roadmap) is the only active backlog. This file maps code and contracts; historical handoffs are [archived](development-history-2026-09-12.md) and do not direct new work.

## Current Change

`components/welcome.tsx` provides the plain-language homepage and code-native three-step illustration. Welcome is first; Data & Privacy is last. Start opens Household, sample replacement opens Summary, and importing opens Household. Setup pages share Back/Next controls fixed at the bottom on mobile. Continue unlocks a saved local plan or returns to the last setup section visited in this session. The importer has a replacement prompt before file selection; structural validation and field previews remain separate work. Browser journeys exercise fresh start, navigation, sample replacement, file chooser import, saved-plan reload/unlock and technical disclosure.

Public import documentation ships at `llms.txt` and `import-guide.md`, with `schemas/plan-v2.schema.json` and `examples/blank-plan-v2.json`. `scripts/public-import-contract.mjs` generates the strict structural schema from PlannerData and the blank template from DEFAULT_PLAN. `npm run schema:write` updates them; tests check drift and example normalization. No runtime importer, URL ingestion or remote plan transport was added. The guide warns that selecting a valid file replaces state without a field preview; strict arbitrary-file validation/preview remains a follow-up.

Knowledge Center is a standalone Explore destination using GraduationCap, shared Tailwind layout primitives and nine bundled guides. `lib/knowledge.ts` owns content, source editions/review date and local search; `components/knowledge-center.tsx` owns accessible disclosure/filter controls. It accepts no plan props, changes no financial state and sends no search data. Links open external sites explicitly without a referrer or appended plan context. Copy explains supported decisions; it does not claim provider vetting, personalized legal/medical advice or a complete eligibility engine.

README now separates the shipped catalog, calculation boundaries, unfinished backlog and routine public-data maintenance. Old release counts/priorities moved to archives. Delivered FEHB mappings, family arrangements, per-fill caps, HRA allowances, payroll/529 and layout work are no longer incorrectly listed as future foundations.

The opt-in savings-rate illustration uses an independent annuity model (`lib/savings-illustration.ts`), a locally drawn interactive SVG and no plan state. Its [model contract](savings-illustration.md) separates inspirational examples from personal projections.

## Implementation Map

| Area | Code / contract |
| --- | --- |
| Entry, navigation and vault lifecycle | `app/page.tsx`, `lib/plan-lifecycle.ts`, `lib/vault.ts`; [security](../SECURITY.md) |
| Shared UI | `components/ui/planner-layout.tsx`; [layout contract](ui-layout.md) |
| Budgets and shared flows | `lib/budget*.ts`, `lib/monthly-projection.ts`, `lib/monthly-funding.ts`; [compact budget](compact-budget-round.md), [Batch 5](batch-5-plan.md), [experience](batch-5-experience.md) |
| Scenarios and debt | `lib/scenarios.ts`, `lib/debt-ledger.ts`, `lib/refinance-scenario.ts`, `lib/home-move.ts`; [refinance scenarios](refinance-scenarios.md) |
| Household/payroll/529 | `lib/payroll-contributions.ts`, `lib/education.ts`; [contract](household-enrollment-round.md) |
| Taxes and account rules | `lib/federal-tax.ts`, `lib/capital-gains-tax.ts`, `lib/social-security-tax.ts`, `lib/rmd.ts`, `lib/qcd.ts`, `lib/early-distribution.ts`, `lib/roth-conversion.ts`; [sources](calculation-sources.md) |
| Enrollment | `lib/enrollment*.ts`, `lib/federal-health.ts`, `lib/federal-benefits.ts`; [calculation contract](open-enrollment.md), [federal/incentive contract](federal-health-options.md), [FEHB source refresh](fehb-refresh.md) |
| Knowledge | `lib/knowledge.ts`, `components/knowledge-center.tsx`; reviewed primary sources embedded in each guide |

## Boundaries to Preserve

- Monthly results use opening-January balances, funded transfers, month-end returns and labeled annual tax settlement. Annual worksheets have different scopes. Do not infer integration just because a worksheet exists.
- Account access, special tax cases, government benefits and state/local rules require explicit support. README boundaries and the relevant contracts describe exclusions.
- Household facts are canonical. A mortgage, recurring cost, education provision, healthcare selection or reserve must not create duplicate spending or assets.
- The old envelope-breakdown editor is disabled in the compact budget flow. Timed costs remain expenses, not synthetic loans.
- FEHB mapping must preserve manual overrides and saved source editions. Separate prescription deductibles with unresolved family structures are not inferred. Broader mapped services are not a claim of complete plan coverage.
- No ads, tracking, accounts, bank connections or server plan storage. Private screenshots and real plan values never enter the repository, CI evidence or fixtures. Fresh plans stay blank.
- Timed feature builds remain disabled. The existing weekly mortgage-reference PR workflow and yearly FEHB review task maintain public data; they are not feature-development schedules.

## Verification and Publishing

Run `npm test`, `npx tsc --noEmit`, and `npm run build:pages`. Pages gates run Chromium and WebKit at 320/375/390/430/768/1280px with synthetic entries, responsive geometry and PDF checks. Knowledge tests cover search/category intersection and reviewed-source metadata; browser checks cover keyboard disclosure, filter reset and external-link attributes. Inspect relevant screenshots, not only overflow totals.

The preceding verified baseline is `e0c89890806c41f875f64cd23453077c5f56cb4b`, Pages run `34667774571` (236 tests and all browser/build/deploy gates passed). Verify the exact new commit's workflow before claiming deployment. The rollback tag `pre-tailwind-layout-2026-09-12` retains the requested icons before the layout migration.

Some workspaces contain synthetic mirror history. Inspect remote main before publication; use a genuine clone or create file/tree commits with the real remote parent. Never push synthetic local history over main. No parallel agents are authorized by this document.
