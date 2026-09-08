/* Public fictional sample only; shared release checks for Chromium and WebKit. */
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function checkEnrollment({page,navigate,noOverflow,name,width,out}){
  await navigate('Open Enrollment');
  await page.getByRole('heading',{name:'Compare the Complete Picture',exact:true}).waitFor();
  assert.equal(await page.locator('main .oe-result').count(),3,'All sample health options produce complete results');
  assert.equal(await page.locator('main .oe-person-results progress').count(),2,'Each family member has individual limit tracking');
  await page.locator('.oe-person > summary').first().click();
  await page.getByLabel('General Medical / Year',{exact:true}).first().fill('10000');
  assert.equal(await page.locator('main .oe-result').count(),3);
  await page.locator('.oe-person > summary').first().click();
  const firstOption=page.locator('main .oe-option').first();
  await firstOption.getByText('Visits & Prescription Coverage',{exact:true}).click();
  await firstOption.locator('.oe-care > summary').first().click();
  await firstOption.getByLabel('Counts Toward Combined OOP Max?',{exact:true}).first().selectOption('unknown');
  assert.equal(await page.locator('main .oe-result').count(),0,'Unknown Rx rules suppress comparison');
  await firstOption.getByLabel('Counts Toward Combined OOP Max?',{exact:true}).first().selectOption('yes');
  assert.equal(await page.locator('main .oe-result').count(),3);
  await noOverflow('expanded enrollment option');
  await firstOption.getByText('Visits & Prescription Coverage',{exact:true}).click();
  await page.getByLabel('Medical-Use Scenario',{exact:true}).selectOption('2');
  await page.getByText('How the Comparison Changes with Medical Use',{exact:true}).click();
  await noOverflow('enrollment charts');
  await page.getByText('Monthly Cash Ledger',{exact:true}).click();
  await noOverflow('enrollment cash ledger');
  await page.getByText('Monthly Cash Ledger',{exact:true}).click();
  await page.getByRole('heading',{name:'Compare the Complete Picture',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${name}-${width}-enrollment.png`)});
  if(width===1280){
    await page.emulateMedia({media:'print'});
    const report=page.locator('.oe-print');
    assert.ok(await report.getByRole('heading',{name:'Open Enrollment Comparison',exact:true}).isVisible());
    assert.ok(await report.locator('svg rect').evaluateAll(rs=>rs.some(r=>r.getBBox().width>0)),'Enrollment print bars have real geometry');
    assert.ok(await report.locator('svg line').evaluateAll(rs=>rs.some(r=>r.getBBox().width>0)),'Enrollment print timelines render');
    if(name==='chromium')await page.pdf({path:path.join(out,'synthetic-enrollment-report.pdf'),format:'Letter',printBackground:true});
    await page.emulateMedia({media:'screen'});
  }
  await page.getByRole('button',{name:'Term Life',exact:true}).click();
  await page.getByRole('heading',{name:'Portable Term-Life Comparison',exact:true}).waitFor();
  await noOverflow('term-only quotes');
  await page.screenshot({path:path.join(out,`${name}-${width}-term.png`)});
};
