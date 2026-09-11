# FEHB Benefit Mapping and Annual Refresh

Effective edition: **2026**, mapping reviewed **September 11, 2026**. This is a public-reference build, separate from users' plans. The application never fetches or sends household or care inputs to OPM or an insurer.

## What fills automatically

An explicit federal-plan selection copies premiums, the published tier's deductible and OOP limit, source-backed within-family limits, and available benefit rules. Explicit “None” in a deductible field means zero; missing or ambiguous text never means zero. Family caps are never calculated by halving a family amount or substituting a self-only limit without brochure evidence.

People enter medical-service categories once. Each selected plan applies its own mapped copay, coinsurance, deductible and combined-OOP treatment. A prescription's formulary tier and fill channel are selected **per plan**: a drug's tier cannot be inferred from its name or its tier in another insurer's formulary. Published choices identify fill sizes and special channels. Medical categories cover the stated service only; professional, facility and drug charges may require separate entries.

Nine nationwide options have detailed source-reviewed profiles: BCBS Standard, Basic and FEP Blue Focus; GEHA High, Standard and HDHP; MHBP Standard, Value and Consumer. Mappings include:

- Individual protection within family deductibles and OOP limits, including GEHA/MHBP aggregate HDHP deductibles.
- BCBS Basic's different laboratory categories and 30-day versus longer-fill Rx caps.
- FEP Blue Focus's first ten combined primary/specialist/outpatient mental-health visits per person, followed by deductible and coinsurance.
- GEHA Standard's first free primary-care visit for children under 18 (select the child category), then its regular copay.
- GEHA High's retail maintenance-drug price increase after the second fill, as a distinct pharmacy choice, and ordinary/specialty caps.
- MHBP's different primary-care prices for dependent children through age 21, as an explicit category.

The generated [coverage report](../data/fehb/2026-coverage.json) records exact coverage per option. At this release: **132 catalog options, 59 HTML/PDF brochure pairs, 895 mapped service rules, 30 options with mapped family-limit structures, and nine detailed profiles**. These counts are not a claim that all services, networks or 132 options are completely modeled. Unmapped inputs remain highlighted in the form, and incomplete options do not enter the cost ranking. BCBS Basic inpatient per-day/admission caps, HRA personal-care-account/deductible offsets, special networks, therapy limits, manufacturer assistance and unmatched formulary conditions need further mappings or entered estimates. General annual medical charges remain a deductible-plus-coinsurance approximation; itemize visits and copay-based procedures.

## Files and reproducibility

- `data/fehb/manifests/YYYY-benefits.json`: exact four workbook URLs, hashes, complete header maps, retrieval date, expected inventory, all brochure and PDF hashes, and source-reviewed overrides with section labels and evidence hashes.
- `scripts/fehb_sources.py`: bounded public-document downloads, cached originals, edition validation, HTML parsing and PDF text supplements. The official BCBS HTML omits Section 4; its official PDF supplies those family rules.
- `scripts/fehb_mapping.py`: narrow deterministic mappings, explicit exceptions, validation and a content-derived version.
- `scripts/refresh-fehb.py`: inventory/change report, validated build, or byte-for-byte reproduction check. It does not change GitHub or deploy anything.
- `data/fehb/YYYY-benefits.json` and `YYYY-coverage.json`: generated application data and unresolved-coverage inventory.

Requirements: Python 3.12+ and Poppler's `pdftotext`. No Python packages, credentials or API keys are needed. Use the same Poppler version when reviewing evidence hashes; extraction differences intentionally require review. Cache originals outside the checkout. Do not commit full brochures, PDFs, spreadsheets, temporary files or personal plans.

Reproduce the current reviewed edition:

```sh
python scripts/refresh-fehb.py --manifest data/fehb/manifests/2026-benefits.json --cache /tmp/fehb-sources --check
```

The command downloads missing public files, then verifies every pinned source, full workbook headers, joins, counts, benefit rules and evidence hashes. `--download` forces a fresh check of the source URLs. A changed source, wrong year, missing document, ambiguous join, invalid rule or unreviewed override stops the build. It does not accept the new values automatically. Temporary network failures leave the active catalog unchanged; rerun using the cache when service recovers.

## November 1 yearly procedure

1. Inspect OPM's public-use-file index and official brochure directory for the **upcoming** benefit year. Record actual URLs and source release dates. If OPM has not published the edition, report that and retain the current catalog; do not relabel last year's data.
2. Create a new edition manifest with the new year, exact official workbook URLs, retrieval date and brochure supplement identifiers. Do not copy prior-year semantic profiles as reviewed facts. Use an inventory build to acquire public sources and prepare review evidence:

```sh
python scripts/refresh-fehb.py --manifest /tmp/next-fehb-edition.json --cache /tmp/fehb-sources --download --inventory /tmp/next-fehb-review.json
```

3. Inspect the adjacent `.changes.json`: added/removed options, changed benefits/premiums, inventory counts and document changes. The inventory output has empty profiles and an empty review date, so it cannot be activated accidentally. Review family limits, network/tier joins, Rx fill sizes and caps, visit thresholds, account funding and exclusions against the **new** brochures. Add exact evidence hashes and a real review date. Retain unresolved fields explicitly. A changed document hash requires re-review, not just replacing the hash to get a green build.
4. Build into a staging directory first:

```sh
python scripts/refresh-fehb.py --manifest /tmp/reviewed-next-edition.json --cache /tmp/fehb-sources --output /tmp/fehb-next
```

5. Inspect the generated coverage report and compare golden calculations for self-only, one high-use family member, multiple members reaching a family cap, Rx caps and stepped prices. Add tests for every changed rule and regression tests for removed benefits. Copy the reviewed manifest and generated data into the repository. An application edition change also requires updating active imports and year gates deliberately; old saved plans must retain their entered values and be marked for an explicit update.
6. Run `npm test`, `npx tsc --noEmit`, `npm run build:pages`, and `--check`. Open a **draft PR** with source dates, changed option/rule counts, coverage regressions, unresolved cases and test results. Do not merge or deploy a yearly refresh automatically. The existing Chromium/WebKit mobile and PDF gates must pass before release.

The yearly task is a source-review task, not a recurring feature build. It must not re-enable timed development, add tracking, query users' medication names, or gather household data.

## Saved plans and overrides

A saved option stores both the OPM catalog version and the benefit-mapping version. Published fields are copied only on selection or **Apply Current Published Benefits**. Manual rules and personal HSA funding, tax rates and premium overrides survive recalculation. New expected-care items use the selected edition's rules; an explicit per-plan category overrides the shared category. Editing a published rule switches to a manual flat rule and removes its automatic visit/fill step. Old plans without a mapping version remain unchanged until the user applies the published benefits. Stale catalog/mapping editions are excluded from current rankings until updated.

## Validation contract

`npm test` includes synthetic source-pipeline fixtures (no network) and calculation regressions. A release also checks source inventory consistency against the pinned manifest. The maintainer's `--check` rebuild uses the real cached/public documents. Test fixtures must remain fictional and must never use private screenshots, user plan values or medical details.
