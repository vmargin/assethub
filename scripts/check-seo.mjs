import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { preview } from '../frontend/node_modules/vite/dist/node/index.js';

// Anonymous built-output checks only: no API server, database or live requests.
const root = fileURLToPath(new URL('../frontend', import.meta.url));
const output = new URL('../docs/development/evidence/seo-2026-10-25/implementation/', import.meta.url);
mkdirSync(output, { recursive: true });
const server = await preview({ root, preview: { host: '127.0.0.1', port: 50585, strictPort: true } });
const origin = 'http://127.0.0.1:50585';
const production = 'https://erlassethub.vercel.app';
let browser;
const results = [];
const errors = [];

try {
  browser = await chromium.launch({ headless: true });
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Keep inventory, people, and asset history/);
  assert.match(html, /<h1[^>]*>Every asset/);
  writeFileSync(new URL('initial-home.html', output), html);

  for (const [path, contentType, text] of [
    ['/robots.txt', /text\/plain/, 'Allow: /'],
    ['/social-preview.png', /image\/png/, null],
  ]) {
    const resource = await fetch(origin + path);
    assert.equal(resource.status, 200);
    assert.match(resource.headers.get('content-type'), contentType);
    if (text) assert.ok((await resource.text()).includes(text));
    results.push({ path, status: resource.status, contentType: resource.headers.get('content-type') });
  }

  const local = await browser.newPage();
  await local.goto(origin);
  await expect(local.locator('#access-submit')).toBeVisible();
  await expect(local.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await local.close();
  results.push({ check: 'local environment exclusion', result: 'passed' });

  // Exercise the production hostname entirely on local built files. This is
  // browser verification, not an emulation of Vercel header or rewrite behavior.
  const context = await browser.newContext();
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, production);
    assert.ok(!url.pathname.startsWith('/api'), 'Anonymous checks must not call an API');
    await route.fulfill({ response: await route.fetch({ url: origin + url.pathname + url.search, maxRedirects: 0 }) });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [path, robots, heading] of [
    ['/', 'noindex, nofollow', 'Welcome back'],
    ['/?utm_source=seo-check', 'noindex, nofollow', 'Welcome back'],
    ['/?invite=seo-check-invalid', 'noindex, nofollow', 'Join your team'],
    ['/?invite=', 'noindex, nofollow', 'Welcome back'],
    ['/#dashboard', 'noindex, nofollow', 'Welcome back'],
    ['/#assets/missing', 'noindex, nofollow', 'Welcome back'],
  ]) {
    await page.goto(production + path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', robots);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', production + '/');
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    results.push({ path, robots, accessHeading: heading });
  }
  await page.goto(production);
  await page.evaluate(() => { location.hash = '#dashboard'; });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  await page.evaluate(() => { location.hash = '#home'; });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  results.push({ check: 'client hash navigation preserves access gate and sitewide noindex', result: 'passed' });
  assert.deepEqual(errors, []);
  await context.close();

  // Inspect the new static shell with JavaScript disabled in both themes.
  for (const theme of ['light', 'dark']) {
    const staticContext = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await staticContext.newPage();
    for (const width of [320, 375, 425, 768, 1024, 1440]) {
      await staticPage.setViewportSize({ width, height: 900 });
      await staticPage.goto(origin);
      await staticPage.locator('html').evaluate((element, value) => { element.dataset.theme = value; }, theme);
      await staticPage.evaluate(() => document.fonts.ready);
      await expect(staticPage.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(staticPage.locator('noscript p')).toBeVisible();
      await expect(staticPage.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
      const overflow = await staticPage.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.equal(overflow, 0, `${theme} static shell overflows at ${width}px`);
      await staticPage.screenshot({ path: fileURLToPath(new URL(`static-${theme}-${width}.png`, output)), fullPage: true });
      results.push({ check: 'static shell', theme, width, overflow });
    }
    await staticContext.close();
  }
  const png = readFileSync(new URL('../frontend/dist/social-preview.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  results.push({ check: 'social preview dimensions', width: 1200, height: 630 });

  writeFileSync(new URL('checks.json', output), JSON.stringify({
    checkedAt: new Date().toISOString(), scope: 'Local built output and locally intercepted trusted-host browser loads',
    results, pageErrors: errors,
    pending: ['Actual Vercel unknown-path 404s, sitewide noindex headers and public social-image fetch after deployment'],
  }, null, 2) + '\n');
  console.log(`Passed ${results.length} SEO checks. Vercel edge behavior remains pending deployment verification.`);
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
