import assert from 'node:assert/strict';
import test from 'node:test';
import { savingsHorizon } from '../lib/savings-illustration.ts';

test('savings illustration agrees with independent year-end compounding around the target', () => {
  for (const saving of [5,10,25,50,75,95]) {
    const years=savingsHorizon(saving,5,4), whole=Math.ceil(years);
    const target=(1-saving/100)/0.04;
    let balance=0;
    for(let year=1;year<whole;year++)balance=balance*1.05+saving/100;
    assert.ok(balance<target);
    balance=balance*1.05+saving/100;
    assert.ok(balance>=target);
  }
  assert.ok(Math.abs(savingsHorizon(50,5,4)-16.620) < 0.01);
});
test('zero return, zero savings and invalid assumptions do not invent a finite timeline', () => {
  assert.equal(savingsHorizon(50,0,4),25);
  assert.equal(savingsHorizon(0,5,4),null);
  assert.equal(savingsHorizon(100,5,4),0);
  for(const args of [[-1,5,4],[101,5,4],[50,-1,4],[50,5,0],[NaN,5,4],[50,Infinity,4]])assert.equal(savingsHorizon(...args),null);
});
test('higher saving reduces years while a more cautious withdrawal target increases them', () => {
  let previous=Infinity;
  for(let saving=5;saving<=95;saving++) {
    const years=savingsHorizon(saving,5,4);
    assert.ok(years<previous);
    assert.ok(savingsHorizon(saving,5,3)>years);
    previous=years;
  }
});
