# URL Shortener

A small but deliberately non-trivial URL shortener, built to demonstrate a few
production-minded decisions rather than just a working demo.

## Stack
- Backend: Node.js, Express, Prisma (SQLite by default, swap to MySQL for prod)
- Frontend: React (Vite)
- Deploy target: Railway/Render for the API, static host (Vercel/Netlify) or
  Render for the frontend

## Design decisions worth calling out in your portfolio writeup

**Fire-and-forget click logging.** The redirect (`GET /:slug`) responds
immediately and logs the click asynchronously afterward. A visitor's redirect
latency should never depend on an analytics write succeeding.

**Base62 slugs via nanoid, not UUIDs.** UUIDs are unnecessarily long for a
public-facing short link. `nanoid(7)` gives ~3.5 trillion possible IDs at 7
characters — collision-safe for realistic scale — with a DB-level retry loop
as a backstop.

**Rate limiting only on the write path.** Limiting `/api/links` (creation)
prevents abuse without penalizing legitimate redirect traffic, which needs to
stay fast and unthrottled.

**TTL + scheduled cleanup instead of soft-delete flags.** Expired links are
actually removed by a nightly cron job, keeping the links table from growing
unbounded — a small nod to long-term data hygiene.

## Local setup
```bash
# backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Possible extensions (if you want to go further)
- Redis cache in front of the redirect lookup for read-heavy scale
- Per-user accounts + link ownership (auth)
- Geo/device breakdown on click stats (parse user-agent, IP geolocation)
- Custom domains per link
