import { buildBudgetYear, type BudgetMonth } from './budget-calendar.ts';
import { normalizeBudget, budgetAllocation } from './budget.ts';
import { calculateFederalIncomeTax } from './federal-tax.ts';
import { calculateCapitalGainsTax } from './capital-gains-tax.ts';
import { calculateTaxableSocialSecurity } from './social-security-tax.ts';
import { calculateEarlyDistributionTax } from './early-distribution.ts';
import { calculateRmd } from './rmd.ts';
import { calculateQcdElection } from './qcd.ts';
import { EMPTY_LAB, type ScenarioOverrides } from './monthly-model.ts';
import { mortgagePayoffSchedule, mortgagePaymentReleased } from './mortgage-scenario.ts';
import { calculateHomeMove } from './home-move.ts';
import { activeMortgageStatement, debtPayoffSchedule, homeInsuranceAnnual, propertyTaxAnnual, type Account, type PlannerData } from './planner.ts';

export interface MonthlyRow {
  month: string; age: number; openingPortfolio: number; portfolio: number; cash: number;
  investmentReturn: number; pay: number; pension: number; socialSecurity: number; cashInterest: number;
  essential: number; discretionary: number; discretionaryReduction: number;
  housing: number; healthcare: number; timedCosts: number; debtPrincipal: number; debtInterest: number;
  spending: number; spendingPaid: number; unfundedSpending: number;
  taxSettlement: number; taxRefund: number; withholding: number; unfundedTax: number;
  requestedSavings: number; savingsFunded: number; savingsUnfunded: number; payrollSavings: number; employerSavings: number;
  withdrawals: number; rmd: number; conversionRequested: number; converted: number; charitableGift: number;
  eventIncome: number; eventExpense: number; cashTarget: number; bufferGap: number; liabilities: number;
  conservationResidual: number; accounts: Record<string, number>;
  mortgagePayoff: number; releasedPaymentInvested: number;
  homeProceeds: number; homeValue: number; totalNetWorth: number;
  coverageMonths: number;
  openingCash: number; cashPayrollSavings: number; savingsToInvestments: number;
  incomeByOwner: Record<'you'|'partner',{pay:number;pension:number;socialSecurity:number}>;
}
export interface MonthlyYear {
  year: number; portfolio: number; cash: number; income: number; spending: number; taxes: number; taxPaid: number; taxRefund: number;
  withholding: number; unfunded: number; savings: number; converted: number; conversionRequested: number;
  federalTax: number; stateTax: number; capitalGainsTax: number; earlyTax: number;
  financialNetWorth: number;
  totalNetWorth: number;
}
export interface MonthlyResult { months: MonthlyRow[]; years: MonthlyYear[]; issues: string[]; supported: boolean; firstShortfall: string | null; legacyTarget: number | null; legacyGap: number | null }
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const nonnegative = (v: number | undefined | null) => Math.max(0, v ?? 0);

/**
 * Monthly planning convention: Jan 1 opening balances; start-of-month wages and
 * benefits, budget payments, saving transfers, then month-end returns. RMD/QCD,
 * conversions and full-year income-tax settlement occur in December. Tax-year
 * tables come exclusively from shared sourced modules. This is not a quarterly
 * estimated-payment compliance calculation. Missing payroll is a hard gate.
 */
