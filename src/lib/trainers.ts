import type { Trainer } from '../types';
import { fnv1a } from './rng';

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

export function seedToTrainer(seed: string): Trainer {
  const [name, file] = TRAINER_CLASSES[fnv1a(`trainer:${seed}`) % TRAINER_CLASSES.length];
  return { name, spriteUrl: `${SPRITE_BASE}/${file}.png` };
}
