import { neon } from '@neondatabase/serverless';

/**
 * Vercel's Neon integration sets DATABASE_URL (or POSTGRES_URL as a fallback name
 * depending on integration version) automatically once Postgres storage is attached
 * to the project — no manual wiring needed beyond attaching it in the dashboard.
 */
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — attach a Postgres database to this Vercel project.');
}

export const sql = neon(connectionString);

let schemaReady: Promise<unknown> | null = null;

/** Creates the log table on first use so no manual SQL setup step is required. */
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS pokemon_events (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        run_id TEXT NOT NULL,
        app_version TEXT,
        num_teams INT,
        generations TEXT,
        team_name TEXT,
        trainer_name TEXT,
        trainer_elite BOOLEAN,
        pokemon_id INT,
        pokemon_name TEXT,
        pokemon_types TEXT,
        is_shiny BOOLEAN,
        has_pokerus BOOLEAN,
        berry TEXT,
        is_manual BOOLEAN,
        wins INT,
        losses INT,
        damage_dealt INT,
        damage_taken INT,
        final_rank INT
      )
    `;
  }
  return schemaReady;
}

export function setCors(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
