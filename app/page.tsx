"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BriefcaseBusiness, Building2, Calculator, ChevronRight, CircleDollarSign, Download, FileUp, HeartPulse, Home, Landmark, Lock, LockKeyhole, Menu, Plus, Printer, ReceiptText, ShieldCheck, Trash2, Unlock, WalletCards } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { ScenarioLaboratory, MonthlyResults, MonthlyPrintReport } from '@/components/scenario-laboratory';
import { projectMonthly } from '@/lib/monthly-projection';
import { BudgetEditor } from "@/components/budget-editor";
import { DebtCascade } from "@/components/debt-cascade";
import { MortgageStatementEditor } from "@/components/mortgage-statement";
import { homeInsuranceAnnual, mortgageAncillaryAnnual } from "@/lib/planner";
import { applyInflationReference, canUndoInflationReference, INFLATION_REFERENCE, inflationReferenceValue } from "@/lib/references";
import { annualize, budgetTotals, retirementAmount } from "@/lib/budget";
import { NumericInput } from "@/components/numeric-input";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_PLAN, debtPayoffSchedule, estimateSuccessRate, normalizePlan, projectPlan, propertyTaxAnnual, totalPortfolio, type Account, type Debt, type IncomeStream, type PlannerData, type RecurringCost } from "@/lib/planner";
import { calculateFederalIncomeTax, type FilingStatus } from "@/lib/federal-tax";
import { compareRothConversion } from "@/lib/roth-conversion";
import { calculateMedicareIrmaa, type IrmaaFilingCategory } from "@/lib/medicare-irmaa";
import { calculateAcaPremiumTaxCredit, type PovertyGuidelineLocation } from "@/lib/aca-ptc";
import { calculateCapitalGainsTax } from "@/lib/capital-gains-tax";
import { buildPrintPortfolioChart, PRINT_PORTFOLIO_SERIES } from "@/lib/print-chart";
import { buildPlanningSignals } from "@/lib/planning-signals";
import { calculateQcdCapacity, type QcdCapacityStatus } from "@/lib/qcd";
import { decryptPlan, encryptPlan } from "@/lib/vault";

type SectionId = "scenarios" | "overview" | "household" | "currentBudget" | "retirementBudget" | "portfolio" | "income" | "spending" | "debt" | "health" | "taxes" | "data";
type VaultStatus = "off" | "locked" | "unlocked";
type SaveStatus = "unsaved" | "locked" | "saving" | "saved" | "failed";

const VAULT_KEY = "open-retirement-planner-vault-v1";
const sections: { id: SectionId; label: string; icon: typeof Activity }[] = [
  { id: "data", label: "Data & Privacy", icon: ShieldCheck },
  { id: "household", label: "Household", icon: Home },
  { id: "currentBudget", label: "Current Budget", icon: ReceiptText },
  { id: "retirementBudget", label: "Retirement Budget", icon: ReceiptText },
  { id: "portfolio", label: "Accounts", icon: BriefcaseBusiness },
  { id: "income", label: "Pensions & Social Security", icon: Landmark },
  { id: "spending", label: "Spending & Housing", icon: ReceiptText },
  { id: "debt", label: "Debt Payoff", icon: WalletCards },
  { id: "health", label: "Health & Long-Term Care", icon: HeartPulse },
  { id: "taxes", label: "Taxes & Withdrawals", icon: Calculator },
  { id: "scenarios", label: "Scenario Laboratory", icon: Activity },
  { id: "overview", label: "Plan Summary", icon: Activity },
];

const portfolioChartConfig = {
  taxable: { label: "Taxable", color: "#2f7df4" },
  traditional: { label: "Tax-Deferred", color: "#11a68a" },
  roth: { label: "Roth", color: "#8567e8" },
  cash: { label: "Cash", color: "#e8a82b" },
  hsa: { label: "HSA", color: "#dc5d79" },
} satisfies ChartConfig;
const cashFlowConfig = {
  income: { label: "Guaranteed Income", color: "#11a68a" },
  withdrawals: { label: "Portfolio Withdrawals", color: "#2f7df4" },
  spending: { label: "Planned Spending", color: "#d66b36" },
} satisfies ChartConfig;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const qcdStatusCopy: Record<QcdCapacityStatus, string> = {
  eligible: "Potentially eligible",
  "age-date-review": "Confirm the distribution date",
  underage: "Not yet age-eligible",
  "no-eligible-ira": "No eligible IRA identified",
  "unsupported-year": "Law update required",
};

type AffixedNumericInputProps = React.ComponentProps<typeof NumericInput> & {
  prefix?: string;
  suffix?: string;
};

function AffixedNumericInput({ prefix, suffix, ...props }: AffixedNumericInputProps) {
  return (
    <div className="input-affix">
      {prefix && <span>{prefix}</span>}
      <NumericInput {...props} />
      {suffix && <span>{suffix}</span>}
    </div>
  );
}

