import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkIntegration, findSkills, main, projectRoot, scanSources } from './sauron-workflow.mjs';

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('sauron-ai/package.json'));
const installedVersion = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version;
const runner = fileURLToPath(new URL('./sauron-workflow.mjs', import.meta.url));

function fixture(t) {
  const temporaryRoot = resolve(tmpdir());
  const root = mkdtempSync(join(temporaryRoot, 'assethub-workflow-test-'));
  t.after(() => {
    // Delete only this exact, independently created fixture, never a computed
    // parent or a target supplied by the code under test.
    const child = relative(temporaryRoot, root);
    assert.ok(!isAbsolute(child) && !child.startsWith(`..${sep}`));
    assert.ok(child.startsWith('assethub-workflow-test-') && !child.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function write(root, path, content = '') {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function writeConfig(root, departments = { architecture: true, frontend: true }) {
  write(root, 'sauron.config.yaml', JSON.stringify({ departments, fellowship: { merry: { enabled: true } } }));
}

function integrationFixture(t) {
  const root = fixture(t);
  writeConfig(root);
  write(root, 'package.json', JSON.stringify({ devDependencies: { 'sauron-ai': installedVersion } }));
  write(root, 'package-lock.json', JSON.stringify({ packages: { 'node_modules/sauron-ai': { version: installedVersion } } }));
  for (const path of ['AGENTS.md', 'frontend/AGENTS.md', 'backend/AGENTS.md', 'docs/development/sauron.md']) write(root, path);
  write(root, '.agents/skills/assethub-workflow/SKILL.md',
    '---\nname: fixture-workflow\ndescription: Fixture task routing\n---\nUse frontend/design-engineering.\n');
  return root;
}

function sourceFixture(t) {
  const root = fixture(t);
  for (const path of ['api', 'backend/src', 'frontend/src']) mkdirSync(join(root, path), { recursive: true });
  return root;
}

test('task search returns ranked, readable pinned skills and remains stable', (t) => {
  const root = fixture(t);
  writeConfig(root, { frontend: true });
  const result = findSkills('frontend design engineering accessibility', root);
  assert.ok(result.indexed > 0);
  assert.ok(result.results.length > 0 && result.results.length <= 5);
  assert.ok(result.results.some((skill) => /accessibility|design-engineering/.test(skill.path)));
  for (const [index, skill] of result.results.entries()) {
    assert.ok(skill.score > 0);
    assert.ok(index === 0 || result.results[index - 1].score >= skill.score);
    assert.ok(skill.path.startsWith('node_modules/sauron-ai/skills/frontend/'));
    assert.match(readFileSync(resolve(projectRoot, skill.path), 'utf8'), /^---\r?\n/);
  }
  assert.deepEqual(findSkills('frontend design engineering accessibility', root), result);
});

test('task search honors disabled departments from the supplied project config', (t) => {
  const root = fixture(t);
  writeConfig(root, { architecture: true, frontend: true });
  const enabled = findSkills('frontend accessibility', root);
  assert.ok(enabled.results.some((skill) => skill.path.includes('/frontend/')));
  writeConfig(root, { architecture: true, frontend: false });
  const disabled = findSkills('frontend accessibility', root);
  assert.ok(disabled.indexed < enabled.indexed);
  assert.ok(disabled.results.every((skill) => !skill.path.includes('/frontend/')));
  writeConfig(root, { architecture: false, frontend: false });
  assert.deepEqual(findSkills('frontend accessibility', root), { indexed: 0, results: [] });
});

test('task search rejects missing task text and malformed config', (t) => {
  const root = fixture(t);
  writeConfig(root);
  for (const query of ['', '   ', null, undefined]) assert.throws(() => findSkills(query, root), /Provide a task/);
  write(root, 'sauron.config.yaml', 'departments: null\n');
  assert.throws(() => findSkills('architecture', root), /must define departments/);
});

test('integration accepts matching package pins and existing routed capabilities', (t) => {
  const root = integrationFixture(t);
  assert.deepEqual(checkIntegration(root), []);
  assert.deepEqual(checkIntegration(root), []);
});

test('integration detects package and lockfile drift independently', (t) => {
  const root = integrationFixture(t);
  write(root, 'package.json', JSON.stringify({ devDependencies: { 'sauron-ai': '0.0.0' } }));
  const packageErrors = checkIntegration(root);
  assert.ok(packageErrors.some((error) => /pin 0\.0\.0 differs from installed/.test(error)));
  assert.ok(packageErrors.some((error) => /package-lock\.json pin differs/.test(error)));
  write(root, 'package.json', JSON.stringify({ devDependencies: { 'sauron-ai': installedVersion } }));
  write(root, 'package-lock.json', JSON.stringify({ packages: { 'node_modules/sauron-ai': { version: '0.0.0' } } }));
  assert.deepEqual(checkIntegration(root), ['Sauron package-lock.json pin differs from package.json.']);
});

test('integration reports missing project entrypoints, routed skills, and configured agents', (t) => {
  const root = integrationFixture(t);
  // Leave the valid route in place so validation must inspect every route.
  write(root, '.agents/skills/assethub-workflow/SKILL.md',
    '---\nname: fixture-workflow\ndescription: Fixture task routing\n---\nUse frontend/design-engineering and quality/does-not-exist.\n');
  write(root, 'sauron.config.yaml', JSON.stringify({ departments: {}, fellowship: { 'missing-agent': { enabled: true } } }));
  const errors = checkIntegration(root);
  assert.ok(errors.includes('Missing routed skill: quality/does-not-exist'));
  assert.ok(errors.includes('Missing Fellowship specification: missing-agent'));
  const missing = fixture(t);
  writeConfig(missing);
  write(missing, 'package.json', readFileSync(join(root, 'package.json')));
  write(missing, 'package-lock.json', readFileSync(join(root, 'package-lock.json')));
  assert.ok(checkIntegration(missing).includes('Missing project entrypoint: AGENTS.md'));
  assert.ok(checkIntegration(missing).includes('Missing project entrypoint: .agents/skills/assethub-workflow/SKILL.md'));
});

test('source scan counts only allowed application JavaScript and reports unsafe executable sinks', (t) => {
  const root = sourceFixture(t);
  write(root, 'api/index.js', 'export const handler = () => 1;\n');
  write(root, 'backend/src/nested/unsafe.cjs', '// eval(comment)\neval(input);\n');
  write(root, 'frontend/src/App.jsx', 'export default function App() { return <main />; }\n');
  write(root, 'frontend/src/helper.mjs', 'export const answer = 42;\n');
  for (const path of [
    '.env', 'scripts/outside.js', 'backend/outside.js', 'frontend/public/outside.js',
    'api/node_modules/vendor.js', 'backend/src/dist/bundle.js', 'frontend/src/build/bundle.js',
    'frontend/src/.cache/hidden.js', 'frontend/src/.env.js', 'frontend/src/style.css',
    'backend/src/schema.json', 'backend/src/.env',
  ]) write(root, path, 'eval(secret);\n');
  const result = scanSources(root);
  assert.equal(result.files, 4);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, 'backend/src/nested/unsafe.cjs');
  assert.equal(result.findings[0].line, 2);
  assert.equal(result.findings[0].rule, 'no-eval');
  assert.equal(result.findings[0].severity, 'error');
  assert.deepEqual(scanSources(root), result);
});

test('source scan refuses incomplete application layouts', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'api'));
  assert.throws(() => scanSources(root), /Missing application source: backend\/src/);
});

test('source scan does not follow nested directory symlinks', (t) => {
  const root = sourceFixture(t);
  const target = join(root, 'outside-source');
  write(root, 'outside-source/unsafe.js', 'eval(input);\n');
  write(root, 'api/index.js', 'export const safe = true;\n');
  try {
    symlinkSync(target, join(root, 'frontend/src/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
      assert.ok(['EPERM', 'EACCES', 'ENOSYS'].includes(error.code));
      t.skip(`Creating directory symlinks is unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.deepEqual(scanSources(root), { files: 1, findings: [] });
});

for (const sourcePath of ['api', 'backend']) {
  test(`source scan refuses a symlink at source ancestor ${sourcePath}`, (t) => {
    const root = fixture(t);
    const target = join(root, 'linked-target');
    mkdirSync(join(target, 'src'), { recursive: true });
    for (const path of ['api', 'backend/src', 'frontend/src']) {
      if (!path.startsWith(sourcePath)) mkdirSync(join(root, path), { recursive: true });
    }
    try {
      symlinkSync(target, join(root, sourcePath), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
        assert.ok(['EPERM', 'EACCES', 'ENOSYS'].includes(error.code));
        t.skip(`Creating directory symlinks is unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    assert.throws(() => scanSources(root), /Unsafe source directory/);
  });
}

test('CLI rejects empty queries, unknown commands, help, and arbitrary scan paths', () => {
  for (const args of [[], ['--help'], ['unknown'], ['find'], ['find', '  '], ['check', 'unexpected'], ['scan', '../']]) {
    const result = spawnSync(process.execPath, [runner, ...args], { encoding: 'utf8', timeout: 30_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /Use check, find|Provide a task|does not accept paths or extra arguments/);
    assert.equal(result.stdout, '');
  }
});

test('CLI resolves the project from its module when invoked from another working directory', (t) => {
  const root = fixture(t);
  const result = spawnSync(process.execPath, [runner, 'find', 'accessibility'], { cwd: root, encoding: 'utf8', timeout: 30_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /accessibility-auditor/);
  assert.match(result.stdout, /Searched \d+ pinned skills in enabled departments/);
  assert.equal(result.stderr, '');
  assert.ok(existsSync(join(projectRoot, 'sauron.config.yaml')));
});

test('main returns stable results across repeated invocations without retaining arguments', (t) => {
  const lines = [];
  t.mock.method(console, 'log', (...args) => lines.push(args));
  assert.equal(main(['find', 'accessibility']), 0);
  const first = structuredClone(lines);
  assert.ok(first.length > 0);
  lines.length = 0;
  assert.throws(() => main(['check', 'unexpected']), /does not accept/);
  assert.equal(main(['find', 'accessibility']), 0);
  assert.deepEqual(lines, first);
});
