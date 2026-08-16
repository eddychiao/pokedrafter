import type { Combatant, MatchResult, Standing } from '../types';
import { damageDealtBy, simulateBattle } from './battle';
import { fnv1a, mulberry32, shuffle } from './rng';

export interface TournamentResult {
  matches: MatchResult[];
  standings: Standing[];
}

export function runTournament(combatants: Combatant[], salt: string): TournamentResult {
  const seedString = combatants.map((c) => `${c.team.name}|${c.team.seed}`).join('::');
  const rng = mulberry32(fnv1a(`tournament:${salt}:${seedString}`));

  const pairs: [Combatant, Combatant][] = [];
  for (let i = 0; i < combatants.length; i++) {
    for (let j = i + 1; j < combatants.length; j++) {
      pairs.push([combatants[i], combatants[j]]);
    }
  }

  const matches = shuffle(pairs, rng).map(([a, b]) => simulateBattle(a, b, rng));

  const standings: Standing[] = combatants.map((combatant) => {
    const played = matches.filter((m) => m.a === combatant || m.b === combatant);
    const wins = played.filter((m) => m.winner === combatant).length;
    return {
      combatant,
      wins,
      losses: played.length - wins,
      damageDealt: played.reduce((sum, m) => sum + damageDealtBy(m, combatant), 0),
    };
  });

  standings.sort(
    (x, y) =>
      y.wins - x.wins ||
      y.damageDealt - x.damageDealt ||
      x.combatant.team.name.localeCompare(y.combatant.team.name),
  );

  return { matches, standings };
}
