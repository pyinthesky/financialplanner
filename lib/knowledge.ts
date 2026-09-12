/** Reviewed educational copy; no plan inputs, remote search or personalized advice. */
export const KNOWLEDGE_REVIEWED = '2026-09-12';
export const KNOWLEDGE_CATEGORIES = ['All Topics', 'Everyday Planning', 'Investing', 'Health & Benefits', 'Family & Future'] as const;
export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];
export type Guide = {
  id: string; category: Exclude<KnowledgeCategory, 'All Topics'>; title: string;
  summary: string; points: string[]; next: string; inPlanner: string;
  sources: { label: string; url: string; edition: string }[];
};

export const KNOWLEDGE_GUIDES: readonly Guide[] = [
  {
    id: 'budget-buffer', category: 'Everyday Planning', title: 'Build a Budget You Can Live With',
    summary: 'Separate regular bills, occasional costs and the cash that helps you handle surprises.',
    points: [
      'Start with take-home income and bills you recognize. Annual premiums, repairs and travel need a place too; a monthly average helps you plan, while the due month explains when cash is needed.',
      'For retirement, carry forward what stays, remove costs that end and change the things you want to do differently. Keep healthcare, housing and debt linked to their source sections so they are counted once.',
      'An emergency fund covers unexpected expenses or lost income. Its size depends on your circumstances. Compare essential expenses, dependable income, insurance exposure and how quickly you could replace lost pay instead of treating one number of months as universal.',
    ],
    next: 'Choose one missing bill to add, then compare your current and retirement months. Build a cash reserve gradually if a large target feels out of reach.',
    inPlanner: 'Current Budget → Retirement Budget → Plan Summary. Scenario Laboratory shows the selected cash-coverage target.',
    sources: [{label: 'CFPB: Building an Emergency Fund', url: 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/', edition: 'General consumer guidance'}],
  },
  {
    id: 'debt-cascade', category: 'Everyday Planning', title: 'Make Debt Payments Build Momentum',
    summary: 'Understand Snowball, Avalanche and what happens when a loan is paid off.',
    points: [
      'Snowball targets the smallest balance first, creating earlier payoff milestones. Avalanche targets the highest interest rate first and generally reduces interest more when the same payment budget is maintained. Choose a plan you can sustain.',
      'Keep paying the other required minimums. When one debt ends, roll its freed payment into the next target. In this app both strategies retain that budget; Custom uses the assigned extras without rollover.',
      'A mortgage statement may include property tax, insurance or other escrow charges. Only principal and interest repay the loan. Those housing costs can continue after payoff. Total debt need not form an exponential curve: with zero interest and steady payments, it falls in a straight line.',
    ],
    next: 'Enter principal-and-interest payments separately from escrow, then compare strategies with the same total monthly payment budget.',
    inPlanner: 'Loans & Debts sets the baseline. Plan Summary explains transfers; Scenario Laboratory lets you experiment.',
    sources: [{label: 'CFPB: Debt Reduction Strategies', url: 'https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/', edition: 'July 16, 2019; general strategy guidance'}],
  },
  {
    id: 'advisor-fees', category: 'Investing', title: 'Choose an Advisor and Understand the Bill',
    summary: 'Check registration, conflicts, services and the annual cost in dollars.',
    points: [
      'Search both the person and firm in the official SEC Investment Adviser Public Disclosure (IAPD) system. Review current registration, disclosures and Form ADV; use FINRA BrokerCheck for brokerage history. RIA means registered investment adviser. Registration is not an endorsement or a performance guarantee.',
      'Ask whether they act as a fiduciary for every service you are buying, how they are compensated, and what conflicts exist. Read the relationship summary (Form CRS, where applicable), advisory brochure and written agreement. Confirm the record and contact details belong to the person you intend to hire.',
      'Compare an hourly or fixed planning fee with an ongoing assets-under-management fee for the same work. Add fund expenses, custody and transaction charges. For illustration, 1% of $100,000 is $1,000 a year before other costs; this is not a recommended rate. There is no universal reasonable fee: ask what you receive and compare written quotes.',
    ],
    next: 'Request an all-in annual dollar estimate and a written list of deliverables. Decide whether you need ongoing management, occasional planning, or can manage a simple portfolio yourself.',
    inPlanner: 'Cash & Investments organizes your assets. The planner does not verify an advisor or recommend a provider.',
    sources: [
      {label: 'SEC: IAPD Registration Search', url: 'https://adviserinfo.sec.gov/', edition: 'Live SEC/state registration records'},
      {label: 'SEC: Checking an Investment Professional', url: 'https://www.investor.gov/introduction-investing/getting-started/working-investment-professional/check-out-your-investment-professional', edition: 'General investor guidance'},
      {label: 'SEC: Understanding Fees', url: 'https://www.investor.gov/introduction-investing/getting-started/understanding-fees', edition: 'General investor guidance'},
    ],
  },
  {
    id: 'simple-investing', category: 'Investing', title: 'Keep Investing Understandable',
    summary: 'Diversification, costs and a suitable stock/bond mix matter more than product complexity.',
    points: [
      'An index fund follows a specified index. Broad funds can spread exposure across many holdings, but a narrow sector index can still be concentrated. Index funds can lose money; indexing does not eliminate market risk.',
      'Look at the whole portfolio across accounts. Your mix of stocks, bonds and cash should reflect when you need the money and the losses you can tolerate. Holding several funds with the same underlying investments does not necessarily diversify you.',
      'Compare expense ratios and other costs. A small set of broad, low-cost funds can be a useful starting point for a self-managed portfolio, but neither a fund label nor a higher advisory fee guarantees better results. Complex tax or family decisions may warrant separate professional help.',
    ],
    next: 'Write down what each holding does, its cost, and when you expect to use the money. Test lower returns before increasing risk to make a projection look better.',
    inPlanner: 'Cash & Investments records tax treatment. Household reference buttons are optional historical illustrations; Scenario Laboratory tests assumptions.',
    sources: [
      {label: 'SEC: Index Funds', url: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-4', edition: 'General investor guidance'},
      {label: 'SEC: Asset Allocation and Diversification', url: 'https://www.investor.gov/introduction-investing/getting-started/asset-allocation', edition: 'General investor guidance'},
    ],
  },
  {
    id: 'health-options', category: 'Health & Benefits', title: 'Compare the Whole Health Plan',
    summary: 'A lower premium is only one part of the decision, especially with family coverage.',
    points: [
      'Compare annual premiums plus the care and prescriptions each person is likely to need. Use insurer-negotiated allowed charges when estimating deductible costs; last year’s personal out-of-pocket bill is a different number.',
      'Check individual and family deductibles and out-of-pocket limits. An embedded structure gives a person their own threshold within family coverage; an aggregate family deductible works differently. Ask how prescriptions count toward each limit. Premiums, excluded care and many out-of-network charges are outside the plan’s out-of-pocket maximum.',
      'Compare providers, prescription coverage and affordability in a high-use year as well as expected cost. Medical bills can arrive after an explanation of benefits (EOB); an EOB is not itself a bill. Pharmacy costs may be due immediately. Follow actual payment terms even if the planning estimate uses a delay.',
    ],
    next: 'Collect the benefit summary, employee premium, provider network and formulary. Enter each person’s expected care once, then compare the same needs across plans.',
    inPlanner: 'Open Enrollment compares plans, separate household coverage groups, employer incentives and cash timing.',
    sources: [
      {label: 'HealthCare.gov: Total Health Plan Costs', url: 'https://www.healthcare.gov/choose-a-plan/your-total-costs/', edition: 'General plan-comparison guidance'},
      {label: 'HealthCare.gov: Out-of-Pocket Limits', url: 'https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/', edition: 'General definitions; consult the selected plan year'},
      {label: 'CMS: Reading an Explanation of Benefits', url: 'https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/medical-bill-guides-resources/how-read-health-insurance-explanation-benefits', edition: 'Updated August 25, 2026'},
    ],
  },
  {
    id: 'hsa', category: 'Health & Benefits', title: 'Use an HSA Deliberately',
    summary: 'Separate tax benefits, owned savings and money available to pay a bill today.',
    points: [
      'HSA contribution eligibility depends on coverage and other conditions, not just a high deductible. Check the applicable year’s rules, other coverage and Medicare enrollment before contributing. Employer contributions count toward the applicable contribution limit.',
      'An HSA belongs to you and unused balances carry forward. Personal contributions transfer your money into savings; they are not a discount on medical care. Employer funding and eligible tax savings change the comparison separately.',
      'Keep records for qualified expenses incurred after the HSA was established. Do not claim the same expense twice or both reimburse and deduct it. Investing may suit money you will not need soon, but bills can arrive before contributions or reimbursements. Medicare enrollment can affect eligibility, including retroactive coverage; review timing before making contributions near enrollment.',
    ],
    next: 'Keep near-term bill money accessible, confirm eligibility and save receipts securely outside this app. Compare HSA and other plan options rather than assuming either wins.',
    inPlanner: 'Open Enrollment models selected funding, tax savings and delays. It does not establish contribution eligibility or implement a complete retirement HSA strategy.',
    sources: [{label: 'IRS Publication 969', url: 'https://www.irs.gov/publications/p969', edition: '2025 publication; general HSA principles, not a 2026 limit table'}],
  },
  {
    id: 'benefits-timing', category: 'Health & Benefits', title: 'Separate Retirement From Benefit Start Dates',
    summary: 'Stopping work and starting Social Security or a pension are separate decisions.',
    points: [
      'Social Security retirement benefits can generally begin at 62, with a reduction for claiming before full retirement age. Full retirement age depends on birth year. A household comparison should also consider the other spouse and the years when only one benefit is received.',
      'Use your own Social Security statement and pension estimates for the dates you are considering. Benefit taxation, work income, health coverage and the cash needed before payments begin can change the practical choice.',
      'Compare more than one lifespan and spending path. The largest monthly payment is not by itself a complete household strategy, and this planner currently relies on entered benefits rather than automatically optimizing claiming.',
    ],
    next: 'Obtain benefit estimates for alternative start dates and check how the budget is funded between leaving work and receiving benefits.',
    inPlanner: 'Pensions & Social Security holds entered estimates. Scenario Laboratory explores retirement timing with the supported benefit assumptions.',
    sources: [{label: 'SSA: Retirement Age and Benefit Reduction', url: 'https://www.ssa.gov/benefits/retirement/planner/agereduction.html', edition: 'Birth-year-dependent retirement rules'}],
  },
  {
    id: 'estate-preparation', category: 'Family & Future', title: 'Make Your Wishes Easier to Carry Out',
    summary: 'Understand the jobs of a will, financial authority and healthcare instructions.',
    points: [
      'A will describes how your estate should be handled after death and can address care for dependents. A durable financial power of attorney addresses decisions while you are alive but unable to manage them. Healthcare directives address treatment and who speaks for you.',
      'A living trust can help manage and distribute property, but it is not automatically needed by every household. The right documents and signing rules depend on your jurisdiction and family circumstances. Ask about dependent care, disability-related planning and property held in multiple states where relevant.',
      'Search for an estate-planning lawyer licensed in your state, using your state bar directory or local legal-aid resources. Ask about relevant experience, the scope of the documents, updates, and the total fee. No provider is endorsed here.',
    ],
    next: 'Make a private list of documents you already have and questions to resolve. Tell a trusted person where the signed originals are kept; do not upload identity or estate documents here.',
    inPlanner: 'Knowledge Center offers preparation guidance, not document drafting or a determination of which trust or will you need.',
    sources: [
      {label: 'NIA: Documents to Prepare for the Future', url: 'https://www.nia.nih.gov/health/advance-care-planning/getting-your-affairs-order-checklist-documents-prepare-future', edition: 'Reviewed February 1, 2023; general preparation guidance'},
      {label: 'CFPB: Financial Power of Attorney', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-power-of-attorney-poa-en-1149/', edition: 'General consumer guidance; local law governs'},
    ],
  },
  {
    id: 'healthy-aging', category: 'Family & Future', title: 'Plan for Health and Independence',
    summary: 'Build a retirement you want to live, while keeping healthcare uncertainty in the budget.',
    points: [
      'Physical activity can support sleep, mood, strength and everyday function. Activities suited to your abilities, including strength and balance work, can help support independence as you age.',
      'Plan time and money for activities you enjoy and can sustain. Discuss suitable changes with your care team when health conditions or mobility needs affect what is practical.',
      'Healthy habits do not guarantee low medical costs or eliminate the need for care. This planner does not convert lifestyle choices into promised savings or reduce your healthcare reserve automatically. A longer life can also mean more years of spending.',
    ],
    next: 'Choose one sustainable activity, then stress-test a longer retirement and a higher-care-cost period separately.',
    inPlanner: 'Health & Long-Term Care records cost assumptions. Scenario Laboratory can compare supported longevity and care-cost changes.',
    sources: [{label: 'CDC: Benefits of Physical Activity', url: 'https://www.cdc.gov/physical-activity-basics/benefits/index.html', edition: 'December 4, 2025'}],
  },
];

export function findGuides(query: string, category: KnowledgeCategory = 'All Topics'): Guide[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return KNOWLEDGE_GUIDES.filter(guide => {
    if (category !== 'All Topics' && guide.category !== category) return false;
    const text = [guide.title, guide.summary, ...guide.points, guide.next, guide.inPlanner, ...guide.sources.map(s => s.label)].join(' ').toLocaleLowerCase();
    return words.every(word => text.includes(word));
  });
}
