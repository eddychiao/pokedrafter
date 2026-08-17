import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, setCors, sql } from './_db';

const COLUMNS = [
  'id', 'created_at', 'run_id', 'app_version', 'num_teams', 'generations',
  'team_name', 'trainer_name', 'trainer_elite',
  'pokemon_id', 'pokemon_name', 'pokemon_types',
  'is_shiny', 'has_pokerus', 'berry', 'is_manual',
  'wins', 'losses', 'damage_dealt', 'damage_taken', 'final_rank',
] as const;

function csvField(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).send('GET only');

  try {
    await ensureSchema();
    const rows = await sql`SELECT * FROM pokemon_events ORDER BY created_at ASC`;

    const lines = [COLUMNS.join(',')];
    for (const row of rows as Record<string, unknown>[]) {
      lines.push(COLUMNS.map((c) => csvField(row[c])).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pokedrafter-log.csv"');
    res.status(200).send(lines.join('\n'));
  } catch (err) {
    console.error('export failed', err);
    res.status(500).send('export failed');
  }
}
