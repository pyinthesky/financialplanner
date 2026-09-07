/* Synthetic user journey only. No real plan data is used in CI artifacts. */
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve('dist-pages');
const out = path.resolve('browser-evidence');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const relative = decodeURIComponent(url.pathname).replace(/^\/financialplanner\/?/, '');
  const file = path.resolve(root, relative || 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
  const evidence = [];
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const width of [320, 375, 390, 430, 768, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('http://127.0.0.1:4173/financialplanner/');
        console.log(`Checking ${name} at ${width}px`);
        const navigate = async label => {
          const nav = page.getByRole('button', { name: label, exact: true });
          if (!await nav.isVisible()) await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
          await page.getByRole('button', { name: label, exact: true }).click();
          const heading = label === 'Household' ? 'Household & Assumptions' : label;
          await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
        };
        const noOverflow = async label => {
          const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
          assert.ok(size.content <= size.viewport + 1, `${name} ${width} ${label}: ${JSON.stringify(size)}`);
        };
        await navigate('Current Budget');
        assert.equal(await page.locator('main input[type=number]').count(), 0, 'No prefilled financial entries');
        await page.getByRole('button', { name: 'Add Take-Home Pay', exact: true }).click();
        await page.getByLabel('Take-Home per Payment').fill('100');
        await page.getByLabel('Frequency', { exact: true }).selectOption('biweekly');
        await page.getByRole('button', { name: 'Food', exact: true }).click();
        await page.getByLabel('Current Amount').fill('10');
        await page.getByLabel('Description', { exact: true }).fill('Synthetic Bill');
        await noOverflow('current budget');
        await navigate('Retirement Budget');
        await page.getByLabel('In Retirement', { exact: true }).selectOption('replace');
        await page.getByLabel('Retirement Amount').fill('20');
        await page.getByLabel('Retirement Spending Source').selectOption('worksheet');
        await noOverflow('retirement budget');
        await page.screenshot({ path: path.join(out, `${name}-${width}-retirement.png`), fullPage: true });
        await navigate('Current Budget');
        await page.getByLabel('Current Amount').fill('15');
        await navigate('Retirement Budget');
        assert.equal(await page.getByLabel('Retirement Amount').inputValue(), '20', 'Explicit override survives current edit');
        // A deliberate zero remains visible and blank remains distinguishable.
        await page.getByLabel('Retirement Amount').fill('0');
        assert.equal(await page.getByLabel('Retirement Amount').inputValue(), '0');
        await page.getByLabel('Retirement Amount').fill('');
        assert.equal(await page.getByLabel('Retirement Amount').inputValue(), '');
        await page.getByLabel('Retirement Amount').fill('20');
        {
          const downloadPromise = page.waitForEvent('download');
          await page.getByRole('button', { name: 'Export plan data', exact: true }).click();
          const downloaded = await downloadPromise;
          const fixture = JSON.parse(fs.readFileSync(await downloaded.path(), 'utf8'));
          Object.assign(fixture.household, { currentAge: 60, retirementAge: 60, planToAge: 80 });
          fixture.accounts = [{ id: 'synthetic-cash', name: 'Synthetic Cash', owner: 'you', kind: 'cash', balance: 10000, annualContribution: 0 }];
          fixture.debts = [['A',100,50],['B',400,100],['C',1000,100]].map(([id,balance,minimumPayment]) => ({ id, name: id, kind: id === 'C' ? 'mortgage' : 'other', balance, minimumPayment, interestRate: 0 }));
          fixture.debtStrategy = { method: 'snowball', extraMonthlyPayment: 50 };
          await navigate('Data & Privacy');
          await page.locator('input[type=file]').setInputFiles({ name: 'synthetic-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
          await navigate('Retirement Budget');
          assert.equal(await page.getByLabel('Retirement Amount').inputValue(), '20', 'Export/import preserves the overlay');
          await navigate('Debt Payoff');
          await page.getByLabel('Payment Month', { exact: true }).selectOption('2');
          await noOverflow('debt cascade');
          await page.getByText('A ($50.00/month) is paid off.', { exact: false }).waitFor();
          await page.screenshot({ path: path.join(out, `${name}-${width}-debt.png`), fullPage: true });
          await navigate('Spending & Housing');
          const emptyLabel = await page.locator('.costs-table td[colspan]').evaluate(el => getComputedStyle(el, '::before').content);
          assert.ok(['none', 'normal', '""'].includes(emptyLabel), 'Empty cost cards have no overlapping column label');
          await page.getByLabel('Mortgage Account', { exact: true }).selectOption('C');
          for (const [label, value] of [['Total Statement Payment','130'],['Principal & Interest','100'],['Property Tax Escrow','20'],['Home Insurance Escrow','10'],['Mortgage Insurance','0'],['Other Escrow','0']]) await page.getByLabel(label, { exact: true }).fill(value);
          await page.getByRole('checkbox', { name: 'Use This Statement in the Plan', exact: true }).check();
          await noOverflow('mortgage statement');
          await page.screenshot({ path: path.join(out, `${name}-${width}-housing.png`), fullPage: true });
          await navigate('Household');
          await page.locator('summary').filter({ hasText: 'Use a Historical Inflation Reference' }).click();
          await page.getByRole('button', { name: /^Use .*Historical Reference$/ }).click();
          assert.ok(+(await page.getByLabel('General inflation', { exact: true }).inputValue()) > 2.5);
          await page.getByRole('button', { name: 'Undo Reference', exact: true }).click();
          assert.equal(await page.getByLabel('General inflation', { exact: true }).inputValue(), '');
          await noOverflow('historical reference');
        }
        if (name === 'chromium' && width === 1280) {
          await page.emulateMedia({ media: 'print' });
          assert.ok(await page.locator('.report-portfolio-chart').isVisible(), 'Print chart renders');
          await page.pdf({ path: path.join(out, 'synthetic-budget-report.pdf'), format: 'Letter', printBackground: true });
        }
        assert.deepEqual(errors, [], `${name} ${width} has no uncaught errors`);
        evidence.push({ engine: name, width, status: 'passed' });
        await page.close();
      }
    } finally { await browser.close(); }
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
})().catch(e => { console.error(`::error::${String(e).replace(/\n/g, ' ')}`); process.exitCode = 1; }).finally(() => server.close());
