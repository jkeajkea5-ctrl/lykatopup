# Lyka Topup

Full-stack game top-up website with React, Express, MongoDB, KHQR checkout, optional buyer login, protected admin dashboard, and Telegram notifications.

## Local Development

1. Install Node.js 20+ and MongoDB, or create a MongoDB Atlas cluster.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill the values.
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173`.

The API runs on `http://localhost:5000` and the Vite dev server proxies `/api`.

## MongoDB Setup

Use either local MongoDB:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/lykatopup
```

Or MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/lykatopup
```

The first successful API startup seeds:

- Default admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Starter games and packages
- Default system settings

## Google OAuth

1. Create a Google Cloud OAuth client for a web app.
2. Add authorized JavaScript origins:
   - Local: `http://localhost:5173`
   - Production: your Vercel domain
3. Add the client ID to `.env`:
   ```env
   GOOGLE_CLIENT_ID=...
   ```
4. The backend verifies Google ID tokens at `/api/auth/google`.

## Telegram Login

1. Create the buyer bot with BotFather.
2. Configure domain for the Telegram Login Widget in BotFather.
3. Set:
   ```env
   TELEGRAM_BOT_TOKEN_BUYER=...
   ```
4. Send Telegram login payloads to `/api/auth/telegram`.

## Telegram Bots

Create three bots with BotFather:

- Buyer bot: sends order creation, payment status, and completion messages.
- Seller/admin bot: sends new order and successful payment notifications.
- Notification bot: sends system alerts and payment errors.

Set:

```env
TELEGRAM_BOT_TOKEN_BUYER=...
TELEGRAM_BOT_TOKEN_ADMIN=...
TELEGRAM_BOT_TOKEN_NOTIFICATION=...
TELEGRAM_ADMIN_CHAT_ID=...
```

Buyer notifications require `contact.telegramChatId` or a logged-in Telegram buyer.

## KHQR Setup

Secrets must stay in `.env` or Vercel environment variables only:

```env
TOLA_BASE_URL=https://tola-api.com
TOLA_AUTH_PATH=/api/login
TOLA_KHQR_PATH=/api/khqr/create
TOLA_STATUS_PATH=/api/khqr/status
TOLA_USERNAME=...
TOLA_PASSWORD=...
TOLA_TOKEN=
TOLA_MERCHANT_NAME=Lyka Topup
TOLA_BAKONG_ID=...
TOLA_MOCK=false
```

If Tola uses different endpoint paths, update only `TOLA_AUTH_PATH`, `TOLA_KHQR_PATH`, and `TOLA_STATUS_PATH`. For local UI testing without live payment calls, set:

```env
TOLA_MOCK=true
```

Payment status is checked in two ways:

- KHQR Link can call the webhook endpoint `/api/webhooks/khqr`. Set the portal Webhook URL to `https://your-domain.com/api/webhooks/khqr`, copy the portal webhook secret into `KHQR_LINK_WEBHOOK_SECRET`, and enable webhook delivery. Webhook requests are verified with `X-KHQR-Signature`, then the backend confirms the payment with KHQR Link before marking the order paid.
- The checkout popup polls `/api/payments/:paymentId/check` while the buyer keeps the page open.
- The scheduled cron endpoint `/api/cron/poll-payments` checks pending payments and can confirm orders even if the buyer pays from a screenshot and never returns to the website.
- On long-running Node servers, the built-in payment polling worker runs automatically after MongoDB connects. Configure it with `PAYMENT_POLL_WORKER_ENABLED`, `PAYMENT_POLL_INTERVAL_SECONDS`, `PAYMENT_POLL_LIMIT`, and `PAYMENT_POLL_MAX_AGE_MINUTES`.

Set `CRON_SECRET` in production and call cron endpoints with `Authorization: Bearer <CRON_SECRET>`. `vercel.json` schedules payment polling daily to support Vercel Hobby limits; for faster confirmation on Vercel, call the same endpoint from an external scheduler more frequently or upgrade to a plan that supports frequent Cron Jobs.

This repo includes `.github/workflows/poll-fulfillment.yml` for automatic 5-minute polling through GitHub Actions. To enable it, add a GitHub Actions repository secret named `CRON_SECRET` with the same value configured in Vercel. The workflow calls both `/api/cron/poll-payments` and `/api/cron/poll-deliveries`.

For faster external polling on an always-on server such as B2K, run:

```bash
npm run poll:fulfillment-loop
```

Set `FULFILLMENT_POLL_BASE_URL=https://lykatopup.store`, `CRON_SECRET`, `FULFILLMENT_DELIVERY_POLL_SECONDS=5`, and `FULFILLMENT_PAYMENT_POLL_SECONDS=30`. This polls G2Bulk delivery every 5 seconds and payment fallback every 30 seconds. Vercel Hobby and GitHub Actions cannot run every 5 seconds.

## Game Username APIs

Each game stores `requiredFields` and optional `usernameApi` settings. Use templates like `{{userId}}` and `{{serverId}}` in URL, headers, or request body fields. Checkout is blocked unless the username check returns a username.

Example username API shape:

```json
{
  "enabled": true,
  "method": "GET",
  "url": "https://example.com/check?uid={{userId}}&server={{serverId}}",
  "headers": {
    "Authorization": "Bearer SECRET"
  },
  "usernamePath": "data.username"
}
```

Store provider API secrets on the backend only.

## Vercel Deployment

1. Push this folder to GitHub repository `https://github.com/jkeajkea5-ctrl/lykatopup.git`.
2. Import the repository in Vercel project `lykatopup`.
3. Set Vercel build command:
   ```bash
   npm run build
   ```
4. Set output directory:
   ```bash
   client/dist
   ```
5. Add all production environment variables in Vercel Project Settings.
6. Set `CLIENT_URL=https://real-topup.vercel.app`.
7. Deploy.

`vercel.json` rewrites `/api/*` to the Express serverless function and all frontend routes to `index.html`.

## Security Notes

- Admin routes require JWT with `role=admin`.
- Payment routes are rate-limited and execute only on the backend.
- API credentials are never included in frontend code.
- Requests are validated with Zod on sensitive routes.
- Input is sanitized before MongoDB writes.
- Use HTTPS in production.
- Rotate any credential that was shared in chat or committed accidentally.
