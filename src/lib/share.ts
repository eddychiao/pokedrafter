import type { DraftConfig } from '../types';
import { DEFAULT_FEATURES } from '../types';
import { ALL_GENERATIONS, GENERATIONS } from './pokeapi';
import { sanitizeSalt, sanitizeTeams } from './sanitize';

export function encodeConfig(config: DraftConfig): string {
  const payload = {
    t: config.teams.map((t) => [
      t.name,
      t.seed,
      t.manual?.pokemonId ?? null,
      t.manual?.shiny === undefined ? null : t.manual.shiny ? 1 : 0,
    ]),
    g: config.generations,
    s: config.salt,
    f: [config.features.pokerus ? 1 : 0, config.features.berries ? 1 : 0, config.features.items ? 1 : 0],
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeConfig(encoded: string): DraftConfig | null {
  try {
    const payload = JSON.parse(decodeURIComponent(atob(encoded)));
    // Legacy links encoded a bare array of [name, seed] pairs.
    const rawTeams: unknown[] = Array.isArray(payload) ? payload : payload.t;
    if (!Array.isArray(rawTeams)) return null;

    // All fields are attacker-controlled: length-clamp, bound-check, and type-check everything.
    const teams = sanitizeTeams(
      rawTeams.map((entry) => {
        const [name, seed, pokemonId, shiny] = entry as unknown[];
        return {
          name,
          seed,
          manual:
            pokemonId != null || shiny != null
              ? { pokemonId, shiny: shiny === 1 ? true : undefined }
              : undefined,
        };
      }),
    );
    if (!teams) return null;

    const rawGens: unknown[] = Array.isArray(payload) ? ALL_GENERATIONS : (payload.g ?? ALL_GENERATIONS);
    const generations = rawGens.map(Number).filter((g) => g in GENERATIONS);
    const salt = Array.isArray(payload) ? '' : sanitizeSalt(payload.s);
    const rawFeatures = Array.isArray(payload) ? null : payload.f;
    const features = Array.isArray(rawFeatures)
      ? { pokerus: rawFeatures[0] === 1, berries: rawFeatures[1] === 1, items: rawFeatures[2] === 1 }
      : DEFAULT_FEATURES;
    return {
      teams,
      generations: generations.length > 0 ? generations : ALL_GENERATIONS,
      salt,
      features,
    };
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
