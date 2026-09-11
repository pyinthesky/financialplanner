# Federal Health Options and Employer Incentives

Research and design recorded September 11, 2026. **Status: implemented with explicit benefit review. The catalog, checkbox, reviewed top-three shortlist, employer incentives and split household comparisons are available. Automatic interpretation of every OPM free-text benefit remains unsupported; unresolved options do not enter the ranking.** Existing manually entered health-option comparisons continue to work. The design below records the implemented boundaries and the remaining automation requirements.

## Official Source Inventory

OPM publishes downloadable [FEHB Public Use Files](https://www.opm.gov/healthcare-insurance/healthcare/transparency-in-healthcare/public-use-files/), not only a consumer comparison site. The latest year listed when checked was 2026. The four workbooks below were downloaded and their worksheet records inspected on September 11, 2026; counts exclude the header row.

| File | Date in source filename | Records | Use |
| --- | --- | ---: | --- |
| [Plan Key](https://www.opm.gov/healthcare-insurance/healthcare/transparency-in-healthcare/public-use-files/2026/fehb/2026-fehb-plan-key-11202025.xlsx) | 2025-11-20 | 396 | Enrollment codes, option/network types, brochure and formulary/provider links |
| [Rates](https://www.opm.gov/healthcare-insurance/healthcare/transparency-in-healthcare/public-use-files/2026/fehb/2026-fehb-rates-10232025.xlsx) | 2025-10-23 | 6,732 | Rate type, enrollment tier, pay frequency, employee and government shares |
| [Plan Benefits](https://www.opm.gov/healthcare-insurance/healthcare/transparency-in-healthcare/public-use-files/2026/fehb/2026-fehb-plan-benefits-11202025.xlsx) | 2025-11-20 | 264 | 246 columns covering limits, medical/Rx categories and explanatory conditions |
| [Service Area](https://www.opm.gov/healthcare-insurance/healthcare/transparency-in-healthcare/public-use-files/2026/fehb/2026-fehb-service-area-03242026.xlsx) | 2026-03-24 | 10,112 | Nationwide, state, county, countywide and ZIP qualifiers |

The benefits file contains 56 distinct `Plan Name` values, 96 distinct `Plan Code` values, and 132 rows each for in-network and out-of-network benefits. These are file-level counts, not the number of choices available to every employee. The key contains 396 distinct enrollment codes; never count coverage tiers, geographical records or rate types as separate universally available plans.

SHA-256 of the downloaded originals:

- Plan Key: `da3f046c20758a944c49e3306ea46ce42c95e761e1faa78472cede42f69a7805`
- Rates: `8203394c0baa5046013cd0cf0a3ecadd58d4b77f6ed6362021e7810bda072167`
- Benefits: `046276ab692f9af9e8aa3a6e344a01333de9fc865fd78e101f2176e9655cda52`
- Service Area: `21275722416d08d4ef3f705432265c0f54f4240eeec63484732b4ee3a125a919`

Cross-check against [OPM plan brochures](https://www.opm.gov/healthcare-insurance/healthcare/plan-information/plans/), [premium tables](https://www.opm.gov/healthcare-insurance/healthcare/plan-information/premiums/), and [the comparison tool](https://www.opm.gov/healthcare-insurance/healthcare/plan-information/compare-plans/). Brochures are the official statement of benefits. OPM permits updates and cautions about accuracy. Cite original release/access dates; label our transformed catalog and modeled costs as the planner's interpretation of those sources, not an official OPM product.

## Compact User Experience

Beside **Add Health Option**, put an unchecked **Include Federal Employee Options** checkbox. Checking it opens a compact inline selector, not dozens of editable plan cards. Unchecking it removes federal candidates from this comparison without deleting private employer options or care inputs.

Reuse locally entered Household location when available. Request only the missing details:

- Benefit year and which adult is the federal employee.
- Eligible FEHB enrollee/rate category; start with standard active non-postal employees. Explicitly gate annuitants, FDIC/special rates, TCC/former spouses, tribal arrangements and PSHB instead of using the wrong employee share.
- Home or work ZIP with state/county disambiguation when needed. Nationwide plans remain discoverable without pretending every regional plan applies. Geography alone does not confirm provider participation or restricted-plan membership eligibility.
- Covered household members and enrollment tier. Do not infer eligibility from a household member existing in the financial plan.

Default results show **up to three lowest modeled-cost eligible federal options plus the user's private employer options**. Label the scope and plan year. Permit View All Eligible Options, pinning a preferred plan, and an unranked Needs Review list. Prefer compact summary rows/cards; details open only when requested. A top-three FEHB shortlist is separate from the existing four manually entered employer options, so enabling it never truncates private options on import or normalization.

Each row should show premium, expected member medical/Rx cost, employer HSA/HRA treatment, net waiver income/surcharges, net household cost, and readiness/network notes. Compare identical covered people and the same benefit year. Provider and prescription suitability can disqualify a cheap plan; cost rank is not an overall clinical recommendation.

Rank with unrounded calculations and disclose ties at displayed precision. If fewer than three plans are fully modeled, show fewer. If some eligible plans remain unresolved, say “Lowest modeled costs among X reviewed eligible options; Y need review,” and do not present a global best-plan star. A missing prescription rule or unknown limit is never zero. Avoid selecting three by premium and presenting them as lowest total cost.

## Benefit Review and Automation Boundaries

The current engine applies one general medical coinsurance assumption to an annual medical amount and supports detailed rules for entered care items. OPM has distinct PCP, specialist, facility, surgery, therapy and pharmacy benefits, with conditions in free text. For example, some pharmacy percentages have dollar caps per prescription. Flattening those rules to a single percentage would mis-rank plans.

Before an option enters the reviewed ranking (and before any future fully automatic catalog mapping):

1. Add compact service categories to per-person use inputs, with optional visits/procedures and negotiated allowed costs. Preserve a simple annual-total mode as an explicitly limited estimate; unresolved service mix must not produce a definitive catalog-wide winner.
2. Interpret copays, coinsurance, minimum/maximum charges, deductible exceptions, prior authorization, visit limits, network differences and separate/shared accumulators explicitly. Keep the original benefit text alongside reviewed rules. Unknown or contradictory mappings fail closed for ranking.
3. Verify embedded versus aggregate family deductibles and each person's embedded limit under family coverage. **The self-only deductible or maximum is not automatically the individual limit inside a family enrollment.** Do not add a separate Rx maximum to the medical maximum when it is a sublimit of a combined cap.
4. Confirm each expensive prescription's formulary coverage, tier, pharmacy/supply rules, prior authorization and whether member payments count toward the combined OOP limit. OPM's generic Rx tiers and formulary links do not establish the coverage of an individual drug. All personal drug lookups/confirmations stay local or are performed explicitly by the user at the insurer; never transmit their medication list automatically.
5. Distinguish HSA-eligible HDHPs from HRA/CDHP designs and ordinary PPOs. An HRA allowance is not an unrestricted cash contribution or HSA asset. HSA eligibility must account for other spouse coverage and general-purpose FSAs; do not presume eligibility merely from selecting an HDHP.
6. Retain benefit-year, source edition, rate type, network, tier and mapping version on selected reference records. A refreshed catalog must not silently change a saved comparison; offer an explicit update review and mark unavailable versions.

## 2a. Employer Incentives

Place this optional, collapsed section immediately after Health Options and before results. Enter an incentive once per adult/employment source; associate each health option with that source. Use anonymous labels such as Your Employer and Partner's Employer, not required company names.

Compact fields:

| Field | Behavior |
| --- | --- |
| Employee / employer source | Identifies whose coverage is being declined; required before applying the incentive |
| Payment amount and cadence | Annual, monthly or per-pay-period; blank by default |
| Amount basis | Confirmed take-home amount, or gross amount with explicit estimated applicable tax rate |
| Eligibility conditions | Explicit confirmation of the employer's waiver and alternative-coverage requirements; partial/dependent-only waiver not assumed |
| Payment period | Effective start/end and payout cadence; annual entitlement and cash timing are separate |
| Spousal surcharge | Optional charge on the accepting employer's plan; applies only when that arrangement meets its stated condition |

Compute the incentive for a **coverage arrangement**, not as an unconditional discount on every plan:

`Household annual economic cost = employee premiums after applicable premium tax savings + member care + applicable surcharges − employer health-account benefit actually modeled − HSA tax savings − eligible after-tax waiver income.`

If Employee A declines Employer A and the household uses Employer B, count A's confirmed waiver income once. If A enrolls in A's plan, do not count A's waiver payment. If both employees take their own plans, do not assume either receives a full waiver payment. Do not double count a stipend already included in imported take-home income. The enrollment comparison remains standalone until the user explicitly applies any payroll/budget changes.

Cash received for waiving a benefit is generally taxable compensation, not a reduction in the insurer's premium or in the deductible/OOP maximum. [IRS Publication 15-B (2026)](https://www.irs.gov/publications/p15b) describes cafeteria-plan cash/taxable benefit treatment; [Publication 15 (2026)](https://www.irs.gov/publications/p15) covers taxable wages. A federal marginal bracket alone is not a complete estimate of the net stipend: state and employee payroll taxes may apply. Let users enter a confirmed take-home amount; leave unsupported tax estimates unresolved. Do not infer the employer's ACA affordability compliance from this household cost comparison. See [IRS Notice 2015-87](https://www.irs.gov/irb/2015-52_IRB) for the separate opt-out/affordability context; proposed-rule material must not be treated as enacted final law.

Show waiver income as its own line and cash-timing series. It does not reduce bill amounts, satisfy a deductible, increase HSA eligibility, or cover the medical cash bridge before it is actually paid. A negative net economic cost can be displayed with its contributing income explained; do not fabricate a negative insurance premium.

## Household Coverage Arrangements

Compare these arrangements when eligibility and employer terms support them:

- Everyone under A's available family coverage, plus B's applicable waiver income.
- Everyone under B's available family coverage, plus A's applicable waiver income.
- A enrolled self-only and B with the remaining covered members, or the reverse.

Every person belongs to exactly one primary coverage group in this release. Each group's deductible, individual OOP and family OOP accumulators are independent; add the group totals only after calculating each group. Do not model dual coverage/coordination of benefits implicitly. Compare Self Plus One with Self and Family where both legally cover the same members: [OPM notes that Self Plus One can cost more](https://www.opm.gov/healthcare-insurance/healthcare/plan-information/premiums/).

Before suggesting a switch away from FEHB, surface its retirement-continuation requirement. [OPM's retirement guidance](https://www.opm.gov/support/retirement/faq/health-care-coverage/) describes continuous coverage requirements, generally the five years immediately before retirement or the applicable shorter eligibility period. A spouse's private employer coverage must not be assumed to preserve FEHB eligibility. Keep this eligibility review separate from annual price ranking; do not recommend cancellation based solely on a one-year saving.

## Data Refresh and Privacy

A yearly **Refresh Federal Health Plans** task is scheduled for November 1, starting in 2026, before the usual Open Season period. It targets the upcoming benefit year, validates the original sources and prepares a draft PR for review rather than automatically merging new benefit interpretations. It does not resume timed feature development.

OPM can revise files outside that date (the 2026 service-area file was revised in March). Also provide an on-demand maintainer refresh; the annual task is not a promise of continuous corrections. If upcoming-year files are missing, report the exact missing inputs and retain the last valid year without relabeling it.

Ship validated public reference data with the static site. Calculate location eligibility, medical costs, family accumulators, incentives and ranking entirely in the browser. No household/ZIP/health/employer data is sent to OPM or any other provider. Only generic public source files are fetched by maintenance. Shared employer-option exports continue to use an allowlist and exclude household membership, private care, tax estimates and personally elected incentives. Consider a separate reviewed employer-incentive template later; never add household data to the coworker-share format.

## Delivery and Acceptance

1. Public-source importer and year/version manifest, service-area and rate-tier matching; tests for source changes, duplicate joins, wrong program/year/rate category, ZIP/county ambiguity and missing records.
2. Employer ownership, independent covered-person groups and Section 2a incentives; tests for waived/enrolled combinations, both/one/no eligible payment, gross/net handling, proration, surcharge conditions and payroll duplication.
3. Reviewed service/Rx/HSA/HRA rules and family accumulators; tests for embedded/aggregate deductibles, one high-cost member, separate prescription sublimits, copay caps and split-plan families.
4. Federal checkbox, top-three reviewed shortlist and pinned private options; tests for input-driven re-ranking, ties, incomplete candidates, reference-version preservation and private-option export isolation.
5. Mobile/browser/PDF checks, clear source/readiness labels and a wholly fictional FEHB/private-employer example. No private screenshots, memory-derived household values or real user's employers/medical information may become public fixtures.

Implemented September 11, 2026:

- Reproducible standard-library importer, exact source hashes, schema/duplicate/ambiguous-rate guards and versioned 2026 catalog. Run `python scripts/import-fehb.py --year 2026 --cache /tmp/opm-research --download` for those reviewed editions. A different year fails closed until its source manifest is reviewed; original workbooks stay outside the repository. Service-area suffix sets are not joined as enrollment codes.
- Compact directory, geography filters, 12 separate federal review slots, scalar service-price suggestions, source text and links, explicit family/formulary review, top-three full-household shortlist, pin/show-all controls and reference/care invalidation. Only January 2026 comparisons use this catalog. Government contributions are not counted as employee cash benefits.
- Per-employer gross/net waivers and group-dependent eligibility, proration and payment timing; surcharges; two-group comparisons with independent accumulators and full coverage checks. Waiver income disables the automatic Household-only HSA tax estimate because taxable gross can vary by coverage choice; users supply a reviewed rate. Shared HSA allowances require explicit confirmation; automatic split-plan contribution allocation and dual coverage are excluded.
- Per-fill minimum/maximum charges after deductibles; HRA reimbursement capped by actual modeled covered care, with no retained-asset benefit. HRA timing currently requires full allowance at the start of the year and reimbursement when covered bills are paid; other HRA designs remain unresolved.
- Enrollment PDF and monthly ledgers include the applied incentives. Coworker exports do not include this personal configuration. Search Console verification uses only the supplied meta tag, without analytics. Enrollment/catalog code is loaded when the tab opens.

The source text remains the review aid, not a machine-certified mapping. Automatic category-wide benefit interpretation, insurer-specific negotiated prices, assistance accumulators, prescription formulary verification and special enrollee rate classes remain intentionally outside the supported calculation. The ranking is **lowest cost among reviewed options**, never a claim to have evaluated every eligible plan automatically.

Regression coverage includes source counts/joins, tier and location handling, stale review/import behavior, top-three re-ranking, gross/net and payout calculations, surcharge/OOP separation, HRA limits, per-fill caps, split accumulators and export privacy. The release browser journey exercises the federal checkbox/review and a waiver changing displayed costs on mobile and desktop. No personal source material is used.
