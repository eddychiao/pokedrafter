import { useEffect, useMemo, useRef, useState } from 'react';
import type { Combatant, MatchResult } from '../types';
import { damageDealtBy, damageTakenBy } from '../lib/battle';
import { TypeBadge } from './TypeBadge';
import { PokemonStatCard, ShinyChip, TamperBadge } from './PokemonHoverCard';

interface Props {
  matches: MatchResult[];
  onDone: () => void;
}

const SPEEDS = [
  { label: '1x', ms: 900 },
  { label: '2x', ms: 450 },
  { label: '5x', ms: 180 },
  { label: '10x', ms: 60 },
];

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = (hp / maxHp) * 100;
  const color = pct > 50 ? '#4ade80' : pct > 20 ? '#facc15' : '#f87171';
  return (
    <div className="hp-bar">
      <div className="hp-fill" style={{ width: `${pct}%`, background: color }} />
      <span className="hp-text">
        {hp}/{maxHp}
      </span>
    </div>
  );
}

interface RecordRow {
  combatant: Combatant;
  wins: number;
  losses: number;
  damageDealt: number;
  damageTaken: number;
}

function computeRecords(matches: MatchResult[], completedCount: number): RecordRow[] {
  const rows = new Map<string, RecordRow>();
  for (const match of matches) {
    for (const c of [match.a, match.b]) {
      if (!rows.has(c.team.name)) {
        rows.set(c.team.name, { combatant: c, wins: 0, losses: 0, damageDealt: 0, damageTaken: 0 });
      }
    }
  }
  for (const match of matches.slice(0, completedCount)) {
    const loser = match.winner === match.a ? match.b : match.a;
    rows.get(match.winner.team.name)!.wins++;
    rows.get(loser.team.name)!.losses++;
    for (const c of [match.a, match.b]) {
      const row = rows.get(c.team.name)!;
      row.damageDealt += damageDealtBy(match, c);
      row.damageTaken += damageTakenBy(match, c);
    }
  }
  // Ties: most wins, then most damage dealt, then least damage taken.
  return [...rows.values()].sort(
    (x, y) =>
      y.wins - x.wins ||
      y.damageDealt - x.damageDealt ||
      x.damageTaken - y.damageTaken ||
      x.combatant.team.name.localeCompare(y.combatant.team.name),
  );
}

const RECORD_ROW_HEIGHT = 78;

