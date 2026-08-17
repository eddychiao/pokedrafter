import type { ManualOverride, TeamConfig } from '../types';

/**
 * Sanitizers for untrusted input (URL share payloads, localStorage). Everything is
 * length-clamped and type-checked so a crafted link can't inject huge payloads, invalid
 * API ids, or unexpected shapes.
 */

export const MAX_TEAMS = 16;
export const MAX_SEED_LENGTH = 100;
export const MAX_NAME_LENGTH = 60;
export const MAX_SALT_LENGTH = 64;
const MAX_POKEMON_ID = 1025;

export function sanitizeName(value: unknown): string {
  return String(value ?? '').slice(0, MAX_NAME_LENGTH);
}

export function sanitizeSeed(value: unknown): string {
  return String(value ?? '').slice(0, MAX_SEED_LENGTH);
}

export function sanitizeSalt(value: unknown): string {
  return String(value ?? '').slice(0, MAX_SALT_LENGTH);
}

export function sanitizePokemonId(value: unknown): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 && id <= MAX_POKEMON_ID ? id : undefined;
}

export function sanitizeManual(value: unknown): ManualOverride | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const pokemonId = sanitizePokemonId(raw.pokemonId);
  const shiny = raw.shiny === true ? true : undefined;
  return pokemonId === undefined && shiny === undefined ? undefined : { pokemonId, shiny };
}

export function sanitizeTeams(value: unknown): TeamConfig[] | null {
  if (!Array.isArray(value)) return null;
  const teams = value.slice(0, MAX_TEAMS).map((entry) => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    return {
      name: sanitizeName(raw.name),
      seed: sanitizeSeed(raw.seed),
      manual: sanitizeManual(raw.manual),
    };
  });
  return teams.length >= 2 ? teams : null;
}
