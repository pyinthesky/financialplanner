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
