# Lead CRM

A simple personal CRM to keep all your leads in one place. Built with Next.js + Postgres, ready to host on Vercel.

**Features**
- 🔐 Password-protected (single user)
- 📊 Dashboard: totals, pipeline value, win rate, follow-ups due, leads by source
- 📋 Leads list: search, filter by status/source, sort, bulk status change / delete
- 🧲 Pipeline (Kanban): drag leads between New → Contacted → Qualified → Proposal → Won / Lost
- 📝 Lead page: activity log (calls, WhatsApp, emails, meetings, notes), one-click Call / WhatsApp / Email
- 📥 CSV import (Meta Lead Ads export, Excel, Google Sheets…) with duplicate detection, 📤 CSV export
- 🔌 Webhook `POST /api/leads` so forms, Zapier, Make, Pabbly or Meta Lead Ads can push leads in automatically

## Deploy to Vercel (≈5 minutes)

1. **Import the repo** – go to [vercel.com/new](https://vercel.com/new), pick this GitHub repo, click **Deploy** (the first deploy may show an error page until step 3 is done — that's fine).
2. **Add a database** – in the Vercel project open **Storage → Create Database → Neon (Postgres)** → connect it to the project. This sets `DATABASE_URL` for you. (Supabase or any other Postgres also works: just set `DATABASE_URL` yourself.)
3. **Set environment variables** – **Settings → Environment Variables**:
   | Name | Value |
   |---|---|
   | `APP_PASSWORD` | the password you'll log in with |
   | `AUTH_SECRET` | any long random string (e.g. from `openssl rand -hex 32`) |
   | `LEADS_API_KEY` | another random string (only needed for the webhook) |
4. **Redeploy** (Deployments → ⋯ → Redeploy). Open the site and log in.

Tables are created automatically on first use — no migrations to run.

## Receive leads automatically

```bash
curl -X POST "https://YOUR-APP.vercel.app/api/leads?source=website" \
  -H "x-api-key: YOUR_LEADS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","email":"rahul@example.com","phone":"+91 98765 43210","notes":"Wants a demo"}'
```

Accepts JSON or form data. Field names like `full_name`, `first_name`/`last_name`, `phone_number`, `message` are understood too.
Send `{"leads":[...]}` to add several at once. The **Integrations** page in the app shows your exact URL and a Meta Lead Ads → Zapier/Make recipe.

## Run locally

```bash
cp .env.example .env.local   # fill in DATABASE_URL, APP_PASSWORD, AUTH_SECRET
npm install
npm run dev
```
