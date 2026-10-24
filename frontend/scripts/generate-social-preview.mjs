import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Run from the installed repository: node frontend/scripts/generate-social-preview.mjs
// Local fonts and artwork make this reproducible without network requests.
const font = (path) => readFileSync(new URL(path, import.meta.url)).toString('base64');
const sans = font('../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2');
const serif = font('../node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2');
const mark = readFileSync(new URL('../public/assethub.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><head><style>
    @font-face { font-family: Sans; src: url(data:font/woff2;base64,${sans}); }
    @font-face { font-family: Serif; src: url(data:font/woff2;base64,${serif}); }
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; padding: 56px 72px;
      background: #f4f3ee; color: #23342d; font: 26px Sans, sans-serif; }
    header { display: flex; align-items: center; gap: 14px; font-size: 28px; }
    header svg { width: 48px; height: 48px; }
    h1 { margin: 56px 0 20px; font: 88px/0.98 Serif, Georgia, serif; letter-spacing: -2px; }
    h1 span { color: #315e4d; }
    p { max-width: 800px; margin: 0; line-height: 1.5; color: #59675e; }
    footer { margin-top: 38px; padding-top: 24px; border-top: 1px solid #d5dace;
      display: flex; justify-content: space-between; font-size: 19px; color: #315e4d; }
  </style></head><body>
    <header>${mark}<span>ERL AssetHub</span></header>
    <h1>Every asset.<br><span>In good hands.</span></h1>
    <p>Inventory, people, and asset history.<br>One clear view across your workspaces.</p>
    <footer><span>Explore an isolated demo workspace</span><span>erlassethub.vercel.app</span></footer>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL('../public/social-preview.png', import.meta.url)) });
} finally {
  await browser.close();
}
