import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeArchitecture } from './analyze-architecture.mjs';

function fixture(t, files) {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent, 'assethub-graph-'));
  t.after(() => {
    const child = relative(parent, root);
    assert.ok(!isAbsolute(child) && child.startsWith('assethub-graph-') && !child.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  for (const directory of ['api', 'backend/src', 'frontend/src']) mkdirSync(join(root, directory), { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

test('AST analysis resolves JSX, CommonJS, re-exports, dynamic imports and resources', (t) => {
  const root = fixture(t, {
    'api/index.js': 'module.exports = require("../backend/src/server");',
    'backend/src/server.js': 'const express = require("express");',
    'frontend/src/App.jsx': 'import "./style.css"; export { item } from "./module"; const view = <main/>; import("./module");',
    'frontend/src/module/index.js': 'export const item = 1;',
    'frontend/src/style.css': 'body {}',
    'frontend/src/dist/excluded.js': 'not valid code',
  });
  const graph = analyzeArchitecture(root);
  assert.equal(graph.nodes.length, 4);
  assert.deepEqual(graph.edges, [
    { from: 'api/index.js', to: 'backend/src/server.js' },
    { from: 'frontend/src/App.jsx', to: 'frontend/src/module/index.js' },
  ]);
  assert.equal(graph.resources.length, 1);
  assert.deepEqual(graph.external, [{ from: 'backend/src/server.js', specifier: 'express' }]);
  assert.deepEqual(graph.unresolved, []);
  assert.deepEqual(graph.boundaryViolations, []);
});

test('AST analysis identifies cycles, missing imports and forbidden frontend dependencies', (t) => {
  const root = fixture(t, {
    'frontend/src/a.js': 'import "./b.js"; import "./missing"; import "../../backend/src/server.js";',
    'frontend/src/b.js': 'export * from "./a.js";',
    'backend/src/server.js': 'module.exports = {};',
  });
  const graph = analyzeArchitecture(root);
  assert.equal(graph.cycles.length, 1);
  assert.deepEqual(graph.cycles[0], ['frontend/src/a.js', 'frontend/src/b.js', 'frontend/src/a.js']);
  assert.deepEqual(graph.unresolved, [{ from: 'frontend/src/a.js', specifier: './missing' }]);
  assert.equal(graph.boundaryViolations.length, 1);
});

test('AST analysis fails on malformed source instead of reporting a clean graph', (t) => {
  const root = fixture(t, { 'frontend/src/broken.jsx': 'export const value = <main>;' });
  assert.throws(() => analyzeArchitecture(root), /Unterminated JSX/);
});
