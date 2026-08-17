import type { Move, Pokemon } from '../types';
import { fnv1a, mulberry32, shuffle } from './rng';

const API_BASE = 'https://pokeapi.co/api/v2';

/** National dex ID ranges per generation, inclusive. */
export const GENERATIONS: Record<number, [number, number]> = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025],
};

export const ALL_GENERATIONS = Object.keys(GENERATIONS).map(Number);

export function seedToPokemonId(seed: string, generations: number[]): number {
  const gens = generations.length > 0 ? generations : ALL_GENERATIONS;
  const pool: number[] = [];
  for (const gen of [...gens].sort((a, b) => a - b)) {
    const [start, end] = GENERATIONS[gen];
    for (let id = start; id <= end; id++) pool.push(id);
  }
  return pool[fnv1a(seed.trim().toLowerCase()) % pool.length];
}

interface ApiMove {
  name: string;
  power: number | null;
  accuracy: number | null;
  type: { name: string };
  damage_class: { name: string };
}

interface ApiPokemon {
  id: number;
  name: string;
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  moves: { move: { url: string } }[];
  species: { url: string };
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other: { 'official-artwork': { front_default: string | null; front_shiny: string | null } };
  };
}

const SHINY_CHANCE = 0.1;

/** Base probability shared by the rare bonus features (Pokérus, berries, items). */
export const FEATURE_CHANCE = 0.03;

/** Pokérus: rare beneficial virus granting a very slight stat boost. */
const POKERUS_BOOST = 1.08;

interface ChainLink {
  species: { name: string };
  evolves_to: ChainLink[];
}

/**
 * Stat multiplier by unrealized evolution stages. Non-linear on purpose: a base-stage mon
 * with two evolutions ahead (Charmander) needs real help, while a mon with only one
 * evolution (Growlithe) already has decent base stats and just gets a nudge.
 */
const STAGE_BOOSTS: Record<number, number> = { 0: 1, 1: 1.1, 2: 1.35 };

/**
 * Gentle floor on post-boost base stat total: anything still below this (Caterpie, Magikarp...)
 * is scaled up to it, so the weakest mons are underdogs rather than free wins. Mid-tier and
 * above are untouched.
 */
const MIN_BST = 370;

interface SpeciesInfo {
  /** Species (base form) name, e.g. "giratina" rather than "giratina-altered". */
  name: string;
  stagesRemaining: number;
}

