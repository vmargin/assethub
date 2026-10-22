import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const database = new URL(process.env.AUDIT_DATABASE_URL || 'postgresql://assethub_test@127.0.0.1:55439/assethub_execution');
if (!['127.0.0.1', 'localhost'].includes(database.hostname) || !/^\/assethub_(execution|test)$/.test(database.pathname)) {
  throw new Error('Browser audit requires a local, dedicated assethub_execution or assethub_test database.');
}
const baseline = process.argv.includes('--baseline');
const output = join(root, baseline ? '.sauron/runtime/browser-before' : 'docs/development/evidence/browser');
mkdirSync(output, { recursive: true });
const screenshots = join(root, '.sauron/runtime', baseline ? 'browser-before-images' : 'browser-images');
mkdirSync(screenshots, { recursive: true });
const appUrl = 'http://127.0.0.1:50582';
const env = { ...process.env, DATABASE_URL: database.href, JWT_SECRET: randomBytes(32).toString('hex'),
  APP_URL: appUrl, FRONTEND_URL: appUrl, PORT: '50581', HOST: '127.0.0.1' };
const children = [];
const fixtures = [];
const failures = [];
const results = [];
const errors = [];
const interactions = [];
const startedAt = new Date().toISOString();
let browser;

async function available(port) {
  await new Promise((done, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(done));
  });
}
function start(cwd, args) {
  const child = spawn(process.execPath, args, { cwd: join(root, cwd), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  // Consume pipes without persisting environment values or user session data.
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  children.push(child);
  return child;
}
async function ready(url, child) {
  await expect.poll(async () => {
    if (child.exitCode !== null) throw new Error(`Test service exited (${child.exitCode}).`);
    try { return (await fetch(url)).ok; } catch { return false; }
  }, { timeout: 30_000, intervals: [100, 250, 500] }).toBe(true);
}
async function inspect(page, surface, theme, width) {
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: join(root, 'frontend/node_modules/axe-core/axe.min.js') });
  const audit = await page.evaluate(async () => {
    const report = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    const tokens = getComputedStyle(document.documentElement);
    return {
      violations: report.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })),
      incomplete: report.incomplete.map(({ id }) => id),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      viewportWidth: innerWidth,
      tokens: Object.fromEntries(['--canvas', '--surface', '--text', '--muted', '--accent', '--accent-text', '--serif'].map((key) => [key, tokens.getPropertyValue(key).trim()])),
      controlsUnder44px: [...document.querySelectorAll('button,a,input,select')].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      }).length,
    };
  });
  results.push({ surface, theme, width, ...audit });
  if (audit.overflow) failures.push(`${surface}/${theme}/${width}: page overflow`);
  if (audit.viewportWidth !== width) failures.push(`${surface}/${theme}/${width}: incorrect browser viewport`);
  if (audit.violations.length) failures.push(`${surface}/${theme}/${width}: axe ${audit.violations.map((item) => item.id).join(', ')}`);
  await page.screenshot({ path: join(screenshots, `${surface}-${theme}-${width}.png`), fullPage: true });
  console.log(`${surface}/${theme}/${width}: ${audit.violations.length} axe violations; overflow=${audit.overflow}`);
}

async function cleanupFixtures() {
  if (!fixtures.length) return;
  const { PrismaClient } = createRequire(join(root, 'backend/package.json'))('@prisma/client');
  const client = new PrismaClient({ datasourceUrl: database.href });
  try {
    for (const fixture of fixtures) {
      const organizations = await client.organization.findMany({ where: { id: { in: fixture.organizationIds } } });
      const actor = await client.user.findUnique({ where: { id: fixture.userId } });
      if (!actor?.isDemoActor || organizations.length !== 2 || organizations.some((organization) => !organization.isDemo)) {
        throw new Error('Refusing cleanup of records outside this run\'s synthetic demo fixtures.');
      }
      const memberships = await client.membership.findMany({ where: { organizationId: { in: fixture.organizationIds } } });
      const userIds = [...new Set(memberships.map((membership) => membership.userId).filter(Boolean))];
      await client.$transaction(async (tx) => {
        const where = { organizationId: { in: fixture.organizationIds } };
        for (const model of ['invitation', 'audit', 'activity', 'maintenanceRequest', 'checkout', 'asset', 'location', 'category', 'membership']) {
          await tx[model].deleteMany({ where });
        }
        await tx.organization.deleteMany({ where: { id: { in: fixture.organizationIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds }, demoExpiresAt: { not: null } } });
      });
    }
  } finally {
    await client.$disconnect();
  }
}

