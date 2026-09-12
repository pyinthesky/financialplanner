# Generate a Local Plan File

Contract: schemaVersion 2. Documentation reviewed September 12, 2026.

The file is for the existing **Data & Privacy → Open a Saved Plan** action. This site is static; it does not accept POSTed plan data or populate a plan from URL contents. There is no automatic cloud transfer. A model may deliver a JSON attachment privately to its user, who imports it on their own device.

## Workflow

1. Read this guide and the [generated schema](https://pyinthesky.github.io/financialplanner/schemas/plan-v2.schema.json). Begin with the [blank template](https://pyinthesky.github.io/financialplanner/examples/blank-plan-v2.json), not the comprehensive fictional sample.
2. Populate only user-authorized facts. Ask for material missing information or leave it unresolved. Do not manufacture assumptions, benefit eligibility, account-access exceptions or prior review confirmations.
3. Keep required fields; omit unknown optional sections. Use JSON numbers and booleans, not formatted strings. Use only properties/enumerations defined in the schema. Do not embed the schema itself or add a `$schema` property to the plan object.
4. Validate locally against the schema when possible. Then check the units, dates, ownership and links described below. Never send the completed file to an online validator. If unable to validate, tell the user; do not claim the file was tested.
5. Deliver `my-retirement-plan.json` as a UTF-8 attachment. List unresolved information in the accompanying message, outside the file.
6. Tell the user to download any existing plan before importing. The app asks before choosing another file when a plan or saved copy already exists. **Selecting a valid file then replaces the active plan without a field-by-field preview.** An unlocked vault will save that replacement locally in encrypted form. Strict arbitrary-file validation and a field preview remain future enhancements.

## Privacy and Unknown Values

Do not include names, emails, street addresses, exact birth dates, government/account numbers, credentials, employer identifiers or private notes. Use generic descriptions (Pay 1, Investment 1, Child 1, Property 1) and opaque unique IDs (account-1, debt-1). An optional birth year or locality may be entered only if the user chooses to provide it for a supported calculation. Anonymous labels do not make financial/health data nonsensitive: keep the finished attachment private.

Never put plan JSON, compressed plan JSON, a vault passphrase, or a hosted private-file URL into a link, query string or fragment. Link only to the public planner and let the user select the local file.

Unknown is not the same as zero. Fields typed `number | null` use `null` for unknown. Empty date/string fields use `""` where supported. The blank template's required numeric zeroes are legacy empty-form sentinels, not evidence of zero income, cost, return or age. Leave them unchanged if unknown, and identify the gap in the accompanying message. Do not substitute `null` where the schema requires a number. Leave required enum/boolean defaults unchanged only as template placeholders; ask about important choices and never describe them as confirmed. A schema-valid incomplete plan can produce incomplete or misleading results.

## Units and Shared Facts

| Area | Input meaning | Avoid duplicating |
| --- | --- | --- |
| `household` | Ages are whole years; birth years are four-digit years; state uses a U.S. postal abbreviation when supplied, ZIP is a string | Do not add a name, exact birth date or address |
| `accounts` | `balance` and `costBasis` are dollar amounts; `annualContribution` is dollars per year | Payroll/saving allocations must reconcile to account contributions; do not independently add the same saving twice |
| Account kinds | `taxable`, `traditional`, `roth`, `cash`, `hsa`; account owner is `you`, `partner` or `joint` | A 401(k), 403(b) or IRA maps by tax treatment; split traditional/Roth portions into distinct accounts; 529s belong in `education` |
| `budget.pay` | `amount` is net take-home **per payment**; frequency determines annualization | Do not use gross salary as take-home or also record the same paycheck as pension income |
| Optional payroll detail | `gross`, `taxableWages`, withholding and savings are **per paycheck** | Payroll elections/allocations have explicit reconciliation; do not invent a completed Apply result |
| `budget.lines` | `amount` is dollars **per occurrence**, using its frequency | Linked debt, home, healthcare and rental costs already flow from source sections |
| `income` | Pension/Social Security `annualAmount` is dollars per year; start age is the owner's age | Do not put the same benefit in `budget.pay` |
| `debts` | Balance in dollars; `interestRate` as percent; `minimumPayment` and extras in dollars **per month** | A mortgage payment here is principal and interest only, not the total escrowed statement |
| `housing.statement` | All payment components are **monthly**; `debtId` links the mortgage; total must reconcile | Property tax/insurance here must not also be independent budget expenses |
| `housing` | Home value and annual insurance/tax are dollar amounts; mill rate means dollars per $1,000 assessed value | For dollar-mode property tax, use `propertyTaxMode: "annual"` and `annualPropertyTax`; do not fabricate assessed percent/mills |
| `healthcare`, `recurringCosts` | Cost fields named `Annual`/`annualAmount` are annual dollars; timed costs use the primary person's ages | Do not also list the same care or timed cost in the budget |
| Rates | Inflation, investment returns, withholding, state effective rate and `taxableGainFraction` are percentage points: `5` means 5%, not `0.05` | Enter assumptions only when chosen; a ZIP does not supply tax law |
| Dates | Full dates `YYYY-MM-DD`; month fields `YYYY-MM`; preserve empty unknown dates | Do not invent payday/bill dates just to fill a calendar or Sankey |

Pay and bills support `weekly`, `biweekly` (26/year), `semimonthly` (24/year), `monthly`, `quarterly`, and `annual`. Semimonthly calendar timing uses the 15th and month end. `budget.timeline.startYear` sets the projection's starting year when supplied; timing must agree with the household ages.

## Current and Retirement Budgets

Use the same bill once and put its retirement change in `retirement`:

- `continue`: retain the current amount/frequency.
- `stop`: no retirement expense.
- `replace`: use the retirement amount **at the same frequency**.
- `percent`: retirement `amount` is a relative percent change; `-20` means 20% less than current spending, not spending 20% of it.
- `retirementOnly`: exclude from the current budget, use the retirement amount later.

When supplying an itemized retirement budget, set `budget.retirementSpendingSource` to `"worksheet"`. Do not also fill the legacy `assumptions.annualSpending` aggregate for those bills. Keep `budget.reviewed: false` until the user reviews it. Standard categories are Housing, Utilities, Food, Transport, Health, Dependents, Travel & Leisure, Subscriptions, Giving, Other. Names can be descriptive without identifying the user.

Here is an independently invented **single bill**, not a complete plan. Add it to the blank template's `budget.lines` only as an example; replace amounts with authorized facts or `null`:

```json
{
  "id": "bill-1",
  "name": "Groceries",
  "category": "Food",
  "amount": 100,
  "frequency": "monthly",
  "essential": true,
  "owner": "household",
  "nextDueDate": "",
  "endDate": "",
  "retirement": { "rule": "replace", "amount": 80, "reason": "" }
}
```

IDs must be unique within their collections and referenced IDs must exist. Match account ownership to payroll/benefit owners. Property `debtId` links must point to the corresponding mortgage. Education accounts link to a household dependent, not a retirement account. Do not create orphan links or two different entries for the same real item.

## Optional and Advanced Sections

The schema includes `education`, `enrollment`, `realEstate`, `refinancing`, `laboratory` and tax worksheets. Consult each referenced definition; optional does not mean arbitrary. A plan's medical options use the `enrollment` section; the separate employer-options sharing format is not a full plan file. Do not merge these file formats.

Unless explicitly supplied by the user, omit scenario snapshots and reference receipts (`laboratory`, `inflationReference`, `returnReferences`, bill `reference`). Do not invent public-source review dates, eligibility confirmations, qualified-Roth dates, QCD eligibility, early-withdrawal exceptions or taxable rental profit. Owner `joint` is not supported for every account rule. A source statement's employer match, expected Social Security, or deductible requires its actual terms; an LLM should not guess them.

## Validation Boundaries

The published JSON Schema is generated from TypeScript and rejects unrecognized properties on ordinary objects. It documents structure, not all ranges, unique-ID/reference constraints, reconciliation rules, or financial-law eligibility. Typed string fields can still contain personal information; the schema is not a PII detector. The application performs additional normalization/validation, but its legacy importer is not yet a strict arbitrary-file preview. Never claim a generated file is guaranteed correct or private merely because it validates.

For tool authors: pin a repository commit when reproducibility matters. `npm run schema:write` regenerates the schema and blank template. CI tests fail on drift and validate the blank template, fictional sample, and budget round-trip against the generated schema. No personal data is used in those checks.
