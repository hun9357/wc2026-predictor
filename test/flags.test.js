import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIFA_TO_ISO2, flagPath } from '../src/flags.js';

test('flagPath maps known FIFA codes to local svg paths', () => {
  assert.equal(flagPath('FRA'), './assets/flags/fr.svg');
  assert.equal(flagPath('ENG'), './assets/flags/gb-eng.svg');
  assert.equal(flagPath('SCO'), './assets/flags/gb-sct.svg');
  assert.equal(flagPath('KOR'), './assets/flags/kr.svg');
});

test('flagPath returns null for an unmapped code', () => {
  assert.equal(flagPath('XXX'), null);
});

test('all 48 tournament teams are mapped', () => {
  assert.equal(Object.keys(FIFA_TO_ISO2).length, 48);
});
