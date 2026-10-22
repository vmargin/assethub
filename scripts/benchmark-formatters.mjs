import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const before = spawnSync('git', ['show', 'HEAD:frontend/src/lib/format.js'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (before.status !== 0) throw new Error('Cannot read the committed formatter baseline.');
const after = readFileSync(join(root, 'frontend/src/lib/format.js'), 'utf8');
const importSource = (source) => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const baseline = await importSource(before.stdout);
const current = await importSource(after);
for (const currency of ['PHP', 'USD', 'EUR', 'PHP']) {
  for (const amount of [0, 12.5, '1234.75', null]) assert.equal(current.money(amount, currency), baseline.money(amount, currency));
}
assert.equal(current.dateLabel('2026-10-23T00:00:00Z'), baseline.dateLabel('2026-10-23T00:00:00Z'));
function measure(module) {
  const start = performance.now();
  for (let index = 0; index < 3000; index++) {
    module.money(index, 'PHP');
    module.dateLabel('2026-10-23T00:00:00Z');
  }
  return performance.now() - start;
}
const startedAt = new Date().toISOString();
const baselineMs = [], currentMs = [];
for (let run = 0; run < 3; run++) { baselineMs.push(measure(baseline)); currentMs.push(measure(current)); }
const median = (values) => [...values].sort((a, b) => a - b)[1];
const result = { startedAt, endedAt: new Date().toISOString(), iterations: 3000, samples: 3,
  baseline: 'git HEAD:frontend/src/lib/format.js', baselineMs, currentMs,
  baselineMedianMs: median(baselineMs), currentMedianMs: median(currentMs), outputEquivalence: true,
  limitation: 'Local formatting microbenchmark, not end-to-end page timing. No timing threshold is enforced in CI.' };
const output = join(root, 'docs/development/evidence');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'formatter-benchmark.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