export function projectMonthly(data: PlannerData, overrides: ScenarioOverrides = {}): MonthlyResult {
  const lab = data.laboratory ?? EMPTY_LAB;
  const settings = { ...lab.settings, ...Object.fromEntries(['cashCoverageMonths', 'guardrailFloor', 'discretionaryCutPercent'].filter(k => overrides[k as keyof ScenarioOverrides] !== undefined).map(k => [k, overrides[k as keyof ScenarioOverrides]])) } as typeof lab.settings;
  let budget;
  try { budget = normalizeBudget(data.budget); } catch { return { months:[], years:[], issues:['Correct invalid or negative budget inputs before projecting.'], supported:false, firstShortfall:null, legacyTarget:null, legacyGap:null }; }
  if (overrides.retirementMonthYou || overrides.retirementMonthPartner) budget.timeline = { startYear: budget.timeline?.startYear ?? null, retirementMonthYou: overrides.retirementMonthYou ?? budget.timeline?.retirementMonthYou ?? '', retirementMonthPartner: overrides.retirementMonthPartner ?? budget.timeline?.retirementMonthPartner ?? '' };
  const issues = new Set<string>();
  if(budget.lines.some(l=>budgetAllocation(l).overallocated||budgetAllocation(l,true).overallocated))issues.add('A bill breakdown exceeds its current or retirement envelope. Reconcile its total before comparing scenarios.');
  const empty = (): MonthlyResult => ({ months: [], years: [], issues: [...issues], supported: false, firstShortfall: null, legacyTarget: null, legacyGap: null });
  const start = budget.timeline?.startYear;
  const horizon = overrides.planToAge ?? data.household.planToAge;
  if (!Number.isInteger(horizon) || !Number.isInteger(data.household.currentAge)) issues.add('Use whole years for the planning ages; retirement timing uses the month fields.');
  if (budget.overrides?.some(o=>!o.fromMonth)) issues.add('Complete or remove unfinished dated budget changes.');
  if (overrides.returnYears?.some(r=>r.year===null || r.rate===null || r.rate<=-100 || !Number.isFinite(r.rate))) issues.add('Complete each stress year and its hypothetical return, or remove the unfinished row.');
  if (overrides.returnYears && new Set(overrides.returnYears.map(r=>r.year)).size !== overrides.returnYears.length) issues.add('Use only one return override per calendar year.');
  if (Object.values(data.assumptions).some(n=>typeof n==='number'&&!Number.isFinite(n))) issues.add('Economic assumptions must be finite.');
  if ((overrides.spendingChangePercent??0)<-100 || (overrides.inflation??data.assumptions.inflation)<=-100) issues.add('Spending cannot fall below zero and inflation must exceed −100%.');
  if (!start || start < 2026 || start > 2100 || !Number.isInteger(start)) issues.add('Enter the opening-balance year (January 1, 2026 or later).');
  if (data.household.currentAge <= 0 || horizon < data.household.currentAge || horizon > 120) issues.add('Complete current age and a planning horizon no later than age 120.');
  if (budget.retirementSpendingSource !== 'worksheet' || !budget.reviewed) issues.add('Select and review the linked Retirement Budget before using monthly projections.');
  if (data.housing.statement?.enabled && !activeMortgageStatement(data)) issues.add('Reconcile the active mortgage statement.');
  if (data.housing.payoffMortgageAtRetirement) issues.add('The legacy mortgage-payoff flag is unsupported in the monthly engine. Turn it off; a funded payoff event needs a separate comparison.');
  if (data.household.filingStatus === 'marriedSeparate') issues.add('Separate-return allocation is not supported by the household monthly tax settlement; use the sourced separate-filing worksheets without ranking this projection.');
  const accountIds = data.accounts.map(a => a.id);
  if(data.income.some(s=>s.withholdingPercent!==undefined&&s.withholdingPercent!==null&&(!Number.isFinite(s.withholdingPercent)||s.withholdingPercent<0||s.withholdingPercent>100)))issues.add('Benefit withholding must be between zero and 100 percent.');
  const payoff=overrides.mortgagePayoff;
  const homeMove=overrides.homeMove;
  if(homeMove && (!calculateHomeMove(homeMove,data.household.filingStatus,0).supported || data.housing.homeValue<=0 || data.debts.filter(d=>d.kind==='mortgage').length>1 || data.debts.some(d=>d.kind==='mortgage'&&d.id!==homeMove.mortgageId))) issues.add('Home moves require the opening home value, complete standard-case inputs, and the one linked mortgage (or no mortgage). Multiple liens and new financing require separate rules.');
  if(homeMove&&payoff)issues.add('Compare a home move and a separate mortgage payoff in different scenarios; combined transaction sequencing is not supported.');
  if(payoff && (!data.debts.some(d=>d.id===payoff.debtId&&d.kind==='mortgage') || !/^\d{4}-(0[1-9]|1[0-2])$/.test(payoff.month) || payoff.destination==='invest' && !data.accounts.some(a=>a.id===payoff.accountId&&a.kind==='taxable'))) issues.add('Complete the mortgage payoff month, loan and optional taxable investing destination.');
  if (new Set(accountIds).size !== accountIds.length || accountIds.length === 0) issues.add('Add uniquely identified opening account balances.');
  for (const a of data.accounts) {
    if (!Number.isFinite(a.balance) || a.balance < 0) issues.add('Account balances must be finite and nonnegative.');
    if (a.kind === 'traditional' && a.owner === 'joint' && a.balance > 0) issues.add('Assign each tax-deferred account to its individual owner.');
    if (a.kind === 'traditional' && a.balance > 0 && !(a.owner === 'partner' ? data.household.partnerBirthYear : data.household.birthYear)) issues.add('Birth years are required for owners of tax-deferred accounts so RMDs are not omitted.');
  }
  if (issues.size) return empty();
  const startYear = start!;
  const yearsCount = horizon - data.household.currentAge + 1;
  const calendar = Array.from({ length: yearsCount }, (_, i) => buildBudgetYear(budget, data.household, startYear + i, startYear, accountIds));
  for (const ms of calendar) for (const m of ms) {
    if (!m.payrollComplete) issues.add('Reconcile gross pay, taxable wages, income-tax withholding, payroll deductions and savings for each working paycheck. Net-only budgets remain usable without a tax projection.');
    if (m.missingAmounts) issues.add('Complete missing budget, pay and savings amounts, including explicit zeros.');
    for (const t of m.transfers) if (t.amount > 0 && !accountIds.includes(t.accountId)) issues.add('Assign every savings transfer to an existing account.');
  }
  const events = overrides.events ?? lab.events;
  const finalMonth=`${startYear+yearsCount-1}-12`;
  for(const event of [payoff,homeMove,...events])if(event&&(event.month<`${startYear}-01`||event.month>finalMonth))issues.add('A dated event falls outside this projection horizon; change its date or extend the horizon before comparing.');
  for(const event of events)if(event.throughMonth&&(event.kind!=='expense'||event.throughMonth<event.month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(event.throughMonth)))issues.add('Complete a valid ending month for the repeating expense.');
  for (const e of events) if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.month) || e.amount === null || !Number.isFinite(e.amount) || e.amount<0 || e.kind === 'cashReceipt' && (e.taxableAmount === null || e.taxableAmount<0 || e.taxableAmount>e.amount || !e.confirmedCashTreatment)) issues.add('Complete dated life events and confirm cash-receipt tax treatment; inherited retirement accounts and property sales cannot be entered as generic cash.');
  if (issues.size) return empty();
  const accounts = data.accounts.filter(a => a.kind !== 'cash').map(a => ({ ...a, balance: nonnegative(a.balance), costBasis: a.costBasis ?? a.balance * (1 - Math.min(1, nonnegative(data.assumptions.taxableGainFraction) / 100)), lockedConversions: [] as { amount: number; year: number }[] }));
  let cash = sum(data.accounts.filter(a => a.kind === 'cash').map(a => a.balance));
  const portfolio = () => cash + sum(accounts.map(a => a.balance));
  const getAge = (owner: Account['owner'], i: number) => (owner === 'partner' ? data.household.partnerAge : data.household.currentAge) + i;
  const married = data.household.maritalStatus === 'married';
  const infl = (overrides.inflation ?? data.assumptions.inflation) / 100;
  const scale = (i: number) => Math.pow(1 + Math.max(-0.99, infl), i);
  const originalDebt = debtPayoffSchedule(data);
  let debt = originalDebt;
  let movedYear: number | null=null;
  let homeValue=nonnegative(data.housing.homeValue);
  const statement = activeMortgageStatement(data);
  const months: MonthlyRow[] = [], years: MonthlyYear[] = [];
  const qcdOffsets = { you: data.qcdPlanning.unusedDeductibleContributionOffsetYou, partner: data.qcdPlanning.unusedDeductibleContributionOffsetPartner };
  for (let y = 0; y < yearsCount; y++) {
    const year = startYear + y;
    homeValue=movedYear===null?nonnegative(data.housing.homeValue)*scale(y):nonnegative(homeMove?.replacementPrice)*Math.pow(1+Math.max(-0.99,infl),year-movedYear);
    const prior = { you: sum(accounts.filter(a => a.kind === 'traditional' && a.owner === 'you').map(a => a.balance)), partner: sum(accounts.filter(a => a.kind === 'traditional' && a.owner === 'partner').map(a => a.balance)) };
    const distributions = { you: 0, partner: 0 };
    let wages = 0, pensions = 0, ss = 0, interest = 0, gains = 0, conversions = 0, eventTaxable = 0, qcdTaxable = 0, withholding = 0;
    const tax = () => {
      const ordinaryOther = wages + pensions + interest + distributions.you + distributions.partner + conversions + eventTaxable + qcdTaxable;
      const social = calculateTaxableSocialSecurity({ benefits: ss, otherIncome: ordinaryOther + gains, taxExemptInterest: data.assumptions.taxExemptInterest, filingStatus: data.household.filingStatus, marriedFilingSeparatelyLivedApart: data.household.marriedFilingSeparatelyLivedApart });
      const ordinary = ordinaryOther + social.taxableBenefits;
      const federal = calculateFederalIncomeTax(ordinary, data.household.filingStatus, Math.pow(1 + Math.max(-0.99, infl), year - 2026)).tax;
      const capital = calculateCapitalGainsTax({ filingStatus: data.household.filingStatus, grossOrdinaryIncome: ordinary, netLongTermCapitalGain: gains, modifiedAdjustedGrossIncome: ordinary + gains, netInvestmentIncome: gains + interest, inflationFactor: Math.pow(1 + Math.max(-0.99, infl), year - 2026), overrideRatePercent: data.assumptions.capitalGainsRate }).totalCapitalGainsTax;
      const state = Math.max(0, ordinary + gains) * nonnegative(data.assumptions.stateEffectiveTaxRate) / 100;
      let early = 0;
      for (const owner of ['you', 'partner'] as const) {
        const e = calculateEarlyDistributionTax({ ageOnDistributionDate: getAge(owner, y), taxableDistribution: distributions[owner], confirmedExceptionAmount: owner === 'you' ? data.earlyWithdrawalPlanning.annualConfirmedExceptionYou : data.earlyWithdrawalPlanning.annualConfirmedExceptionPartner });
        early += e.additionalTax;
        if (e.status === 'age-date-review' && distributions[owner] > 0) issues.add('Age-59 distributions need exact-date review; the additional-tax estimate is conservative.');
      }
      return { federal, capital, state, early, total: federal + capital + state + early };
    };
    const deposit = (id: string, amount: number) => {
      const original = data.accounts.find(a => a.id === id);
      if (original?.kind === 'cash') { cash += amount; return; }
      const a = accounts.find(a => a.id === id);
      if (a) { a.balance += amount; if (a.kind === 'taxable') a.costBasis += amount; }
    };
    const distribute = (a: typeof accounts[number], amount: number) => {
      const paid = Math.min(a.balance, nonnegative(amount));
      if (a.kind === 'taxable' && a.balance > 0) { const basis = a.costBasis * paid / a.balance; a.costBasis -= basis; gains += Math.max(0, paid - basis); }
      if (a.kind === 'traditional' && a.owner !== 'joint') distributions[a.owner] += paid;
      a.balance -= paid; cash += paid;
      return paid;
    };
    const raiseCash = (required: number) => {
      let raised = 0;
      for (const kind of ['taxable', 'traditional', 'roth'] as const) for (const a of accounts.filter(a => a.kind === kind)) {
        if (cash >= required) return raised;
        let available = a.balance;
        if (kind === 'roth') {
          // Qualified-status affirmation covers earnings; conversion principal
          // additionally remains unavailable for five tax years in this model.
          if (!a.rothQualifiedFromYear || year < a.rothQualifiedFromYear || getAge(a.owner, y) < 60) available = 0;
          else available = Math.max(0, available - sum(a.lockedConversions.filter(l => year < l.year + 5).map(l => l.amount)));
        }
        raised += distribute(a, Math.min(available, required - cash));
      }
      return raised;
    };
    let lastAssessment = tax();
    for (let m = 0; m < 12; m++) {
      const b: BudgetMonth = calendar[y][m];
      const opening = portfolio();
      const openingCash=cash;
      const incomeByOwner={you:{pay:0,pension:0,socialSecurity:0},partner:{pay:0,pension:0,socialSecurity:0}};
      for(const p of b.payByOwner)incomeByOwner[p.owner].pay+=p.amount;
      const age = data.household.currentAge + y;
      const monthIndex = y * 12 + m;
      wages += b.taxableWages; withholding += b.withholding;
      cash += b.takeHome;
      let mortgagePayoff=0, payoffDraws=0, releasedPaymentInvested=0,homeProceeds=0;
      let pension = 0, social = 0;
      let pensionWithholding=0,socialWithholding=0;
      for (const s of data.income) {
        if (!married && s.owner === 'partner') continue;
        const ownerAge = getAge(s.owner, y);
        if (ownerAge >= s.startAge) {
          const amount = s.annualAmount * Math.pow(1 + s.cola / 100, ownerAge - s.startAge) / 12;
          if (s.kind === 'socialSecurity') social += amount; else pension += amount;
          const held=amount*(s.withholdingPercent??0)/100;
          if(s.kind==='socialSecurity')socialWithholding+=held;else pensionWithholding+=held;
          incomeByOwner[s.owner==='partner'?'partner':'you'][s.kind==='socialSecurity'?'socialSecurity':'pension']+=amount-held;
        }
      }
      pensions += pension; ss += social;
      const benefitWithholding=pensionWithholding+socialWithholding;
      withholding+=benefitWithholding;pension-=pensionWithholding;social-=socialWithholding;cash += pension + social;
      for (const t of b.transfers.filter(t => t.source !== 'takeHome')) deposit(t.accountId, t.amount);
      const cashPayrollSavings=sum(b.transfers.filter(t=>t.source!=='takeHome'&&data.accounts.find(a=>a.id===t.accountId)?.kind==='cash').map(t=>t.amount));
      if(homeMove?.month===b.month){
        const changed=mortgagePayoffSchedule(data,debt,monthIndex,homeMove.mortgageId);
        const sale=calculateHomeMove(homeMove,data.household.filingStatus,changed.payoff);
        const savedAccounts=structuredClone(accounts),savedCash=cash,savedGains=gains,savedDistributions={...distributions};
        const need=Math.max(0,-sale.netCash);payoffDraws=raiseCash(need);
        if(sale.supported&&cash+0.0001>=need){cash+=sale.netCash;homeProceeds=sale.netCash;gains+=sale.taxableGain;debt=changed.schedule;homeValue=homeMove.replacementPrice!;movedYear=year;}
        else{accounts.splice(0,accounts.length,...savedAccounts);cash=savedCash;gains=savedGains;Object.assign(distributions,savedDistributions);payoffDraws=0;issues.add('Replacement housing or underwater sale could not be funded; the existing home and mortgage remain.');}
      }
      if(payoff?.month===b.month){
        const changed=mortgagePayoffSchedule(data,debt,monthIndex,payoff.debtId);
        if(changed.payoff>0){
          const savedAccounts=structuredClone(accounts),savedCash=cash,savedGains=gains,savedDistributions={...distributions};
          payoffDraws=raiseCash(changed.payoff);
          if(cash+0.0001>=changed.payoff){mortgagePayoff=changed.payoff;cash-=mortgagePayoff;debt=changed.schedule;}
          else{accounts.splice(0,accounts.length,...savedAccounts);cash=savedCash;gains=savedGains;Object.assign(distributions,savedDistributions);payoffDraws=0;issues.add('Mortgage payoff could not be funded; the loan and original payment schedule remain.');}
        }
      }
      const spendScale = scale(y) * (1 + (overrides.spendingChangePercent ?? 0) / 100);
      const essential = b.essential * spendScale;
      const requestedDiscretionary = b.discretionary * spendScale;
      const cutActive = settings.guardrailFloor !== null && portfolio() < settings.guardrailFloor * scale(y);
      const reduction = cutActive ? requestedDiscretionary * Math.min(1, nonnegative(settings.discretionaryCutPercent) / 100) : 0;
      const discretionary = requestedDiscretionary - reduction;
      const debtRow = debt[monthIndex + 1];
      const housing = movedYear!==null&&homeMove ? (homeMove.newMonthlyHousing!+(homeMove.newAnnualPropertyTax!+homeMove.newAnnualInsurance!)/12)*Math.pow(1+Math.max(-0.99,infl),year-movedYear) : (propertyTaxAnnual(data) + homeInsuranceAnnual(data)) * scale(y) / 12 + (statement && debtRow?.payments.some(p => p.id === statement.debtId && p.openingBalance > 0) ? nonnegative(statement.mortgageInsurance) + nonnegative(statement.otherEscrow) : 0);
      const healthScale = Math.pow(1 + data.healthcare.healthInflation / 100, y);
      const healthcare = ((age < 65 ? data.healthcare.preMedicareAnnual : data.healthcare.medicareAnnual) + (age >= data.healthcare.longTermCareStartAge && age < data.healthcare.longTermCareStartAge + data.healthcare.longTermCareYears ? data.healthcare.longTermCareAnnual : 0)) * healthScale / 12;
      const timed = sum(data.recurringCosts.filter(c => age >= c.startAge && age <= c.endAge).map(c => c.annualAmount * (c.inflationLinked ? scale(y) : 1) / 12));
      const matchingEvents = events.filter(e => e.month === b.month || e.kind==='expense'&&e.throughMonth&&b.month>e.month&&b.month<=e.throughMonth);
      const eventIncome = sum(matchingEvents.filter(e => e.kind === 'cashReceipt').map(e => e.amount!));
      const eventExpense = sum(matchingEvents.filter(e => e.kind === 'expense').map(e => e.amount!));
      eventTaxable += sum(matchingEvents.filter(e => e.kind === 'cashReceipt').map(e => e.taxableAmount!));
      cash += eventIncome;
      const regularSpending = essential + discretionary + housing + healthcare + timed + eventExpense + (debtRow?.principalPaid ?? 0) + (debtRow?.interestPaid ?? 0);
      const spending=regularSpending+mortgagePayoff;
      let withdrawals = payoffDraws+raiseCash(regularSpending);
      const regularPaid=Math.min(cash,regularSpending);cash-=regularPaid;
      const spendingPaid=regularPaid+mortgagePayoff;
      let savingsFunded = 0;
      let savingsToInvestments=0;
      for (const t of b.transfers.filter(t => t.source === 'takeHome')) {
        const available = Math.min(cash, t.amount); cash -= available; deposit(t.accountId, available); savingsFunded += available;
        if(data.accounts.find(a=>a.id===t.accountId)?.kind!=='cash')savingsToInvestments+=available;
      }
      if(payoff?.destination==='invest'&&debt!==originalDebt&&b.month>=payoff.month){
        releasedPaymentInvested=Math.min(cash,mortgagePaymentReleased(originalDebt,debt,monthIndex));
        cash-=releasedPaymentInvested;deposit(payoff.accountId,releasedPaymentInvested);
      }
      let investmentReturn = 0;
      const returnYear = overrides.returnYears?.find(r => r.year === year)?.rate;
      const annualRate = (returnYear ?? (b.youRetired && b.partnerRetired ? data.assumptions.retirementReturn : data.assumptions.preRetirementReturn)) / 100;
      const monthlyRate = Math.pow(Math.max(0.000001, 1 + annualRate), 1 / 12) - 1;
      for (const a of accounts) { const change = a.balance * monthlyRate; a.balance += change; investmentReturn += change; }
      const cashInterest = cash * nonnegative(data.assumptions.cashReturn) / 1200;
      cash += cashInterest; interest += cashInterest;
      let rmd = 0, qcd = 0, conversionRequested = 0, converted = 0, taxSettlement = 0, taxRefund = 0, unfundedTax = 0;
      if (m === 11) {
        for (const owner of ['you', 'partner'] as const) {
          if (owner === 'partner' && !married) continue;
          const r = calculateRmd({ birthYear: owner === 'you' ? data.household.birthYear : data.household.partnerBirthYear, calendarYear: year, age: getAge(owner, y), priorYearEndBalance: prior[owner] });
          if (r.status === 'needs-review') issues.add('An RMD rule requires review; unsupported birth-year/table cases are not ranked.');
          const eligible = accounts.filter(a => a.owner === owner && a.kind === 'traditional' && a.qcdEligibleIra);
          const election = calculateQcdElection({ taxYear: year, ageOnDistributionDate: getAge(owner, y), eligibleIraBalance: sum(eligible.map(a => a.balance)), requiredMinimumDistribution: Math.max(0, r.requiredDistribution - distributions[owner]), intendedDistribution: owner === 'you' ? data.qcdPlanning.annualGiftYou : data.qcdPlanning.annualGiftPartner, unusedDeductibleContributionOffset: qcdOffsets[owner] });
          if ((owner === 'you' ? data.qcdPlanning.annualGiftYou : data.qcdPlanning.annualGiftPartner)>0 && election.status!=='eligible') issues.add('A requested QCD is not currently supported by its entered age or eligible IRA balance.');
          let gift = election.distribution;
          for (const a of eligible) { const amount = Math.min(gift, a.balance); a.balance -= amount; gift -= amount; }
          qcd += election.distribution; qcdTaxable += election.taxableAmount; qcdOffsets[owner] = election.contributionOffsetRemaining;
          let remaining = Math.max(0, r.requiredDistribution - distributions[owner] - election.rmdSatisfied);
          for (const a of accounts.filter(a => a.kind === 'traditional' && a.owner === owner)) { const paid = distribute(a, remaining); remaining -= paid; rmd += paid; }
          if (remaining > 0.005) issues.add('Required distributions exceed remaining account funds.');
          const c = data.rothConversionPlanning;
          const begin = owner === 'you' ? c.startAgeYou : c.startAgePartner, end = owner === 'you' ? c.endAgeYou : c.endAgePartner;
          const requested = begin > 0 && getAge(owner, y) >= begin && getAge(owner, y) <= end ? nonnegative(owner === 'you' ? c.annualConversionYou : c.annualConversionPartner) : 0;
          conversionRequested += requested;
          const destination = accounts.find(a => a.kind === 'roth' && a.owner === owner);
          if (requested && !destination) issues.add('A planned conversion needs an owner-matched Roth destination account.');
          let left = requested;
          if (destination) for (const a of accounts.filter(a => a.kind === 'traditional' && a.owner === owner && a.conversionEligiblePretax)) {
            const amount = Math.min(a.balance, left); a.balance -= amount; destination.balance += amount; destination.lockedConversions.push({ amount, year }); left -= amount; converted += amount;
          }
          if (left > 0.005) issues.add('Some requested conversion dollars lack confirmed eligible pretax funds after distributions. IRA basis, inherited accounts and workplace eligibility require review.');
        }
        conversions += converted;
        // Full-year settlement, including extra gains/distributions needed to pay
        // the settlement itself. Withholding was already removed from net pay.
        for (let attempt = 0; attempt < 128; attempt++) {
          lastAssessment = tax();
          const due = Math.max(0, lastAssessment.total - withholding - taxSettlement);
          if (due <= 0.0001) break;
          withdrawals += raiseCash(due);
          const paid = Math.min(cash, due); cash -= paid; taxSettlement += paid;
          if (paid <= 0) break;
        }
        lastAssessment = tax();
        unfundedTax = Math.max(0, lastAssessment.total - withholding - taxSettlement);
        taxRefund = Math.max(0, withholding - lastAssessment.total); cash += taxRefund;
      }
      // End-of-month cash covers the next selected months, including the actual
      // due month of nonmonthly bills. A reserve allocation is never an expense.
      const coverageMonths=Math.min(nonnegative(settings.cashCoverageMonths),Math.max(0,yearsCount*12-monthIndex-1));
      let cashTarget=nonnegative(settings.reserveExtra);
      for(let next=1;next<=Math.ceil(coverageMonths);next++){
        const futureIndex=monthIndex+next,fy=Math.floor(futureIndex/12),fm=futureIndex%12;
        const future=calendar[fy]?.[fm];if(!future)break;
        const futureAge=data.household.currentAge+fy;
        const everyday=future.essential*scale(fy)*(1+(overrides.spendingChangePercent??0)/100);
        const futureHealth=((futureAge<65?data.healthcare.preMedicareAnnual:data.healthcare.medicareAnnual)+(futureAge>=data.healthcare.longTermCareStartAge&&futureAge<data.healthcare.longTermCareStartAge+data.healthcare.longTermCareYears?data.healthcare.longTermCareAnnual:0))*Math.pow(1+data.healthcare.healthInflation/100,fy)/12;
        const futureTimed=sum(data.recurringCosts.filter(c=>futureAge>=c.startAge&&futureAge<=c.endAge).map(c=>c.annualAmount*(c.inflationLinked?scale(fy):1)/12));
        const futureDebt=debt[futureIndex+1];
        const futureHousing=movedYear!==null&&homeMove?(homeMove.newMonthlyHousing!+(homeMove.newAnnualPropertyTax!+homeMove.newAnnualInsurance!)/12)*Math.pow(1+Math.max(-0.99,infl),startYear+fy-movedYear):(propertyTaxAnnual(data)+homeInsuranceAnnual(data))*scale(fy)/12+(statement&&futureDebt?.payments.some(p=>p.id===statement.debtId&&p.openingBalance>0)?nonnegative(statement.mortgageInsurance)+nonnegative(statement.otherEscrow):0);
        const dependable=settings.dependableIncomeSource==='benefits'?sum(data.income.filter(s=>(married||s.owner==='you')&&getAge(s.owner,fy)>=s.startAge).map(s=>s.annualAmount*Math.pow(1+s.cola/100,getAge(s.owner,fy)-s.startAge)/12)):nonnegative(settings.dependableIncomeMonthly);
        const futureEvents=sum(events.filter(e=>e.kind==='expense'&&(e.month===future.month||e.throughMonth&&future.month>e.month&&future.month<=e.throughMonth)).map(e=>e.amount!));
        const gap=Math.max(0,everyday+futureHousing+futureHealth+futureTimed+futureEvents+(futureDebt?.principalPaid??0)+(futureDebt?.interestPaid??0)-dependable);
        cashTarget+=gap*Math.min(1,coverageMonths-next+1);
      }
      // Refill through ordinary funded withdrawals. Taxes created after the
      // December settlement must not escape that settlement, so skip December.
      if (settings.refillCash && m !== 11) withdrawals += raiseCash(cashTarget);
      const closing = portfolio();
      if (spending-spendingPaid>0.005 && (debtRow?.principalPaid??0)+(debtRow?.interestPaid??0)>0) issues.add('A shortfall occurs while debt payments are scheduled; projected debt balances assume those payments are made and require review.');
      const externalChange = b.takeHome + pension + social + b.employeeSavings + b.employerSavings + eventIncome + investmentReturn + cashInterest + homeProceeds - spendingPaid - taxSettlement + taxRefund - qcd;
      const row: MonthlyRow = {openingCash,cashPayrollSavings,savingsToInvestments,incomeByOwner, month: b.month, age, openingPortfolio: opening, portfolio: closing, cash, investmentReturn, pay: b.takeHome, pension, socialSecurity: social, cashInterest, essential, discretionary, discretionaryReduction: reduction, housing, healthcare, timedCosts: timed, debtPrincipal: (debtRow?.principalPaid ?? 0)+mortgagePayoff, debtInterest: debtRow?.interestPaid ?? 0, spending, spendingPaid, unfundedSpending: spending - spendingPaid, taxSettlement, taxRefund, withholding: b.withholding+benefitWithholding, unfundedTax, requestedSavings: b.requestedSavings, savingsFunded, savingsUnfunded: b.requestedSavings - savingsFunded, payrollSavings: b.employeeSavings, employerSavings: b.employerSavings, withdrawals, rmd, conversionRequested, converted, charitableGift: qcd, eventIncome, eventExpense, cashTarget, bufferGap: Math.max(0, cashTarget - cash), liabilities: debtRow?.totalBalance ?? debt.at(-1)?.totalBalance ?? 0, conservationResidual: closing - opening - externalChange, accounts: Object.fromEntries(accounts.map(a => [a.id, a.balance])),mortgagePayoff,releasedPaymentInvested,homeProceeds,homeValue,coverageMonths,totalNetWorth:closing+homeValue-(debtRow?.totalBalance??debt.at(-1)?.totalBalance??0) };
      months.push(row);
    }
    const rows = months.slice(-12);
    years.push({ year, portfolio: portfolio(), cash, income: sum(rows.map(r => r.pay + r.pension + r.socialSecurity + r.eventIncome + r.cashInterest)), spending: sum(rows.map(r => r.spending)), taxes: lastAssessment.total, taxPaid: sum(rows.map(r => r.taxSettlement)) + withholding, taxRefund: sum(rows.map(r => r.taxRefund)), withholding, unfunded: sum(rows.map(r => r.unfundedSpending + r.unfundedTax)), savings: sum(rows.map(r => r.savingsFunded + r.payrollSavings + r.employerSavings)), converted: conversions, conversionRequested: sum(rows.map(r => r.conversionRequested)), federalTax: lastAssessment.federal, stateTax: lastAssessment.state, capitalGainsTax: lastAssessment.capital, earlyTax: lastAssessment.early, financialNetWorth:portfolio()-rows.at(-1)!.liabilities,totalNetWorth:portfolio()+homeValue-rows.at(-1)!.liabilities });
  }
  if (calendar.some(ms => ms.some(m => m.averageSchedules > 0))) issues.add('Undated recurring amounts use monthly averages; dated bills and pay use their scheduled months.');
  const blockers = [...issues].filter(s => !s.startsWith('Undated'));
  const legacyTarget = settings.legacyTarget === null ? null : settings.legacyTarget * (settings.legacyRealDollars ? scale(yearsCount - 1) : 1);
  return { months, years, issues: [...issues], supported: blockers.length === 0, firstShortfall: months.find(m => m.unfundedSpending + m.unfundedTax > 0.005)?.month ?? null, legacyTarget, legacyGap: legacyTarget === null ? null : Math.max(0, legacyTarget - portfolio()) };
}
