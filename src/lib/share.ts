import type { DraftConfig } from '../types';
import { DEFAULT_FEATURES } from '../types';
import { ALL_GENERATIONS, GENERATIONS } from './pokeapi';
import { sanitizeSalt, sanitizeTeams } from './sanitize';
import { APP_VERSION } from '../version';

/**
 * Share format v3: "3." + base64url(deflate-raw(utf8(json))) of a positional array
 * [teams, salt, appVersion, generations|0, features|0] — no object keys, defaults as 0.
 * v2 ("2." + object payload) and legacy links (base64 of percent-encoded JSON) still decode.
 */
const V3_PREFIX = '3.';
const V2_PREFIX = '2.';

export interface DecodedShare {
  config: DraftConfig;
  /** App version that generated the link; battle logic may differ if it's not current. */
  version: string | null;
}

interface WirePayload {
  t: unknown[];
  g?: unknown[];
  s?: unknown;
  f?: unknown[];
  v?: unknown;
}

function buildTeamTuples(config: DraftConfig): unknown[] {
  return config.teams.map((t) => {
    const tuple: unknown[] = [
      t.name,
      t.seed,
      t.manual?.pokemonId ?? null,
      t.manual?.shiny === undefined ? null : t.manual.shiny ? 1 : 0,
    ];
    while (tuple.length > 2 && tuple[tuple.length - 1] === null) tuple.pop();
    return tuple;
  });
}

function buildPayload(config: DraftConfig): unknown[] {
  const f = config.features;
  const featuresDefault =
    f.pokerus === DEFAULT_FEATURES.pokerus &&
    f.berries === DEFAULT_FEATURES.berries &&
    f.items === DEFAULT_FEATURES.items;
  return [
    buildTeamTuples(config),
    config.salt,
    APP_VERSION,
    config.generations.length === ALL_GENERATIONS.length ? 0 : config.generations,
    featuresDefault ? 0 : [f.pokerus ? 1 : 0, f.berries ? 1 : 0, f.items ? 1 : 0],
  ];
}

function parsePayload(payload: WirePayload | unknown[], v3 = false): DecodedShare | null {
  // v3 is a positional array [teams, salt, version, gens|0, features|0]; v2 is a keyed
  // object; legacy links encoded a bare array of [name, seed] pairs.
  const fields: WirePayload = v3
    ? (() => {
        const [t, s, ver, g, f] = payload as unknown[];
        return { t: t as unknown[], s, v: ver, g: g as unknown[], f: f as unknown[] };
      })()
    : Array.isArray(payload)
      ? { t: payload }
      : payload;

  const rawTeams = fields.t;
  if (!Array.isArray(rawTeams)) return null;

  // All fields are attacker-controlled: length-clamp, bound-check, and type-check everything.
  const teams = sanitizeTeams(
    rawTeams.map((entry) => {
      const [name, seed, pokemonId, shiny] = Array.isArray(entry) ? entry : [];
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

  const rawGens = Array.isArray(fields.g) ? fields.g : ALL_GENERATIONS;
  const generations = rawGens.map(Number).filter((g) => g in GENERATIONS);
  const features = Array.isArray(fields.f)
    ? { pokerus: fields.f[0] === 1, berries: fields.f[1] === 1, items: fields.f[2] === 1 }
    : DEFAULT_FEATURES;

  return {
    config: {
      teams,
      generations: generations.length > 0 ? generations : ALL_GENERATIONS,
      salt: sanitizeSalt(fields.s),
      features,
    },
    version: typeof fields.v === 'string' ? fields.v.slice(0, 16) : null,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const readable = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(readable).arrayBuffer());
}

export async function encodeConfig(config: DraftConfig): Promise<string> {
  const json = JSON.stringify(buildPayload(config));
  if (typeof CompressionStream !== 'undefined') {
    const deflated = await pipeThrough(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
    return V3_PREFIX + toBase64Url(deflated);
  }
  // Very old browsers: fall back to the legacy uncompressed format (team tuples only).
  return btoa(encodeURIComponent(JSON.stringify(buildTeamTuples(config))));
}

async function inflatePrefixed(encoded: string, prefix: string): Promise<unknown> {
  const inflated = await pipeThrough(
    fromBase64Url(encoded.slice(prefix.length)),
    new DecompressionStream('deflate-raw'),
  );
  return JSON.parse(new TextDecoder().decode(inflated));
}

export async function decodeConfig(encoded: string): Promise<DecodedShare | null> {
  try {
    if (encoded.startsWith(V3_PREFIX)) {
      return parsePayload((await inflatePrefixed(encoded, V3_PREFIX)) as unknown[], true);
    }
    if (encoded.startsWith(V2_PREFIX)) {
      return parsePayload((await inflatePrefixed(encoded, V2_PREFIX)) as WirePayload);
    }
    return parsePayload(JSON.parse(decodeURIComponent(atob(encoded))));
  } catch {
    return null;
  }
}

export async function shareUrl(config: DraftConfig): Promise<string> {
  const url = new URL(window.location.href);
  url.hash = `sim=${await encodeConfig(config)}`;
  return url.toString();
}

export async function configFromUrl(): Promise<DecodedShare | null> {
  const match = window.location.hash.match(/sim=([^&]+)/);
  return match ? decodeConfig(match[1]) : null;
}
