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