export function BattlePlayback({ matches, onDone }: Props) {
  const [matchIndex, setMatchIndex] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  const match = matches[matchIndex];
  const event = match.events[Math.min(eventIndex, match.events.length - 1)];
  const lastMatch = matchIndex === matches.length - 1;
  const matchFinished = eventIndex >= match.events.length - 1;

  const completedCount = matchIndex + (matchFinished ? 1 : 0);
  const records = useMemo(() => computeRecords(matches, completedCount), [matches, completedCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!matchFinished) {
        setEventIndex(eventIndex + 1);
      } else if (!lastMatch) {
        setMatchIndex(matchIndex + 1);
        setEventIndex(0);
      } else {
        onDone();
      }
    }, SPEEDS[speedIndex].ms);
    return () => clearTimeout(timer);
  }, [matchIndex, eventIndex, speedIndex, matchFinished, lastMatch, onDone]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [eventIndex]);

  const skipMatch = () => {
    if (lastMatch) onDone();
    else {
      setMatchIndex(matchIndex + 1);
      setEventIndex(0);
    }
  };

  return (
    <div className="battle">
      <header className="battle-header">
        <h2>
          Match {matchIndex + 1} / {matches.length}
        </h2>
        <div className="battle-controls">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              className={i === speedIndex ? 'active' : ''}
              onClick={() => setSpeedIndex(i)}
            >
              {s.label}
            </button>
          ))}
          <button onClick={skipMatch}>Skip match</button>
          <button onClick={onDone}>Skip to results</button>
        </div>
      </header>

      <div className="battle-layout">
        <div className="battle-main">
          <div className="arena">
            {([
              { c: match.a, hp: event.hpA, max: event.maxHpA, side: 'a' as const },
              { c: match.b, hp: event.hpB, max: event.maxHpB, side: 'b' as const },
            ] as const).map(({ c, hp, max, side }) => {
              const isAttacker = event.attacker === side;
              const isHit =
                event.attacker !== undefined && event.attacker !== side && event.damage !== undefined;
              return (
                <div
                  className={[
                    'fighter',
                    hp === 0 ? 'fainted' : '',
                    isAttacker ? `attacking-${side}` : '',
                    isHit ? 'hit' : '',
                  ].join(' ')}
                  key={side}
                >
                  <span className="fighter-team">
                    <span className="hover-wrap">
                      <img
                        className="trainer-sprite-big"
                        src={c.trainer.spriteUrl}
                        alt={c.trainer.name}
                      />
                      <span className="hover-pop trainer-pop">{c.trainer.name}</span>
                    </span>
                    {c.team.name}
                  </span>
                  <div className="sprite-box hover-wrap">
                    <img src={c.pokemon.spriteUrl} alt={c.pokemon.name} />
                    {c.pokemon.shiny && <span className="shiny-tag">✨</span>}
                    {isHit && (
                      <span
                        className={`damage-pop ${event.crit || (event.effectiveness ?? 1) >= 2 ? 'big' : ''}`}
                        key={`${matchIndex}-${eventIndex}`}
                      >
                        -{event.damage}
                      </span>
                    )}
                    <PokemonStatCard pokemon={c.pokemon} />
                  </div>
                  <span className="fighter-name">
                    {c.pokemon.name}
                    {c.pokemon.shiny && <ShinyChip />}
                    {c.pokemon.manual && <TamperBadge />}
                  </span>
                  <div className="fighter-types">
                    {c.pokemon.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                  <HpBar hp={hp} maxHp={max} />
                </div>
              );
            })}
            <div className="vs">VS</div>
          </div>

          <div className="battle-log" ref={logRef}>
            {match.events.slice(0, eventIndex + 1).map((e, i) => {
              const tone =
                e.faint ? 'log-faint'
                : e.crit || (e.effectiveness ?? 1) >= 2 ? 'log-super'
                : (e.effectiveness ?? 1) < 1 ? 'log-weak'
                : '';
              return (
                <p key={i} className={`${tone} ${i === eventIndex ? 'log-latest' : ''}`}>
                  {e.moveType && <TypeBadge type={e.moveType} />}
                  <span>{e.text}</span>
                  {e.damage !== undefined && <span className="log-damage">−{e.damage}</span>}
                </p>
              );
            })}
          </div>
        </div>

        <aside className="records">
          <h3>Leaderboard</h3>
          <div className="records-list" style={{ height: records.length * RECORD_ROW_HEIGHT }}>
            {[...records]
              .sort((x, y) => x.combatant.team.name.localeCompare(y.combatant.team.name))
              .map((row) => {
                const rank = records.indexOf(row);
                const { team, trainer, pokemon } = row.combatant;
                return (
                  <div
                    className="record-row"
                    key={team.name}
                    style={{ transform: `translateY(${rank * RECORD_ROW_HEIGHT}px)` }}
                  >
                    <span className={`record-rank ${rank === 0 ? 'leader' : ''}`}>{rank + 1}</span>
                    <img className="record-poke" src={pokemon.spriteUrl} alt={pokemon.name} />
                    <div className="record-names">
                      <span className="record-team">
                        <span className="hover-wrap">
                          <img className="trainer-sprite" src={trainer.spriteUrl} alt={trainer.name} />
                          <span className="hover-pop trainer-pop">{trainer.name}</span>
                        </span>
                        {team.name}
                      </span>
                      <span className="record-poke-name">
                        {pokemon.name} {pokemon.shiny && '✨'} {pokemon.manual && '⚙'}
                      </span>
                      <div className="record-poke-types">
                        {pokemon.types.map((t) => (
                          <TypeBadge key={t} type={t} />
                        ))}
                      </div>
                    </div>
                    <div className="record-stats">
                      <span className="record-wl">
                        {row.wins}–{row.losses}
                      </span>
                      <span className="record-dmg dmg-dealt">{row.damageDealt} dealt</span>
                      <span className="record-dmg dmg-taken">{row.damageTaken} taken</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </aside>
      </div>
    </div>
  );
}
