import type { FeatureOptions, TeamConfig } from '../types';
import { DEFAULT_FEATURES } from '../types';
import { GENERATIONS } from './pokeapi';
import { sanitizeTeams } from './sanitize';

const STORAGE_KEY = 'pokedraft:setup';

export interface SavedSetup {
  teams: TeamConfig[];
  generations: number[];
  adminMode: boolean;
  features: FeatureOptions;
}

export function saveSetup(setup: SavedSetup): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  } catch {
    // Storage can be unavailable (private browsing, quota exceeded) — persistence is best-effort.
  }
}

export function loadSetup(): SavedSetup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Storage contents are untrusted (user- or extension-writable): sanitize like a share link.
    const teams = sanitizeTeams(parsed.teams);
    if (!teams || !Array.isArray(parsed.generations)) return null;
    const generations = parsed.generations.map(Number).filter((g: number) => g in GENERATIONS);
    const rawFeatures = parsed.features && typeof parsed.features === 'object' ? parsed.features : {};
    return {
      teams,
      generations:
        generations.length > 0 ? generations : Object.keys(GENERATIONS).map(Number),
      adminMode: parsed.adminMode === true,
      features: {
        pokerus: typeof rawFeatures.pokerus === 'boolean' ? rawFeatures.pokerus : DEFAULT_FEATURES.pokerus,
        berries: typeof rawFeatures.berries === 'boolean' ? rawFeatures.berries : DEFAULT_FEATURES.berries,
        items: typeof rawFeatures.items === 'boolean' ? rawFeatures.items : DEFAULT_FEATURES.items,
      },
    };
  } catch {
    return null;
  }
}

export function clearSetup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing to clean up if storage is unavailable.
  }
}