async function fetchSpeciesInfo(speciesUrl: string): Promise<SpeciesInfo> {
  try {
    const species = await fetchJson<{ name: string; evolution_chain: { url: string } | null }>(speciesUrl);
    if (!species.evolution_chain) return { name: species.name, stagesRemaining: 0 };
    const chain = await fetchJson<{ chain: ChainLink }>(species.evolution_chain.url);

    const find = (node: ChainLink): ChainLink | null => {
      if (node.species.name === species.name) return node;
      for (const child of node.evolves_to) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    };
    const depthBelow = (node: ChainLink): number =>
      node.evolves_to.length === 0 ? 0 : 1 + Math.max(...node.evolves_to.map(depthBelow));

    const node = find(chain.chain);
    return { name: species.name, stagesRemaining: node ? depthBelow(node) : 0 };
  } catch {
    return { name: '', stagesRemaining: 0 };
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokeAPI request failed: ${url} (${res.status})`);
  return res.json();
}

const STRUGGLE: Move = { name: 'struggle', power: 50, accuracy: 100, type: 'normal', damageClass: 'physical' };

const MAX_MOVE_LOOKUPS = 16;
const MOVES_PER_POKEMON = 4;

/** Moves that faint the user outright; kept rare so a draft doesn't get decided by a fluke KO. */
const SELF_DESTRUCT_MOVES = new Set(['explosion', 'self-destruct', 'misty-explosion']);
const SELF_DESTRUCT_SURVIVAL_CHANCE = 0.15;

async function pickMoves(moveUrls: string[], seed: string): Promise<Move[]> {
  const rng = mulberry32(fnv1a(`moves:${seed}`));
  const shuffled = shuffle(moveUrls, rng);

  // Fetch in batches, expanding into the full movepool if the first batch doesn't yield
  // enough damaging moves, so every Pokémon ends up with exactly MOVES_PER_POKEMON moves.
  const moves: Move[] = [];
  for (let cursor = 0; cursor < shuffled.length && moves.length < MOVES_PER_POKEMON; cursor += MAX_MOVE_LOOKUPS) {
    const batch = shuffled.slice(cursor, cursor + MAX_MOVE_LOOKUPS);
    const details = await Promise.all(batch.map((url) => fetchJson<ApiMove>(url).catch(() => null)));

    for (const m of details) {
      if (moves.length >= MOVES_PER_POKEMON) break;
      // Status moves (Growl, Toxic, Swords Dance, ...) deal no damage and aren't modeled by
      // the battle sim, so they're excluded — checked both by power and damage class.
      if (!m || m.power === null || m.power <= 0 || m.damage_class.name === 'status') continue;
      // Self-destruct moves are mostly filtered out; the rest of the list still fills up normally.
      if (SELF_DESTRUCT_MOVES.has(m.name) && rng() >= SELF_DESTRUCT_SURVIVAL_CHANCE) continue;
      moves.push({
        name: m.name.replace(/-/g, ' '),
        power: m.power,
        accuracy: m.accuracy ?? 100,
        type: m.type.name,
        damageClass: m.damage_class.name === 'special' ? 'special' : 'physical',
        selfDestruct: SELF_DESTRUCT_MOVES.has(m.name),
      });
    }
  }

  // Extremely move-poor Pokémon (e.g. Ditto) fall back to Struggle to still hit the count.
  while (moves.length < MOVES_PER_POKEMON) moves.push(STRUGGLE);

  return moves;
}

export interface FetchPokemonOptions {
  /** Admin-mode: forces shiny on/off instead of rolling it from the seed. */
  shinyOverride?: boolean;
  /** Admin-mode: marks the result as manually tampered with, for UI display. */
  manual?: boolean;
  /** Gates the 3% Pokérus roll (default on). */
  enablePokerus?: boolean;
  /** Gates the 3% held-berry roll (default off — toggle not yet exposed). */
  enableBerries?: boolean;
}

export async function fetchPokemon(
  id: number,
  seed: string,
  options: FetchPokemonOptions = {},
): Promise<Pokemon> {
  const data = await fetchJson<ApiPokemon>(`${API_BASE}/pokemon/${id}`);

  const [moves, speciesInfo] = await Promise.all([
    pickMoves(
      data.moves.map((m) => m.move.url),
      seed,
    ),
    fetchSpeciesInfo(data.species.url),
  ]);

  const pokerus =
    (options.enablePokerus ?? true) && mulberry32(fnv1a(`pokerus:${seed}`))() < FEATURE_CHANCE;
  const berryRng = mulberry32(fnv1a(`berry:${seed}`));
  const berry =
    (options.enableBerries ?? false) && berryRng() < FEATURE_CHANCE
      ? berryRng() < 0.5
        ? ('oran' as const)
        : ('sitrus' as const)
      : undefined;
  const evolutionBoost = STAGE_BOOSTS[Math.min(2, speciesInfo.stagesRemaining)];
  const boostedTotal = data.stats.reduce((sum, s) => sum + s.base_stat * evolutionBoost, 0);
  const floorBoost = boostedTotal < MIN_BST ? MIN_BST / boostedTotal : 1;
  const boost = evolutionBoost * floorBoost * (pokerus ? POKERUS_BOOST : 1);
  const statOf = (name: string) =>
    Math.round((data.stats.find((s) => s.stat.name === name)?.base_stat ?? 50) * boost);

  const shiny = options.shinyOverride ?? mulberry32(fnv1a(`shiny:${seed}`))() < SHINY_CHANCE;
  const artwork = data.sprites.other['official-artwork'];
  const spriteUrl =
    (shiny ? (artwork.front_shiny ?? data.sprites.front_shiny) : null) ??
    artwork.front_default ??
    data.sprites.front_default ??
    '';

  return {
    id: data.id,
    name: (speciesInfo.name || data.name).replace(/-/g, ' '),
    types: data.types.map((t) => t.type.name),
    stats: {
      hp: statOf('hp'),
      attack: statOf('attack'),
      defense: statOf('defense'),
      specialAttack: statOf('special-attack'),
      specialDefense: statOf('special-defense'),
      speed: statOf('speed'),
    },
    moves,
    spriteUrl,
    animatedSpriteUrl: data.sprites.front_default ?? '',
    shiny,
    pokerus,
    berry,
    manual: options.manual ?? false,
  };
}
