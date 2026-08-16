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

interface ChainLink {
  species: { name: string };
  evolves_to: ChainLink[];
}

/** Boost per unrealized evolution stage, so a Charmander isn't hopeless against a Charizard. */
const EVOLUTION_STAGE_BOOST = 0.25;

async function evolutionStagesRemaining(speciesUrl: string): Promise<number> {
  try {
    const species = await fetchJson<{ name: string; evolution_chain: { url: string } | null }>(speciesUrl);
    if (!species.evolution_chain) return 0;
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
    return node ? depthBelow(node) : 0;
  } catch {
    return 0;
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

async function pickMoves(moveUrls: string[], seed: string): Promise<Move[]> {
  const rng = mulberry32(fnv1a(`moves:${seed}`));
  const candidates = shuffle(moveUrls, rng).slice(0, MAX_MOVE_LOOKUPS);
  const details = await Promise.all(
    candidates.map((url) => fetchJson<ApiMove>(url).catch(() => null)),
  );

  const moves: Move[] = details
    .filter((m): m is ApiMove => m !== null && m.power !== null && m.power > 0)
    .slice(0, MOVES_PER_POKEMON)
    .map((m) => ({
      name: m.name.replace(/-/g, ' '),
      power: m.power ?? 0,
      accuracy: m.accuracy ?? 100,
      type: m.type.name,
      damageClass: m.damage_class.name === 'special' ? 'special' : 'physical',
    }));

  return moves.length > 0 ? moves : [STRUGGLE];
}

export async function fetchPokemon(id: number, seed: string): Promise<Pokemon> {
  const data = await fetchJson<ApiPokemon>(`${API_BASE}/pokemon/${id}`);

  const [moves, stagesRemaining] = await Promise.all([
    pickMoves(
      data.moves.map((m) => m.move.url),
      seed,
    ),
    evolutionStagesRemaining(data.species.url),
  ]);

  const boost = 1 + EVOLUTION_STAGE_BOOST * stagesRemaining;
  const statOf = (name: string) =>
    Math.round((data.stats.find((s) => s.stat.name === name)?.base_stat ?? 50) * boost);

  const shiny = mulberry32(fnv1a(`shiny:${seed}`))() < SHINY_CHANCE;
  const artwork = data.sprites.other['official-artwork'];
  const spriteUrl =
    (shiny ? (artwork.front_shiny ?? data.sprites.front_shiny) : null) ??
    artwork.front_default ??
    data.sprites.front_default ??
    '';

  return {
    id: data.id,
    name: data.name.replace(/-/g, ' '),
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
  };
}
