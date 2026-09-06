import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("mobile charts fit their panel instead of forcing horizontal scrolling", () => {
  assert.match(css, /\.chart-panel \[data-slot="chart"\] \{ min-width: 0;/);
  assert.match(css, /\.chart-panel \{ overflow: hidden; \}/);
  assert.doesNotMatch(css, /min-width:\s*620px/);
});

test("data-entry tables switch to labeled cards on mobile", () => {
  for (const className of ["accounts-table", "income-table", "costs-table", "debts-table"]) {
    assert.match(page, new RegExp(`mobile-card-table ${className}`));
    assert.match(css, new RegExp(`\\.${className} td:nth-child`));
  }
});

test("mobile navigation closes after selecting a planning section", () => {
  assert.match(page, /if \(isMobile\) setOpenMobile\(false\)/);
  assert.match(page, /aria-current=\{activeSection === section\.id \? "page"/);
});

test("the privacy page starts the guided journey and plan summary ends it", () => {
  const privacyPosition = page.indexOf('{ id: "data", label: "Data & Privacy"');
  const householdPosition = page.indexOf('{ id: "household", label: "Household"');
  const summaryPosition = page.indexOf('{ id: "overview", label: "Plan Summary"');
  assert.ok(privacyPosition >= 0 && privacyPosition < householdPosition);
  assert.ok(summaryPosition > householdPosition);
  assert.match(page, /useState<SectionId>\("data"\)/);
});

test("the privacy start explains all local persistence choices", () => {
  assert.match(page, /You can work without saving, create an encrypted local vault, or restore a plan/);
  assert.match(page, /Without a vault, the open plan lasts only for this browser session/);
});

test("navigation, page, and panel titles use consistent title case", () => {
  for (const title of [
    "Spending & Housing",
    "Debt Payoff",
    "Health & Long-Term Care",
    "Taxes & Withdrawals",
    "Household & Assumptions",
    "Portfolio by Tax Treatment",
    "Required Minimum Distribution Worksheet",
  ]) {
    assert.ok(page.includes(title), `expected title-cased label: ${title}`);
  }

  for (const oldTitle of [
    "Spending & housing",
    "Debt payoff",
    "Health & long-term care",
    "Taxes & withdrawals",
    "Portfolio by tax treatment",
  ]) {
    assert.ok(!page.includes(oldTitle), `found sentence-cased title: ${oldTitle}`);
  }
});

test("chart legends expose human-readable names instead of internal data keys", () => {
  for (const name of [
    "Tax-Deferred Withdrawal",
    "Taxable Withdrawal",
    "HSA Withdrawal",
    "Roth Withdrawal",
    "Guaranteed Income",
    "Portfolio Withdrawals",
    "Planned Spending",
  ]) {
    assert.match(page, new RegExp(`name="${name}"`));
  }

  assert.doesNotMatch(page, /<(?:Area|Bar|Line)(?![^>]*\bname=)[^>]*\bdataKey=/);
});

test("every quantitative editor uses the shared visible-affix control", () => {
  const numericInputTags = page.match(/<NumericInput\b/g) ?? [];
  assert.equal(numericInputTags.length, 1, "only the shared affixed control should render NumericInput directly");
  assert.match(page, /function AffixedNumericInput/);
  assert.match(page, /prefix="\$" suffix="\/ year"/);
  assert.match(page, /prefix="\$"[\s\S]{0,80}suffix="\/ month"/);
  assert.match(page, /suffix="years old"/);
  assert.match(page, /suffix="YYYY"/);
  assert.match(page, /suffix="%"/);
});

test("affixed table inputs stay bounded on narrow screens", () => {
  assert.match(css, /\.table-wrap \.input-affix input \{ min-width: 0;/);
  assert.match(css, /\.mobile-card-table \.input-affix \{ width: 100%; min-width: 0; \}/);
});

test("native selects remain bounded and leave room for text descenders", async () => {
  const nativeSelect = await readFile(new URL("../components/ui/native-select.tsx", import.meta.url), "utf8");

  assert.match(nativeSelect, /relative w-full min-w-0 max-w-full/);
  assert.match(nativeSelect, /min-h-11 w-full min-w-0 max-w-full/);
  assert.match(nativeSelect, /py-2\.5[^\n]*leading-5/);
  assert.doesNotMatch(nativeSelect, /\bh-9\b/);
  assert.doesNotMatch(nativeSelect, /\bw-fit\b/);
});

test("narrow layouts contain long controls without hiding card content", () => {
  assert.match(css, /html, body \{[\s\S]*overflow-x: clip;/);
  assert.match(css, /\.app-shell \{ min-width: 0; max-width: 100%; overflow-x: clip;/);
  assert.match(css, /\.page-flow > \*,[\s\S]*\.threat-grid\) > \* \{ min-width: 0; \}/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.mobile-card-table td \{ white-space: normal; \}/);
  assert.match(css, /\.mobile-card-table \[data-slot="native-select-wrapper"\] \{ width: 100%; min-width: 0; max-width: 100%; \}/);
});

test("encrypted vault saving has explicit, accessible visual states", () => {
  assert.match(page, /type SaveStatus = "unsaved" \| "locked" \| "saving" \| "saved" \| "failed"/);
  assert.match(page, /data-save-state=\{saveStatus\} role="status" aria-live="polite"/);
  assert.match(page, /setSaveStatus\("saving"\)/);
  assert.match(page, /setSaveStatus\("saved"\)/);
  assert.match(page, /setSaveStatus\("failed"\)/);
  assert.match(css, /@keyframes vault-saving-pulse/);
  assert.match(css, /@keyframes vault-saving-ring/);
});

test("vault animation respects reduced-motion preferences", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*vault-action\[data-save-state="saving"\][\s\S]*animation: none/);
});

test("page-level cards and sections use one consistent vertical rhythm", () => {
  assert.match(page, /<div className="page-flow">\{content\}<\/div>/);
  assert.match(css, /\.page-flow \{ display: flex; min-width: 0; flex-direction: column; gap: 1rem; \}/);
  assert.match(css, /\.page-flow > :where\(\.metric-grid, \.overview-grid, \.three-column, \.debt-topline, \.privacy-banner\) \{ margin-bottom: 0; \}/);
  assert.match(css, /\.page-flow > :where\(\.planner-panel, \.model-note, \.summary-strip, \.calculated-line\) \{ margin-top: 0; \}/);
});

test("mobile page rhythm stays compact while preserving card separation", () => {
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.page-flow \{ gap: \.8rem; \}/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.page-flow > \.section-heading \{ margin-bottom: \.35rem; \}/);
  assert.match(css, /@media \(max-width: 460px\)[\s\S]*\.page-flow \{ gap: \.7rem; \}/);
  assert.match(css, /@media \(max-width: 460px\)[\s\S]*\.planner-panel \{ padding: \.85rem; \}/);
});

test("primary mobile actions meet a 44px touch target", () => {
  assert.match(css, /\.topbar-actions button \{ width: 2\.75rem;/);
  assert.match(css, /\[data-sidebar="menu-button"\] \{ min-height: 3rem; \}/);
  assert.match(css, /\.section-heading button \{ width: 100%; min-height: 2\.75rem; \}/);
});

test("the PDF report is removed from screen layout and enabled only for printing", () => {
  assert.match(css, /\.print-report \{ display: none; \}/);
  assert.match(css, /@media print[\s\S]*\.print-report \{ display: block;/);
  assert.doesNotMatch(css, /left:\s*-200vw/);
});

test("the PDF portfolio chart uses precomputed SVG geometry instead of hidden responsive measurement", () => {
  assert.match(page, /buildPrintPortfolioChart\(projection\)/);
  assert.match(page, /<svg className="report-portfolio-chart"/);
  assert.match(page, /<polygon points=\{series\.points\}/);
  assert.doesNotMatch(page, /initialDimension=\{\{ width: 900, height: 310 \}\}/);
  assert.match(css, /\.report-portfolio-chart \{ display: block; width: 100%; height: auto;/);
});
