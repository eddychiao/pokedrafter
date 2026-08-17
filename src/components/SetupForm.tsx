import { useEffect, useMemo, useState } from 'react';
import type { DraftConfig, FeatureOptions, TeamConfig } from '../types';
import { DEFAULT_FEATURES } from '../types';
import { ALL_GENERATIONS } from '../lib/pokeapi';
import { randomSalt } from '../lib/rng';
import { loadSpeciesList, type SpeciesOption } from '../lib/speciesList';
import { loadSetup, saveSetup } from '../lib/setupStorage';
import { ITEM_SPRITES } from '../lib/itemSprites';
import { PokerusIcon } from './PokemonHoverCard';

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
  // A share link or a carried-over draft always wins; otherwise fall back to whatever was
  // last typed here, so a refresh doesn't wipe out an in-progress setup.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saved = useMemo(() => (initialConfig ? null : loadSetup()), []);

  const [teams, setTeams] = useState<TeamConfig[]>(() =>
    blankTeams(
      nearestTeamCount(initialConfig?.teams.length ?? saved?.teams.length ?? 10),
      initialConfig?.teams ?? saved?.teams,
    ),
  );
  const [generations, setGenerations] = useState<number[]>(
    initialConfig?.generations ?? saved?.generations ?? ALL_GENERATIONS,
  );
  const [error, setError] = useState('');
  const [adminMode, setAdminMode] = useState(saved?.adminMode ?? false);
  const [features, setFeatures] = useState<FeatureOptions>(
    initialConfig?.features ?? saved?.features ?? DEFAULT_FEATURES,
  );
  const [species, setSpecies] = useState<SpeciesOption[]>([]);

  useEffect(() => {
    saveSetup({ teams, generations, adminMode, features });
  }, [teams, generations, adminMode, features]);

  useEffect(() => {
    if (adminMode && species.length === 0) {
      void loadSpeciesList().then(setSpecies);
    }
  }, [adminMode, species.length]);

  const speciesByName = new Map(species.map((s) => [s.name, s.id]));
  const speciesById = new Map(species.map((s) => [s.id, s.name]));

  const updateTeam = (index: number, patch: Partial<TeamConfig>) =>
    setTeams((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  // Drops the manual object entirely once both overrides are cleared, so the "tampered" flag disappears.
  const applyManual = (index: number, patch: TeamConfig['manual']) => {
    const merged = { ...teams[index].manual, ...patch };
    updateTeam(index, {
      manual: merged.pokemonId === undefined && merged.shiny === undefined ? undefined : merged,
    });
  };

  const setManualSpecies = (index: number, typedName: string) =>
    applyManual(index, { pokemonId: speciesByName.get(typedName.trim().toLowerCase()) });

  const setManualShiny = (index: number, checked: boolean) =>
    applyManual(index, { shiny: checked ? true : undefined });

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
      manual: t.manual,
    }));
    if (duplicated.size > 0) {
      setError('Team names must be unique — fix the highlighted rows.');
      return;
    }
    setError('');
    // Fresh salt every run: nobody can predict which Pokémon a seed maps to.
    onStart({ teams: filled, generations, salt: randomSalt(), features });
  };

  return (
    <div className="setup">
      <div className="config-row">
        <label className="count-row">
          Teams
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
      </div>

      <label className="admin-toggle">
        <input
          type="checkbox"
          checked={adminMode}
          onChange={(e) => setAdminMode(e.target.checked)}
        />
        Admin mode — manually set a team's Pokémon
      </label>
      {adminMode && (
        <p className="admin-disclaimer">
          ⚠ Heads up: manually set Pokémon are publicly marked with a "⚙ set" badge in the battle,
          leaderboard, and results — everyone will know they weren't rolled from a seed.
        </p>
      )}

      <details className="advanced-settings">
        <summary>Additional settings</summary>
        <div className="feature-toggles">
          <button
            className={`feature-toggle ${features.pokerus ? 'active' : ''}`}
            title="Pokérus: 3% chance a Pokémon catches a rare beneficial virus that slightly boosts its stats"
            onClick={() => setFeatures((f) => ({ ...f, pokerus: !f.pokerus }))}
          >
            <PokerusIcon size={14} /> Pokérus
          </button>
          <span
            className="feature-disabled-wrap"
            title="Coming soon! Berries: a held Oran or Sitrus Berry heals a Pokémon once per battle when its HP drops below half"
          >
            <button className="feature-toggle" disabled>
              <img src={ITEM_SPRITES.sitrus} alt="" width={16} height={16} /> Berries
            </button>
          </span>
          <span
            className="feature-disabled-wrap"
            title="Coming soon! Items: held items (like Leftovers) with effects during battle"
          >
            <button className="feature-toggle" disabled>
              <img src={ITEM_SPRITES.leftovers} alt="" width={16} height={16} /> Items
            </button>
          </span>
        </div>
      </details>

      <div className="team-grid">
        {teams.map((team, i) => (
          <div className="team-row-group" key={i}>
            <div className="team-row">
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
            {adminMode && (
              <div className="admin-row">
                <label className="admin-field">
                  <span className="admin-field-label">Pokémon override (optional)</span>
                  <input
                    key={String(species.length > 0)}
                    list="species-datalist"
                    placeholder={species.length ? 'e.g. Charizard' : 'Loading dex...'}
                    disabled={species.length === 0}
                    defaultValue={team.manual?.pokemonId ? speciesById.get(team.manual.pokemonId) : ''}
                    onChange={(e) => setManualSpecies(i, e.target.value)}
                  />
                </label>
                <label className="admin-shiny">
                  <input
                    type="checkbox"
                    checked={team.manual?.shiny === true}
                    onChange={(e) => setManualShiny(i, e.target.checked)}
                  />
                  Shiny
                </label>
                {team.manual && <span className="tamper-badge" title="Manually overridden">⚙ set</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      {adminMode && (
        <datalist id="species-datalist">
          {species.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      )}

      {error && <p className="error">{error}</p>}

      <button className="primary" onClick={handleStart}>
        Let the Draft Battle Begin!
      </button>
      <p className="hint">
        Type anything as your seed — it becomes a random Pokémon when the battle starts. Leave it
        blank and we'll pick for you. Share the link afterwards to rewatch the same battles.
      </p>
    </div>
  );
}
