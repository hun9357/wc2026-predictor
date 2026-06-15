import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProb, validateData } from '../src/validate.js';

test('normalizeProb keeps a valid 100-sum distribution', () => {
  assert.deepEqual(normalizeProb({ win: 56, draw: 24, loss: 20 }), { win: 56, draw: 24, loss: 20, normalized: false });
});
test('normalizeProb scales to 100 and fixes rounding drift', () => {
  assert.deepEqual(normalizeProb({ win: 5, draw: 3, loss: 2 }), { win: 50, draw: 30, loss: 20, normalized: true });
  const n = normalizeProb({ win: 1, draw: 1, loss: 1 });
  assert.equal(n.win + n.draw + n.loss, 100);
  assert.equal(n.normalized, true);
});
test('validateData passes a well-formed payload', () => {
  const teams = [{ id: 'MEX' }, { id: 'POL' }];
  const preds = { matches: [{ id: 'A-MD3-1', group: 'A', matchday: 3, status: 'upcoming', home: 'MEX', away: 'POL', prob: { win: 56, draw: 24, loss: 20 }, verdict: 'home_win' }] };
  const r = validateData(preds, teams);
  assert.equal(r.ok, true); assert.equal(r.errors.length, 0); assert.equal(r.warnings.length, 0);
});
test('validateData warns on bad sum, verdict mismatch, unknown team', () => {
  const teams = [{ id: 'MEX' }];
  const preds = { matches: [{ id: 'X', group: 'A', matchday: 3, status: 'upcoming', home: 'MEX', away: 'ZZZ', prob: { win: 50, draw: 24, loss: 20 }, verdict: 'draw' }] };
  const r = validateData(preds, teams);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some(w => w.includes('prob')));
  assert.ok(r.warnings.some(w => w.includes('verdict')));
  assert.ok(r.warnings.some(w => w.includes('ZZZ')));
});
test('validateData errors when matches is missing', () => {
  const r = validateData({}, []);
  assert.equal(r.ok, false); assert.ok(r.errors.length >= 1);
});
