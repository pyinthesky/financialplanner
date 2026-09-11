> Federal-plan selection now reuses shared medical-service categories and per-plan formulary choices through [versioned OPM benefit mappings](fehb-refresh.md). Published visit/fill steps are computed per person; manual rule editing replaces a step with an explicit flat rule.

Latest feedback: [employer-only sharing, ranking, household-derived tax rates and household/529 changes](household-enrollment-round.md) extend this original contract.

# Open Enrollment: Supported Comparison Contract

Implemented September 8, 2026. This is a separate local comparison, available through **Open Enrollment**, with **Health Plans** and **Term Life** views. It does not add widgets to Plan Summary or automatically change retirement projections. All numeric fields start blank; the existing, explicitly loaded fictional sample exercises three health options and four term quotes. No personal screenshots or their contents are used as fixtures.

## Entry and Interpretation

1. Choose the beginning of one complete 12-month benefit year. Add up to eight anonymous people, with the same covered group in every option. Each person has a compact expandable row. Annual general medical spending means insurer-negotiated allowed charges before insurance payments, excluding separately itemized visits and prescriptions. An input identified as past personal out-of-pocket spending blocks comparison until replaced with an allowed-charge estimate.
2. Add visits or prescriptions with allowed cost per occurrence, annual count and service timing. Monthly spreading distributes whole occurrences in order across the year. Costs marked payable at service, including prescription fills by default, do not inherit a delayed provider-bill assumption. Confirm covered preventive services separately; diagnostic services belong in medical care.
3. Add up to four health options. Premiums use the employee's per-pay-period amount and annual pay periods. Medical terms include individual/family deductibles, embedded/aggregate structure, individual/family OOP maximum and member coinsurance. Optional labels and network descriptions are stored only with the local plan.
4. For each itemized service, optionally override its allowed price for that option, then confirm coverage, deductible treatment, copay or coinsurance, and OOP credit. Prescription deductibles may be shared, separate or exempt. Separate Rx deductibles currently use the same embedded/aggregate structure as medical. Optional Rx caps sit within the overall caps. Missing coverage, amount or accumulator information blocks the complete comparison; it does not silently treat the prescription as free.
5. Enter billing delays, including explicit zero. HSA options can add employer and personal contributions, opening balance, an effective tax-saving percentage, a confirmed allowable contribution total, employer deposit timing and reimbursement lag. Contributions from both sources count toward the entered allowance. Existing HSA balances may reimburse confirmed eligible costs even when new contributions are zero and current contribution eligibility is absent.

Plan-column details are progressively disclosed. On phones, options stack and quantitative fields use one column. Results have exact textual amounts alongside SVG graphics; claim and monthly ledgers are expandable. Printing while Open Enrollment is selected produces its own expected-use comparison, with vector cost and cash-timing charts and term quotes. It does not replace the normal retirement report on other pages.

## Accumulation Algorithm

- All covered people share the family accumulators; each also has their own deductible, combined OOP and Rx accumulator. In an embedded structure, the remaining deductible is the smaller of that person's remaining threshold and the remaining family threshold. In an aggregate structure, the family threshold governs. For one covered person, the individual threshold governs.
- Apply deductible dollars first, then the entered copay capped at remaining allowed cost or the entered coinsurance percentage. A deductible-exempt service bypasses only the deductible, not its configured OOP credit. A covered preventive service has no member charge. Excluded care is paid in full and never uses a covered accumulator.
- If the item's payments count toward the combined OOP maximum, cap them at both the person's and family's remaining limits, and any applicable Rx sublimit. Credit only the deductible dollars actually paid. A person can therefore reach their OOP limit before an aggregate family deductible has been met. Their later counted costs are paid by the plan even if other members still face a deductible.
- If member payments do not count toward the OOP maximum, they remain payable outside that protection. The displayed premiums-plus-covered-maximum figure is not an all-care ceiling. Premiums, excluded costs and noncounting charges remain separate.
- Process service months chronologically. Within a month, use person order, with that person's general medical followed by listed items. Exact insurer processing order, unentered negotiated network-price differences, separate medical/Rx deductible structures, copay-plus-coinsurance combinations, coinsurance per-fill minimums/maximums, assistance accumulators and out-of-network balance billing are not inferred. Those require more detailed plan rules or an insurer estimate.

## Annual Economics and Cash Timing

`Gross annual cost = employee premiums + modeled member medical + prescription + excluded payments`.

`Net economic cost = gross annual cost − employer HSA funds − estimated personal-contribution tax savings − entered premium tax savings`.

All employer funding is an economic benefit, including retained HSA assets; a negative result is not an insurance refund. Personal HSA deposits are transfers to an owned asset and are never a second medical expense. Opening HSA assets are not counted as new savings. An optional confirmed effective premium tax-saving rate accounts for payroll-premium treatment without guessing state or payroll law. Blank means no premium tax benefit is estimated. Imputed employer-life tax is not calculated.

Service-month liability, EOB processing, payment due and HSA reimbursement have separate ledger entries. Deductible/OOP credit stays in the service year even when a bill is paid later. Premiums and personal HSA contributions are spread monthly; employer contributions can be monthly or in the first month. Deposits precede monthly payments in this approximation. Actual pay dates and within-month provider terms can require a larger cash buffer.

