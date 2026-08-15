# Ascent

Ascent is a private, local-first personal portfolio manager for stocks, ETFs, crypto, cash, watchlists and transaction records.

## What it does

- Create, edit and delete positions with live cost, market value, P/L, return and weight calculations.
- Track TWD and USD cash with a user-controlled USD/TWD rate and selectable base currency.
- Maintain target-entry watchlists and an independent buy/sell transaction ledger.
- Build allocation, concentration and exposure analytics only from entered data.
- Record de-duplicated real portfolio-value snapshots instead of generating fake performance history.
- Persist everything in browser `localStorage`, with JSON export, import and full reset.
- Search TWSE-listed assets and crypto, refresh market prices and USD/TWD FX, and preserve the last successful value when a provider is unavailable.
- Fall back to explicit manual assets and prices without ever substituting fabricated quotes.

## Market data

- Taiwan: TWSE OpenAPI (no key; end-of-day/delayed).
- US: Finnhub Search and Quote (`FINNHUB_API_KEY` required).
- Crypto: CoinGecko public API (no key; rate limited).
- USD/TWD: Frankfurter central-bank reference rate (no key; delayed).

Copy `.env.example` to `.env.local` for local US asset search and quotes. The key is read only by the server route and is never sent to the browser.

## Local development

Use Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
```

## Deployment

The repository builds with React, TypeScript, Vite and Tailwind CSS. It supports both the private Sites build and a standard static Vite build for Vercel.

For GitHub → Vercel, import the repository in Vercel. The committed `vercel.json` runs `npm run build:vercel` and publishes `vercel-dist` automatically. Set `FINNHUB_API_KEY` in the deployment environment to enable automatic US search and quotes; without it, Ascent clearly exposes manual mode.

All portfolio data is device-local. Export `portfolio-backup.json` regularly if the browser profile may be cleared.
