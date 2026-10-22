import test from 'node:test';
import assert from 'node:assert/strict';
import { money, dateLabel } from '../src/lib/format.js';

test('money preserves locale formatting when currencies switch between workspaces', () => {
  for (const currency of ['PHP', 'USD', 'EUR', 'USD', 'PHP']) {
    const expected = new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });
    for (const value of [0, 12.5, '1234.75', null, undefined]) {
      assert.equal(money(value, currency), expected.format(Number(value || 0)));
    }
  }
  assert.equal(money(12), money(12, 'PHP'));
});

test('date labels retain locale, timezone and missing-date behavior', () => {
  const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  for (const value of ['2026-10-23T00:00:00Z', '2026-12-31T23:30:00Z', '2024-02-29']) {
    assert.equal(dateLabel(value), expected.format(new Date(value)));
  }
  assert.equal(dateLabel(null), '\u2014');
  assert.equal(dateLabel(undefined), '\u2014');
  assert.throws(() => dateLabel('invalid-date'), RangeError);
});
