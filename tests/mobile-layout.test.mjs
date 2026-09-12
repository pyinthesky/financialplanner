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
  for (const className of ["accounts-table", "income-table", "costs-table", "debts-table", "conversion-table"]) {
    assert.match(page, new RegExp(`mobile-card-table ${className}`));
    assert.match(css, new RegExp(`\\.${className} td(?::nth-child|::before)`));
  }
});

test("state tax input describes its limited planning scope", () => {
  assert.match(page, /Estimated effective state income-tax rate/);
  assert.match(page, /applied only to modeled ordinary taxable income/);
  assert.doesNotMatch(page, /\$\{plan\.household\.state \|\| "State"\} effective rate/);
});

test("mobile navigation closes after selecting a planning section", () => {
  assert.match(page, /if \(isMobile\) setOpenMobile\(false\)/);
  assert.match(page, /aria-current=\{activeSection === section\.id \? "page"/);
});

test("navigation, page, and panel titles use consistent title case", () => {
  for (const title of [
    "Loans & Debts",
    "Cash & Investments",
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

// Spacing, card padding and field columns are checked from computed browser layout
// in scripts/browser-check.cjs, rather than asserting particular CSS source strings.

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

test("plan summary uses prioritized signals without duplicate navigation", () => {
  assert.match(page, /className="planning-signal-list"/);
  assert.match(page, /<b>Next:<\/b>/);
  assert.match(page, /Signals use only the values currently in this plan and are estimates, not guarantees/);
  assert.doesNotMatch(page, /Review assumptions/i);
  assert.match(css, /\.planning-signal-list li\[data-tone="attention"\]/);
});

test("plan summary keeps cash, investments and real estate visible with the monthly engine", async () => {
  const position = await readFile(new URL("../components/summary-position.tsx", import.meta.url), "utf8");
  assert.match(page, /<SummaryPosition plan=\{plan\}\/>/);
  assert.match(position, />Cash & Investments</);
  assert.match(position, />Real Estate</);
});
