# TalentScout (SelfcastPro sub‑app)

Standalone Next.js app living under `/talentscout`. Deploy as a **separate Vercel project** (Root Directory = `talentscout`) to keep it isolated from the rest of the repo.

## Quick start (local)
1. `cd talentscout`
2. `cp .env.example .env`
3. `npm i`
4. `npm run prisma:push` (creates SQLite `dev.db`)
5. `npm run dev`

Open http://localhost:3000 → you’ll be asked for a display name (dev cookie).

## Deploy
- Create a new Vercel project → *Import GitHub repo* → set **Root Directory** to `talentscout` → add env vars:
- `DATABASE_URL` *(optional – enables persistent Postgres storage; when omitted the app uses an in-memory store that resets between deploys)*. If you set it, paste the **actual** Postgres connection string from your provider (for example `postgres://myuser:mysecret@db.eu-west-1.aws.neon.tech:5432/app?sslmode=require`). Placeholder fragments such as `USER`, `PASSWORD`, `HOST` or `DBNAME` are treated as missing, so migrations are skipped and Prisma stays disabled.
- `INGEST_TOKEN`
- `SESSION_SECRET`
- Build script auto-skips `prisma migrate deploy` when `DATABASE_URL` is missing, so deploys succeed even without a database.
- Run `prisma generate` during build (already in `build` script).

## Connect Apify Hashtag Scraper
Set your Apify actor to POST JSON array to:
```
POST https://<your-vercel-domain>/api/ingest
Headers: x-ingest-token: <INGEST_TOKEN>
Body example: [
{
"username": "janedoe",
"fullName": "Jane Doe",
"bio": "Actor | Model",
"profileUrl": "https://instagram.com/janedoe",
"avatarUrl": "https://.../profile.jpg",
"followers": 12000,
"sourceHashtag": "castingdenmark",
"country": "DK"
}
]
```

## Notes
- Auth is intentionally lightweight for speed. Swap to NextAuth/SAML later.
- Status values are: `NEW`, `CONTACTED`, `REPLIED`, `SIGNED_UP`, `NOT_INTERESTED`.
- DM Composer lets scouts inject **up to 3 Instagram handles** for credibility.
- All UI is Tailwind; easy to restyle in `globals.css`.
