import type { DraftConfig } from '../types';
import type { TournamentResult } from './tournament';
import { APP_VERSION } from '../version';

/**
 * Serverless logging API — deployed separately on Vercel (see /api). Works cross-origin
 * from GitHub Pages too, since the API sets permissive CORS headers.
 */
const API_BASE = 'https://pokedrafter.vercel.app';

/** Fire-and-forget: analytics must never break or slow down the actual battle flow. */
export function logTournamentResult(draft: DraftConfig, result: TournamentResult): void {
  const rows = result.standings.map((s, i) => ({
    teamName: s.combatant.team.name,
    trainerName: s.combatant.trainer.name,
    trainerElite: s.combatant.trainer.elite,
    pokemonId: s.combatant.pokemon.id,
    pokemonName: s.combatant.pokemon.name,
    pokemonTypes: s.combatant.pokemon.types,
    isShiny: s.combatant.pokemon.shiny,
    hasPokerus: s.combatant.pokemon.pokerus,
    berry: s.combatant.pokemon.berry ?? null,
    isManual: s.combatant.pokemon.manual,
    wins: s.wins,
    losses: s.losses,
    damageDealt: s.damageDealt,
    damageTaken: s.damageTaken,
    finalRank: i + 1,
  }));

  const body = JSON.stringify({
    runId: draft.salt,
    appVersion: APP_VERSION,
    numTeams: draft.teams.length,
    generations: draft.generations.join(','),
    rows,
  });

  void fetch(`${API_BASE}/api/log-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Logging is best-effort — a failed request shouldn't surface to the user.
  });
}
