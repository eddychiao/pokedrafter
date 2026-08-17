import type { FeatureOptions, TeamConfig } from '../types';
import { DEFAULT_FEATURES } from '../types';

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
    if (!Array.isArray(parsed.teams) || !Array.isArray(parsed.generations)) return null;
    return {
      teams: parsed.teams,
      generations: parsed.generations,
      adminMode: parsed.adminMode === true,
      features:
        parsed.features && typeof parsed.features === 'object'
          ? { ...DEFAULT_FEATURES, ...parsed.features }
          : DEFAULT_FEATURES,
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
