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
  const engines={chromium,webkit};
  const requested=process.env.PLANNER_BROWSER;
  if(requested&&!Object.hasOwn(engines,requested))throw new Error('Unknown browser test engine');
  for (const [name, engine] of Object.entries(requested?{[requested]:engines[requested]}:engines)) {
    for (const width of [320, 375, 390, 430, 768, 1280]) {
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.setDefaultTimeout(30000);
        const errors = [];
        page.on('crash',()=>console.error(`Renderer crashed: ${name} ${width}px`));
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('http://127.0.0.1:4173/financialplanner/');
        console.log(`Checking ${name} at ${width}px`);
        const navigate = async label => {
          const nav = page.getByRole('button', { name: label, exact: true });
          if (!await nav.isVisible()) await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
          if(width<768){
            const drawer=page.locator('[data-mobile="true"][data-state="open"]');
            await drawer.waitFor({state:'visible'});
            await drawer.evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})));});
          }
          await page.getByRole('button', { name: label, exact: true }).click();
          const heading = label === 'Household' ? 'Household & Assumptions' : label;
          await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
          if (width < 768) await page.locator('[data-mobile="true"]').waitFor({ state: 'hidden' });
        };
        const noOverflow = async label => {
          const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
          assert.ok(size.content <= size.viewport + 1, `${name} ${width} ${label}: ${JSON.stringify(size)}`);
          const clipped=await page.locator('main input, main select, main button, main [data-slot="chart"], main .panel, main .budget-card, main .monthly-table td').evaluateAll(elements=>elements.filter(el=>{const r=el.getBoundingClientRect();return el.getClientRects().length&&r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&(r.left < -1||r.right > window.innerWidth+1);}).map(el=>({tag:el.tagName,className:el.className,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})).slice(0,5));
          assert.deepEqual(clipped,[],`${name} ${width} ${label}: visible content must fit even when an ancestor clips overflow`);
        };
        await navigate('Current Budget');
        assert.ok((await page.locator('main input[type=number]').evaluateAll(inputs=>inputs.map(i=>i.value))).every(v=>v===''), 'No prefilled financial entries');
        await page.getByRole('button', { name: 'Add Take-Home Pay', exact: true }).click();
        await page.getByLabel('Take-Home per Payment').fill('100');
        await page.getByLabel('Frequency', { exact: true }).selectOption('biweekly');
        await page.getByRole('button', { name: 'Food', exact: true }).click();
        await page.getByLabel('Current Amount').fill('10');
        await page.locator('summary').filter({hasText:'Use a Public Reference (Optional)'}).click();
        await page.getByLabel('Budget Reference',{exact:true}).selectOption('electricity');
        await page.getByLabel('Reference State',{exact:true}).selectOption('VA');
        await page.getByRole('button',{name:'Apply to Current Amount',exact:true}).click();
        await page.waitForFunction(el=>Number(el.value)>100,await page.getByLabel('Current Amount').elementHandle());
        await page.getByRole('button',{name:'Undo Reference Amount',exact:true}).click();
        await page.waitForFunction(el=>el.value==='10',await page.getByLabel('Current Amount').elementHandle());
        await page.locator('summary').filter({hasText:'Use a Public Reference (Optional)'}).click();
        await page.locator('summary').filter({hasText:'Break Down This Amount'}).click();
        await page.getByRole('button',{name:'Add Bill Allocation',exact:true}).click();
        await page.getByLabel('Current Allocation',{exact:true}).fill('5');
        await page.getByLabel('Allocation Label',{exact:true}).fill('Synthetic Detail');
        await page.locator('summary').filter({hasText:'Break Down This Amount'}).click();
        await page.locator('summary').filter({hasText:'Edit Bill Details'}).click();
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
          fixture.budget.timeline={startYear:2026,retirementMonthYou:'2026-01',retirementMonthPartner:''};
          fixture.budget.reviewed=true;
          fixture.housing.homeValue=2000;
          fixture.accounts = [{ id: 'synthetic-cash', name: 'Synthetic Cash', owner: 'you', kind: 'cash', balance: 10000, annualContribution: 0 }];
          fixture.debts = [['A',100,50],['B',400,100],['C',1000,100]].map(([id,balance,minimumPayment]) => ({ id, name: id, kind: id === 'C' ? 'mortgage' : 'other', balance, minimumPayment, interestRate: 0 }));
          fixture.debtStrategy = { method: 'snowball', extraMonthlyPayment: 50 };
          await navigate('Data & Privacy');
          await page.locator('input[type=file]').setInputFiles({ name: 'synthetic-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
          await page.getByRole('button', { name: /Open data and privacy — Imported/ }).waitFor();
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
          await page.waitForFunction(el => Number(el.value) > 2.5, await page.getByLabel('General inflation', { exact: true }).elementHandle());
          assert.ok(+(await page.getByLabel('General inflation', { exact: true }).inputValue()) > 2.5);
          await page.getByRole('button', { name: 'Undo Reference', exact: true }).click();
          await page.waitForFunction(el => el.value === '', await page.getByLabel('General inflation', { exact: true }).elementHandle());
          assert.equal(await page.getByLabel('General inflation', { exact: true }).inputValue(), '');
          await noOverflow('historical reference');
          await navigate('Scenario Laboratory');
          await page.getByRole('checkbox',{name:'Use Monthly Results in Plan Summary and PDF',exact:true}).check();
          await page.getByRole('button',{name:'Create Scenario',exact:true}).click();
          await page.getByLabel('Scenario Name',{exact:true}).fill('Synthetic Scenario');
          await page.getByLabel('Everyday Spending Change / %',{exact:true}).fill('50');
          await page.locator('summary').filter({hasText:'Mortgage Payoff versus Keeping the Loan'}).click();
          await page.getByRole('checkbox',{name:'Include a Funded Mortgage Payoff',exact:true}).check();
          await page.getByLabel('Mortgage to Pay Off',{exact:true}).selectOption('C');
          await page.getByLabel('Payoff Month',{exact:true}).fill('2026-03');
          await page.getByRole('button',{name:'Create Scenario',exact:true}).click();
          await page.getByLabel('Scenario Name',{exact:true}).fill('Synthetic Home Move');
          await page.locator('summary').filter({hasText:'Home Sale & Cash-Funded Downsize'}).click();
          await page.getByRole('checkbox',{name:'Include a Home Move',exact:true}).check();
          await page.getByLabel('Sale Month',{exact:true}).fill('2026-03');
          await page.getByLabel('Mortgage Settled at Sale',{exact:true}).selectOption('C');
          for(const [label,value] of [['Home Sale Price','2500'],['Selling Costs','100'],['Adjusted Home Tax Basis','1000'],['Replacement Home Cash Price','1000'],['Replacement Closing Costs','50'],['New Rent / HOA / Maintenance per Month','0'],['New Property Tax per Year','0'],['New Home / Renters Insurance per Year','0']])await page.getByLabel(label,{exact:true}).fill(value);
          await page.getByRole('checkbox',{name:'I confirm a long-term, standard personal-home sale with none of the excluded special cases.',exact:true}).check();
          await page.locator('summary').filter({hasText:'Scenario Cash Policy & Care / Life Events'}).click();
          await page.getByRole('button',{name:'Customize Scenario Events',exact:true}).click();
          const scenarioEvents=page.getByRole('heading',{name:'Scenario Events',exact:true}).locator('..');
          await scenarioEvents.getByRole('button',{name:'Add Life Event',exact:true}).click();
          await scenarioEvents.getByLabel('Event Month',{exact:true}).fill('2026-06');
          await scenarioEvents.getByLabel('Repeat Expense through Month',{exact:true}).fill('2026-08');
          await scenarioEvents.getByLabel('Event Amount',{exact:true}).fill('50');
          await page.getByRole('heading',{name:'Selected Scenario Results',exact:true}).waitFor();
          await page.locator('summary').filter({hasText:'Uncertainty: Compare Matching Market Paths'}).click();
          for(const [label,value] of [['Simulation Mean Annual Return / %','0'],['Annual Return Standard Deviation / %','0'],['Annual Investment Fee / %','0'],['Number of Paths','3'],['Repeatable Integer Seed','1']])await page.getByLabel(label,{exact:true}).fill(value);
          await page.getByRole('button',{name:'Run Local Simulation',exact:true}).click();
          await page.getByText('Simulation Complete',{exact:true}).waitFor();
          await noOverflow('scenario laboratory');
          await page.screenshot({path:path.join(out,`${name}-${width}-scenarios.png`),fullPage:true});
          const save=page.waitForEvent('download');
          await page.getByRole('button',{name:'Export plan data',exact:true}).click();
          const exported=JSON.parse(fs.readFileSync(await (await save).path(),'utf8'));
          assert.equal(exported.laboratory.scenarios[0].overrides.spendingChangePercent,50);
          assert.equal(exported.laboratory.settings.enabled,true);
          assert.equal(exported.laboratory.simulation.samples,3);
          assert.equal(exported.laboratory.scenarios[1].overrides.homeMove.salePrice,2500);
          assert.equal(exported.laboratory.scenarios[1].overrides.events[0].throughMonth,'2026-08');
          assert.equal(exported.laboratory.scenarios[0].overrides.mortgagePayoff.month,'2026-03');
          await navigate('Data & Privacy');
          await page.locator('input[type=file]').setInputFiles({name:'synthetic-scenarios.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
          await page.getByRole('button',{name:/Open data and privacy — Imported/}).waitFor();
          await navigate('Plan Summary');
          await page.getByRole('heading',{name:'Monthly Planning Summary',exact:true}).waitFor();
          await page.getByRole('heading',{name:'Where the Money Goes',exact:true}).waitFor();
          const assetChart=page.locator('.monthly-results .recharts-wrapper').first();
          await assetChart.scrollIntoViewIfNeeded();
          // Capture the finished user-visible animation, not its empty first frame.
          await page.waitForTimeout(1800);
          assert.ok(await assetChart.locator('.recharts-area-area').evaluateAll(paths=>paths.some(p=>p.getBBox().width>0&&p.getBBox().height>0)), 'Funded portfolio draws a visible area');
          await page.locator('.monthly-results .recharts-wrapper').nth(1).scrollIntoViewIfNeeded();
          await page.waitForTimeout(1800);
          await page.evaluate(()=>window.scrollTo(0,0));
          await page.locator('summary').filter({hasText:'Monthly Ledger Details'}).click();
          await noOverflow('expanded monthly ledger');
          await page.locator('summary').filter({hasText:'Monthly Ledger Details'}).click();
          await noOverflow('monthly summary');
          await page.screenshot({path:path.join(out,`${name}-${width}-monthly-summary.png`),fullPage:true});
        }
        if (name === 'chromium' && width === 1280) {
          await page.emulateMedia({ media: 'print' });
          assert.ok(await page.getByRole('img',{name:'Monthly Engine Portfolio Projection',exact:true}).isVisible(), 'Monthly print chart renders');
          assert.ok(await page.getByRole('img',{name:'Saved Scenarios on Shared Axes',exact:true}).isVisible(), 'Scenario print chart renders');
          await page.pdf({ path: path.join(out, 'synthetic-budget-report.pdf'), format: 'Letter', printBackground: true });
        }
        assert.deepEqual(errors, [], `${name} ${width} has no uncaught errors`);
        evidence.push({ engine: name, width, status: 'passed' });
        await page.close();
      } finally { await browser.close(); }
    }
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
})().catch(e => { console.error(`::error::${String(e).replace(/\n/g, ' ')}`); process.exitCode = 1; }).finally(() => server.close());