try {
  await available(50581);
  await available(50582);
  const api = start('backend', ['src/server.js']);
  const vite = start('frontend', ['scripts/serve-audit.mjs']);
  await ready('http://127.0.0.1:50581/api/health', api);
  await ready(`${appUrl}/api/health`, vite);
  browser = await chromium.launch({ headless: true });
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript((preference) => localStorage.setItem('assethub.theme', preference), theme);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(appUrl);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    for (const width of [320, 375, 425, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await inspect(page, 'access', theme, width);
    }
    await page.getByRole('button', { name: 'Fill demo credentials' }).click();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Dashboard', exact: true })).toBeVisible({ timeout: 30_000 });
    fixtures.push(await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('assethub.session'));
      return { userId: session.user.id, organizationIds: session.organizations.map((organization) => organization.id) };
    }));
    for (const surface of ['dashboard', 'assets']) {
      await page.goto(`${appUrl}/#/${surface}`);
      await expect(page.getByRole('region', { name: surface === 'assets' ? 'Assets' : 'Dashboard', exact: true })).toBeVisible();
      for (const width of [320, 375, 425, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await inspect(page, surface, theme, width);
      }
    }
    const trigger = page.getByRole('button', { name: 'Add asset', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await inspect(page, 'add-asset-dialog', theme, 1440);
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Add asset', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    interactions.push({ theme, check: 'dialog survives StrictMode, traps focus, closes on Escape and restores trigger focus', status: 'pass' });
    await trigger.click();
    const assetName = 'Browser audited asset';
    await dialog.getByRole('textbox', { name: 'Asset name', exact: true }).fill(assetName);
    await dialog.getByRole('textbox', { name: 'Serial number', exact: true }).fill(`BROWSER-AUDIT-${theme}`);
    await dialog.getByRole('combobox', { name: 'Category', exact: true }).selectOption({ label: 'Laptops' });
    await dialog.getByRole('button', { name: 'Add asset', exact: true }).click();
    await expect(dialog).toBeHidden();
    const assetRow = page.getByRole('row').filter({ hasText: assetName });
    await expect(assetRow).toBeVisible();
    await assetRow.getByRole('button', { name: `View ${assetName}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: assetName, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Check out asset', exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Assign to', exact: true }).selectOption({ label: 'Maya Chen' });
    await dialog.getByRole('button', { name: 'Check out', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Check in asset', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Check in asset', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Return notes', exact: true }).fill('Verified local browser return');
    await dialog.getByRole('button', { name: 'Confirm return', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Check out asset', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Transfer location', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'New location', exact: true }).selectOption({ label: 'Engineering' });
    await dialog.getByRole('button', { name: 'Move asset', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Engineering', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Retire asset', exact: true }).click();
    await dialog.getByRole('button', { name: 'Retire asset', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Check out asset', exact: true })).toHaveCount(0);
    await expect(page.getByText('Retired', { exact: true })).toBeVisible();
    interactions.push({ theme, check: 'create, checkout, return, transfer and retire an asset through the UI', status: 'pass' });
    for (const [route, name] of [['locations', 'Locations'], ['people', 'People & access'], ['requests', 'Maintenance'], ['audits', 'Audits'], ['categories', 'Categories & tags'], ['reports', 'Reports'], ['settings', 'Settings']]) {
      await page.goto(`${appUrl}/#/${route}`);
      await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await inspect(page, route, theme, width);
      }
    }
    await page.setViewportSize({ width: 320, height: 1000 });
    const navigationTrigger = page.getByRole('button', { name: 'Open navigation', exact: true });
    await navigationTrigger.click();
    const navigation = page.getByRole('dialog', { name: 'Navigation menu', exact: true });
    await expect(navigation).toBeVisible();
    await inspect(page, 'mobile-navigation', theme, 320);
    await expect.poll(() => navigation.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(navigation).toBeHidden();
    await expect(navigationTrigger).toBeFocused();
    interactions.push({ theme, check: 'mobile navigation focus and Escape restoration', status: 'pass' });
    await context.close();
  }
  const sheet = await browser.newPage({ viewport: { width: 1320, height: 1580 } });
  for (const surface of ['access', 'dashboard', 'assets']) {
    for (const theme of ['light', 'dark']) {
      const cards = [320, 375, 425, 768, 1024, 1440].map((width) => {
        const data = readFileSync(join(screenshots, `${surface}-${theme}-${width}.png`)).toString('base64');
        return `<figure><figcaption>${surface} / ${theme} / ${width}px</figcaption><img src="data:image/png;base64,${data}" /></figure>`;
      }).join('');
      await sheet.setContent(`<style>body{margin:16px;background:#ddd;font:16px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0;background:white;padding:8px}figcaption{padding:4px}img{width:100%;height:720px;object-fit:contain;object-position:top}</style>${cards}`);
      await sheet.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
      await sheet.screenshot({ path: join(output, `${surface}-${theme}-contact.jpg`), fullPage: true, type: 'jpeg', quality: 85 });
    }
  }
  await sheet.close();
} catch (error) {
  failures.push(error.message);
} finally {
  await browser?.close();
  for (const child of children.reverse()) {
    child.kill();
    await new Promise((done) => {
      if (child.exitCode !== null || child.signalCode !== null) return done();
      child.once('exit', done);
    });
  }
  try { await cleanupFixtures(); } catch (error) { failures.push(error.message); }
  if (errors.length) failures.push(...errors.map((error) => `Browser error: ${error}`));
  const report = { startedAt, endedAt: new Date().toISOString(), browser: 'Chromium via Playwright', syntheticLocalDatabase: true, baseline, results, interactions, failures };
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Browser audit: ${results.length} rendered checks, ${failures.length} failures. Report: ${output}`);
  process.exitCode = failures.length ? 1 : 0;
}
