import { track } from '@vercel/analytics';
import type { TournamentResult } from './tournament';

/**
 * Logs one Vercel Analytics custom event per generated Pokémon once a draft's battles
 * finish. Requires the site to actually be served from a Vercel deployment (the tracking
 * script proxies through Vercel's edge network) and a **Pro** team — Custom Events aren't
 * available on the free Hobby plan at all, and Pro caps you at 2 properties per event
 * (8 with the paid Web Analytics Plus add-on). Everything below is packed into 2 compact
 * delimited strings to fit that base limit. See README for the plan requirement.
 *
 * Fire-and-forget: track() is synchronous/non-blocking and never throws, so this can't
 * affect the actual battle flow either way.
 */
export function logTournamentResult(result: TournamentResult): void {
  result.standings.forEach((s, i) => {
    const { team, trainer, pokemon } = s.combatant;

    const flags = [
      pokemon.shiny && 'shiny',
      pokemon.pokerus && 'pokerus',
      pokemon.berry ?? null,
      pokemon.manual && 'manual',
      trainer.elite && 'elite',
    ]
      .filter(Boolean)
      .join(',');

    // pokemon: species + types + any special flags
    const pokemonField = `${pokemon.name}|${pokemon.types.join('/')}|${flags}`.slice(0, 255);
    // result: team/trainer, final placement, and the battle stats that produced it
    const resultField =
      `${team.name}|${trainer.name}|rank ${i + 1}|${s.wins}-${s.losses}|` +
      `dealt ${s.damageDealt}|taken ${s.damageTaken}`;

    track('pokemon_generated', {
      pokemon: pokemonField,
      result: resultField.slice(0, 255),
    });
  });
}
