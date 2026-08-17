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

## Logging & analytics

Pageviews and per-Pokémon results log through **Vercel Web Analytics** (`@vercel/analytics`)
— no backend of our own. `src/lib/logging.ts` fires one `track('pokemon_generated', ...)`
custom event per Pokémon once a draft's battles finish (species/types/shiny/Pokérus/berry/
manual-override flags, team & trainer, final rank, wins/losses, damage dealt/taken). View
and export it from the Vercel dashboard's **Analytics → Events** panel.

This only works when the site is actually served from a Vercel deployment (the tracking
script proxies through Vercel's edge network — it silently does nothing on GitHub Pages),
and **Custom Events require a Pro team** — they're not available on the free Hobby plan at
all. Pro also caps you at 2 properties per event (8 with the paid Web Analytics Plus
add-on), which is why each event packs its fields into two delimited strings instead of one
per field. Logging is otherwise fire-and-forget: if Analytics isn't set up or the event is
dropped, the app behaves exactly as before.
