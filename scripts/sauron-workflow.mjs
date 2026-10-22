import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sauronRoot = dirname(require.resolve('sauron-ai/package.json'));
const { parse } = createRequire(join(sauronRoot, 'package.json'))('yaml');
const finder = await import(pathToFileURL(join(sauronRoot, 'dist/adapters/skill-finder.js')));
const scanner = await import(pathToFileURL(join(sauronRoot, 'dist/adapters/slopsquat.js')));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const portable = (path) => path.replaceAll('\\', '/');
const sourceRoots = ['api', 'backend/src', 'frontend/src'];

export function loadConfig(root = projectRoot) {
  const config = parse(readFileSync(join(root, 'sauron.config.yaml'), 'utf8'));
  if (!config || typeof config.departments !== 'object' || !config.departments) {
    throw new Error('sauron.config.yaml must define departments.');
  }
  return config;
}

export function findSkills(query, root = projectRoot) {
  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('Provide a task: npm run ai:find -- "<task>"');
  }
  const config = loadConfig(root);
  const catalog = finder.loadSkillCatalog(join(sauronRoot, 'skills'), projectRoot);
  const documents = catalog.documents.filter((skill) => {
    const department = portable(relative(join(sauronRoot, 'skills'), resolve(projectRoot, skill.path))).split('/')[0];
    return config.departments[department] === true;
  });
  return { results: finder.rankSkills(documents, query, 5), indexed: documents.length };
}

export function checkIntegration(root = projectRoot) {
  const errors = [];
  const config = loadConfig(root);
  const expected = readJson(join(root, 'package.json')).devDependencies?.['sauron-ai'];
  const installed = readJson(join(sauronRoot, 'package.json')).version;
  if (expected !== installed) errors.push(`Sauron pin ${expected} differs from installed ${installed}. Run npm ci.`);
  const locked = readJson(join(root, 'package-lock.json')).packages?.['node_modules/sauron-ai']?.version;
  if (expected !== locked) errors.push('Sauron package-lock.json pin differs from package.json.');
  for (const path of [
    'AGENTS.md', 'frontend/AGENTS.md', 'backend/AGENTS.md',
    '.agents/skills/assethub-workflow/SKILL.md', 'docs/development/sauron.md',
  ]) {
    if (!existsSync(join(root, path))) errors.push(`Missing project entrypoint: ${path}`);
  }
  for (const [name, agent] of Object.entries(config.fellowship ?? {})) {
    if (agent.enabled === true && !existsSync(join(sauronRoot, 'core/fellowship', `${name}.md`))) {
      errors.push(`Missing Fellowship specification: ${name}`);
    }
  }
  const workflow = join(root, '.agents/skills/assethub-workflow/SKILL.md');
  if (existsSync(workflow)) {
    const content = readFileSync(workflow, 'utf8');
    finder.parseSkillDocument(workflow, content);
    const paths = content.match(/\b(?:architecture|backend|database|devops|frontend|quality|security|workflow)\/[a-z][a-z0-9/-]*/g) ?? [];
    for (const path of new Set(paths)) {
      if (path === 'frontend/brand-presets') {
        if (!existsSync(join(sauronRoot, 'skills', path))) errors.push(`Missing design presets: ${path}`);
        continue;
      }
      if (!existsSync(join(sauronRoot, 'skills', path, 'SKILL.md'))) errors.push(`Missing routed skill: ${path}`);
    }
  }
  for (const path of [
    'skills/frontend/design-engineering/references/foundations/README.md',
    'skills/frontend/design-engineering/references/ui-design/stacks/react.md',
    'skills/frontend/design-engineering/06-audit/responsive-screenshot-check/SKILL.md',
  ]) {
    if (!existsSync(join(sauronRoot, path))) errors.push(`Missing design capability: ${path}`);
  }
  return errors;
}

// Only read application source. Do not traverse symlinks, environment files,
// node_modules, build output, generated adapters or arbitrary CLI paths.
export function scanSources(root = projectRoot) {
  const findings = [];
  let files = 0;
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || ['node_modules', 'dist', 'build'].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && /\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) {
        files += 1;
        findings.push(...scanner.scanUnsafeSinks(portable(relative(root, path)), readFileSync(path, 'utf8')));
      }
    }
  }
  for (const directory of sourceRoots) {
    const path = join(root, directory);
    if (!existsSync(path)) throw new Error(`Missing application source: ${directory}`);
    // Inspect each root's ancestors too, so a replaced source root cannot
    // redirect this scanner into another directory through a symlink.
    let parent = root;
    for (const segment of directory.split('/')) {
      const entry = readdirSync(parent, { withFileTypes: true }).find((item) => item.name === segment);
      if (!entry?.isDirectory() || entry.isSymbolicLink()) throw new Error(`Unsafe source directory: ${directory}`);
      parent = join(parent, segment);
    }
    visit(path);
  }
  return { files, findings };
}

export function main(args) {
  const [command, ...rest] = args;
  if (command === 'find') {
    const query = rest.join(' ');
    const { results, indexed } = findSkills(query);
    console.log(finder.formatFinderReport(results, query));
    console.log(`Searched ${indexed} pinned skills in enabled departments. Read only relevant matches.`);
    return 0;
  }
  if (rest.length) throw new Error(`${command} does not accept paths or extra arguments.`);
  if (command === 'check') {
    const errors = checkIntegration();
    if (errors.length) {
      for (const error of errors) console.error(error);
      return 1;
    }
    console.log('Sauron pin, lockfile, project entrypoints, routed skills and configured Fellowship specifications verified.');
    return 0;
  }
  if (command === 'scan') {
    const { files, findings } = scanSources();
    console.log(`Sauron heuristic sink scan: ${files} source files, ${findings.length} findings.`);
    if (findings.length) console.log(scanner.toSarif(findings));
    console.log('This scan does not verify authorization, tenancy or complete security coverage.');
    return findings.some((finding) => finding.severity === 'error') ? 1 : 0;
  }
  throw new Error('Use check, find "<task>", or scan. See docs/development/sauron.md.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
