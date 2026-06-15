import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdictFromProb, confidenceLevel, confidenceLabel, isStale, formatKickoff } from '../src/format.js';

test('verdictFromProb picks the max outcome', () => {
  assert.equal(verdictFromProb({ win: 56, draw: 24, loss: 20 }), 'home_win');
  assert.equal(verdictFromProb({ win: 20, draw: 24, loss: 56 }), 'away_win');
  assert.equal(verdictFromProb({ win: 25, draw: 50, loss: 25 }), 'draw');
});

test('confidenceLevel buckets by max probability', () => {
  assert.equal(confidenceLevel({ win: 62, draw: 20, loss: 18 }), 'high');
  assert.equal(confidenceLevel({ win: 50, draw: 30, loss: 20 }), 'med');
  assert.equal(confidenceLevel({ win: 40, draw: 35, loss: 25 }), 'toss');
});

test('confidenceLabel maps to Korean labels', () => {
  assert.equal(confidenceLabel({ win: 62, draw: 20, loss: 18 }), '높은 확신');
  assert.equal(confidenceLabel({ win: 50, draw: 30, loss: 20 }), '중간 확신');
  assert.equal(confidenceLabel({ win: 40, draw: 35, loss: 25 }), '접전');
});

test('isStale compares against threshold hours', () => {
  const gen = '2026-06-15T07:00:00-05:00';
  assert.equal(isStale(gen, new Date('2026-06-15T20:00:00-05:00')), false);
  assert.equal(isStale(gen, new Date('2026-06-16T12:00:00-05:00')), true);
});

test('verdictFromProb prefers draw on a top tie', () => {
  assert.equal(verdictFromProb({ win: 40, draw: 40, loss: 20 }), 'draw');
  assert.equal(verdictFromProb({ win: 20, draw: 40, loss: 40 }), 'draw');
  assert.equal(verdictFromProb({ win: 40, draw: 20, loss: 40 }), 'home_win');
});

test('formatKickoff returns CT time with relative day', () => {
  const k = '2026-06-24T17:00:00-05:00';
  assert.deepEqual(formatKickoff(k, new Date('2026-06-24T09:00:00-05:00')), { time: '17:00', rel: '오늘', label: '오늘 17:00 CT' });
  assert.equal(formatKickoff(k, new Date('2026-06-23T09:00:00-05:00')).rel, '내일');
  assert.equal(formatKickoff(k, new Date('2026-06-20T09:00:00-05:00')).rel, '6/24');
});
