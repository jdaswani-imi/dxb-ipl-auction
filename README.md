# Dxb IPL Auction 2026

Private cricket auction app for the Dubai IPL league.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres, Auth)
- CricAPI

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Open <http://localhost:3000>.

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint
