import type { DraftConfig } from '../types';
import { ALL_GENERATIONS, GENERATIONS } from './pokeapi';

export function encodeConfig(config: DraftConfig): string {
  const payload = {
    t: config.teams.map((t) => [t.name, t.seed]),
    g: config.generations,
    s: config.salt,
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeConfig(encoded: string): DraftConfig | null {
  try {
    const payload = JSON.parse(decodeURIComponent(atob(encoded)));
    // Legacy links encoded a bare array of [name, seed] pairs.
    const rawTeams: unknown[] = Array.isArray(payload) ? payload : payload.t;
    if (!Array.isArray(rawTeams)) return null;

    const teams = rawTeams.map((entry) => ({
      name: String((entry as unknown[])[0] ?? ''),
      seed: String((entry as unknown[])[1] ?? ''),
    }));
    if (teams.length < 2) return null;

    const rawGens: unknown[] = Array.isArray(payload) ? ALL_GENERATIONS : (payload.g ?? ALL_GENERATIONS);
    const generations = rawGens.map(Number).filter((g) => g in GENERATIONS);
    const salt = Array.isArray(payload) ? '' : String(payload.s ?? '');
    return { teams, generations: generations.length > 0 ? generations : ALL_GENERATIONS, salt };
  } catch {
    return null;
  }
}

export function shareUrl(config: DraftConfig): string {
  const url = new URL(window.location.href);
  url.hash = `sim=${encodeConfig(config)}`;
  return url.toString();
}

export function configFromUrl(): DraftConfig | null {
  const match = window.location.hash.match(/sim=([^&]+)/);
  return match ? decodeConfig(match[1]) : null;
}
