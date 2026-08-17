import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, setCors, sql } from './_db';

/** Same shape the frontend sends — see src/lib/logging.ts. */
interface RunRow {
  teamName: string;
  trainerName: string;
  trainerElite: boolean;
  pokemonId: number;
  pokemonName: string;
  pokemonTypes: string[];
  isShiny: boolean;
  hasPokerus: boolean;
  berry: string | null;
  isManual: boolean;
  wins: number;
  losses: number;
  damageDealt: number;
  damageTaken: number;
  finalRank: number;
}

const MAX_ROWS = 16;
const MAX_TEXT = 80;

function str(value: unknown, max = MAX_TEXT): string {
  return String(value ?? '').slice(0, max);
}

function int(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function bool(value: unknown): boolean {
  return value === true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body as {
    runId?: unknown;
    appVersion?: unknown;
    numTeams?: unknown;
    generations?: unknown;
    rows?: unknown;
  };

  const rawRows = Array.isArray(body?.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  if (rawRows.length === 0) return res.status(400).json({ error: 'no rows' });

  const runId = str(body.runId, 64);
  const appVersion = str(body.appVersion, 16);
  const numTeams = int(body.numTeams, 2, 16);
  const generations = str(body.generations, 32);

  try {
    await ensureSchema();

    for (const raw of rawRows as RunRow[]) {
      const types = Array.isArray(raw.pokemonTypes) ? raw.pokemonTypes.slice(0, 2).map((t) => str(t, 20)) : [];
      await sql`
        INSERT INTO pokemon_events (
          run_id, app_version, num_teams, generations,
          team_name, trainer_name, trainer_elite,
          pokemon_id, pokemon_name, pokemon_types,
          is_shiny, has_pokerus, berry, is_manual,
          wins, losses, damage_dealt, damage_taken, final_rank
        ) VALUES (
          ${runId}, ${appVersion}, ${numTeams}, ${generations},
          ${str(raw.teamName)}, ${str(raw.trainerName)}, ${bool(raw.trainerElite)},
          ${int(raw.pokemonId, 1, 1025)}, ${str(raw.pokemonName)}, ${types.join(',')},
          ${bool(raw.isShiny)}, ${bool(raw.hasPokerus)}, ${raw.berry ? str(raw.berry, 20) : null}, ${bool(raw.isManual)},
          ${int(raw.wins, 0, 15)}, ${int(raw.losses, 0, 15)}, ${int(raw.damageDealt, 0, 1_000_000)}, ${int(raw.damageTaken, 0, 1_000_000)}, ${int(raw.finalRank, 1, 16)}
        )
      `;
    }

    res.status(204).end();
  } catch (err) {
    console.error('log-run failed', err);
    res.status(500).json({ error: 'log failed' });
  }
}
