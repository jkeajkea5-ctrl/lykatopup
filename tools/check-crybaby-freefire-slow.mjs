import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'https://crybabyst4re.com/product/freefire-slow';
const outDir = path.resolve('test-results');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'
});

const responses = [];
page.on('response', async (response) => {
  const responseUrl = response.url();
  if (!responseUrl.includes('crybabyst4re.com')) return;
  const contentType = response.headers()['content-type'] || '';
  if (!/json|html|text|javascript/.test(contentType)) return;
  try {
    const text = await response.text();
    responses.push({
      url: responseUrl,
      status: response.status(),
      contentType,
      text: text.slice(0, 20000)
    });
  } catch {}
});

let status = null;
try {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  status = response?.status() ?? null;
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.screenshot({ path: path.join(outDir, 'crybaby-freefire-slow.png'), fullPage: true });
} catch (error) {
  console.error(`NAV_ERROR ${error.message}`);
}

const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
await fs.writeFile(path.join(outDir, 'crybaby-freefire-slow.txt'), bodyText, 'utf8');
await fs.writeFile(path.join(outDir, 'crybaby-freefire-slow-responses.json'), JSON.stringify(responses, null, 2), 'utf8');

console.log(JSON.stringify({
  status,
  title: await page.title().catch(() => ''),
  url: page.url(),
  bodyPreview: bodyText.slice(0, 4000),
  responses: responses.map((response) => ({
    url: response.url,
    status: response.status,
    contentType: response.contentType,
    preview: response.text.slice(0, 300)
  }))
}, null, 2));

await browser.close();
