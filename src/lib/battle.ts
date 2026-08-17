import type { BattleEvent, Combatant, MatchResult, Move, Pokemon } from '../types';
import type { Rng } from './rng';
import { typeEffectiveness } from './typeChart';

export const LEVEL = 100;
const MAX_TURNS = 60;

function maxHp(pokemon: Pokemon): number {
  return Math.floor(0.02 * pokemon.stats.hp * LEVEL) + LEVEL + 10;
}

function effectiveStat(base: number): number {
  return Math.floor(0.02 * base * LEVEL) + 5;
}

interface Fighter {
  combatant: Combatant;
  hp: number;
  maxHp: number;
  damageDealt: number;
}

function computeDamage(attacker: Pokemon, defender: Pokemon, move: Move, rng: Rng) {
  const attackStat = effectiveStat(
    move.damageClass === 'physical' ? attacker.stats.attack : attacker.stats.specialAttack,
  );
  const defenseStat = effectiveStat(
    move.damageClass === 'physical' ? defender.stats.defense : defender.stats.specialDefense,
  );

  const base = (((2 * LEVEL) / 5 + 2) * move.power * (attackStat / defenseStat)) / 50 + 2;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeEffectiveness(move.type, defender.types);
  const crit = rng() < 1 / 16 ? 1.5 : 1;
  const roll = 0.85 + rng() * 0.15;

  return {
    damage: Math.max(effectiveness === 0 ? 0 : 1, Math.floor(base * stab * effectiveness * crit * roll)),
    effectiveness,
    crit: crit > 1,
  };
}

function describeEffectiveness(multiplier: number): string {
  if (multiplier === 0) return " It doesn't affect the target...";
  if (multiplier >= 2) return " It's super effective!";
  if (multiplier < 1) return " It's not very effective...";
  return '';
}

export function simulateBattle(a: Combatant, b: Combatant, rng: Rng): MatchResult {
  const fighters: [Fighter, Fighter] = [
    { combatant: a, hp: maxHp(a.pokemon), maxHp: maxHp(a.pokemon), damageDealt: 0 },
    { combatant: b, hp: maxHp(b.pokemon), maxHp: maxHp(b.pokemon), damageDealt: 0 },
  ];

  const events: BattleEvent[] = [];
  const snapshot = (
    text: string,
    extra: Omit<BattleEvent, 'text' | 'hpA' | 'hpB' | 'maxHpA' | 'maxHpB'> = {},
  ): BattleEvent => ({
    text,
    ...extra,
    hpA: fighters[0].hp,
    hpB: fighters[1].hp,
    maxHpA: fighters[0].maxHp,
    maxHpB: fighters[1].maxHp,
  });

  events.push(
    snapshot(
      `${a.pokemon.name} (${a.team.name}) vs ${b.pokemon.name} (${b.team.name})!`,
    ),
  );

  let turns = 0;
  for (; turns < MAX_TURNS && fighters[0].hp > 0 && fighters[1].hp > 0; turns++) {
    const speedA = effectiveStat(a.pokemon.stats.speed);
    const speedB = effectiveStat(b.pokemon.stats.speed);
    const first =
      speedA === speedB ? (rng() < 0.5 ? 0 : 1) : speedA > speedB ? 0 : 1;

    for (const idx of [first, 1 - first] as const) {
      const attacker = fighters[idx];
      const defender = fighters[1 - idx];
      if (attacker.hp <= 0 || defender.hp <= 0) continue;

      const moves = attacker.combatant.pokemon.moves;
      const move = moves[Math.floor(rng() * moves.length)];

      if (rng() * 100 >= move.accuracy) {
        events.push(
          snapshot(`${attacker.combatant.pokemon.name} used ${move.name}... but it missed!`, {
            moveType: move.type,
            attacker: idx === 0 ? 'a' : 'b',
          }),
        );
        continue;
      }

      const { damage, effectiveness, crit } = computeDamage(
        attacker.combatant.pokemon,
        defender.combatant.pokemon,
        move,
        rng,
      );
      defender.hp = Math.max(0, defender.hp - damage);
      attacker.damageDealt += damage;
      if (move.selfDestruct) attacker.hp = 0;

      events.push(
        snapshot(
          `${attacker.combatant.pokemon.name} used ${move.name}!` +
            (crit ? ' A critical hit!' : '') +
            describeEffectiveness(effectiveness) +
            (move.selfDestruct ? ` ${attacker.combatant.pokemon.name} blew itself up!` : ''),
          {
            moveType: move.type,
            attacker: idx === 0 ? 'a' : 'b',
            damage,
            crit,
            effectiveness,
            selfDestruct: move.selfDestruct,
          },
        ),
      );

      if (attacker.hp <= 0) {
        events.push(snapshot(`${attacker.combatant.pokemon.name} fainted!`, { faint: true }));
      }
      if (defender.hp <= 0) {
        events.push(snapshot(`${defender.combatant.pokemon.name} fainted!`, { faint: true }));
      }
    }
  }

  const [fa, fb] = fighters;
  const winner =
    fa.hp <= 0 ? b
    : fb.hp <= 0 ? a
    : fa.hp / fa.maxHp >= fb.hp / fb.maxHp ? a
    : b;

  if (fa.hp > 0 && fb.hp > 0) {
    events.push(snapshot(`Time's up! ${winner.pokemon.name} wins on remaining HP!`));
  } else {
    events.push(snapshot(`${winner.pokemon.name} (${winner.team.name}) wins!`));
  }

  return { a, b, winner, turns, events };
}

export function damageDealtBy(result: MatchResult, combatant: Combatant): number {
  const isA = result.a === combatant;
  let total = 0;
  let prevA = result.events[0]?.maxHpA ?? 0;
  let prevB = result.events[0]?.maxHpB ?? 0;
  for (const event of result.events) {
    if (isA) total += Math.max(0, prevB - event.hpB);
    else total += Math.max(0, prevA - event.hpA);
    prevA = event.hpA;
    prevB = event.hpB;
  }
  return total;
}
