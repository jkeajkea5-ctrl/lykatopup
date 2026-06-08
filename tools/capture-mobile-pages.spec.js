import fs from 'node:fs';
import path from 'node:path';
import { test, chromium, request } from '@playwright/test';

const root = process.cwd();
const baseUrl = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const outDir = path.join(root, 'docs', 'mobile-screenshots');
const mobile = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
};

function readEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=\s]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()])
  );
}

async function capture(page, name, url, setup) {
  await setup?.(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

test('capture mobile pages', async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const env = readEnv();
  const api = await request.newContext({ baseURL: baseUrl });

  const games = await (await api.get('/api/games')).json();
  const game = games.find((item) => item.slug === 'mobile-legends') || games[0];
  const packages = game ? await (await api.get(`/api/packages?game=${game._id}`)).json() : [];
  const pkg = packages[0];

  let adminToken = '';
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const login = await api.post('/api/auth/admin/login', {
      data: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }
    });
    if (login.ok()) adminToken = (await login.json()).token;
  }

  let sampleOrderNo = '';
  let receiptOrderNo = '';
  if (adminToken) {
    const ordersResponse = await api.get('/api/orders', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (ordersResponse.ok()) {
      const orders = await ordersResponse.json();
      sampleOrderNo = orders[0]?.orderNo || '';
      receiptOrderNo =
        orders.find((order) => ['paid', 'processing', 'completed'].includes(order.status))?.orderNo || sampleOrderNo;
    }
  }

  const browser = await chromium.launch({ channel: 'chrome' });
  const publicContext = await browser.newContext(mobile);
  const page = await publicContext.newPage();

  const publicPages = [
    ['01-home', '/'],
    ['02-games', '/games'],
    game ? ['03-game-detail', `/games/${game.slug}`] : null,
    ['04-login', '/login'],
    ['05-register', '/register'],
    ['06-profile', '/profile'],
    ['07-order-status', '/order-status'],
    ['08-admin-login', '/admin/login']
  ].filter(Boolean);

  for (const [name, route] of publicPages) {
    await capture(page, name, `${baseUrl}${route}`);
  }

  if (game && pkg) {
    await capture(page, '09-checkout', `${baseUrl}/checkout/${game.slug}/${pkg._id}`, async (targetPage) => {
      await targetPage.addInitScript(
        ({ packageId }) => {
          sessionStorage.setItem(
            'finchup_checkout_draft',
            JSON.stringify({
              packageId,
              username: 'DemoPlayer',
              accountInfo: { userId: '123456789', serverId: '1234' }
            })
          );
        },
        { packageId: pkg._id }
      );
    });
  }

  if (sampleOrderNo) {
    await capture(page, '10-payment', `${baseUrl}/payment/${sampleOrderNo}`);
  }

  if (receiptOrderNo) {
    await capture(page, '11-receipt', `${baseUrl}/receipt/${receiptOrderNo}`);
  }

  await publicContext.close();

  if (adminToken) {
    const adminContext = await browser.newContext({
      ...mobile,
      storageState: {
        cookies: [],
        origins: [{ origin: baseUrl, localStorage: [{ name: 'finchup_token', value: adminToken }] }]
      }
    });
    const adminPage = await adminContext.newPage();
    const adminPages = [
      ['12-admin-dashboard', '/admin'],
      ['13-admin-games', '/admin/games'],
      ['14-admin-game-new', '/admin/games/new'],
      ['15-admin-packages', '/admin/packages'],
      ['16-admin-categories', '/admin/categories'],
      ['17-admin-slides', '/admin/slides'],
      ['18-admin-orders', '/admin/orders'],
      ['19-admin-transactions', '/admin/transactions'],
      ['20-admin-analytics', '/admin/analytics'],
      ['21-admin-users', '/admin/users'],
      ['22-admin-settings', '/admin/settings']
    ];

    for (const [name, route] of adminPages) {
      await capture(adminPage, name, `${baseUrl}${route}`);
    }

    await adminContext.close();
  }

  await browser.close();
});
