import { parse } from '@babel/parser';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const portable = (path) => path.replaceAll('\\', '/');
const sourceRoots = ['api', 'backend/src', 'frontend/src'];
const extensions = ['.js', '.jsx', '.mjs', '.cjs'];

export function analyzeArchitecture(base = root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || ['node_modules', 'dist', 'build'].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extensions.includes(extname(path))) files.push(path);
    }
  }
  for (const directory of sourceRoots) {
    let parent = base;
    for (const segment of directory.split('/')) {
      const entry = readdirSync(parent, { withFileTypes: true }).find((item) => item.name === segment);
      if (!entry?.isDirectory() || entry.isSymbolicLink()) throw new Error(`Unsafe or missing source root: ${directory}`);
      parent = join(parent, segment);
    }
    visit(parent);
  }
  files.sort();
  const nodes = files.map((path) => ({ id: portable(relative(base, path)), lines: readFileSync(path, 'utf8').split(/\r?\n/).length }));
  const edges = [];
  const external = [];
  const unresolved = [];
  const resources = [];
  function walk(node, found) {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) found.add(node.source.value);
    if (node.type === 'CallExpression' && (node.callee?.name === 'require' || node.callee?.type === 'Import') && node.arguments[0]?.type === 'StringLiteral') found.add(node.arguments[0].value);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach((child) => walk(child, found));
      else if (value && typeof value === 'object') walk(value, found);
    }
  }
  for (const path of files) {
    const from = portable(relative(base, path));
    const tree = parse(readFileSync(path, 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx'] });
    const imports = new Set();
    walk(tree.program, imports);
    for (const specifier of [...imports].sort()) {
      if (!specifier.startsWith('.')) { external.push({ from, specifier }); continue; }
      const target = resolve(dirname(path), specifier);
      const candidates = [target, ...extensions.map((extension) => target + extension), ...extensions.map((extension) => join(target, 'index' + extension))];
      const match = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      if (!match) { unresolved.push({ from, specifier }); continue; }
      const to = portable(relative(base, match));
      if (nodes.some((node) => node.id === to)) edges.push({ from, to });
      else resources.push({ from, to });
    }
  }
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) adjacency.get(edge.from).push(edge.to);
  const visited = new Set();
  const active = [];
  const cycles = [];
  function dfs(id) {
    if (active.includes(id)) {
      const cycle = [...active.slice(active.indexOf(id)), id];
      if (!cycles.some((existing) => existing.join('|') === cycle.join('|'))) cycles.push(cycle);
      return;
    }
    if (visited.has(id)) return;
    active.push(id);
    for (const dependency of adjacency.get(id)) dfs(dependency);
    active.pop();
    visited.add(id);
  }
  for (const id of adjacency.keys()) dfs(id);
  const boundaryViolations = edges.filter(({ from, to }) =>
    (from.startsWith('frontend/') && !to.startsWith('frontend/')) ||
    (from.startsWith('backend/') && !to.startsWith('backend/')));
  const hubs = nodes.map((node) => ({ ...node,
    imports: edges.filter((edge) => edge.from === node.id).length,
    importedBy: edges.filter((edge) => edge.to === node.id).length,
  })).sort((a, b) => (b.imports + b.importedBy) - (a.imports + a.importedBy) || a.id.localeCompare(b.id));
  return { generator: 'AssetHub project fallback using @babel/parser; not native Sauron graph',
    scope: sourceRoots, nodes, edges, resources, external, unresolved, cycles, boundaryViolations, hubs };
}

export function writeArchitectureReport(graph, directory) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'graph.json'), JSON.stringify(graph, null, 2) + '\n');
  const report = [
    '# Architecture execution evidence', '', graph.generator, '',
    `Parsed ${graph.nodes.length} JavaScript/JSX modules; ${graph.edges.length} internal dependency edges; ${graph.external.length} external import references.`,
    `Detected ${graph.cycles.length} cycle paths, ${graph.unresolved.length} unresolved relative imports and ${graph.boundaryViolations.length} frontend/backend boundary violations.`, '',
    '| Module | Lines | Imports | Imported by |', '| --- | ---: | ---: | ---: |',
    ...graph.hubs.map((node) => `| ${node.id} | ${node.lines} | ${node.imports} | ${node.importedBy} |`), '',
    'Static import/require edges are analyzed without executing product code. Dynamic computed imports, runtime behavior, SQL relations, unused exports and CSS rules are outside this analysis.',
    'Large modules are review candidates, not proof that a rewrite is needed. Existing controller/UI architecture is preserved.',
  ].join('\n') + '\n';
  writeFileSync(join(directory, 'graph-report.md'), report);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const graph = analyzeArchitecture();
  writeArchitectureReport(graph, join(root, 'docs/development/evidence/architecture'));
  console.log(`AST analysis: ${graph.nodes.length} modules, ${graph.edges.length} edges, ${graph.cycles.length} cycles, ${graph.unresolved.length} unresolved, ${graph.boundaryViolations.length} boundary violations.`);
  process.exitCode = graph.cycles.length || graph.unresolved.length || graph.boundaryViolations.length ? 1 : 0;
}
