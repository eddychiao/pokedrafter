import { useEffect, useRef, useState } from 'react';
import type { Combatant, DraftConfig } from './types';
import { fetchPokemon, seedToPokemonId } from './lib/pokeapi';
import { seedToTrainer } from './lib/trainers';
import { runTournament, type TournamentResult } from './lib/tournament';
import { configFromUrl } from './lib/share';
import { SetupForm } from './components/SetupForm';
import { BattlePlayback } from './components/BattlePlayback';
import { Results } from './components/Results';
import { Masterball } from './components/Masterball';
import { LoadingScreen } from './components/LoadingScreen';
import './App.css';

type Phase =
  | { name: 'setup' }
  | { name: 'loading'; done: number; total: number }
  | { name: 'battle' }
  | { name: 'results' };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [config, setConfig] = useState<DraftConfig | null>(() => configFromUrl());
  const [tournament, setTournament] = useState<TournamentResult | null>(null);
  const [error, setError] = useState('');

  const start = async (draft: DraftConfig) => {
    setConfig(draft);
    setError('');
    setPhase({ name: 'loading', done: 0, total: draft.teams.length });
    try {
      let done = 0;
      const combatants: Combatant[] = await Promise.all(
        draft.teams.map(async (team) => {
          const saltedSeed = `${draft.salt}|${team.seed}`;
          const pokemonId = team.manual?.pokemonId ?? seedToPokemonId(saltedSeed, draft.generations);
          const pokemon = await fetchPokemon(pokemonId, saltedSeed, {
            shinyOverride: team.manual?.shiny,
            manual: team.manual !== undefined,
          });
          done++;
          setPhase({ name: 'loading', done, total: draft.teams.length });
          return { team, trainer: seedToTrainer(saltedSeed), pokemon };
        }),
      );
      setTournament(runTournament(combatants, draft.salt));
      setPhase({ name: 'battle' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Pokémon data.');
      setPhase({ name: 'setup' });
    }
  };

  // A shared link carries the full config (including salt), so replay it directly.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStarted.current && config?.salt) {
      autoStarted.current = true;
      void start(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <h1 className="logo-row">
        <Masterball size={44} /> Draft Order, I Choose You!
      </h1>
      <p className="subtitle">
        Your league's draft order, decided in glorious Pokémon combat — may the best trainer pick first
      </p>

      {error && <p className="error">{error}</p>}

      {phase.name === 'setup' && <SetupForm initialConfig={config} onStart={start} />}

      {phase.name === 'loading' && <LoadingScreen done={phase.done} total={phase.total} />}

      {phase.name === 'battle' && tournament && (
        <BattlePlayback
          matches={tournament.matches}
          onDone={() => setPhase({ name: 'results' })}
        />
      )}

      {phase.name === 'results' && tournament && config && (
        <Results
          standings={tournament.standings}
          config={config}
          onReplay={() => setPhase({ name: 'battle' })}
          onNewDraft={({ keepNames, keepSeeds }) => {
            window.location.hash = '';
            setTournament(null);
            setConfig(
              keepNames || keepSeeds
                ? {
                    ...config,
                    teams: config.teams.map((t) => ({
                      name: keepNames ? t.name : '',
                      seed: keepSeeds ? t.seed : '',
                      manual: keepSeeds ? t.manual : undefined,
                    })),
                  }
                : null,
            );
            setPhase({ name: 'setup' });
          }}
        />
      )}
    </div>
  );
}