function Field({ label, value, onChange, prefix, suffix, min = 0, max, step = 1, help }: { label: string; value: number; onChange: (value: number) => void; prefix?: string; suffix?: string; min?: number; max?: number; step?: number; help?: string }) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="field-stack">
      <Label htmlFor={id}>{label}</Label>
      <AffixedNumericInput id={id} min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.valueAsNumber || 0)} prefix={prefix} suffix={suffix} />
      {help && <p className="field-help">{help}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const id = `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="field-stack">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)} className="w-full">
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function SectionHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="section-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Panel({ title, eyebrow, children, className = "" }: { title?: string; eyebrow?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`planner-panel ${className}`}>
      {(title || eyebrow) && (
        <div className="panel-title">
          {eyebrow && <span>{eyebrow}</span>}
          {title && <h2>{title}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function PlannerNavigation({ activeSection, onSelect }: { activeSection: SectionId; onSelect: (section: SectionId) => void }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {sections.map((section) => (
        <SidebarMenuItem key={section.id}>
          <SidebarMenuButton
            isActive={activeSection === section.id}
            aria-current={activeSection === section.id ? "page" : undefined}
            onClick={() => {
              onSelect(section.id);
              if (isMobile) setOpenMobile(false);
            }}
          >
            <section.icon />
            <span>{section.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function PrintReport({ data, projection, successRate, debtMonths }: { data: PlannerData; projection: ReturnType<typeof projectPlan>; successRate: number; debtMonths: number }) {
  if (data.laboratory?.settings.enabled) return <article className="print-report"><header className="report-header"><h1>Retirement Plan Summary</h1><p>Monthly Engine</p></header><MonthlyPrintReport plan={data} result={projectMonthly(data)}/><footer>Local-only educational planning estimate. See Scenario Laboratory for tax, benefit and account-access limitations.</footer></article>;
  const retirement = projection.find((row) => row.age === data.household.retirementAge) ?? projection[0];
  const last = projection.at(-1)!;
  const printChart = buildPrintPortfolioChart(projection);
  const retirementIndex = Math.max(0, projection.findIndex((row) => row.age >= data.household.retirementAge));
  const retirementX = printChart.xPositions[retirementIndex] ?? printChart.plot.left;
  return (
    <article className="print-report" aria-hidden="true">
      <header className="report-header">
        <div>
          <span>OPEN RETIREMENT PLANNER</span>
          <h1>Retirement Plan Summary</h1>
        </div>
        <p>Generated {new Date().toLocaleDateString()}</p>
      </header>
      <div className="report-metrics">
        <div>
          <span>Monte Carlo range</span>
          <strong>{buildPlanningSignals(data, { payoffMonths: debtMonths }).ready ? `${successRate}%` : 'Needs Inputs'}</strong>
        </div>
        <div>
          <span>Portfolio today</span>
          <strong>{compactCurrency.format(totalPortfolio(data))}</strong>
        </div>
        <div>
          <span>At retirement</span>
          <strong>{compactCurrency.format(retirement.portfolio)}</strong>
        </div>
        <div>
          <span>At age {last.age}</span>
          <strong>{compactCurrency.format(last.portfolio)}</strong>
        </div>
      </div>
      {data.budget.lines.length > 0 && <section className="report-budget">
        <h2>Current & Retirement Everyday Budget</h2>
        <p>Monthly averages in today's dollars. Housing, debt and entered healthcare remain separate. Projection uses {data.budget.retirementSpendingSource === 'worksheet' ? 'the linked worksheet' : 'the legacy aggregate baseline'}.</p>
        <table><thead><tr><th>Cost</th><th>Current / Month</th><th>Retirement / Month</th><th>Choice</th></tr></thead><tbody>{data.budget.lines.map(line => <tr key={line.id}><td>{line.name || line.category}</td><td>{line.retirement.rule === 'retirementOnly' ? currency.format(0) : line.amount === null ? 'Not Entered' : currency.format(annualize(line.amount, line.frequency)! / 12)}</td><td>{retirementAmount(line) === null ? 'Not Entered' : currency.format(annualize(retirementAmount(line), line.frequency)! / 12)}</td><td>{line.retirement.rule}</td></tr>)}</tbody></table>
        <p>Everyday retirement total: {currency.format(budgetTotals(data.budget, true).spending)} / year. Budget timing and net pay are not yet a complete working-year tax projection.</p>
      </section>}
      <section className="report-chart">
        <h2>Portfolio Projection</h2>
        <svg className="report-portfolio-chart" viewBox={`0 0 ${printChart.width} ${printChart.height}`} role="img" aria-labelledby="print-portfolio-chart-title">
          <title id="print-portfolio-chart-title">Stacked portfolio projection by tax treatment</title>
          {printChart.gridLines.map((line) => (
            <g key={line.y}>
              <line x1={printChart.plot.left} x2={printChart.plot.right} y1={line.y} y2={line.y} stroke="#e3e9f1" strokeWidth="1" />
              <text x={printChart.plot.left - 9} y={line.y + 3} textAnchor="end" fill="#718096" fontSize="10">{compactCurrency.format(line.value)}</text>
            </g>
          ))}
          {printChart.polygons.filter((series) => projection.some(row => row[series.key] > 0)).map((series) => (
            <g key={series.key}>
              <polygon points={series.points} fill={series.color} fillOpacity="0.76" />
              <polyline points={series.topPoints} fill="none" stroke={series.color} strokeWidth="1.2" />
            </g>
          ))}
          <line x1={retirementX} x2={retirementX} y1={printChart.plot.top} y2={printChart.plot.bottom} stroke="#17243b" strokeDasharray="4 4" strokeWidth="1" />
          <text x={Math.min(retirementX + 5, printChart.plot.right - 32)} y={printChart.plot.top + 11} fill="#17243b" fontSize="10">Retire</text>
          {printChart.ageTicks.map((tick) => (
            <text key={tick.age} x={tick.x} y={printChart.height - 14} textAnchor="middle" fill="#718096" fontSize="10">Age {tick.age}</text>
          ))}
        </svg>
        <div className="report-chart-legend" aria-hidden="true">
          {PRINT_PORTFOLIO_SERIES.map((series) => (
            <span key={series.key}><i style={{ background: series.color }} />{series.label}</span>
          ))}
        </div>
      </section>
      <div className="report-grid">
        <section>
          <h2>Household Assumptions</h2>
          <dl>
            <div>
              <dt>Retirement age</dt>
              <dd>{data.household.retirementAge}</dd>
            </div>
            <div>
              <dt>Plan through age</dt>
              <dd>{data.household.planToAge}</dd>
            </div>
            <div>
              <dt>Annual retirement spending</dt>
              <dd>{currency.format(data.budget.retirementSpendingSource === 'worksheet' ? budgetTotals(data.budget, true).spending : data.assumptions.annualSpending)}</dd>
            </div>
            <div>
              <dt>Inflation / return</dt>
              <dd>
                {data.assumptions.inflation}% / {data.assumptions.retirementReturn}%
              </dd>
            </div>
          </dl>
        </section>
        <section>
          <h2>Planning Notes</h2>
          <ul>
            <li>
              Debt strategy: {data.debtStrategy.method}; projected payoff in {debtMonths} months.
            </li>
            <li>Tax-deferred withdrawals fill ordinary income toward {currency.format(data.assumptions.targetOrdinaryIncome)} before other withdrawals.</li>
            <li>Healthcare and long-term care are modeled separately from baseline spending.</li>
          </ul>
        </section>
      </div>
      <footer>This is an educational estimate, not tax, investment, legal, or medical advice. Values are nominal and depend on the assumptions entered.</footer>
    </article>
  );
}

export default function HomePage() {
  const [plan, setPlan] = useState<PlannerData>(DEFAULT_PLAN);
  const [activeSection, setActiveSection] = useState<SectionId>("data");
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("off");
  const [vaultOpen, setVaultOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [vaultError, setVaultError] = useState("");
  const [saveState, setSaveState] = useState("Blank plan — not saved");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");
  const [confirmErase, setConfirmErase] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const passphraseRef = useRef("");

  useEffect(() => {
    if (localStorage.getItem(VAULT_KEY)) {
      setVaultStatus("locked");
      setSaveStatus("locked");
      setSaveState("Local vault locked");
    }
  }, []);
  useEffect(() => {
    if (vaultStatus !== "unlocked" || !passphraseRef.current) return;
    setSaveStatus("saving");
    setSaveState("Saving encrypted…");
    const timer = window.setTimeout(async () => {
      try {
        localStorage.setItem(VAULT_KEY, await encryptPlan(plan, passphraseRef.current));
        setSaveStatus("saved");
        setSaveState("Saved locally — encrypted");
      } catch {
        setSaveStatus("failed");
        setSaveState("Could not save vault");
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [plan, vaultStatus]);

  const projection = useMemo(() => projectPlan(plan), [plan]);
  const projectionWithoutPlannedConversions = useMemo(() => {
    const baseline = structuredClone(plan);
    baseline.rothConversionPlanning.annualConversionYou = 0;
    baseline.rothConversionPlanning.annualConversionPartner = 0;
    return projectPlan(baseline);
  }, [plan]);
  const debtSchedule = useMemo(() => debtPayoffSchedule(plan), [plan]);
  const successRate = useMemo(() => estimateSuccessRate(plan), [plan]);
  const fullRetirementAge = Math.max(plan.household.retirementAge, plan.household.maritalStatus === "married" ? plan.household.currentAge + Math.max(0, plan.household.partnerRetirementAge - plan.household.partnerAge) : plan.household.retirementAge);
  const retirementRow = projection.find((row) => row.age === fullRetirementAge) ?? projection[0];
  const finalRow = projection.at(-1)!;
  const shortfall = projection.find((row) => row.age >= fullRetirementAge && row.fundedRatio < 0.995);
  const payoffMonths = debtSchedule.at(-1)?.month ?? 0;
  const planningSignalSummary = buildPlanningSignals(plan, {
    shortfallAge: shortfall?.age,
    payoffMonths,
  });
  const totalDebt = plan.debts.reduce((sum, debt) => sum + debt.balance, 0);

  const setHousehold = (key: keyof PlannerData["household"], value: string | number | boolean) =>
    setPlan((current) => ({
      ...current,
      household: { ...current.household, [key]: value },
    }));
  const setAssumption = (key: keyof PlannerData["assumptions"], value: number) =>
    setPlan((current) => ({
      ...current,
      inflationReference: key === 'inflation' ? undefined : current.inflationReference,
      assumptions: { ...current.assumptions, [key]: value },
    }));
  const setHousing = <K extends keyof PlannerData["housing"]>(key: K, value: PlannerData["housing"][K]) =>
    setPlan((current) => ({
      ...current,
      housing: { ...current.housing, [key]: value },
    }));
  const setHealthcare = (key: keyof PlannerData["healthcare"], value: number) =>
    setPlan((current) => ({
      ...current,
      healthcare: { ...current.healthcare, [key]: value },
    }));
  const setQcdPlanning = (key: keyof PlannerData["qcdPlanning"], value: number) =>
    setPlan((current) => ({
      ...current,
      qcdPlanning: { ...current.qcdPlanning, [key]: value },
    }));
  const setEarlyWithdrawalPlanning = (
    key: keyof PlannerData["earlyWithdrawalPlanning"],
    value: number,
  ) =>
    setPlan((current) => ({
      ...current,
      earlyWithdrawalPlanning: {
        ...current.earlyWithdrawalPlanning,
        [key]: value,
      },
    }));
  const setRothConversionPlanning = (
    key: keyof PlannerData["rothConversionPlanning"],
    value: number,
  ) =>
    setPlan((current) => ({
      ...current,
      rothConversionPlanning: {
        ...current.rothConversionPlanning,
        [key]: value,
      },
    }));
  const setMedicareIrmaaPlanning = (
    key: keyof PlannerData["medicareIrmaaPlanning"],
    value: number | PlannerData["medicareIrmaaPlanning"]["filingCategory"],
  ) =>
    setPlan((current) => ({
      ...current,
      medicareIrmaaPlanning: {
        ...current.medicareIrmaaPlanning,
        [key]: value,
      },
    }));
  const setAcaPlanning = (
    key: keyof PlannerData["acaPlanning"],
    value: number | PlannerData["acaPlanning"]["location"],
  ) =>
    setPlan((current) => ({
      ...current,
      acaPlanning: { ...current.acaPlanning, [key]: value },
    }));
  const setCapitalGainsPlanning = (
    key: keyof PlannerData["capitalGainsPlanning"],
    value: number,
  ) =>
    setPlan((current) => ({
      ...current,
      capitalGainsPlanning: {
        ...current.capitalGainsPlanning,
        [key]: value,
      },
    }));
  const updateAccount = (id: string, patch: Partial<Account>) =>
    setPlan((current) => ({
      ...current,
      accounts: current.accounts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const updateIncome = (id: string, patch: Partial<IncomeStream>) =>
    setPlan((current) => ({
      ...current,
      income: current.income.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const updateDebt = (id: string, patch: Partial<Debt>) =>
    setPlan((current) => ({
      ...current,
      debts: current.debts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const updateCost = (id: string, patch: Partial<RecurringCost>) =>
    setPlan((current) => ({
      ...current,
      recurringCosts: current.recurringCosts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `retirement-plan-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      setPlan(normalizePlan(JSON.parse(await file.text())));
      if (vaultStatus === "unlocked") {
        setSaveStatus("saving");
        setSaveState("Imported — saving encrypted…");
      } else {
        setSaveStatus("unsaved");
        setSaveState("Imported — not saved locally");
      }
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : "The selected file could not be imported.");
      setVaultOpen(true);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const unlockOrCreateVault = async () => {
    setVaultError("");
    try {
      const existing = localStorage.getItem(VAULT_KEY);
      if (existing) setPlan(normalizePlan(await decryptPlan(existing, passphrase)));
      else localStorage.setItem(VAULT_KEY, await encryptPlan(plan, passphrase));
      passphraseRef.current = passphrase;
      setVaultStatus("unlocked");
      setSaveStatus("saved");
      setSaveState("Saved locally — encrypted");
      setPassphrase("");
      setVaultOpen(false);
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : "Unable to open the vault.");
    }
  };
  const lockVault = () => {
    passphraseRef.current = "";
    setVaultStatus("locked");
    setSaveStatus("locked");
    setSaveState("Local vault locked");
  };
  const eraseVault = () => {
    localStorage.removeItem(VAULT_KEY);
    passphraseRef.current = "";
    setVaultStatus("off");
    setSaveStatus("unsaved");
    setSaveState("Local vault erased — current plan remains open");
    setConfirmErase(false);
  };

  const renderOverview = () => (
    <>
      <SectionHeading title="Plan Summary" description="A living projection from today through the end of your planning horizon." />
      {projection.some((row) => row.unfundedTaxes > 0.01) && <div className="notice" role="status">The projection has {currency.format(projection.reduce((sum, row) => sum + row.unfundedTaxes, 0))} in unpaid modeled taxes. A remaining account balance does not necessarily mean those taxes can be funded under the withdrawal rules.</div>}
      <div className="metric-grid">
        <div className="metric-card primary-metric">
          <span>{planningSignalSummary.ready ? "Plan range" : "Plan readiness"}</span>
          <strong>{planningSignalSummary.ready ? `${successRate}%` : "Needs inputs"}</strong>
          <p>{planningSignalSummary.ready ? "240 simulated market paths" : "Complete the priorities below"}</p>
        </div>
        <div className="metric-card">
          <span>Portfolio today</span>
          <strong>{compactCurrency.format(totalPortfolio(plan))}</strong>
          <p>Across {plan.accounts.length} accounts</p>
        </div>
        <div className="metric-card">
          <span>At full retirement</span>
          <strong>{compactCurrency.format(retirementRow.portfolio)}</strong>
          <p>Age {fullRetirementAge}</p>
        </div>
        <div className="metric-card">
          <span>At plan end</span>
          <strong>{compactCurrency.format(finalRow.portfolio)}</strong>
          <p>Age {finalRow.age}, nominal dollars</p>
        </div>
      </div>
      <div className="overview-grid">
        <Panel title="Portfolio by Tax Treatment" eyebrow="LONG-RANGE VIEW" className="chart-panel wide-panel">
          <ChartContainer config={portfolioChartConfig} className="h-[340px] w-full aspect-auto">
            <AreaChart data={projection} margin={{ top: 12, right: 10, left: 6, bottom: 0 }}>
              <defs>
                {Object.entries(portfolioChartConfig).map(([key, item]) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={item.color} stopOpacity={0.78} />
                    <stop offset="95%" stopColor={item.color} stopOpacity={0.4} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="age" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={70} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <>
                        <span className="text-muted-foreground">{portfolioChartConfig[name as keyof typeof portfolioChartConfig]?.label}</span>
                        <span className="ml-auto font-mono font-medium">{currency.format(Number(value))}</span>
                      </>
                    )}
                  />
                }
              />
              <Area name="Tax-Deferred" type="monotone" dataKey="traditional" stackId="portfolio" fill="url(#fill-traditional)" stroke="var(--color-traditional)" />
              <Area name="Taxable" type="monotone" dataKey="taxable" stackId="portfolio" fill="url(#fill-taxable)" stroke="var(--color-taxable)" />
              <Area name="Roth" type="monotone" dataKey="roth" stackId="portfolio" fill="url(#fill-roth)" stroke="var(--color-roth)" />
              <Area name="Cash" type="monotone" dataKey="cash" stackId="portfolio" fill="url(#fill-cash)" stroke="var(--color-cash)" />
              <Area name="HSA" type="monotone" dataKey="hsa" stackId="portfolio" fill="url(#fill-hsa)" stroke="var(--color-hsa)" />
              <ReferenceLine
                x={plan.household.retirementAge}
                stroke="#8c9bb1"
                strokeDasharray="4 4"
                label={{
                  value: "Retire",
                  position: "insideTopRight",
                  fill: "#6a778a",
                  fontSize: 12,
                }}
              />
              <Legend />
            </AreaChart>
          </ChartContainer>
        </Panel>
        <Panel title="What the Plan Says" eyebrow="PLANNING SIGNALS" className="insight-panel">
          <ol className="planning-signal-list">
            {planningSignalSummary.signals.map((signal, index) => (
              <li key={signal.title} data-tone={signal.tone}>
                <span className="signal-rank">{index + 1}</span>
                <div>
                  <strong>{signal.title}</strong>
                  <p>{signal.reason}</p>
                  <small><b>Next:</b> {signal.nextAction}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="signal-footnote">Signals use only the values currently in this plan and are estimates, not guarantees.</p>
        </Panel>
      </div>
      <Panel title="Retirement Cash Flow" eyebrow="INCOME + WITHDRAWALS">
        <ChartContainer config={cashFlowConfig} className="h-[300px] w-full aspect-auto">
          <ComposedChart data={projection.filter((row) => row.age >= fullRetirementAge)} margin={{ top: 12, right: 10, left: 6, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="age" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={70} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span className="ml-auto font-mono">{currency.format(Number(value))}</span>} />} />
            <Bar name="Guaranteed Income" dataKey="income" stackId="funding" fill="var(--color-income)" radius={[0, 0, 3, 3]} />
            <Bar name="Portfolio Withdrawals" dataKey="withdrawals" stackId="funding" fill="var(--color-withdrawals)" radius={[3, 3, 0, 0]} />
            <Line name="Planned Spending" type="monotone" dataKey="spending" stroke="var(--color-spending)" strokeWidth={2} dot={false} />
            <Legend />
          </ComposedChart>
        </ChartContainer>
      </Panel>
      <p className="model-note">
        <CircleDollarSign /> “Plan range” is a simplified Monte Carlo estimate using your return assumptions and 12% annual volatility. It is not a guarantee or a substitute for professional advice.
      </p>
    </>
  );

  const renderHousehold = () => (
    <>
      <SectionHeading title="Household & Assumptions" description="Set the timeline and the few assumptions that drive most of the plan." />
      <div className="two-column">
        <Panel title="Planning Household" eyebrow="TIMELINE">
          <div className="form-grid">
            <SelectField
              label="Household"
              value={plan.household.maritalStatus}
              onChange={(value) => setHousehold("maritalStatus", value)}
              options={[
                { value: "married", label: "Married / planning together" },
                { value: "single", label: "Single" },
              ]}
            />
            <Field label="Your current age" value={plan.household.currentAge} onChange={(value) => setHousehold("currentAge", value)} suffix="years old" max={99} />
            <Field label="Your birth year" value={plan.household.birthYear} onChange={(value) => setHousehold("birthYear", value)} suffix="YYYY" min={1900} max={new Date().getFullYear()} help="Optional. Used locally to determine when RMDs begin; 1959 requires review." />
            {plan.household.maritalStatus === "married" && <Field label="Partner current age" value={plan.household.partnerAge} onChange={(value) => setHousehold("partnerAge", value)} suffix="years old" max={99} />}
            {plan.household.maritalStatus === "married" && <Field label="Partner birth year" value={plan.household.partnerBirthYear} onChange={(value) => setHousehold("partnerBirthYear", value)} suffix="YYYY" min={1900} max={new Date().getFullYear()} help="Optional. Used only for the partner's RMD schedule." />}
            <Field label="Your retirement age" value={plan.household.retirementAge} onChange={(value) => setHousehold("retirementAge", value)} suffix="years old" max={99} />
            {plan.household.maritalStatus === "married" && <Field label="Partner retirement age" value={plan.household.partnerRetirementAge} onChange={(value) => setHousehold("partnerRetirementAge", value)} suffix="years old" max={99} />}
            <Field label="Plan through age" value={plan.household.planToAge} onChange={(value) => setHousehold("planToAge", value)} suffix="years old" min={plan.household.currentAge + 1} max={120} />
            <div className="field-stack">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={plan.household.state} onChange={(event) => setHousehold("state", event.target.value)} />
            </div>
          </div>
        </Panel>
        <Panel title="Economic Assumptions" eyebrow="ALL VALUES EDITABLE">
          <div className="form-grid">
            <Field label="General inflation" value={plan.assumptions.inflation} onChange={(value) => setAssumption("inflation", value)} suffix="%" step={0.1} max={20} />
            <details className="budget-flow"><summary>Use a Historical Inflation Reference</summary>
              <p>{INFLATION_REFERENCE.title}: <strong>{inflationReferenceValue().toFixed(2)}% / year</strong>. {INFLATION_REFERENCE.geography}. {INFLATION_REFERENCE.limitation}</p>
              <p className="field-help">{INFLATION_REFERENCE.method}. Source reviewed {INFLATION_REFERENCE.reviewedOn}. <a href={INFLATION_REFERENCE.url} target="_blank" rel="noreferrer">BLS source table</a>.</p>
              {canUndoInflationReference(plan.assumptions.inflation, plan.inflationReference) ? <><p className="field-help">Applied from BLS. Edit the inflation field to override it.</p><Button variant="outline" onClick={() => setAssumption('inflation', plan.inflationReference!.previousValue)}>Undo Reference</Button></> : <Button variant="outline" onClick={() => setPlan(current => { const result = applyInflationReference(current.assumptions.inflation); return { ...current, assumptions: { ...current.assumptions, inflation: result.value }, inflationReference: result.receipt }; })}>Use {inflationReferenceValue().toFixed(2)}% Historical Reference</Button>}
            </details>
            <Field label="Return before retirement" value={plan.assumptions.preRetirementReturn} onChange={(value) => setAssumption("preRetirementReturn", value)} suffix="%" step={0.1} max={30} />
            <Field label="Return in retirement" value={plan.assumptions.retirementReturn} onChange={(value) => setAssumption("retirementReturn", value)} suffix="%" step={0.1} max={30} />
            <Field label="Cash interest rate" value={plan.assumptions.cashReturn ?? 0} onChange={(value) => setAssumption("cashReturn", value)} suffix="%" step={0.1} max={30} help="Cash uses this separate rate, with interest included in ordinary income. Simulated market returns do not apply to cash." />
            <Field label="Annual retirement spending" value={plan.assumptions.annualSpending} onChange={(value) => setAssumption("annualSpending", value)} prefix="$" suffix="/ year" step={1000} help="Excludes healthcare, housing tax/insurance, debts, and recurring costs entered elsewhere." />
          </div>
        </Panel>
      </div>
    </>
  );

  const renderPortfolio = () => (
    <>
      <SectionHeading
        title="Investment Accounts"
        description="Keep each tax treatment separate so the withdrawal plan can use the right dollars at the right time."
        action={
          <Button
            onClick={() =>
              setPlan((current) => ({
                ...current,
                accounts: [
                  ...current.accounts,
                  {
                    id: crypto.randomUUID(),
                    name: "New account",
                    kind: "taxable",
                    owner: "joint",
                    balance: 0,
                    annualContribution: 0,
                    costBasis: 0,
                    qcdEligibleIra: false,
                  },
                ],
              }))
            }
          >
            <Plus /> Add account
          </Button>
        }
      />
      <Panel>
        <div className="table-wrap mobile-card-table accounts-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Tax Treatment</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Adjusted Cost Basis</TableHead>
                <TableHead>Annual Contribution</TableHead>
                <TableHead>QCD-Eligible IRA</TableHead>
                <TableHead>
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.accounts.length === 0 && <EmptyRow message="Add an account to begin the portfolio projection." />}
              {plan.accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Input value={account.name} onChange={(event) => updateAccount(account.id, { name: event.target.value })} aria-label="Account name" />
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      value={account.kind}
                      onChange={(event) =>
                        updateAccount(account.id, {
                          kind: event.target.value as Account["kind"],
                          qcdEligibleIra:
                            event.target.value === "traditional" && account.owner !== "joint"
                              ? account.qcdEligibleIra
                              : false,
                        })
                      }
                    >
                      <NativeSelectOption value="taxable">Taxable brokerage</NativeSelectOption>
                      <NativeSelectOption value="traditional">401(k), 403(b), IRA</NativeSelectOption>
                      <NativeSelectOption value="roth">Roth</NativeSelectOption>
                      <NativeSelectOption value="cash">Cash</NativeSelectOption>
                      <NativeSelectOption value="hsa">HSA</NativeSelectOption>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      value={account.owner}
                      onChange={(event) =>
                        updateAccount(account.id, {
                          owner: event.target.value as Account["owner"],
                          qcdEligibleIra:
                            event.target.value !== "joint" && account.kind === "traditional"
                              ? account.qcdEligibleIra
                              : false,
                        })
                      }
                    >
                      <NativeSelectOption value="you">You</NativeSelectOption>
                      {plan.household.maritalStatus === "married" && <NativeSelectOption value="partner">Partner</NativeSelectOption>}
                      <NativeSelectOption value="joint">Joint {account.kind === "traditional" ? "— excluded from RMD estimate" : ""}</NativeSelectOption>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      prefix="$"
                      value={account.balance}
                      onChange={(event) =>
                        updateAccount(account.id, {
                          balance: event.target.valueAsNumber || 0,
                        })
                      }
                      aria-label="Balance"
                    />
                  </TableCell>
                  <TableCell>
                    {account.kind === "taxable" ? (
                      <AffixedNumericInput
                        prefix="$"
                        value={account.costBasis ?? 0}
                        onChange={(event) =>
                          updateAccount(account.id, {
                            costBasis: event.target.valueAsNumber || 0,
                          })
                        }
                        aria-label="Adjusted cost basis"
                      />
                    ) : (
                      <span className="not-applicable">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      prefix="$"
                      suffix="/ year"
                      value={account.annualContribution}
                      onChange={(event) =>
                        updateAccount(account.id, {
                          annualContribution: event.target.valueAsNumber || 0,
                        })
                      }
                      aria-label="Annual contribution"
                    />
                  </TableCell>
                  <TableCell>
                    {account.kind === "traditional" && account.owner !== "joint" ? (
                      <Switch
                        checked={account.qcdEligibleIra ?? false}
                        onCheckedChange={(value) => updateAccount(account.id, { qcdEligibleIra: value })}
                        aria-label={`Identify ${account.name} as a QCD-eligible traditional IRA`}
                      />
                    ) : (
                      <span className="not-applicable">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          accounts: current.accounts.filter((item) => item.id !== account.id),
                        }))
                      }
                      aria-label={`Delete ${account.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <div className="summary-strip">
        <span>Total invested assets</span>
        <strong>{currency.format(totalPortfolio(plan))}</strong>
      </div>
      {plan.accounts.some((account) => account.kind === "traditional" && account.owner === "joint") && (
        <p className="model-note">
          <Calculator /> Tax-deferred accounts need an individual owner for RMD calculations. Joint tax-deferred balances remain in the portfolio but are excluded from the RMD estimate until assigned to you or your partner.
        </p>
      )}
      <p className="model-note">
        <Calculator /> For taxable accounts, enter the aggregate adjusted basis shown by your brokerage. The projection uses an average-basis planning estimate; actual tax lots, holding periods, loss harvesting, wash sales, and basis adjustments can change realized gains.
      </p>
      <p className="model-note">
        <Calculator /> Mark QCD eligibility only for an individually owned traditional IRA that is not an ongoing SEP or SIMPLE IRA. Workplace plans such as a 401(k) or 403(b) are not eligible QCD sources.
      </p>
    </>
  );

  const renderIncome = () => (
    <>
      <SectionHeading
        title="Pensions & Social Security"
        description="Enter benefit estimates at the age they begin. COLA compounds from that start age."
        action={
          <Button
            onClick={() =>
              setPlan((current) => ({
                ...current,
                income: [
                  ...current.income,
                  {
                    id: crypto.randomUUID(),
                    name: "New income",
                    owner: "you",
                    kind: "pension",
                    startAge: 65,
                    annualAmount: 0,
                    cola: 0,
                    survivorPercent: 50,
                  },
                ],
              }))
            }
          >
            <Plus /> Add income
          </Button>
        }
      />
      <Panel>
        <div className="table-wrap mobile-card-table income-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Income Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Start Age</TableHead>
                <TableHead>Annual Benefit</TableHead>
                <TableHead>COLA</TableHead>
                <TableHead>Survivor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.income.length === 0 && <EmptyRow message="Add Social Security or pension income." />}
              {plan.income.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell>
                    <Input value={stream.name} onChange={(event) => updateIncome(stream.id, { name: event.target.value })} aria-label="Income source name" />
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      value={stream.kind}
                      onChange={(event) =>
                        updateIncome(stream.id, {
                          kind: event.target.value as IncomeStream["kind"],
                        })
                      }
                    >
                      <NativeSelectOption value="pension">Pension</NativeSelectOption>
                      <NativeSelectOption value="socialSecurity">Social Security</NativeSelectOption>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      value={stream.owner}
                      onChange={(event) =>
                        updateIncome(stream.id, {
                          owner: event.target.value as IncomeStream["owner"],
                        })
                      }
                    >
                      <NativeSelectOption value="you">You</NativeSelectOption>
                      {plan.household.maritalStatus === "married" && <NativeSelectOption value="partner">Partner</NativeSelectOption>}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      suffix="years"
                      value={stream.startAge}
                      onChange={(event) =>
                        updateIncome(stream.id, {
                          startAge: event.target.valueAsNumber || 0,
                        })
                      }
                      aria-label="Start age"
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      prefix="$"
                      suffix="/ year"
                      value={stream.annualAmount}
                      onChange={(event) =>
                        updateIncome(stream.id, {
                          annualAmount: event.target.valueAsNumber || 0,
                        })
                      }
                      aria-label="Annual benefit"
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      suffix="%"
                      step="0.1"
                      value={stream.cola}
                      onChange={(event) =>
                        updateIncome(stream.id, {
                          cola: event.target.valueAsNumber || 0,
                        })
                      }
                      aria-label="COLA percent"
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      suffix="%"
                      value={stream.survivorPercent}
                      onChange={(event) =>
                        updateIncome(stream.id, {
                          survivorPercent: event.target.valueAsNumber || 0,
                        })
                      }
                      aria-label="Survivor percent"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          income: current.income.filter((item) => item.id !== stream.id),
                        }))
                      }
                      aria-label={`Delete ${stream.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <p className="model-note">
        <Landmark /> Use the annual benefit shown in your pension statement or Social Security estimate for the claiming age you choose. Survivor and spousal optimization is tracked in the roadmap; this version models each entered stream independently.
      </p>
    </>
  );

  const renderSpending = () => (
    <>
      <SectionHeading title="Spending & Housing" description="Separate everyday spending from large costs and home carrying costs so each can change on its own timeline." />
      <div className="two-column">
        <Panel title="Baseline Spending" eyebrow="RETIREMENT">
          <div className="form-grid single">
            <Field label="Annual retirement spending" value={plan.assumptions.annualSpending} onChange={(value) => setAssumption("annualSpending", value)} prefix="$" suffix="/ year" step={1000} />
            <p className="panel-copy">Enter normal living expenses here. Healthcare, property tax, home insurance, debts, and the large recurring costs below are added separately.</p>
          </div>
        </Panel>
        <Panel title="Home Carrying Costs" eyebrow="HOUSING">
          {plan.housing.statement?.enabled && <p className="panel-copy">The active mortgage statement supplies property tax and home insurance. Manual amounts below are retained for use if you turn it off.</p>}
          <div className="form-grid">
            <SelectField label="Property tax entry method" value={plan.housing.propertyTaxMode ?? 'mills'} onChange={value => setHousing('propertyTaxMode', value as 'mills' | 'annual')} options={[{ value: 'annual', label: 'Annual Dollar Amount' }, { value: 'mills', label: 'Assessment and Mill Rate' }]} />
            {plan.housing.propertyTaxMode === 'annual' && <Field label="Annual property tax" value={plan.housing.annualPropertyTax ?? 0} onChange={value => setHousing('annualPropertyTax', value)} prefix="$" suffix="/ year" />}
            <Field label="Home market value" value={plan.housing.homeValue} onChange={(value) => setHousing("homeValue", value)} prefix="$" step={5000} />
            <Field label="Assessed percent" value={plan.housing.assessedPercent} onChange={(value) => setHousing("assessedPercent", value)} suffix="%" step={1} max={200} />
            <Field label="Mill rate" value={plan.housing.millRate} onChange={(value) => setHousing("millRate", value)} suffix="mills" step={0.1} help="One mill is $1 per $1,000 of assessed value." />
            <Field label="Annual home insurance" value={plan.housing.annualInsurance} onChange={(value) => setHousing("annualInsurance", value)} prefix="$" suffix="/ year" step={100} />
          </div>
          <div className="calculated-line">
            <span>Estimated annual property tax</span>
            <strong>{currency.format(propertyTaxAnnual(plan))}</strong>
          </div>
          <label className="switch-row">
            <span>
              <strong>Include home in net worth</strong>
              <small>Shown separately; never used to fund spending.</small>
            </span>
            <Switch checked={plan.housing.includeInNetWorth} onCheckedChange={(value) => setHousing("includeInNetWorth", value)} />
          </label>
          <label className="switch-row">
            <span>
              <strong>Pay mortgage at retirement</strong>
              <small>Scenario flag is recorded; full lump-sum comparison is in the roadmap.</small>
            </span>
            <Switch checked={plan.housing.payoffMortgageAtRetirement} onCheckedChange={(value) => setHousing("payoffMortgageAtRetirement", value)} />
          </label>
        </Panel>
      </div>
      <MortgageStatementEditor statement={plan.housing.statement} debts={plan.debts} onChange={statement => setHousing('statement', statement)} />
      <Panel title="Large Recurring Costs" eyebrow="TIMED EXPENSES">
        <div className="table-wrap mobile-card-table costs-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cost</TableHead>
                <TableHead>Annual Amount</TableHead>
                <TableHead>Start Age</TableHead>
                <TableHead>End Age</TableHead>
                <TableHead>Inflation-Linked</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.recurringCosts.length === 0 && <EmptyRow message="Add travel, tuition, family support, replacement vehicles, or other large costs." />}
              {plan.recurringCosts.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>
                    <Input value={cost.name} onChange={(event) => updateCost(cost.id, { name: event.target.value })} />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      prefix="$"
                      suffix="/ year"
                      value={cost.annualAmount}
                      onChange={(event) =>
                        updateCost(cost.id, {
                          annualAmount: event.target.valueAsNumber || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      suffix="years"
                      value={cost.startAge}
                      onChange={(event) =>
                        updateCost(cost.id, {
                          startAge: event.target.valueAsNumber || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      suffix="years"
                      value={cost.endAge}
                      onChange={(event) =>
                        updateCost(cost.id, {
                          endAge: event.target.valueAsNumber || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch checked={cost.inflationLinked} onCheckedChange={(value) => updateCost(cost.id, { inflationLinked: value })} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          recurringCosts: current.recurringCosts.filter((item) => item.id !== cost.id),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() =>
            setPlan((current) => ({
              ...current,
              recurringCosts: [
                ...current.recurringCosts,
                {
                  id: crypto.randomUUID(),
                  name: "New cost",
                  annualAmount: 0,
                  startAge: current.household.retirementAge,
                  endAge: current.household.retirementAge,
                  inflationLinked: true,
                },
              ],
            }))
          }
        >
          <Plus /> Add cost
        </Button>
      </Panel>
    </>
  );

  const renderDebt = () => (
    <>
      <SectionHeading
        title="Debt Payoff"
        description="Snowball targets small balances; Avalanche targets high interest. Both roll paid-off minimums forward. Custom keeps extra payments assigned to individual debts."
        action={
          <Button
            onClick={() =>
              setPlan((current) => ({
                ...current,
                debts: [
                  ...current.debts,
                  {
                    id: crypto.randomUUID(),
                    name: "New debt",
                    kind: "other",
                    balance: 0,
                    interestRate: 0,
                    minimumPayment: 0,
                  },
                ],
              }))
            }
          >
            <Plus /> Add debt
          </Button>
        }
      />
      <div className="debt-topline">
        <div>
          <span>Total debt</span>
          <strong>{currency.format(totalDebt)}</strong>
        </div>
        <div>
          <span>Projected debt-free</span>
          <strong>{payoffMonths < 600 ? `${Math.floor(payoffMonths / 12)}y ${payoffMonths % 12}m` : "50+ years"}</strong>
        </div>
        <SelectField
          label="Payoff method"
          value={plan.debtStrategy.method}
          onChange={(value) =>
            setPlan((current) => ({
              ...current,
              debtStrategy: {
                ...current.debtStrategy,
                method: value as PlannerData["debtStrategy"]["method"],
              },
            }))
          }
          options={[
            { value: "snowball", label: "Snowball — smallest balance first" },
            { value: "avalanche", label: "Avalanche — highest APR first" },
            { value: "custom", label: "Custom — assigned extra, no rollover" },
          ]}
        />
        {plan.debtStrategy.method !== 'custom' && <Field
          label="Extra monthly payment"
          value={plan.debtStrategy.extraMonthlyPayment}
          onChange={(value) =>
            setPlan((current) => ({
              ...current,
              debtStrategy: {
                ...current.debtStrategy,
                extraMonthlyPayment: value,
              },
            }))
          }
          prefix="$"
          suffix="/ month"
          step={50}
        />}
      </div>
      <Panel title="Payoff Path" eyebrow={plan.debtStrategy.method.toUpperCase()} className="chart-panel">
        <ChartContainer config={{ totalBalance: { label: "Debt Balance", color: "#2f7df4" } }} className="h-[280px] w-full aspect-auto">
          <LineChart data={debtSchedule.filter((_, index) => index % 3 === 0 || index === debtSchedule.length - 1)}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={(value) => payoffMonths < 24 ? `${value}m` : `${Math.floor(value / 12)}y${value % 12 ? ` ${value % 12}m` : ''}`} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={70} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => currency.format(Number(value))} />} />
            <Line name="Debt Balance" type="monotone" dataKey="totalBalance" stroke="var(--color-totalBalance)" strokeWidth={3} dot={false} />
          </LineChart>
        </ChartContainer>
      </Panel>
      <DebtCascade months={debtSchedule} method={plan.debtStrategy.method} debts={plan.debts} updateDebt={updateDebt} />
      <Panel>
        <div className="table-wrap mobile-card-table debts-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Debt</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>APR</TableHead>
                <TableHead>Minimum / Month</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.debts.length === 0 && <EmptyRow message="You have no debts in this plan." />}
              {plan.debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>
                    <Input value={debt.name} onChange={(event) => updateDebt(debt.id, { name: event.target.value })} />
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      value={debt.kind}
                      onChange={(event) =>
                        updateDebt(debt.id, {
                          kind: event.target.value as Debt["kind"],
                        })
                      }
                    >
                      <NativeSelectOption value="mortgage">Mortgage</NativeSelectOption>
                      <NativeSelectOption value="creditCard">Credit card</NativeSelectOption>
                      <NativeSelectOption value="auto">Auto</NativeSelectOption>
                      <NativeSelectOption value="student">Student loan</NativeSelectOption>
                      <NativeSelectOption value="other">Other</NativeSelectOption>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      prefix="$"
                      value={debt.balance}
                      onChange={(event) =>
                        updateDebt(debt.id, {
                          balance: event.target.valueAsNumber || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      suffix="%"
                      step="0.1"
                      value={debt.interestRate}
                      onChange={(event) =>
                        updateDebt(debt.id, {
                          interestRate: event.target.valueAsNumber || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <AffixedNumericInput
                      prefix="$"
                      suffix="/ month"
                      value={debt.minimumPayment}
                      onChange={(event) =>
                        updateDebt(debt.id, {
                          minimumPayment: event.target.valueAsNumber || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPlan((current) => ({
                          ...current,
                          debts: current.debts.filter((item) => item.id !== debt.id),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );

  const renderHealth = () => (
    <>
      <SectionHeading title="Health & Long-Term Care" description="Keep medical inflation and care shocks visible instead of hiding them inside general spending." />
      <div className="two-column">
        <Panel title="Healthcare" eyebrow="ANNUAL HOUSEHOLD COST">
          <div className="form-grid">
            <Field label="Before Medicare" value={plan.healthcare.preMedicareAnnual} onChange={(value) => setHealthcare("preMedicareAnnual", value)} prefix="$" suffix="/ year" step={500} help="Premiums plus expected out-of-pocket costs." />
            <Field label="Medicare years" value={plan.healthcare.medicareAnnual} onChange={(value) => setHealthcare("medicareAnnual", value)} prefix="$" suffix="/ year" step={500} help="Parts B/D, supplement or Advantage, dental, and expected out-of-pocket costs." />
            <Field label="Healthcare inflation" value={plan.healthcare.healthInflation} onChange={(value) => setHealthcare("healthInflation", value)} suffix="%" step={0.1} max={20} />
          </div>
          <div className="info-callout">
            <Building2 />
            <div>
              <strong>State Exchange Planning</strong>
              <p>Use the net annual premium from your state marketplace or HealthCare.gov after any estimated premium tax credit. Exact premiums and subsidies depend on ZIP code, ages, household size, plan year, and projected MAGI.</p>
            </div>
          </div>
        </Panel>
        <Panel title="Long-Term Care Reserve" eyebrow="STRESS SCENARIO">
          <div className="form-grid">
            <Field label="Annual care cost" value={plan.healthcare.longTermCareAnnual} onChange={(value) => setHealthcare("longTermCareAnnual", value)} prefix="$" suffix="/ year" step={1000} />
            <Field label="Care starts at age" value={plan.healthcare.longTermCareStartAge} onChange={(value) => setHealthcare("longTermCareStartAge", value)} suffix="years old" max={120} />
            <Field label="Years of care" value={plan.healthcare.longTermCareYears} onChange={(value) => setHealthcare("longTermCareYears", value)} suffix="years" max={20} />
          </div>
          <div className="calculated-line">
            <span>Reserve before inflation</span>
            <strong>{currency.format(plan.healthcare.longTermCareAnnual * plan.healthcare.longTermCareYears)}</strong>
          </div>
        </Panel>
      </div>
      <p className="model-note">
        <HeartPulse /> These are planning inputs—not quotes. A future data module can link current exchange, Medicare, and state long-term-care sources without sending your plan data anywhere.
      </p>
    </>
  );

  const renderTaxes = () => {
    const withdrawalRows = projection.filter((row) => row.age >= plan.household.retirementAge);
    const targetTax = calculateFederalIncomeTax(plan.assumptions.targetOrdinaryIncome, plan.household.filingStatus);
    const rothConversionComparison = compareRothConversion({
      filingStatus: plan.household.filingStatus,
      ...plan.rothConversionPlanning,
    });
    const medicareIrmaa = plan.medicareIrmaaPlanning.filingCategory
      ? calculateMedicareIrmaa({
          magi: plan.medicareIrmaaPlanning.magi2024,
          filingCategory: plan.medicareIrmaaPlanning
            .filingCategory as IrmaaFilingCategory,
          partBEnrollees: plan.medicareIrmaaPlanning.partBEnrollees,
          partDEnrollees: plan.medicareIrmaaPlanning.partDEnrollees,
        })
      : null;
    const acaPtc =
      plan.acaPlanning.location && plan.acaPlanning.taxFamilySize > 0
        ? calculateAcaPremiumTaxCredit({
            ...plan.acaPlanning,
            location: plan.acaPlanning.location as PovertyGuidelineLocation,
          })
        : null;
    const acaPtcAfterConversion = acaPtc
      ? calculateAcaPremiumTaxCredit({
          ...plan.acaPlanning,
          householdMagi:
            plan.acaPlanning.householdMagi +
            plan.rothConversionPlanning.taxableConversionAmount,
          location: plan.acaPlanning.location as PovertyGuidelineLocation,
        })
      : null;
    const capitalGainsWorksheet = calculateCapitalGainsTax({
      filingStatus: plan.household.filingStatus,
      ...plan.capitalGainsPlanning,
      overrideRatePercent: plan.assumptions.capitalGainsRate,
    });
    const conversionRows = projection.filter((row) => row.rothConversion > 0);
    const baselineByYear = new Map(
      projectionWithoutPlannedConversions.map((row) => [row.year, row]),
    );
    const totalPlannedConversions = conversionRows.reduce(
      (sum, row) => sum + row.rothConversion,
      0,
    );
    const projectedTaxDifference = projection.reduce((sum, row) => {
      const baseline = baselineByYear.get(row.year);
      return sum + (baseline ? row.taxes - baseline.taxes : 0);
    }, 0);
    const currentLawAcaCreditDifference = conversionRows.reduce((sum, row) => {
      const baseline = baselineByYear.get(row.year);
      return (
        sum +
        (baseline &&
        baseline.currentLawAcaPremiumTaxCredit !== null &&
        row.currentLawAcaPremiumTaxCredit !== null
          ? row.currentLawAcaPremiumTaxCredit -
            baseline.currentLawAcaPremiumTaxCredit
          : 0)
      );
    }, 0);
    const currentLawIrmaaDifference = conversionRows.reduce((sum, row) => {
      const baseline = baselineByYear.get(row.year);
      return (
        sum +
        (baseline &&
        baseline.currentLawIrmaaAnnual !== null &&
        row.currentLawIrmaaAnnual !== null
          ? row.currentLawIrmaaAnnual - baseline.currentLawIrmaaAnnual
          : 0)
      );
    }, 0);
    const socialSecurityYear = projection.find((row) => row.socialSecurityIncome > 0);
    const firstRmdYear = projection.find((row) => row.requiredMinimumDistribution > 0);
    const firstQcdYear = projection.find(
      (row) => row.qualifiedCharitableDistribution > 0,
    );
    const firstEarlyDistributionYear = projection.find(
      (row) =>
        row.earlyDistributionPenaltyBase > 0 ||
        row.earlyDistributionExceptionAmount > 0 ||
        row.earlyDistributionReviewAmount > 0 ||
        row.earlyRothWithdrawalReviewAmount > 0,
    );
    const currentProjectionYear = projection[0];
    const qcdCapacityFor = (owner: "you" | "partner") =>
      calculateQcdCapacity({
        taxYear: currentProjectionYear?.year ?? new Date().getFullYear(),
        ageOnDistributionDate:
          owner === "you" ? plan.household.currentAge : plan.household.partnerAge,
        eligibleIraBalance: plan.accounts
          .filter((account) => account.owner === owner && account.qcdEligibleIra)
          .reduce((sum, account) => sum + Math.max(0, account.balance), 0),
        requiredMinimumDistribution:
          owner === "you"
            ? currentProjectionYear?.youRmd ?? 0
            : currentProjectionYear?.partnerRmd ?? 0,
      });
    const qcdOwners = [
      { key: "you" as const, label: "You", result: qcdCapacityFor("you") },
      ...(plan.household.maritalStatus === "married"
        ? [{ key: "partner" as const, label: "Partner", result: qcdCapacityFor("partner") }]
        : []),
    ];
    const has1959RmdReview =
      plan.household.birthYear === 1959 ||
      (plan.household.maritalStatus === "married" &&
        plan.household.partnerBirthYear === 1959);
    return (
      <>
        <SectionHeading title="Taxes & Withdrawals" description="A transparent withdrawal order that can be reviewed—not a black-box recommendation." />
        <div className="two-column">
          <Panel title="Federal Tax Foundation" eyebrow="2026 IRS LAW">
            <div className="form-grid">
              <SelectField
                label="Federal filing status"
                value={plan.household.filingStatus}
                onChange={(value) => setHousehold("filingStatus", value as FilingStatus)}
                options={[
                  { value: "single", label: "Single" },
                  { value: "marriedJoint", label: "Married filing jointly" },
                  { value: "headOfHousehold", label: "Head of household" },
                  {
                    value: "marriedSeparate",
                    label: "Married filing separately",
                  },
                ]}
              />
              <Field label="Estimated effective state income-tax rate" value={plan.assumptions.stateEffectiveTaxRate} onChange={(value) => setAssumption("stateEffectiveTaxRate", value)} suffix="%" step={0.1} max={20} help="Optional planning estimate applied only to modeled ordinary taxable income. It does not calculate jurisdiction-specific deductions, credits, retirement-income exclusions, or state treatment of capital gains and Roth conversions." />
              <Field label="Capital-gains override rate" value={plan.assumptions.capitalGainsRate} onChange={(value) => setAssumption("capitalGainsRate", value)} suffix="%" step={0.1} max={50} help="Optional. Leave blank to use the 2026 federal 0% / 15% / 20% worksheet. A nonzero rate replaces those regular LTCG bands but does not replace NIIT." />
              <Field label="Annual tax-exempt interest" value={plan.assumptions.taxExemptInterest} onChange={(value) => setAssumption("taxExemptInterest", value)} prefix="$" suffix="/ year" step={100} help="Municipal-bond interest can increase taxable Social Security even though the interest itself is federally tax-exempt." />
              <Field label="Ordinary-income target" value={plan.assumptions.targetOrdinaryIncome} onChange={(value) => setAssumption("targetOrdinaryIncome", value)} prefix="$" suffix="/ year" step={1000} help="The model fills this band with tax-deferred withdrawals before drawing taxable assets." />
            </div>
            {plan.household.filingStatus === "marriedSeparate" && (
              <label className="switch-row">
                <span>
                  <strong>Lived apart from spouse for the entire tax year</strong>
                  <small>The IRS uses a $25,000 base only when this is true; otherwise the base is $0.</small>
                </span>
                <Switch checked={plan.household.marriedFilingSeparatelyLivedApart} onCheckedChange={(value) => setHousehold("marriedFilingSeparatelyLivedApart", value)} />
              </label>
            )}
            <div className="calculated-line">
              <span>2026 standard deduction</span>
              <strong>{currency.format(targetTax.standardDeduction)}</strong>
            </div>
            <div className="calculated-line">
              <span>Federal tax at the ordinary-income target</span>
              <strong>{currency.format(targetTax.tax)}</strong>
            </div>
            <div className="calculated-line">
              <span>Top marginal / effective rate at target</span>
              <strong>
                {(targetTax.marginalRate * 100).toFixed(0)}% / {(targetTax.effectiveRate * 100).toFixed(1)}%
              </strong>
            </div>
          </Panel>
          <Panel title="Withdrawal Policy" eyebrow="EACH RETIREMENT YEAR">
            <ol className="strategy-list">
              <li>
                <span>1</span>
                <div>
                  <strong>Take each owner's required minimum distribution</strong>
                  <p>Use the prior year-end owner balance and IRS Uniform Lifetime denominator.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Fill the chosen ordinary-income band</strong>
                  <p>Use additional traditional 401(k), 403(b), and IRA dollars up to your target.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Use taxable assets for the remaining gap</strong>
                  <p>Apply cost basis, remaining deduction, federal long-term-gain bands, and NIIT where modeled.</p>
                </div>
              </li>
              <li>
                <span>4</span>
                <div>
                  <strong>Match HSA dollars to healthcare</strong>
                  <p>HSA withdrawals are modeled only against medical costs.</p>
                </div>
              </li>
              <li>
                <span>5</span>
                <div>
                  <strong>Preserve Roth assets for last</strong>
                  <p>Roth balances remain the final flexible pool.</p>
                </div>
              </li>
            </ol>
          </Panel>
        </div>
        <Panel title="Long-Term Capital Gains Worksheet" eyebrow="2026 FEDERAL ESTIMATE">
          <div className="form-grid">
            <Field
              label="Gross ordinary income"
              value={plan.capitalGainsPlanning.grossOrdinaryIncome}
              onChange={(value) =>
                setCapitalGainsPlanning("grossOrdinaryIncome", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="Before the standard deduction and before long-term capital gains. Include taxable wages, pensions, interest, distributions, and taxable Social Security."
            />
            <Field
              label="Net long-term capital gain"
              value={plan.capitalGainsPlanning.netLongTermCapitalGain}
              onChange={(value) =>
                setCapitalGainsPlanning("netLongTermCapitalGain", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="Enter the net gain after basis and loss netting. Short-term gains belong with ordinary income."
            />
            <Field
              label="Modified AGI for NIIT"
              value={plan.capitalGainsPlanning.modifiedAdjustedGrossIncome}
              onChange={(value) =>
                setCapitalGainsPlanning("modifiedAdjustedGrossIncome", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="For most households this begins with AGI. Special foreign-income and controlled-foreign-corporation adjustments are not determined here."
            />
            <Field
              label="Net investment income"
              value={plan.capitalGainsPlanning.netInvestmentIncome}
              onChange={(value) =>
                setCapitalGainsPlanning("netInvestmentIncome", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="For the 3.8% NIIT only. This can include investment interest, dividends, gains, rents, and royalties after allowed investment deductions."
            />
          </div>
          <div className="worksheet-grid">
            <div><span>2026 standard deduction</span><strong>{currency.format(capitalGainsWorksheet.standardDeduction)}</strong></div>
            <div><span>Ordinary taxable income</span><strong>{currency.format(capitalGainsWorksheet.ordinaryTaxableIncome)}</strong></div>
            <div><span>Taxable long-term gain</span><strong>{currency.format(capitalGainsWorksheet.taxableLongTermCapitalGain)}</strong><small>{currency.format(capitalGainsWorksheet.unusedStandardDeduction)} of unused deduction applied</small></div>
            <div><span>Gain taxed at 0%</span><strong>{currency.format(capitalGainsWorksheet.zeroRateGain)}</strong><small>Combined taxable-income ceiling: {currency.format(capitalGainsWorksheet.zeroRateCeiling)}</small></div>
            <div><span>Gain taxed at 15%</span><strong>{currency.format(capitalGainsWorksheet.fifteenRateGain)}</strong><small>Combined taxable-income ceiling: {currency.format(capitalGainsWorksheet.fifteenRateCeiling)}</small></div>
            <div><span>Gain taxed at 20%</span><strong>{currency.format(capitalGainsWorksheet.twentyRateGain)}</strong></div>
            <div>
              <span>Regular federal LTCG tax</span>
              <strong>{currency.format(capitalGainsWorksheet.regularCapitalGainsTax)}</strong>
              {capitalGainsWorksheet.overrideApplied && <small>Manual override applied; statutory result would be {currency.format(capitalGainsWorksheet.statutoryRegularCapitalGainsTax)}</small>}
            </div>
            <div><span>NIIT base / tax</span><strong>{currency.format(capitalGainsWorksheet.niitBase)} / {currency.format(capitalGainsWorksheet.niitTax)}</strong><small>3.8% on the lesser of net investment income or MAGI above {currency.format(capitalGainsWorksheet.niitThreshold)}</small></div>
            <div><span>Total LTCG tax plus NIIT</span><strong>{currency.format(capitalGainsWorksheet.totalCapitalGainsTax)}</strong></div>
            <div><span>Effective rate on taxable LTCG</span><strong>{(capitalGainsWorksheet.effectiveRate * 100).toFixed(1)}%</strong></div>
          </div>
          <p className="model-note">
            <Calculator /> This estimate stacks net long-term capital gain above ordinary taxable income, applies the basic standard deduction, and separately calculates NIIT. It does not model qualified dividends, short-term gains, capital-loss carryovers, itemized deductions, the home-sale exclusion, AMT, state tax, collectibles or qualified-small-business-stock gains taxed up to 28%, unrecaptured section 1250 gain taxed up to 25%, trusts, estates, or transaction-specific basis rules. Projection years planning-index the regular LTCG ceilings with inflation; the NIIT thresholds remain fixed under current law.{" "}
            <a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf" target="_blank" rel="noreferrer">IRS Revenue Procedure 2025-32</a>
            {" · "}
            <a href="https://www.irs.gov/individuals/net-investment-income-tax" target="_blank" rel="noreferrer">IRS NIIT guidance</a>
          </p>
        </Panel>
        <Panel title="Roth Conversion Bracket Check" eyebrow="2026 FEDERAL ESTIMATE">
          <div className="form-grid">
            <Field
              label="Baseline gross ordinary income"
              value={plan.rothConversionPlanning.baselineGrossOrdinaryIncome}
              onChange={(value) =>
                setRothConversionPlanning("baselineGrossOrdinaryIncome", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="Before the conversion and before the standard deduction. Include taxable wages, pensions, interest, distributions, and the taxable share of Social Security you expect on the return."
            />
            <Field
              label="Taxable Roth conversion amount"
              value={plan.rothConversionPlanning.taxableConversionAmount}
              onChange={(value) =>
                setRothConversionPlanning("taxableConversionAmount", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="Enter the taxable portion only. If you have nondeductible IRA basis, determine the taxable amount under Form 8606 and the pro-rata rule before using this estimate."
            />
            <SelectField
              label="Target federal bracket"
              value={String(plan.rothConversionPlanning.targetBracketRate)}
              onChange={(value) =>
                setRothConversionPlanning("targetBracketRate", Number(value))
              }
              options={[
                { value: "0", label: "Choose a target bracket" },
                { value: "0.1", label: "10%" },
                { value: "0.12", label: "12%" },
                { value: "0.22", label: "22%" },
                { value: "0.24", label: "24%" },
                { value: "0.32", label: "32%" },
                { value: "0.35", label: "35%" },
              ]}
            />
          </div>
          <div className="worksheet-grid">
            <div>
              <span>Top of target bracket · gross income</span>
              <strong>
                {rothConversionComparison.targetGrossIncomeCeiling === null
                  ? "Choose a bracket"
                  : currency.format(rothConversionComparison.targetGrossIncomeCeiling)}
              </strong>
            </div>
            <div><span>Room before conversion</span><strong>{currency.format(rothConversionComparison.roomToTargetBeforeConversion)}</strong></div>
            <div><span>Conversion within target</span><strong>{currency.format(rothConversionComparison.conversionWithinTarget)}</strong></div>
            <div><span>Conversion above target</span><strong>{currency.format(rothConversionComparison.amountAboveTarget)}</strong></div>
            <div><span>Federal tax before conversion</span><strong>{currency.format(rothConversionComparison.baselineFederalTax)}</strong></div>
            <div><span>Incremental federal tax</span><strong>{currency.format(rothConversionComparison.incrementalFederalTax)}</strong></div>
            <div><span>Average federal rate on conversion</span><strong>{(rothConversionComparison.averageFederalRateOnConversion * 100).toFixed(1)}%</strong></div>
            <div><span>Resulting marginal federal rate</span><strong>{(rothConversionComparison.resultingMarginalRate * 100).toFixed(0)}%</strong></div>
          </div>
          <p className="model-note">
            <Calculator /> This is a current-year bracket comparison, not a conversion recommendation. It uses the 2026 ordinary-income brackets and basic standard deduction and does not move money between accounts. The real cost can change with IRA basis and the pro-rata rule, taxable Social Security, capital gains, credits, state tax, ACA subsidies, Medicare IRMAA, NIIT, itemized deductions, and transaction timing. Conversions after 2017 generally cannot be recharacterized. Decide the taxable portion and confirm eligibility before acting.{" "}
            <a href="https://www.irs.gov/pub/irs-pdf/p590a.pdf" target="_blank" rel="noreferrer">IRS Publication 590-A (2025)</a>
            {" · "}
            <a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf" target="_blank" rel="noreferrer">2026 IRS brackets</a>
          </p>
        </Panel>
        <Panel title="Roth Conversion Ladder" eyebrow="OWNER-SPECIFIC PROJECTION">
          <div className="form-grid">
            <Field
              label="Your annual conversion"
              value={plan.rothConversionPlanning.annualConversionYou}
              onChange={(value) =>
                setRothConversionPlanning("annualConversionYou", value)
              }
              prefix="$"
              suffix="/ year"
              step={1000}
              help="Moves available dollars from your assigned tax-deferred accounts into the household Roth balance. RMD dollars are distributed first and are not converted."
            />
            <Field
              label="Your conversion start age"
              value={plan.rothConversionPlanning.startAgeYou}
              onChange={(value) =>
                setRothConversionPlanning("startAgeYou", value)
              }
              suffix="years old"
              max={120}
            />
            <Field
              label="Your conversion end age"
              value={plan.rothConversionPlanning.endAgeYou}
              onChange={(value) =>
                setRothConversionPlanning("endAgeYou", value)
              }
              suffix="years old"
              max={120}
            />
            {plan.household.maritalStatus === "married" && (
              <Field
                label="Partner annual conversion"
                value={plan.rothConversionPlanning.annualConversionPartner}
                onChange={(value) =>
                  setRothConversionPlanning("annualConversionPartner", value)
                }
                prefix="$"
                suffix="/ year"
                step={1000}
                help="Uses only tax-deferred accounts assigned to your partner."
              />
            )}
            {plan.household.maritalStatus === "married" && (
              <Field
                label="Partner conversion start age"
                value={plan.rothConversionPlanning.startAgePartner}
                onChange={(value) =>
                  setRothConversionPlanning("startAgePartner", value)
                }
                suffix="years old"
                max={120}
              />
            )}
            {plan.household.maritalStatus === "married" && (
              <Field
                label="Partner conversion end age"
                value={plan.rothConversionPlanning.endAgePartner}
                onChange={(value) =>
                  setRothConversionPlanning("endAgePartner", value)
                }
                suffix="years old"
                max={120}
              />
            )}
          </div>
          <div className="worksheet-grid">
            <div><span>Total modeled conversions</span><strong>{currency.format(totalPlannedConversions)}</strong></div>
            <div><span>Projected Tax Change Over the Full Plan</span><strong>{currency.format(projectedTaxDifference)}</strong><small>Includes later-year consequences and taxes generated by tax-paying withdrawals.</small></div>
            <div><span>2026-rule ACA credit sensitivity</span><strong>{currency.format(currentLawAcaCreditDifference)}</strong><small>With conversion minus no-conversion baseline</small></div>
            <div><span>2026-rule annual IRMAA sensitivity</span><strong>{currency.format(currentLawIrmaaDifference)}</strong><small>Income-year comparison; actual Medicare premiums generally use a two-year lookback</small></div>
            <div><span>Final tax-deferred balance change</span><strong>{currency.format((projection.at(-1)?.traditional ?? 0) - (projectionWithoutPlannedConversions.at(-1)?.traditional ?? 0))}</strong></div>
            <div><span>Final Roth balance change</span><strong>{currency.format((projection.at(-1)?.roth ?? 0) - (projectionWithoutPlannedConversions.at(-1)?.roth ?? 0))}</strong></div>
          </div>
          {conversionRows.length > 0 ? (
            <div className="table-wrap mobile-card-table conversion-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year / Age</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Taxable Ordinary Income</TableHead>
                    <TableHead>Taxable LTCG</TableHead>
                    <TableHead>Projected Taxes</TableHead>
                    <TableHead>ACA PTC · 2026 Rules</TableHead>
                    <TableHead>IRMAA · 2026 Rules</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversionRows.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell data-label="Year / Age">{row.year} / {row.age}</TableCell>
                      <TableCell data-label="Conversion">{currency.format(row.rothConversion)}</TableCell>
                      <TableCell data-label="Taxable Ordinary Income">{currency.format(row.taxableOrdinaryIncome)}</TableCell>
                      <TableCell data-label="Taxable LTCG">{currency.format(row.taxableLongTermCapitalGain)}</TableCell>
                      <TableCell data-label="Projected Taxes">{currency.format(row.taxes)}</TableCell>
                      <TableCell data-label="ACA PTC · 2026 Rules">{row.currentLawAcaPremiumTaxCredit === null ? "Not configured" : currency.format(row.currentLawAcaPremiumTaxCredit)}</TableCell>
                      <TableCell data-label="IRMAA · 2026 Rules">{row.currentLawIrmaaAnnual === null ? "Not configured" : currency.format(row.currentLawIrmaaAnnual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="panel-copy">Enter an owner-specific annual amount and valid start/end ages to build the ladder.</p>
          )}
          <p className="model-note">
            <Calculator /> This ladder changes account balances and recomputes taxable Social Security, ordinary federal tax, long-term capital gains, NIIT, and the entered state estimate each year. ACA and IRMAA columns are sensitivities using the published 2026 rules and today&apos;s entered premium/enrollee assumptions—not forecasts or amounts included in projected cash flow. Future ACA contribution tables, poverty guidelines, Medicare thresholds, premiums, and tax law are unknown. The model does not determine IRA basis or pro-rata taxability, conversion eligibility, five-year rules, withholding, estimated-tax timing, state conversion rules, or whether taxes should be paid from outside funds. Confirm the taxable amount before acting.
          </p>
        </Panel>
        <Panel title="Medicare IRMAA Worksheet" eyebrow="2026 PREMIUMS · 2024 LOOKBACK">
          <div className="form-grid">
            <Field
              label="2024 Medicare MAGI"
              value={plan.medicareIrmaaPlanning.magi2024}
              onChange={(value) => setMedicareIrmaaPlanning("magi2024", value)}
              prefix="$"
              step={1000}
              help="For IRMAA, Medicare MAGI is adjusted gross income plus tax-exempt interest. Use the amount from the return Social Security used, usually tax year 2024 for 2026 premiums."
            />
            <SelectField
              label="2024 IRMAA filing category"
              value={plan.medicareIrmaaPlanning.filingCategory}
              onChange={(value) =>
                setMedicareIrmaaPlanning(
                  "filingCategory",
                  value as PlannerData["medicareIrmaaPlanning"]["filingCategory"],
                )
              }
              options={[
                { value: "", label: "Choose the applicable category" },
                { value: "individual", label: "Individual return" },
                { value: "marriedJoint", label: "Married filing jointly" },
                {
                  value: "marriedSeparateLivedTogether",
                  label: "Married filing separately · lived together",
                },
              ]}
            />
            <Field
              label="Part B enrollees"
              value={plan.medicareIrmaaPlanning.partBEnrollees}
              onChange={(value) => setMedicareIrmaaPlanning("partBEnrollees", value)}
              suffix="people"
              max={2}
              help="Enter the number of household members actually enrolled in full Part B coverage during 2026."
            />
            <Field
              label="Part D enrollees"
              value={plan.medicareIrmaaPlanning.partDEnrollees}
              onChange={(value) => setMedicareIrmaaPlanning("partDEnrollees", value)}
              suffix="people"
              max={2}
              help="Part D IRMAA is separate from—and added to—the premium charged by the selected prescription drug plan."
            />
          </div>
          {medicareIrmaa ? (
            <div className="worksheet-grid">
              <div><span>2026 premium tier</span><strong>{medicareIrmaa.tierLabel}</strong></div>
              <div><span>Part B monthly premium · each</span><strong>{currency.format(medicareIrmaa.partBMonthlyPremiumPerEnrollee)}</strong></div>
              <div><span>Part B monthly IRMAA · each</span><strong>{currency.format(medicareIrmaa.partBMonthlyIrmaaPerEnrollee)}</strong></div>
              <div><span>Part D monthly IRMAA · each</span><strong>{currency.format(medicareIrmaa.partDMonthlyIrmaaPerEnrollee)}</strong></div>
              <div><span>Annual household IRMAA</span><strong>{currency.format(medicareIrmaa.annualHouseholdIrmaa)}</strong></div>
              <div><span>Known annual premiums</span><strong>{currency.format(medicareIrmaa.annualKnownHouseholdPremium)}</strong><small>Part B plus Part D IRMAA; Part D plan premiums excluded</small></div>
              <div>
                <span>Room before the next tier</span>
                <strong>{medicareIrmaa.roomBeforeNextTier === null ? "Top tier" : currency.format(medicareIrmaa.roomBeforeNextTier)}</strong>
                {medicareIrmaa.nextTierBoundary !== null && (
                  <small>
                    Next tier begins {medicareIrmaa.nextTierStartsAtBoundary ? "at" : "above"} {currency.format(medicareIrmaa.nextTierBoundary)}
                  </small>
                )}
              </div>
            </div>
          ) : (
            <p className="panel-copy">Choose the filing category from the return used for the 2026 IRMAA determination.</p>
          )}
          <p className="model-note">
            <Calculator /> This worksheet applies the published 2026 Part B and Part D IRMAA tiers to the entered lookback MAGI. It excludes Part D plan premiums, late-enrollment penalties, Part A premiums, immunosuppressive-drug-only Part B coverage, and any decision by Social Security to use a different return. IRMAA applies per enrolled person, even when a joint-return threshold is used. Future-year thresholds and premiums are not projected.{" "}
            <a href="https://www.ssa.gov/benefits/medicare/medicare-premiums.html" target="_blank" rel="noreferrer">SSA 2026 premium tables</a>
            {" · "}
            <a href="https://www.ssa.gov/medicare/lower-irmaa" target="_blank" rel="noreferrer">SSA life-changing-event guidance</a>
          </p>
        </Panel>
        <Panel title="ACA Premium Tax Credit Worksheet" eyebrow="2026 MARKETPLACE ESTIMATE">
          <div className="form-grid">
            <Field
              label="2026 household ACA MAGI"
              value={plan.acaPlanning.householdMagi}
              onChange={(value) => setAcaPlanning("householdMagi", value)}
              prefix="$"
              suffix="/ year"
              step={1000}
              help="Enter expected household MAGI before the planned Roth conversion above. Marketplace MAGI generally adds tax-exempt interest, nontaxable Social Security, and excluded foreign income to AGI."
            />
            <Field
              label="2026 tax family size"
              value={plan.acaPlanning.taxFamilySize}
              onChange={(value) => setAcaPlanning("taxFamilySize", value)}
              suffix="people"
              max={20}
              help="Usually the tax filer, spouse, and tax dependents—even family members who do not need Marketplace coverage."
            />
            <SelectField
              label="Poverty-guideline location"
              value={plan.acaPlanning.location}
              onChange={(value) =>
                setAcaPlanning(
                  "location",
                  value as PlannerData["acaPlanning"]["location"],
                )
              }
              options={[
                { value: "", label: "Choose a location" },
                { value: "contiguous", label: "48 states and Washington, D.C." },
                { value: "alaska", label: "Alaska" },
                { value: "hawaii", label: "Hawaii" },
              ]}
            />
            <Field
              label="Annual enrolled-plan premium"
              value={plan.acaPlanning.annualEnrollmentPremium}
              onChange={(value) => setAcaPlanning("annualEnrollmentPremium", value)}
              prefix="$"
              suffix="/ year"
              step={100}
              help="The unsubsidized premium for the Marketplace plan you expect to enroll in."
            />
            <Field
              label="Annual benchmark SLCSP premium"
              value={plan.acaPlanning.annualBenchmarkPremium}
              onChange={(value) => setAcaPlanning("annualBenchmarkPremium", value)}
              prefix="$"
              suffix="/ year"
              step={100}
              help="Use the annual second-lowest-cost Silver plan premium from the Marketplace for the covered household members, ages, ZIP code, and plan year."
            />
          </div>
          {acaPtc ? (
            <>
              <div className="worksheet-grid">
                <div><span>2025 poverty guideline used</span><strong>{currency.format(acaPtc.povertyGuideline)}</strong></div>
                <div><span>Household income as FPL</span><strong>{acaPtc.householdIncomePercentOfFpl.toFixed(1)}%</strong></div>
                <div><span>2026 applicable percentage</span><strong>{acaPtc.applicablePercentage === null ? "Eligibility review" : `${(acaPtc.applicablePercentage * 100).toFixed(2)}%`}</strong></div>
                <div><span>Expected benchmark contribution</span><strong>{currency.format(acaPtc.expectedHouseholdContribution)}</strong></div>
                <div><span>Potential annual premium tax credit</span><strong>{currency.format(acaPtc.potentialPremiumTaxCredit)}</strong></div>
                <div><span>Estimated enrolled-plan premium after PTC</span><strong>{currency.format(acaPtc.estimatedNetEnrollmentPremium)}</strong></div>
                <div><span>Income room through 400% FPL</span><strong>{currency.format(acaPtc.incomeRoomTo400PercentFpl)}</strong></div>
                <div>
                  <span>PTC after planned taxable Roth conversion</span>
                  <strong>{currency.format(acaPtcAfterConversion?.potentialPremiumTaxCredit ?? 0)}</strong>
                  <small>
                    Estimated PTC change: {currency.format((acaPtcAfterConversion?.potentialPremiumTaxCredit ?? 0) - acaPtc.potentialPremiumTaxCredit)}
                  </small>
                </div>
              </div>
              {acaPtc.status !== "standard-income-range" && (
                <p className="model-note">
                  <Calculator /> The entered income is {acaPtc.status === "below-standard-income-range" ? "below 100%" : "above 400%"} of the federal poverty level. This worksheet shows no credit because it only implements the standard 2026 income range. Marketplace, Medicaid, immigration, and other exception rules require an eligibility determination; the planner will not guess through them.
                </p>
              )}
            </>
          ) : (
            <p className="panel-copy">Enter a tax family size and choose the poverty-guideline location to estimate the 2026 credit.</p>
          )}
          <p className="model-note">
            <Calculator /> This is a potential premium-tax-credit estimate, not an eligibility determination or quote. It uses the 2026 IRS contribution table and the 2025 poverty guidelines used for 2026 Marketplace applications. It assumes otherwise-qualified Marketplace coverage and does not determine employer-plan affordability, minimum value, Medicare/Medicaid/CHIP/TRICARE eligibility, immigration status, married-filing exceptions, tobacco surcharges, cost-sharing reductions, advance-credit reconciliation, or monthly allocation. Enhanced pandemic-era credits ended December 31, 2025.{" "}
            <a href="https://www.irs.gov/pub/irs-drop/rp-25-25.pdf" target="_blank" rel="noreferrer">IRS Revenue Procedure 2025-25</a>
            {" · "}
            <a href="https://www.healthcare.gov/lower-costs/save-on-monthly-premiums/" target="_blank" rel="noreferrer">HealthCare.gov 2026 guidance</a>
          </p>
        </Panel>
        <Panel title="Required Minimum Distribution Worksheet" eyebrow="FIRST MODELED RMD YEAR">
          {firstRmdYear ? (
            <div className="worksheet-grid">
              <div><span>Projection year / your age</span><strong>{firstRmdYear.year} / {firstRmdYear.age}</strong></div>
              <div><span>Your RMD</span><strong>{currency.format(firstRmdYear.youRmd)}</strong></div>
              {plan.household.maritalStatus === "married" && <div><span>Partner RMD</span><strong>{currency.format(firstRmdYear.partnerRmd)}</strong></div>}
              <div><span>Total required distribution</span><strong>{currency.format(firstRmdYear.requiredMinimumDistribution)}</strong></div>
            </div>
          ) : (
            <p className="panel-copy">Enter each owner's birth year and assign tax-deferred accounts to an individual owner to project RMDs.</p>
          )}
          {has1959RmdReview && (
            <p className="model-note">
              <Calculator /> Birth year 1959 needs review: the final Treasury regulations reserve that applicable-age provision, so this planner does not guess or force an RMD start year.
            </p>
          )}
          <p className="model-note">
            <Calculator /> This planning estimate divides each owner's prior year-end tax-deferred balance by IRS Publication 590-B Table III. It assumes the distribution is taken in its applicable calendar year. It does not yet model a first-year April 1 delay, current-employer plan delay, 5% owner rules, inherited accounts, or the younger-spouse Table II exception. Excess RMD cash remains in the plan.
          </p>
        </Panel>
        <Panel title="Qualified Charitable Distribution Plan" eyebrow="2026 IRA RULES">
          <div className="form-grid">
            <Field
              label="Your intended annual QCD"
              value={plan.qcdPlanning.annualGiftYou}
              onChange={(value) => setQcdPlanning("annualGiftYou", value)}
              prefix="$"
              suffix="/ year"
              step={500}
              help="A recurring gift paid directly from an eligible IRA; it is not available for household spending."
            />
            <Field
              label="Your unused deductible IRA contribution offset"
              value={plan.qcdPlanning.unusedDeductibleContributionOffsetYou}
              onChange={(value) =>
                setQcdPlanning("unusedDeductibleContributionOffsetYou", value)
              }
              prefix="$"
              help="Cumulative deductible IRA contributions made after age 70½ that have not already reduced an earlier QCD exclusion."
            />
            {plan.household.maritalStatus === "married" && (
              <>
                <Field
                  label="Partner intended annual QCD"
                  value={plan.qcdPlanning.annualGiftPartner}
                  onChange={(value) => setQcdPlanning("annualGiftPartner", value)}
                  prefix="$"
                  suffix="/ year"
                  step={500}
                />
                <Field
                  label="Partner unused deductible IRA contribution offset"
                  value={plan.qcdPlanning.unusedDeductibleContributionOffsetPartner}
                  onChange={(value) =>
                    setQcdPlanning(
                      "unusedDeductibleContributionOffsetPartner",
                      value,
                    )
                  }
                  prefix="$"
                />
              </>
            )}
          </div>
          <div className="worksheet-grid">
            {qcdOwners.map(({ key, label, result }) => (
              <div key={key}>
                <span>{label} · {qcdStatusCopy[result.status]}</span>
                <strong>{currency.format(result.potentialExclusionBeforeContributionOffset)}</strong>
                <small>
                  {currency.format(result.eligibleIraBalance)} identified IRA balance
                  {result.potentialRmdSatisfied > 0
                    ? ` · up to ${currency.format(result.potentialRmdSatisfied)} of this year's RMD`
                    : ""}
                </small>
              </div>
            ))}
          </div>
          {firstQcdYear && (
            <div className="worksheet-grid">
              <div><span>First projected QCD year / age</span><strong>{firstQcdYear.year} / {firstQcdYear.age}</strong></div>
              <div><span>IRA distribution to charity</span><strong>{currency.format(firstQcdYear.qualifiedCharitableDistribution)}</strong></div>
              <div><span>Excluded from ordinary income</span><strong>{currency.format(firstQcdYear.qcdExcludedFromIncome)}</strong></div>
              <div><span>Taxable contribution-offset portion</span><strong>{currency.format(firstQcdYear.qcdTaxableAmount)}</strong></div>
              <div><span>RMD satisfied by QCD</span><strong>{currency.format(firstQcdYear.qcdRmdSatisfied)}</strong></div>
            </div>
          )}
          <p className="model-note">
            <Calculator /> A QCD must be paid directly by the IRA trustee to an eligible charity, and the owner must be at least age 70½ on the distribution date. The 2026 exclusion limit is {currency.format(111_000)} per eligible owner and a QCD can count toward that owner's RMD. Age 70 requires the exact birth and distribution dates, which this planner does not collect, so the projection begins no earlier than the first unambiguous eligible year.
          </p>
          <p className="model-note">
            <Calculator /> Mark eligible IRA sources on the Accounts page. The intended gift reduces that IRA balance and may satisfy RMDs, but it is never counted as spendable cash. The entered contribution offset is consumed before any QCD is excluded from income. The known 2026 ceiling is held flat in later years rather than guessing future IRS indexing. Continuing post-70½ deductible contributions, charity eligibility and acknowledgement, split-interest gifts, inherited IRAs, and exact transaction timing remain review items.
          </p>
        </Panel>
        <Panel title="Early Distribution Check" eyebrow="IRC SECTION 72(T)">
          <div className="form-grid">
            <Field
              label="Your confirmed annual exception"
              value={plan.earlyWithdrawalPlanning.annualConfirmedExceptionYou}
              onChange={(value) =>
                setEarlyWithdrawalPlanning(
                  "annualConfirmedExceptionYou",
                  value,
                )
              }
              prefix="$"
              suffix="/ year"
              step={500}
              help="Enter only the taxable distribution amount you have confirmed qualifies for an IRS exception to the additional 10% tax."
            />
            {plan.household.maritalStatus === "married" && (
              <Field
                label="Partner confirmed annual exception"
                value={
                  plan.earlyWithdrawalPlanning
                    .annualConfirmedExceptionPartner
                }
                onChange={(value) =>
                  setEarlyWithdrawalPlanning(
                    "annualConfirmedExceptionPartner",
                    value,
                  )
                }
                prefix="$"
                suffix="/ year"
                step={500}
              />
            )}
          </div>
          {firstEarlyDistributionYear ? (
            <div className="worksheet-grid">
              <div><span>First projected review year / age</span><strong>{firstEarlyDistributionYear.year} / {firstEarlyDistributionYear.age}</strong></div>
              <div><span>Confirmed exception applied</span><strong>{currency.format(firstEarlyDistributionYear.earlyDistributionExceptionAmount)}</strong></div>
              <div><span>Amount subject to additional tax</span><strong>{currency.format(firstEarlyDistributionYear.earlyDistributionPenaltyBase)}</strong></div>
              <div><span>Estimated 10% additional tax</span><strong>{currency.format(firstEarlyDistributionYear.earlyDistributionPenaltyTax)}</strong></div>
              <div><span>Unassigned tax-deferred amount to review</span><strong>{currency.format(firstEarlyDistributionYear.earlyDistributionReviewAmount)}</strong></div>
              <div><span>Roth amount requiring basis review</span><strong>{currency.format(firstEarlyDistributionYear.earlyRothWithdrawalReviewAmount)}</strong></div>
            </div>
          ) : (
            <p className="panel-copy">No pre-59½ retirement-account distributions are currently projected.</p>
          )}
          <p className="model-note">
            <Calculator /> The projection adds 10% to taxable, individually owned tax-deferred distributions before age 59½ unless covered by the entered confirmed-exception amount. Age 59 is conservatively treated as date-sensitive because the planner does not collect birth and transaction dates. Assign tax-deferred accounts to an owner so the correct age can be used.
          </p>
          <p className="model-note">
            <Calculator /> Exception rules vary by source and facts: examples include qualifying substantially equal periodic payments, disability, certain medical costs, terminal illness, qualified reservist distributions, and separation-from-service rules that generally apply to workplace plans rather than IRAs. This planner does not certify an exception. Roth distributions remain a review item until contribution basis and five-year holding periods are modeled.{" "}
            <a href="https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions" target="_blank" rel="noreferrer">IRS exception table</a>
            {" · "}
            <a href="https://www.irs.gov/taxtopics/tc558" target="_blank" rel="noreferrer">IRS Topic 558</a>
          </p>
        </Panel>
        <Panel title="Social Security Taxation Worksheet" eyebrow="FIRST MODELED BENEFIT YEAR">
          {socialSecurityYear ? (
            <div className="worksheet-grid">
              <div><span>Projection year / age</span><strong>{socialSecurityYear.year} / {socialSecurityYear.age}</strong></div>
              <div><span>Total benefits</span><strong>{currency.format(socialSecurityYear.socialSecurityIncome)}</strong></div>
              <div><span>Provisional income</span><strong>{currency.format(socialSecurityYear.socialSecurityProvisionalIncome)}</strong></div>
              <div><span>Taxable benefits</span><strong>{currency.format(socialSecurityYear.taxableSocialSecurity)}</strong></div>
              <div><span>Taxable share</span><strong>{(socialSecurityYear.socialSecurityIncome > 0 ? socialSecurityYear.taxableSocialSecurity / socialSecurityYear.socialSecurityIncome * 100 : 0).toFixed(1)}%</strong></div>
            </div>
          ) : (
            <p className="panel-copy">Add a Social Security income stream to see the first modeled year's provisional-income worksheet.</p>
          )}
          <p className="model-note">
            <Calculator /> Provisional income is one-half of benefits plus other taxable income and tax-exempt interest. The statutory thresholds are held flat, not inflation-indexed. This estimate does not handle benefit repayments, lump-sum elections, or special exclusions and adjustments.
          </p>
        </Panel>
        <Panel title="Projected Withdrawals" eyebrow="BY TAX TREATMENT">
          <ChartContainer
            config={{
              taxableWithdrawal: { label: "Taxable", color: "#2f7df4" },
              traditionalWithdrawal: {
                label: "Tax-Deferred",
                color: "#11a68a",
              },
              rothWithdrawal: { label: "Roth", color: "#8567e8" },
              hsaWithdrawal: { label: "HSA", color: "#dc5d79" },
              qualifiedCharitableDistribution: {
                label: "QCD Gift",
                color: "#996515",
              },
            }}
            className="h-[320px] w-full aspect-auto"
          >
            <BarChart data={withdrawalRows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="age" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => compactCurrency.format(value)} tickLine={false} axisLine={false} width={70} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => currency.format(Number(value))} />} />
              <Bar name="Tax-Deferred Withdrawal" dataKey="traditionalWithdrawal" stackId="w" fill="var(--color-traditionalWithdrawal)" />
              <Bar name="Taxable Withdrawal" dataKey="taxableWithdrawal" stackId="w" fill="var(--color-taxableWithdrawal)" />
              <Bar name="HSA Withdrawal" dataKey="hsaWithdrawal" stackId="w" fill="var(--color-hsaWithdrawal)" />
              <Bar name="QCD Gift" dataKey="qualifiedCharitableDistribution" stackId="w" fill="var(--color-qualifiedCharitableDistribution)" />
              <Bar name="Roth Withdrawal" dataKey="rothWithdrawal" stackId="w" fill="var(--color-rothWithdrawal)" radius={[3, 3, 0, 0]} />
              <Legend />
            </BarChart>
          </ChartContainer>
        </Panel>
        <p className="model-note">
          <Calculator /> Federal ordinary-income tax uses published 2026 IRS brackets and the basic standard deduction, inflation-indexed by your general inflation assumption in later projection years. The Roth conversion worksheet compares a user-entered taxable conversion with the current-year brackets but does not yet alter the projection. Social Security taxation uses the latest completed IRS Publication 915 worksheet (tax year 2025) with its statutory thresholds held flat. RMDs use the 2025 Publication 590-B Uniform Lifetime Table. QCD elections use the 2026 statutory ceiling held flat for later-year planning and exclude only the amount remaining after the entered deductible-contribution offset. The early-distribution estimate applies the 10% additional tax to modeled, taxable, owner-assigned withdrawals before age 59½ after a user-confirmed exception amount; it does not determine exception eligibility or Roth ordering. Taxable-account gains use aggregate adjusted basis and average-basis allocation as a planning estimate. State and capital-gains rates remain editable estimates. Credits, itemized and additional deductions, AMT, NIIT, IRMAA, ACA interactions, specific-lot accounting, and projected Roth conversion ladders are not yet included.{" "}
          <a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf" target="_blank" rel="noreferrer">
            IRS Rev. Proc. 2025-32
          </a>
          {" · "}
          <a href="https://www.irs.gov/pub/irs-pdf/p915.pdf" target="_blank" rel="noreferrer">IRS Publication 915 (2025)</a>
          {" · "}
          <a href="https://www.irs.gov/pub/irs-pdf/p590b.pdf" target="_blank" rel="noreferrer">IRS Publication 590-B (2025)</a>
          {" · "}
          <a href="https://www.irs.gov/pub/irs-drop/n-25-67.pdf" target="_blank" rel="noreferrer">IRS Notice 2025-67</a>
        </p>
      </>
    );
  };

  const renderData = () => (
    <>
      <SectionHeading title="Data & Privacy" description="Start here: choose whether this browser should save your plan before entering financial details." />
      <div className="privacy-banner">
        <ShieldCheck />
        <div>
          <span>LOCAL-ONLY BY DESIGN</span>
          <h2>Your Plan Never Leaves This Browser.</h2>
          <p>Calculations, charts, imports, exports, and PDF rendering all happen on your device. You can work without saving, create an encrypted local vault, or restore a plan you previously downloaded. The site contains no analytics, advertising pixels, telemetry, sign-in, or third-party data calls.</p>
        </div>
      </div>
      <div className="three-column">
        <Panel title="Encrypted Local Vault" eyebrow={vaultStatus.toUpperCase()}>
          <p className="panel-copy">Optional: save changes in this browser using AES-256-GCM encryption. Without a vault, the open plan lasts only for this browser session unless you download it. Your passphrase is kept only in memory and cannot be recovered.</p>
          <div className="button-stack">
            {vaultStatus === "unlocked" ? (
              <Button onClick={lockVault}>
                <Lock /> Lock vault
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setVaultError("");
                  setVaultOpen(true);
                }}
              >
                <LockKeyhole /> {vaultStatus === "locked" ? "Unlock vault" : "Create local vault"}
              </Button>
            )}
            {vaultStatus !== "off" &&
              (confirmErase ? (
                <div className="inline-confirm">
                  <span>Erase the saved vault?</span>
                  <Button variant="destructive" size="sm" onClick={eraseVault}>
                    Erase
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmErase(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmErase(true)}>
                  <Trash2 /> Erase saved vault
                </Button>
              ))}
          </div>
        </Panel>
        <Panel title="Download Raw Data" eyebrow="PORTABLE JSON">
          <p className="panel-copy">Save a readable copy you can inspect, version, and re-upload later. The raw file is not encrypted; store it carefully.</p>
          <Button variant="outline" onClick={exportData}>
            <Download /> Download plan
          </Button>
        </Panel>
        <Panel title="Restore a Plan" eyebrow="JSON IMPORT">
          <p className="panel-copy">Load a previously downloaded plan. Importing replaces the plan currently open on screen.</p>
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => importData(event.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileUp /> Upload plan
          </Button>
        </Panel>
      </div>
      <Panel title="Threat Model" eyebrow="WHAT ENCRYPTION CAN — AND CANNOT — DO">
        <div className="threat-grid">
          <div>
            <strong>Helps protect against</strong>
            <ul>
              <li>Someone casually opening your browser profile</li>
              <li>Unencrypted browser-profile backups</li>
              <li>Disk inspection without your passphrase</li>
            </ul>
          </div>
          <div>
            <strong>Cannot protect against</strong>
            <ul>
              <li>Malware or a malicious browser extension running while unlocked</li>
              <li>Screen capture, keylogging, or a compromised operating system</li>
              <li>A weak or reused passphrase</li>
            </ul>
          </div>
        </div>
      </Panel>
    </>
  );

  const content = activeSection === "currentBudget" || activeSection === "retirementBudget"
    ? <BudgetEditor benefits={plan.income} onBenefitChange={updateIncome} accounts={plan.accounts} household={plan.household} budget={plan.budget} onChange={budget => setPlan(current => ({ ...current, budget }))} retirement={activeSection === "retirementBudget"} married={plan.household.maritalStatus === "married"} legacyAnnual={plan.assumptions.annualSpending} linkedAnnual={{ housing: propertyTaxAnnual(plan) + homeInsuranceAnnual(plan) + mortgageAncillaryAnnual(plan), debt: debtPayoffSchedule(plan).slice(1, 13).reduce((sum, m) => sum + m.principalPaid + m.interestPaid, 0), health: plan.household.currentAge < 65 ? plan.healthcare.preMedicareAnnual : plan.healthcare.medicareAnnual, timed:plan.recurringCosts.filter(c=>plan.household.currentAge>=c.startAge&&plan.household.currentAge<=c.endAge).reduce((n,c)=>n+c.annualAmount,0) }} />
    : activeSection === "scenarios" ? <ScenarioLaboratory plan={plan} onChange={setPlan}/> : activeSection === "overview" ? (plan.laboratory?.settings.enabled ? <div className="budget-flow"><div className="section-heading"><h1>Plan Summary</h1><p>Monthly budget and funding model selected in Scenario Laboratory.</p></div><MonthlyResults result={projectMonthly(plan)}/></div> : renderOverview()) : activeSection === "household" ? renderHousehold() : activeSection === "portfolio" ? renderPortfolio() : activeSection === "income" ? renderIncome() : activeSection === "spending" ? renderSpending() : activeSection === "debt" ? renderDebt() : activeSection === "health" ? renderHealth() : activeSection === "taxes" ? renderTaxes() : renderData();

  return (
    <>
      <SidebarProvider>
        <Sidebar collapsible="offcanvas">
          <SidebarHeader className="brand-block">
            <div className="brand-mark">
              <CircleDollarSign />
            </div>
            <div>
              <strong>Open Retirement</strong>
              <span>Private planning tools</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>YOUR PLAN</SidebarGroupLabel>
              <SidebarGroupContent>
                <PlannerNavigation activeSection={activeSection} onSelect={setActiveSection} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="sidebar-privacy" data-save-state={saveStatus} role="status" aria-live="polite">
              <span className="vault-status-icon">
                <ShieldCheck />
              </span>
              <div>
                <strong>Nothing is uploaded</strong>
                <span>{saveState}</span>
              </div>
            </div>
            <a className="github-link" href="https://github.com/pyinthesky/financialplanner" target="_blank" rel="noreferrer">
              Open source on GitHub <ChevronRight />
            </a>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="app-shell">
          <header className="topbar">
            <div className="topbar-title">
              <SidebarTrigger className="md:hidden" />
              <Menu className="hidden md:block" />
              <span>{sections.find((section) => section.id === activeSection)?.label}</span>
            </div>
            <div className="topbar-actions">
              <Button className="vault-action" data-save-state={saveStatus} variant="ghost" aria-label={`Open data and privacy — ${saveState}`} onClick={() => setActiveSection("data")}>
                <span className="vault-status-icon">
                  {vaultStatus === "unlocked" ? <LockKeyhole /> : <Lock />}
                </span>
                <span className="hide-mobile">{saveStatus === "saving" ? "Saving encrypted…" : saveStatus === "failed" ? "Save failed" : vaultStatus === "unlocked" ? "Vault unlocked" : vaultStatus === "locked" ? "Vault locked" : "Not saved"}</span>
              </Button>
              <Button variant="outline" aria-label="Export plan data" onClick={exportData}>
                <Download />
                <span className="hide-mobile">Export</span>
              </Button>
              <Button aria-label="Create PDF report" onClick={() => window.setTimeout(() => window.print(), 120)}>
                <Printer />
                <span className="hide-mobile">PDF report</span>
              </Button>
            </div>
          </header>
          <main className="content-wrap">
            <div className="page-flow">{content}</div>
          </main>
          <footer className="site-footer">
            <span>Educational planning estimate — not financial, tax, legal, or medical advice.</span>
            <span>No ads · No tracking · No accounts</span>
          </footer>
        </SidebarInset>
      </SidebarProvider>
      <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{vaultStatus === "locked" ? "Unlock your local vault" : "Create an encrypted local vault"}</DialogTitle>
            <DialogDescription>{vaultStatus === "locked" ? "Enter the passphrase you used on this browser. It cannot be recovered." : "Your plan will be encrypted before it is saved in this browser. Use a unique passphrase you can remember."}</DialogDescription>
          </DialogHeader>
          <div className="field-stack">
            <Label htmlFor="vault-passphrase">Vault passphrase</Label>
            <Input
              id="vault-passphrase"
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlockOrCreateVault();
              }}
            />
            <p className="field-help">At least 10 characters. The passphrase never leaves this page.</p>
          </div>
          {vaultError && <p className="error-message">{vaultError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVaultOpen(false)}>
              Cancel
            </Button>
            <Button onClick={unlockOrCreateVault}>
              {vaultStatus === "locked" ? <Unlock /> : <LockKeyhole />}
              {vaultStatus === "locked" ? "Unlock" : "Create vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PrintReport data={plan} projection={projection} successRate={successRate} debtMonths={payoffMonths} />
    </>
  );
}
