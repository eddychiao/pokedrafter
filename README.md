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

## Logging

The frontend posts a row per Pokémon to a small logging API (`/api`) once each draft's
battles finish — species, shiny/Pokérus/berry/manual-override flags, final wins/losses,
damage dealt/taken, rank, and league metadata (team count, generations, app version).
`/api/export.csv` returns the whole table as a downloadable CSV.

The API needs a Postgres database attached (`DATABASE_URL` env var — the table auto-creates
on first write, no manual SQL needed) and a host that can run serverless functions, since
GitHub Pages only serves static files. Logging is fire-and-forget from the client: if the
API isn't deployed or is unreachable, the app behaves exactly as before and just skips
logging that run.
