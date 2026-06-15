import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterMatches } from '../src/filters.js';

const teams = [{ id: 'MEX', name: '멕시코' }, { id: 'POL', name: '폴란드' }, { id: 'CRO', name: '크로아티아' }];
const matches = [
  { id: 'A1', group: 'A', matchday: 3, status: 'upcoming', home: 'MEX', away: 'POL' },
  { id: 'A2', group: 'A', matchday: 2, status: 'played', home: 'MEX', away: 'CRO' },
  { id: 'B1', group: 'B', matchday: 3, status: 'upcoming', home: 'CRO', away: 'POL' },
];
test('remainingOnly keeps only upcoming', () => {
  assert.deepEqual(filterMatches(matches, { remainingOnly: true }).map(m => m.id), ['A1', 'B1']);
});
test('group filter', () => {
  assert.deepEqual(filterMatches(matches, { remainingOnly: false, group: 'A' }).map(m => m.id), ['A1', 'A2']);
});
test('matchday filter (string/number agnostic)', () => {
  assert.deepEqual(filterMatches(matches, { remainingOnly: false, matchday: 2 }).map(m => m.id), ['A2']);
  assert.deepEqual(filterMatches(matches, { remainingOnly: false, matchday: '3' }).map(m => m.id), ['A1', 'B1']);
});
test('query matches id or korean name', () => {
  assert.deepEqual(filterMatches(matches, { remainingOnly: false, query: '크로아', teams }).map(m => m.id), ['A2', 'B1']);
  assert.deepEqual(filterMatches(matches, { remainingOnly: false, query: 'pol', teams }).map(m => m.id), ['A1', 'B1']);
});
