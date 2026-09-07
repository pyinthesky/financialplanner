import assert from 'node:assert/strict';
import test from 'node:test';
import { applyInflationReference, canUndoInflationReference, inflationReferenceValue } from '../lib/references.ts';
import { DEFAULT_PLAN, normalizePlan } from '../lib/planner.ts';
test('historical inflation uses verified annual-average endpoints twenty years apart', () => {
  const value = inflationReferenceValue();
  assert.ok(Math.abs(188.9 * (1 + value / 100) ** 20 - 313.689) < 0.000001);
  assert.ok(value > 2.5 && value < 2.6);
  assert.equal(DEFAULT_PLAN.assumptions.inflation, 0);
  assert.equal(DEFAULT_PLAN.inflationReference, undefined);
});
test('reference receipts survive export/import and never undo a subsequent manual edit', () => {
  const result = applyInflationReference(0);
  const p = structuredClone(DEFAULT_PLAN);
  p.assumptions.inflation = result.value; p.inflationReference = result.receipt;
  const imported = normalizePlan(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(imported.inflationReference, result.receipt);
  assert.equal(canUndoInflationReference(imported.assumptions.inflation, imported.inflationReference), true);
  assert.equal(imported.inflationReference.previousValue, 0);
  assert.equal(canUndoInflationReference(3, result.receipt), false);
});
