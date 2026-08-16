import type { Trainer } from '../types';
import { fnv1a } from './rng';

const SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/trainers';

/** Trainer classes with verified retro (gen 1/2) sprites on Pokémon Showdown. */
const TRAINER_CLASSES: [label: string, file: string][] = [
  ['Hiker', 'hiker-gen1'],
  ['Fisherman', 'fisherman-gen1'],
  ['Youngster', 'youngster-gen1'],
  ['Lass', 'lass-gen1'],
  ['Sailor', 'sailor-gen1'],
  ['PokéManiac', 'pokemaniac-gen1'],
  ['Beauty', 'beauty-gen1'],
  ['Bug Catcher', 'bugcatcher-gen1'],
  ['Super Nerd', 'supernerd-gen1'],
  ['Burglar', 'burglar-gen1'],
  ['Channeler', 'channeler-gen1'],
  ['Bird Keeper', 'birdkeeper-gen1'],
  ['Juggler', 'juggler-gen1'],
  ['Black Belt', 'blackbelt-gen1'],
  ['Scientist', 'scientist-gen1'],
  ['Psychic', 'psychic-gen1'],
  ['Gentleman', 'gentleman-gen1'],
  ['Biker', 'biker-gen1'],
  ['Swimmer', 'swimmer-gen1'],
  ['Rocker', 'rocker-gen1'],
  ['Tamer', 'tamer-gen1'],
  ['Gambler', 'gambler-gen1'],
  ['Engineer', 'engineer-gen1'],
  ['Cue Ball', 'cueball-gen1'],
  ['Picnicker', 'picnicker-gen2'],
  ['Firebreather', 'firebreather-gen2'],
  ['Teacher', 'teacher-gen2'],
  ['Kimono Girl', 'kimonogirl-gen2'],
  ['Sage', 'sage-gen2'],
  ['Officer', 'officer-gen2'],
];

export function seedToTrainer(seed: string): Trainer {
  const [name, file] = TRAINER_CLASSES[fnv1a(`trainer:${seed}`) % TRAINER_CLASSES.length];
  return { name, spriteUrl: `${SPRITE_BASE}/${file}.png` };
}
