# MetaAds Research

A small Next.js app for researching Facebook & Instagram ads through the **Meta Ad Library API**.

- **Search** by keyword (any or exact phrase) or competitor Page ID, filtered by country, active status and media type.
- **Spot winners**: every ad shows how many days it has been running. Ads running 21+ days are tagged *Likely profitable*, 60+ days *Proven winner*. Filter and sort by run time.
- **Advertisers view**: who runs the most ads for a keyword, their longest and average run times. Click one to see only their ads.
- **Hooks view**: the first line of each ad's primary text, sorted by run time, with one-click copy.
- **Swipe file**: save ads, add notes, and export to CSV (kept in your browser's localStorage).
- **Demo mode**: with no token set, the app serves sample ads so you can try the UI straight away.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your META_ACCESS_TOKEN (optional)
npm run dev                  # http://localhost:3000
```

## Getting a Meta Ad Library token

1. Confirm your identity at <https://www.facebook.com/ID> (needed for Ad Library API access).
2. Create an app at <https://developers.facebook.com/apps> and accept the Ad Library API terms at <https://www.facebook.com/ads/library/api>.
3. Generate a user access token in the [Graph API Explorer](https://developers.facebook.com/tools/explorer) and put it in `.env.local` as `META_ACCESS_TOKEN`.

The token stays on the server: the browser only talks to `/api/ads`, which calls the Graph API `ads_archive` endpoint.

### API coverage caveat

Meta's API returns **all ad types only for ads delivered in the EU/UK**. For other countries (including India and the US), the API returns only political/issue ads; commercial ads there are visible on the public Ad Library website, but not through the API. Pick an EU country (e.g. `DE`, `FR`) or `GB` to research commercial ads, or use "View in Ad Library" to open any ad on the website.

## Roadmap

The plan for the full Meta Ads Intelligence Dashboard is in [docs/PLAN.md](docs/PLAN.md). It covers the architecture, data providers, database schema, adapter interface, build phases and risks.

## Project structure

```
app/
  page.tsx            Research UI (search, stats, ads / advertisers / hooks tabs)
  saved/page.tsx      Swipe file
  api/ads/route.ts    Validates query params; calls Meta or demo data
components/           AdCard, AdvertiserTable
lib/
  metaAdLibrary.ts    Graph API client + normalisation (server only)
  demoAds.ts          Sample data for demo mode
  analysis.ts         Days running, winner tiers, advertiser summary, hooks, CSV
  swipeFile.ts        localStorage-backed swipe file hook
```

## Scripts

| Command             | What it does          |
| ------------------- | --------------------- |
| `npm run dev`       | Dev server            |
| `npm run build`     | Production build      |
| `npm start`         | Serve the build       |
| `npm run typecheck` | TypeScript check      |
