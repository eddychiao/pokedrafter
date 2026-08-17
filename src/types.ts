export interface ManualOverride {
  /** National dex ID, overriding the seed-derived Pokémon. */
  pokemonId?: number;
  /** Forces shiny on/off, overriding the random roll. */
  shiny?: boolean;
}

export interface TeamConfig {
  name: string;
  seed: string;
  /** Admin-mode overrides. Presence of this object marks the entry as manually tampered with. */
  manual?: ManualOverride;
}

export interface FeatureOptions {
  pokerus: boolean;
  /** Not yet exposed in the UI — base logic exists but the toggle is disabled. */
  berries: boolean;
  /** Not yet implemented — placeholder toggle only. */
  items: boolean;
}

export const DEFAULT_FEATURES: FeatureOptions = { pokerus: true, berries: false, items: false };

export interface DraftConfig {
  teams: TeamConfig[];
  generations: number[];
  /** Random salt mixed into every hash so seeds can't be gamed; carried in share links. */
  salt: string;
  features: FeatureOptions;
}

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface Move {
  name: string;
  power: number;
  accuracy: number;
  type: string;
  damageClass: 'physical' | 'special';
  /** Moves like Explosion/Self-Destruct that KO the user regardless of the damage dealt. */
  selfDestruct?: boolean;
}

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  stats: BaseStats;
  moves: Move[];
  spriteUrl: string;
  animatedSpriteUrl: string;
  shiny: boolean;
  /** Rare beneficial virus: slightly boosted stats, rolled from the seed like shininess. */
  pokerus: boolean;
  /** Held berry: heals once per battle when HP drops below the threshold. */
  berry?: 'oran' | 'sitrus';
  /** True if the species or shininess was hand-picked in admin mode rather than rolled from the seed. */
  manual: boolean;
}

export interface Trainer {
  name: string;
  spriteUrl: string;
}

export interface Combatant {
  team: TeamConfig;
  trainer: Trainer;
  pokemon: Pokemon;
}

export interface BattleEvent {
  text: string;
  moveType?: string;
  /** Which side attacked this event, if it was an attack. */
  attacker?: 'a' | 'b';
  damage?: number;
  crit?: boolean;
  effectiveness?: number;
  faint?: boolean;
  selfDestruct?: boolean;
  /** Marks the match intro / final result lines so the log can style them distinctly. */
  banner?: 'start' | 'end';
  /** HP restored this event (berry activation). */
  heal?: number;
  hpA: number;
  hpB: number;
  maxHpA: number;
  maxHpB: number;
}

export interface MatchResult {
  a: Combatant;
  b: Combatant;
  winner: Combatant;
  turns: number;
  events: BattleEvent[];
}

export interface Standing {
  combatant: Combatant;
  wins: number;
  losses: number;
  damageDealt: number;
  damageTaken: number;
}
