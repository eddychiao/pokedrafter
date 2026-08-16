export interface TeamConfig {
  name: string;
  seed: string;
}

export interface DraftConfig {
  teams: TeamConfig[];
  generations: number[];
  /** Random salt mixed into every hash so seeds can't be gamed; carried in share links. */
  salt: string;
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
}
