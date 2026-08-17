import type { Trainer } from '../types';
import { fnv1a, mulberry32 } from './rng';

const SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/trainers';

/** Trainer classes with verified modern (gen 4+) sprites on Pokémon Showdown. */
const TRAINER_CLASSES: [label: string, file: string][] = [
  ['Hiker', 'hiker'],
  ['Fisherman', 'fisherman'],
  ['Youngster', 'youngster'],
  ['Lass', 'lass'],
  ['Sailor', 'sailor'],
  ['PokéManiac', 'pokemaniac'],
  ['Beauty', 'beauty'],
  ['Bug Catcher', 'bugcatcher'],
  ['Super Nerd', 'supernerd'],
  ['Burglar', 'burglar'],
  ['Bird Keeper', 'birdkeeper'],
  ['Juggler', 'juggler'],
  ['Black Belt', 'blackbelt'],
  ['Scientist', 'scientist'],
  ['Psychic', 'psychic'],
  ['Gentleman', 'gentleman'],
  ['Biker', 'biker'],
  ['Swimmer', 'swimmer'],
  ['Gambler', 'gambler'],
  ['Picnicker', 'picnicker'],
  ['Firebreather', 'firebreather'],
  ['Teacher', 'teacher'],
  ['Kimono Girl', 'kimonogirl'],
  ['Sage', 'sage'],
  ['Ace Trainer', 'acetrainer'],
  ['School Kid', 'schoolkid'],
  ['Ruin Maniac', 'ruinmaniac'],
  ['Dragon Tamer', 'dragontamer'],
  ['Skier', 'skier'],
  ['Idol', 'idol'],
  ['Waiter', 'waiter'],
  ['Waitress', 'waitress'],
];

/** Rare pulls: gym leaders, Elite Four, and champions (sprites verified on Showdown). */
const ELITE_TRAINERS: [label: string, file: string][] = [
  ['Gym Leader Brock', 'brock'],
  ['Gym Leader Misty', 'misty'],
  ['Gym Leader Lt. Surge', 'ltsurge'],
  ['Gym Leader Erika', 'erika'],
  ['Gym Leader Sabrina', 'sabrina'],
  ['Gym Leader Blaine', 'blaine'],
  ['Gym Leader Giovanni', 'giovanni'],
  ['Gym Leader Koga', 'koga'],
  ['Gym Leader Whitney', 'whitney'],
  ['Gym Leader Clair', 'clair'],
  ['Gym Leader Volkner', 'volkner'],
  ['Elite Four Bruno', 'bruno'],
  ['Elite Four Will', 'will'],
  ['Elite Four Karen', 'karen'],
  ['Elite Four Flint', 'flint'],
  ['Elite Four Drake', 'drake-gen3'],
  ['Champion Lance', 'lance'],
  ['Champion Cynthia', 'cynthia'],
  ['Champion Steven', 'steven'],
  ['Champion Wallace', 'wallace'],
  ['Champion Alder', 'alder'],
  ['Champion Iris', 'iris'],
  ['Champion Diantha', 'diantha'],
  ['Champion Leon', 'leon'],
  ['Champion Red', 'red'],
  ['Champion Blue', 'blue'],
];

const ELITE_CHANCE = 0.05;

export function seedToTrainer(seed: string): Trainer {
  const elite = mulberry32(fnv1a(`trainer-elite:${seed}`))() < ELITE_CHANCE;
  const pool = elite ? ELITE_TRAINERS : TRAINER_CLASSES;
  const [name, file] = pool[fnv1a(`trainer:${seed}`) % pool.length];
  return { name, spriteUrl: `${SPRITE_BASE}/${file}.png`, elite };
}
