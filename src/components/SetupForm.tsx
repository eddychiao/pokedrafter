import { useState } from 'react';
import type { DraftConfig, TeamConfig } from '../types';
import { ALL_GENERATIONS } from '../lib/pokeapi';
import { randomSalt } from '../lib/rng';

interface Props {
  initialConfig: DraftConfig | null;
  onStart: (config: DraftConfig) => void;
}

const TEAM_COUNTS = [4, 6, 8, 10, 12, 14, 16];

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX',
};

/** One color per generation, loosely themed on that era's flagship games. */
const GEN_COLORS: Record<number, string> = {
  1: '#ef4444', // Red
  2: '#eab308', // Gold
  3: '#10b981', // Emerald
  4: '#60a5fa', // Diamond
  5: '#a1a1aa', // Black & White
  6: '#3b82f6', // X
  7: '#f97316', // Sun
  8: '#8b5cf6', // Shield
  9: '#d946ef', // Violet
};

function blankTeams(count: number, existing: TeamConfig[] = []): TeamConfig[] {
  return Array.from({ length: count }, (_, i) => existing[i] ?? { name: '', seed: '' });
}

function nearestTeamCount(count: number): number {
  return TEAM_COUNTS.reduce((best, c) =>
    Math.abs(c - count) < Math.abs(best - count) ? c : best,
  );
}

export function SetupForm({ initialConfig, onStart }: Props) {
  const [teams, setTeams] = useState<TeamConfig[]>(() =>
    blankTeams(nearestTeamCount(initialConfig?.teams.length ?? 10), initialConfig?.teams),
  );
  const [generations, setGenerations] = useState<number[]>(
    initialConfig?.generations ?? ALL_GENERATIONS,
  );
  const [error, setError] = useState('');

  const updateTeam = (index: number, patch: Partial<TeamConfig>) =>
    setTeams((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const toggleGeneration = (gen: number) =>
    setGenerations((prev) => {
      if (prev.includes(gen)) {
        return prev.length > 1 ? prev.filter((g) => g !== gen) : prev;
      }
      return [...prev, gen].sort((a, b) => a - b);
    });

  // Effective name per row (falling back to "Team N"), used for live duplicate detection.
  const effectiveNames = teams.map((t, i) => (t.name.trim() || `Team ${i + 1}`).toLowerCase());
  const duplicated = new Set(
    effectiveNames.filter((name, i) => effectiveNames.indexOf(name) !== i),
  );

  const handleStart = () => {
    // Blank seeds get a random one — randomSalt() collisions are negligible, so they're distinct.
    const filled = teams.map((t, i) => ({
      name: t.name.trim() || `Team ${i + 1}`,
      seed: t.seed.trim() || randomSalt(),
    }));
    if (duplicated.size > 0) {
      setError('Team names must be unique — fix the highlighted rows.');
      return;
    }
    setError('');
    // Fresh salt every run: nobody can predict which Pokémon a seed maps to.
    onStart({ teams: filled, generations, salt: randomSalt() });
  };

  return (
    <div className="setup">
      <label className="count-row">
        Number of teams
        <select
          value={teams.length}
          onChange={(e) => setTeams((prev) => blankTeams(Number(e.target.value), prev))}
        >
          {TEAM_COUNTS.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </label>

      <div className="gen-row">
        <span className="gen-label">Generations</span>
        <div className="gen-toggles">
          {ALL_GENERATIONS.map((gen) => {
            const active = generations.includes(gen);
            return (
              <button
                key={gen}
                className={`gen-toggle ${active ? 'active' : ''}`}
                style={
                  active
                    ? { background: GEN_COLORS[gen], borderColor: GEN_COLORS[gen] }
                    : { borderColor: `${GEN_COLORS[gen]}66` }
                }
                onClick={() => toggleGeneration(gen)}
              >
                {ROMAN_NUMERALS[gen]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="team-grid">
        {teams.map((team, i) => (
          <div className="team-row" key={i}>
            <span className="team-index">{i + 1}</span>
            <input
              placeholder={`Team ${i + 1} name`}
              className={duplicated.has(effectiveNames[i]) ? 'dup' : ''}
              value={team.name}
              onChange={(e) => updateTeam(i, { name: e.target.value })}
            />
            <input
              placeholder="Seed (any text or number)"
              maxLength={100}
              value={team.seed}
              onChange={(e) => updateTeam(i, { seed: e.target.value })}
            />
          </div>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <button className="primary" onClick={handleStart}>
        Gotta Rank 'Em All!
      </button>
      <p className="hint">
        Type anything as your seed — it becomes a random Pokémon when the battle starts. Leave it
        blank and we'll pick for you. Share the link afterwards to rewatch the same battles.
      </p>
    </div>
  );
}
