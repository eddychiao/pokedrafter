# Poké Draft Order

Settle your fantasy football draft order with simulated Pokémon battles.

## How it works

1. Configure your league: number of teams (2–20), a name per team, and a seed (any text or number).
2. Each seed hashes (FNV-1a) to one of the 1025 Pokémon. Stats, types, moves, and sprites come from [PokeAPI](https://pokeapi.co/).
3. A full round-robin runs: every Pokémon battles every other one using a simplified level-50 damage formula (STAB, type effectiveness, crits, accuracy, speed order).
4. Battles play back on screen with HP bars and a battle log — speed controls from 1x to 10x, or skip straight to results.
5. Draft order = wins, tiebroken by total damage dealt.

The whole simulation is deterministic from the team config, so the **share link** (config encoded in the URL hash) reproduces the exact same battles and order for anyone who opens it.

## Development

```sh
npm install
npm run dev
```

## Deployment

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set **Pages → Source → GitHub Actions** once.

## Logging & analytics (Vercel)

The frontend also (optionally) posts a row per Pokémon to a small logging API once each
draft's battles finish, and mounts Vercel Web Analytics for pageviews. Both live in a
**separate Vercel deployment** of this same repo — GitHub Pages stays the static frontend
host; Vercel only needs to run `/api/*`. One-time setup (can't be done from this session,
needs your Vercel account):

1. On [vercel.com](https://vercel.com), **Add New → Project**, import this GitHub repo.
   Vercel auto-detects Vite; accept the defaults and deploy.
2. In the new project, go to **Storage → Create Database → Postgres (Neon)** and attach it.
   This sets `DATABASE_URL` automatically and redeploys — no manual SQL needed, the API
   creates its table on first write.
3. Go to the project's **Analytics** tab and enable Web Analytics (free on the Hobby plan).
4. Confirm the assigned domain is `pokedrafter.vercel.app`. If Vercel gives you a different
   one, update `API_BASE` in `src/lib/logging.ts` to match and redeploy.
5. To pull the data: visit `https://pokedrafter.vercel.app/api/export.csv` in a browser —
   it downloads the full log as CSV (one row per Pokémon per draft: species, shiny/Pokérus/
   berry/manual-override flags, final wins/losses, damage dealt/taken, rank, and league
   metadata like team count and generations).

Logging is fire-and-forget from the client — if the API is unreachable or not yet set up,
the app behaves exactly as before, it just doesn't log that run.
