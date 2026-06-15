import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateData } from '../src/validate.js';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));

test('sample fixtures conform to the data contract', () => {
  const teams = read('../data/sample/teams.sample.json');
  const preds = read('../data/sample/predictions.sample.json');
  const r = validateData(preds, teams);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.warnings.length, 0, r.warnings.join('; '));
});
test('schema files are valid JSON', () => {
  read('../schema/teams.schema.json');
  read('../schema/predictions.schema.json');
});
