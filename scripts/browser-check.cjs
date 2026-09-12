/* Synthetic user journey only. No real plan data is used in CI artifacts. */
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve('dist-pages');
const out = path.resolve('browser-evidence');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.md': 'text/plain', '.webp': 'image/webp' };
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
        if(width===320){
          for(const resource of ['llms.txt','import-guide.md','schemas/plan-v2.schema.json','examples/blank-plan-v2.json']){
            const response=await page.request.get('http://127.0.0.1:4173/financialplanner/'+resource);
            assert.equal(response.status(),200,`Public import resource: ${resource}`);
            if(resource.endsWith('.json'))assert.ok(await response.json());
            else assert.match(await response.text(),/^# /);
          }
          assert.equal(await page.locator('link[rel="describedby"]').getAttribute('href'),'./llms.txt');
        }
        console.log(`Checking ${name} at ${width}px`);
        let navigationChecked=false;
        const navigate = async label => {
          const nav = page.getByRole('button', { name: label, exact: true });
          // Initial React mounting can briefly precede navigation. Desktop has no drawer toggle.
          if (width>=768) await nav.waitFor({state:'visible'});
          else if (!await nav.isVisible()) await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
          if(width<768){
            const drawer=page.locator('[data-mobile="true"][data-state="open"]');
            await drawer.waitFor({state:'visible'});
            await drawer.evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})));});
          }
          if(!navigationChecked){
            const menu=page.getByRole('navigation',{name:'Planner Sections',exact:true});
            assert.deepEqual(await menu.getByRole('heading').allTextContents(),['Your Plan','Results','Explore']);
            assert.deepEqual(await menu.getByRole('button').evaluateAll(items=>items.map(el=>el.getAttribute('aria-label'))),['Welcome','Household','Cash & Investments','Pensions & Social Security','Loans & Debts','Real Estate','Health & Long-Term Care','Taxes & Withdrawals','Current Budget','Retirement Budget','Plan Summary','Scenario Laboratory','Open Enrollment','Knowledge Center','Data & Privacy']);
            assert.equal(await menu.locator('details, [aria-expanded]').count(),0,'Groups never require expanding');
            await page.screenshot({path:path.join(out,`${name}-${width}-grouped-navigation.png`)});
            navigationChecked=true;
          }
          await page.getByRole('button', { name: label, exact: true }).click();
          const heading = label === 'Welcome' ? 'Make a Plan for the Life You Want.' : label === 'Household' ? 'Household & Assumptions' : label;
          await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
          if (width < 768) await page.locator('[data-mobile="true"]').waitFor({ state: 'hidden' });
        };
        const noOverflow = async label => {
          const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
          assert.ok(size.content <= size.viewport + 1, `${name} ${width} ${label}: ${JSON.stringify(size)}`);
          const clipped=await page.locator('main input, main select, main button, main [data-slot="chart"], main .panel, main .budget-card, main .monthly-table td').evaluateAll(elements=>elements.filter(el=>{const r=el.getBoundingClientRect();return el.getClientRects().length&&r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&(r.left < -1||r.right > window.innerWidth+1);}).map(el=>({tag:el.tagName,className:el.className,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})).slice(0,5));
          assert.deepEqual(clipped,[],`${name} ${width} ${label}: visible content must fit even when an ancestor clips overflow`);
          const wrappedAmounts=await page.locator('main .budget-metrics strong').evaluateAll(elements=>elements.filter(el=>{if(!el.textContent.trim().startsWith('$'))return false;const range=document.createRange();range.selectNodeContents(el);const rects=[...range.getClientRects()];return rects.length>1||el.scrollWidth>el.clientWidth+1;}).map(el=>el.textContent));
          assert.deepEqual(wrappedAmounts,[],`${name} ${width} ${label}: summary amounts stay fully readable on one line`);
          // Verify rendered geometry: a viewport-overflow check alone misses uneven
          // padding, collapsed section gaps, and grids squeezed by nested cards.
          const layoutProblems=await page.locator('[data-layout="content"]').evaluate(main=>{
            const visible=el=>el.getClientRects().length&&el.getBoundingClientRect().height>0;
            const problems=[];
            const expectedPadding=window.innerWidth>=1280?20:window.innerWidth>=768?16:12;
            for(const card of main.querySelectorAll('[data-layout="card"]')){
              if(!visible(card))continue;
              const style=getComputedStyle(card);
              for(const side of ['paddingTop','paddingRight','paddingBottom','paddingLeft']){
                if(Math.abs(parseFloat(style[side])-expectedPadding)>.5)problems.push(`Card ${side}: ${style[side]}`);
              }
            }
            const flow=main.querySelector('.page-flow');
            if(flow){
              const children=[...flow.children].filter(visible);
              const expectedGap=window.innerWidth>=768?16:12;
              for(let i=1;i<children.length;i++){
                const gap=children[i].getBoundingClientRect().top-children[i-1].getBoundingClientRect().bottom;
                if(Math.abs(gap-expectedGap)>1)problems.push(`Page gap: ${gap}`);
              }
            }
            for(const grid of main.querySelectorAll('[data-layout="form"]')){
              if(!visible(grid))continue;
              const bounds=grid.getBoundingClientRect();
              for(const field of [...grid.children].filter(visible)){
                const r=field.getBoundingClientRect();
                if(r.left<bounds.left-1||r.right>bounds.right+1)problems.push('Field exceeds form grid');
              }
            }
            return problems.slice(0,10);
          });
          if(layoutProblems.length)await page.screenshot({path:path.join(out,`${name}-${width}-layout-failure.png`),fullPage:true});
          assert.deepEqual(layoutProblems,[],`${name} ${width} ${label}: shared card padding, section gaps and form containment`);
        };
        const checkDialog = async () => {
          const dialog=page.getByRole('dialog');
          await dialog.evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})));});
          const violations=await dialog.evaluate(el=>{
            const bounds=el.getBoundingClientRect();
            return [...el.querySelectorAll('[data-slot="dialog-title"], [data-slot="dialog-description"], [data-slot="dialog-footer"] button')].filter(child=>{const r=child.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||child.scrollWidth>child.clientWidth+1;}).map(child=>child.textContent);
          });
          assert.deepEqual(violations,[],`${name} ${width}: dialog text and buttons fit the popup`);
        };
        await page.getByRole('heading',{name:'Make a Plan for the Life You Want.',exact:true}).waitFor();
        assert.doesNotMatch(await page.locator('[data-layout="content"]').innerText(),/AES|JSON|PBKDF2/,'Welcome uses everyday language');
        await page.locator('.welcome-hero-art').evaluate(img=>img.decode());
        const hero=await page.locator('.welcome-hero').evaluate(el=>{
          const image=el.querySelector('img'),copy=el.querySelector('.welcome-hero-copy');
          const box=el.getBoundingClientRect(),art=image.getBoundingClientRect(),text=copy.getBoundingClientRect();
          return {loaded:image.naturalWidth>0,local:new URL(image.currentSrc).origin===location.origin,decorative:image.alt==='',fits:art.left>=box.left&&art.right<=box.right+1,stacked:art.top>=text.bottom-1};
        });
        assert.ok(hero.loaded&&hero.local&&hero.decorative&&hero.fits,'Hero artwork loads locally, stays decorative and fits');
        if(width<768)assert.ok(hero.stacked,'Mobile artwork sits below all hero text and actions');
        await noOverflow('Welcome');
        await page.screenshot({path:path.join(out,`${name}-${width}-welcome.png`),fullPage:true});
        await page.getByRole('button',{name:'Start My Plan',exact:true}).click();
        await page.getByRole('heading',{name:'Household & Assumptions',exact:true}).waitFor();
        assert.ok((await page.locator('main input[type=number]').evaluateAll(inputs=>inputs.map(i=>i.value))).every(v=>v===''),'Start opens blank Household directly');
        const setup=page.getByRole('navigation',{name:'Plan Setup Steps',exact:true});
        if(width<768){
          const rect=await setup.evaluate(el=>({bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height}));
          await page.screenshot({path:path.join(out,`${name}-${width}-setup-geometry.png`)});
          assert.ok(Math.abs(rect.bottom-900)<=1&&rect.height<128,`Mobile setup controls stay visible with reserved space: ${JSON.stringify(rect)}`);
        }
        await noOverflow('Household with setup controls');
        await page.screenshot({path:path.join(out,`${name}-${width}-setup.png`)});
        await setup.getByRole('button',{name:'Next: Cash & Investments',exact:true}).click();
        await page.getByRole('heading',{name:'Cash & Investments',exact:true}).first().waitFor();
        await setup.getByRole('button',{name:'Back',exact:true}).click();
        await page.getByRole('heading',{name:'Household & Assumptions',exact:true}).waitFor();
        await setup.getByRole('button',{name:'Back',exact:true}).click();
        await page.getByRole('heading',{name:'Make a Plan for the Life You Want.',exact:true}).waitFor();
        await navigate('Knowledge Center');
        assert.equal(await page.getByLabel('Illustration Savings Rate',{exact:true}).count(),0,'Illustration requires explicit loading');
        await page.getByRole('button',{name:'Explore the Savings Curve',exact:true}).click();
        const savingsRate=page.getByLabel('Illustration Savings Rate',{exact:true});
        await savingsRate.focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await savingsRate.inputValue(),'26');
        assert.ok((await page.locator('[data-savings-illustration] svg desc').textContent()).includes('26%'));
        const axisSize=await page.locator('[data-savings-illustration] svg text').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)*el.ownerSVGElement.getBoundingClientRect().width/el.ownerSVGElement.viewBox.baseVal.width);
        assert.ok(axisSize>=11.5,'Savings-curve labels remain legible at actual rendered size');
        assert.equal(await page.locator('[data-guide]').count(),9);
        await page.getByLabel('What Would You Like to Understand?').fill('  IAPD  ');
        assert.equal(await page.locator('[data-guide]').count(),1);
        const guide=page.locator('[data-guide="advisor-fees"]');
        await guide.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await guide.getAttribute('open'),'');
        const source=guide.getByRole('link',{name:/IAPD Registration Search/});
        assert.equal(await source.getAttribute('href'),'https://adviserinfo.sec.gov/');
        assert.equal(await source.getAttribute('rel'),'noopener noreferrer');
        await noOverflow('Knowledge Center expanded advisor guide');
        await page.screenshot({path:path.join(out,`${name}-${width}-knowledge.png`),fullPage:true});
        await page.getByRole('button',{name:'Health & Benefits',exact:true}).click();
        assert.equal(await page.locator('[data-guide]').count(),0);
        await page.getByRole('button',{name:'Clear Search and Filters',exact:true}).click();
        assert.equal(await page.locator('[data-guide]').count(),9);
        await navigate('Open Enrollment');
        assert.equal(await page.locator('main .oe-person').count(),0,'Enrollment starts without people');
        assert.ok((await page.locator('main input[type=number]').evaluateAll(inputs=>inputs.map(i=>i.value))).every(v=>v===''),'Enrollment starts blank');
        await navigate('Current Budget');
        assert.ok((await page.locator('main input[type=number]').evaluateAll(inputs=>inputs.map(i=>i.value))).every(v=>v===''), 'No prefilled financial entries');
        await navigate('Household');
        await page.getByRole('button', { name: 'Add Take-Home Pay', exact: true }).click();
        await page.getByLabel('Take-Home per Payment').fill('100');
        await page.getByLabel('Frequency', { exact: true }).selectOption('biweekly');
        await navigate('Current Budget');
        const food = () => page.locator('.compact-category').filter({has:page.locator('summary > span').filter({hasText:/^Food/})});
        const expandFood = async () => { const d=food(); if(!await d.getAttribute('open') && await d.getAttribute('open')!== '') await d.locator('summary').click(); };
        const currentAmount=()=>page.getByLabel('Current Amount — suggested-food-home',{exact:true});
        const retirementAmount=()=>page.getByLabel('Retirement Amount — suggested-food-home',{exact:true});
        await expandFood();
        await currentAmount().fill('10');
        await page.getByRole('button',{name:'Public Reference — suggested-food-home',exact:true}).click();
        await page.getByRole('button',{name:'Apply Reference',exact:true}).click();
        await page.waitForFunction(el=>Number(el.value)>100,await currentAmount().elementHandle());
        await page.getByRole('button',{name:'Undo Reference Amount',exact:true}).click();
        assert.equal(await currentAmount().inputValue(),'10');
        await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.getByLabel('Bill Name — suggested-food-home',{exact:true}).fill('Synthetic Bill');
        assert.equal(await page.getByText('Break Down This Amount',{exact:true}).count(),0);
        await page.getByRole('button',{name:'Bill Timing — suggested-food-home',exact:true}).click();
        await page.getByLabel('Next Due Date',{exact:true}).fill('2026-01-15');
        await page.getByRole('button',{name:'Close',exact:true}).click();
        await noOverflow('current budget');
        await navigate('Retirement Budget');
        await expandFood();
        await retirementAmount().fill('20');
        await page.getByLabel('Retirement Spending Source').selectOption('worksheet');
        await noOverflow('retirement budget');
        await page.screenshot({ path: path.join(out, `${name}-${width}-retirement.png`), fullPage: true });
        await navigate('Current Budget');
        await expandFood();
        await currentAmount().fill('15');
        await navigate('Retirement Budget');
        await expandFood();
        assert.equal(await retirementAmount().inputValue(), '20', 'Explicit override survives current edit');
        await retirementAmount().fill('0');
        assert.equal(await retirementAmount().inputValue(), '0');
        await retirementAmount().fill('');
        assert.equal(await retirementAmount().inputValue(), '');
        await retirementAmount().fill('20');
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
          await navigate('Welcome');
          await page.getByRole('button',{name:'Open a Saved Plan',exact:true}).click();
          await page.getByRole('dialog').waitFor();
          await checkDialog();
          await page.getByRole('button',{name:'Cancel',exact:true}).click();
          await page.getByRole('button',{name:'Open a Saved Plan',exact:true}).click();
          const chooserPromise=page.waitForEvent('filechooser');
          await page.getByRole('button',{name:'Choose Plan File',exact:true}).click();
          await (await chooserPromise).setFiles({ name: 'synthetic-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
          await page.getByRole('heading',{name:'Household & Assumptions',exact:true}).waitFor();
          await page.getByRole('button', { name: /Open data and privacy — Imported/ }).waitFor();
          await navigate('Retirement Budget');
          await expandFood();
          assert.equal(await retirementAmount().inputValue(), '20', 'Export/import preserves the overlay');
          const emptyLabel = await page.locator('.costs-table td[colspan]').evaluate(el => getComputedStyle(el, '::before').content);
          assert.ok(['none', 'normal', '""'].includes(emptyLabel), 'Empty cost cards have no overlapping column label');

          await navigate('Plan Summary');
          assert.equal(await page.getByLabel('Payoff method',{exact:true}).count(),0,'Summary does not edit the baseline');
          await page.getByLabel('Payment Month', { exact: true }).selectOption('2');
          await noOverflow('debt cascade');
          await page.getByText('A ($50.00/month) is paid off.', { exact: false }).waitFor();
          await page.screenshot({ path: path.join(out, `${name}-${width}-debt.png`), fullPage: true });
          await navigate('Real Estate');
          await page.getByLabel('Property tax entry method',{exact:true}).selectOption('annual');
          await page.getByLabel('Annual property tax',{exact:true}).fill('240');
          assert.equal(await page.getByLabel('Mill rate',{exact:true}).count(),0);
          assert.equal(await page.getByLabel('Assessed percent',{exact:true}).count(),0);
          assert.ok(await page.getByLabel('Home market value',{exact:true}).isVisible());
          await page.getByLabel('Property tax entry method',{exact:true}).selectOption('mills');
          await page.getByLabel('Assessed percent',{exact:true}).fill('50');
          await page.getByLabel('Mill rate',{exact:true}).fill('3');
          await page.getByLabel('Property tax entry method',{exact:true}).selectOption('annual');
          assert.equal(await page.getByLabel('Annual property tax',{exact:true}).inputValue(),'240');
          await page.getByLabel('Mortgage Account', { exact: true }).selectOption('C');
          for (const [label, value] of [['Total Statement Payment','130'],['Principal & Interest','100'],['Property Tax Escrow','20'],['Home Insurance Escrow','10'],['Mortgage Insurance','0'],['Other Escrow','0']]) await page.getByLabel(label, { exact: true }).fill(value);
          await page.getByRole('checkbox', { name: 'Use This Statement in the Plan', exact: true }).check();
          await noOverflow('mortgage statement');
          await page.screenshot({ path: path.join(out, `${name}-${width}-housing.png`), fullPage: true });
          await navigate('Household');
          await page.getByRole('button', { name: /^Use .*Historical Inflation$/ }).click();
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
          await page.locator('summary').filter({hasText:'Debt Payoff Experiment'}).click();
          assert.equal(await page.getByLabel('Scenario Payoff Method',{exact:true}).inputValue(),'');
          await page.getByLabel('Scenario Payoff Method',{exact:true}).selectOption('avalanche');
          await page.getByLabel('Scenario Extra Payment / Month',{exact:true}).fill('0');
          await page.getByRole('button',{name:'Restore Baseline Debt Strategy',exact:true}).click();
          assert.equal(await page.getByLabel('Scenario Payoff Method',{exact:true}).inputValue(),'');
          assert.equal(await page.getByLabel('Scenario Extra Payment / Month',{exact:true}).inputValue(),'');
          await page.getByLabel('Scenario Payoff Method',{exact:true}).selectOption('avalanche');
          await page.getByLabel('Scenario Extra Payment / Month',{exact:true}).fill('25');
          await noOverflow('scenario debt controls');
          await page.locator('summary').filter({hasText:'Debt Payoff Experiment'}).click();
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
          assert.equal(exported.laboratory.scenarios[0].overrides.debtStrategy.method,'avalanche');
          assert.equal(exported.laboratory.scenarios[0].overrides.debtStrategy.extraMonthlyPayment,25);
          assert.equal(exported.debtStrategy.method,'snowball','Scenario edits preserve the baseline');
          assert.equal(exported.debtStrategy.extraMonthlyPayment,50);
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
        await page.emulateMedia({media:'screen'});
        await navigate('Data & Privacy');
        await page.getByRole('button',{name:'Load Sample Plan',exact:true}).click();
        await page.getByRole('dialog').waitFor();
        await checkDialog();
        await page.screenshot({path:path.join(out,`${name}-${width}-replace-dialog.png`)});
        await page.getByRole('button',{name:'Cancel',exact:true}).click();
        await navigate('Welcome');
        await page.getByRole('button',{name:'Explore a Sample Plan',exact:true}).click();
        await page.getByRole('button',{name:'Erase and Load Sample',exact:true}).click();
        await navigate('Plan Summary');
        await page.getByRole('heading',{name:'Cash & Investments',exact:true}).waitFor();
        await page.getByRole('heading',{name:'Real Estate',exact:true}).waitFor();
        await page.getByText('Maple Street Rental',{exact:true}).waitFor();
        await page.getByRole('img',{name:/^Current Cash Flow Sankey/}).waitFor();
        await page.getByRole('button',{name:'Choose Cash-Flow Month',exact:true}).click();
        await page.getByLabel('Sankey Month',{exact:true}).fill('2026-02');
        await page.getByRole('img',{name:/Sankey for 2026-02/}).waitFor();
        await noOverflow('current Sankey');
        await page.screenshot({path:path.join(out,`${name}-${width}-current-sankey.png`),fullPage:true});
        await page.getByRole('button',{name:'In Retirement',exact:true}).click();
        await page.getByRole('img',{name:/^Retirement Cash Flow Sankey/}).waitFor();
        await noOverflow('retirement Sankey');
        await page.screenshot({path:path.join(out,`${name}-${width}-retirement-sankey.png`),fullPage:true});
        if(width===1280){
          await page.emulateMedia({media:'print'});
          const report=page.locator('.print-report');
          for(const title of ['Household & Economic Assumptions','Current Budget & Cash Flow','Retirement Budget & Cash Flow','Cash & Investments','Pensions & Social Security','Housing & Debt Payoff','Healthcare & Long-Term Care','Timed Expenses','Tax, Withdrawal & Reserve Policy'])assert.ok(await report.getByRole('heading',{name:title,exact:true}).isVisible(),`Printed report includes ${title}`);
          for(const stage of ['Current','Retirement'])assert.ok(await report.getByRole('img',{name:`${stage} Cash Flow Sankey`,exact:true}).isVisible());
          assert.ok(await report.locator('.report-flow-svg path').evaluateAll(paths=>paths.some(p=>p.getBBox().width>0&&p.getBBox().height>0)),'Printable cash flows have populated geometry');
          assert.ok(await report.locator('.education-chart rect').evaluateAll(rs=>rs.some(r=>r.getBBox().width>0&&r.getBBox().height>0)),'Education print chart has populated geometry');
          if(name==='chromium')await page.pdf({path:path.join(out,'synthetic-complete-report.pdf'),format:'Letter',printBackground:true});
          await page.emulateMedia({media:'screen'});
        }
        await require('./enrollment-browser.cjs')({page,navigate,noOverflow,name,width,out});
        await require('./household-browser.cjs')({page,navigate,noOverflow,name,width,out});
        await navigate('Loans & Debts');
        const refinance=page.locator('section').filter({has:page.getByRole('heading',{name:'Refinance Comparison',exact:true})}).last();
        await refinance.locator('summary').filter({hasText:/^Mortgage(?:\s|$)/}).first().click();
        for(const [label,value] of [['New Term / Years — Mortgage','15'],['Offered Rate / % — Mortgage','2'],['Closing Costs and Points — Mortgage','500'],['Holding Period / Months — Mortgage','60']])await page.getByLabel(label,{exact:true}).fill(value);
        await refinance.getByText('Remaining Debt Chart',{exact:true}).first().click();
        await refinance.getByRole('img',{name:'Keep Loan and Refinance Balances — Mortgage',exact:true}).waitFor();
        const refinanceResults=refinance.getByLabel('Refinance Results — Mortgage',{exact:true});
        const oldComparison=await refinanceResults.textContent();
        await page.getByLabel('Offered Rate / % — Mortgage',{exact:true}).fill('3');
        assert.notEqual(await refinanceResults.textContent(),oldComparison,'Quote edits update the comparison');
        await noOverflow('refinance comparison');
        await refinance.getByRole('button',{name:'Save Refinance Scenario',exact:true}).first().click();
        await refinance.getByRole('button',{name:'View Saved Refinance Scenario',exact:true}).click();
        await page.getByRole('heading',{name:'Saved Refinance Offer',exact:true}).waitFor();
        await page.getByRole('heading',{name:'Selected Scenario Results',exact:true}).waitFor();
        await noOverflow('saved refinance scenario');
        await navigate('Real Estate');
        await page.getByRole('button',{name:'Add Rental Property',exact:true}).click();
        await page.getByLabel('Property Label',{exact:true}).last().fill('Synthetic Rental');
        for(const [label,value] of [['Current Market Value','10000'],['Scheduled Rent / Month','100'],['Vacancy Allowance','10'],['Management / Collected Rent','0'],['Property Tax / Year','120'],['Insurance / Year','120'],['Routine Maintenance / Year','120'],['Actual Repair Spending Allowance / Year','120'],['Desired Property Cash Reserve','200'],['Confirmed Passive Taxable Profit / Year','500']])await page.getByLabel(label,{exact:true}).last().fill(value);
        await page.getByRole('checkbox',{name:/I confirmed the nonnegative taxable profit/}).last().check();
        await noOverflow('rental property entry');
        await navigate('Scenario Laboratory');
        const propertyLab=page.locator('section').filter({has:page.getByRole('heading',{name:'Income Property Laboratory',exact:true})}).last();
        await propertyLab.getByRole('button',{name:'Copy Synthetic Rental into Keep Comparison',exact:true}).click();
        assert.equal(await propertyLab.getByLabel('Property Value / Purchase Price',{exact:true}).inputValue(),'10000');
        await propertyLab.getByLabel('Property Comparison',{exact:true}).selectOption('purchase');
        for(const [label,value] of [['Property Value / Purchase Price','12000'],['Equity / Down Payment','6000'],['Purchase Closing Costs','120'],['Mortgage Rate','0'],['Remaining / New Loan Term','10'],['Comparison Horizon','1'],['Scheduled Rent / Month','100'],['Vacancy Allowance','0'],['Operating Costs / Month','20'],['Actual Repairs / Year','0'],['Property Growth / Year','0'],['Alternative Investment Return / Year','0'],['Selling Costs / Property Value','5']])await propertyLab.getByLabel(label,{exact:true}).fill(value);
        await propertyLab.getByText('Annual Comparison Ledger',{exact:true}).click();
        await noOverflow('income property comparison');
        await page.screenshot({path:path.join(out,`${name}-${width}-property.png`),fullPage:true});
        if(width===1280&&name==='chromium'){
          await page.emulateMedia({media:'print'});
          await page.locator('.print-report').getByRole('heading',{name:'Real Estate — Scope and Assumptions',exact:true}).waitFor();
          await page.pdf({path:path.join(out,'synthetic-property-report.pdf'),format:'Letter',printBackground:true});
          await page.emulateMedia({media:'screen'});
        }
        await navigate('Current Budget');
        await expandFood();
        await noOverflow('sample compact budget');
        await page.screenshot({path:path.join(out,`${name}-${width}-sample-budget.png`),fullPage:true});
        await navigate('Data & Privacy');
        await page.getByRole('button',{name:'Save on This Device',exact:true}).click();
        await page.getByLabel('Plan Password',{exact:true}).fill('Public-Synthetic-Test-Only');
        await page.getByRole('button',{name:'Save My Plan',exact:true}).click();
        await page.getByRole('dialog').waitFor({state:'hidden'});
        await page.waitForFunction(()=>localStorage.length===1);
        await page.reload();
        await page.getByRole('button',{name:'Continue My Plan',exact:true}).click();
        await page.getByRole('heading',{name:'Unlock Your Saved Plan',exact:true}).waitFor();
        await page.getByLabel('Plan Password',{exact:true}).fill('Public-Synthetic-Test-Only');
        await page.getByRole('button',{name:'Unlock',exact:true}).click();
        await page.getByRole('heading',{name:'Household & Assumptions',exact:true}).waitFor();
        await navigate('Welcome');
        await page.getByRole('button',{name:'Continue My Plan',exact:true}).click();
        await page.getByRole('heading',{name:'Household & Assumptions',exact:true}).waitFor();
        await navigate('Data & Privacy');
        const technical=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Technical Details & Protection Limits'})});
        assert.equal(await technical.getAttribute('open'),null);
        await technical.locator('summary').click();
        assert.match(await technical.innerText(),/AES-256-GCM/);
        await noOverflow('Data and privacy details');
        await page.screenshot({path:path.join(out,`${name}-${width}-privacy.png`),fullPage:true});

        await page.getByRole('button',{name:'Create New Plan',exact:true}).click();
        await page.getByRole('button',{name:'Erase and Create New Plan',exact:true}).click();
        await navigate('Current Budget');
        await expandFood();
        assert.ok((await page.locator('main input[type=number]').evaluateAll(inputs=>inputs.map(i=>i.value))).every(v=>v===''),'New plan is blank');
        assert.equal(await page.evaluate(()=>localStorage.length),0,'New plan has no saved vault');
        await page.waitForTimeout(700);
        assert.equal(await page.evaluate(()=>localStorage.length),0,'Delayed saving cannot recreate the erased vault');
        assert.deepEqual(errors, [], `${name} ${width} has no uncaught errors`);
        evidence.push({ engine: name, width, status: 'passed' });
        await page.close();
      } finally { await browser.close(); }
    }
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
})().catch(e => { console.error(`::error::${String(e).replace(/\n/g, ' ')}`); process.exitCode = 1; }).finally(() => server.close());