Cash results continue beyond the plan year only to settle its delayed bills and reimbursements. No new-year care, premiums, employer deposits or tax-law assumptions are invented. Only confirmed eligible people and non-excluded items enter the HSA reimbursement queue. Peak bridge cash tracks eligible bills awaiting reimbursement, while noneligible bills remain bank expenses. HSA reimbursements cannot exceed available funds; eligible unpaid reimbursements remain queued and visible. The bank-cash column includes premiums, personal HSA deposits and bills minus reimbursements. Annual tax savings are not treated as immediately available bill-paying cash.

The lower/expected/higher/stress selector multiplies general and itemized medical allowed charges by 0.5/1/2/5, keeping prescriptions, visit counts and excluded costs fixed. A separate graph includes 0% medical charges. Lines connect sampled points; they do not identify exact break-even thresholds or probabilities. Printing always uses the expected-use case.

## Effective-Dated Sources

Reviewed September 8, 2026. User-specific benefit documents and formularies govern plan terms; the app does not substitute statutory maxima for actual plan limits.

- [IRS Revenue Procedure 2025-19](https://www.irs.gov/pub/irs-drop/rp-25-19.pdf), effective calendar year **2026**: base HSA contribution limits of $4,400 self-only and $8,750 family. The optional January-2026 shortcut applies only these base amounts. It does not add catch-up amounts or decide partial-year, Medicare, other-coverage or spouse allocation eligibility.
- [IRS Publication 969 (2025)](https://www.irs.gov/publications/p969): employer/personal contribution coordination, qualified beneficiaries and expenses, HSA establishment and distribution treatment. Each person has separate HSA-owner reimbursement eligibility, distinct from membership in family health coverage. Individual items can be excluded from HSA reimbursement without losing their plan cost-sharing treatment. The model assumes included expenses qualify, occurred after establishment and will not be reimbursed elsewhere; individual eligibility and expense exclusions remain editable. No blanket attestation is required. A non-calendar benefit year needs independently confirmed calendar-year allowances; this tool does not infer them. State and payroll tax treatment require a confirmed effective input.
- [HHS embedded self-only annual limitation FAQ, May 8, 2015](https://www.dol.gov/sites/default/files/ebsa/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers/hhs-guidance-embedded-self-only-annual-limitation-on-cost-sharing-faqs.pdf): individual protection within family coverage. The engine uses entered plan limits, not the FAQ's historical dollar examples.
- [HealthCare.gov: Out-of-pocket maximum](https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/): covered cost-sharing versus premiums and excluded charges.
- [CMS: Reading an explanation of benefits](https://www.cms.gov/medical-bill-rights/help/guides/explanation-of-benefits): the distinction between claim information and a provider bill. No standard billing delay is assumed.

## Term-Life Scope

Only employer term and individually owned level-term comparisons are supported. Enter actual quotes for matching coverage and the same insured person. Available horizons are 10, 15 and 30 years. Cumulative known premiums stop at the earliest of term end, guaranteed-price period or an employer option's modeled job change. Confirmed portability does not establish the price or terms after departure; those remain unpriced. The graph deliberately stops there. Cost per $1,000 is a unit-cost display, not permission to extrapolate a quote to a different death benefit.

No age-based prices, underwriting-class discounts or employment tax rules are guessed. Quarterly reference pricing remains a documented dependency on a credible public dataset with reuse rights, dated assumptions and reviewed updates. Manual quotes are usable now. No lead service or quote request is made.

## Remaining Integration and Acceptance

- Explicit selection into canonical payroll, healthcare budgets and HSA funding remains planned. Automatically copying total costs would double count payroll premiums and deposits; this standalone release preserves the existing budget source of truth. Changes do not stale retirement scenarios because this comparison does not affect their cash flows.
- Separate groups on different plans, changing household membership during a year, precise claim dates, independent medical/Rx deductible structures, detailed tax eligibility, FSA/HRA comparisons, rate datasets and prescription assistance rules remain outside the supported scope.
- Calculation tests cover individual and family cap boundaries, cost concentration, prescription rules, benefit-year versus bill-year timing, HSA conservation, missing-data gates, normalization, export/import, unchanged scenario baselines and term quote horizons. Required browser journeys cover populated and missing-rule states on six widths in Chromium and WebKit, plus expected-use print-chart geometry. Only independently fictional data enter screenshots and PDF evidence.

## Input Guidance (September 11, 2026)

`healthInputErrors` is shared by the cost engine and the editor. Stable paths identify each missing person, option, visit/Rx, or timing field. Errors display beside the input with `aria-invalid` and a linked explanation, and open enclosing details sections. The results area summarizes incompleteness once and can focus the first missing field. Resolving an error removes its marking. Optional tax estimates do not block the comparison: blank means the supported Household HSA estimate when available, otherwise no estimated tax benefit. Actual care costs and plan limits still require explicit entries, including zero.

Year and start month are ordinary select controls, compatible with browsers lacking a native month input. Either can be chosen first. Adding an effective-dated federal option fills its calendar year only when the date is blank. Existing plan dates are preserved.
