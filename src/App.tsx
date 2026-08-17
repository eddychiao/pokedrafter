import { useEffect, useRef, useState } from 'react';
import type { Combatant, DraftConfig } from './types';
import { fetchPokemon, seedToPokemonId } from './lib/pokeapi';
import { seedToTrainer } from './lib/trainers';
import { runTournament, type TournamentResult } from './lib/tournament';
import { configFromUrl } from './lib/share';
import { clearSetup } from './lib/setupStorage';
import { SetupForm } from './components/SetupForm';
import { BattlePlayback } from './components/BattlePlayback';
import { Results } from './components/Results';
import { Masterball } from './components/Masterball';
import { LoadingScreen } from './components/LoadingScreen';
import { APP_VERSION } from './version';
import './App.css';

type Phase =
  | { name: 'setup' }
  | { name: 'loading'; done: number; total: number }
  | { name: 'battle' }
  | { name: 'results' };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [config, setConfig] = useState<DraftConfig | null>(null);
  const [tournament, setTournament] = useState<TournamentResult | null>(null);
  const [error, setError] = useState('');
  const [staleLink, setStaleLink] = useState(false);

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
            enablePokerus: draft.features.pokerus,
            enableBerries: draft.features.berries,
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
    void (async () => {
      const decoded = await configFromUrl();
      if (decoded && decoded.config.salt && !autoStarted.current) {
        autoStarted.current = true;
        // Battle logic can change between releases, so an old link may replay differently
        // than it did when it was created — surface that instead of pretending otherwise.
        if (decoded.version !== APP_VERSION) setStaleLink(true);
        await start(decoded.config);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <h1 className="logo-row">
        <Masterball size={44} /> Draft Order, I Choose You!
      </h1>
      <p className="subtitle">
        Draft order, decided in glorious Pokémon combat — may the best trainer pick first
      </p>

      {error && <p className="error">{error}</p>}
      {staleLink && (
        <p className="stale-link-notice">
          ⚠ This link was created with an older version of the site (now v{APP_VERSION}). The
          battle logic may have changed since, so this replay can differ from the original result.
        </p>
      )}

      {phase.name === 'setup' && (
        <>
          <SetupForm initialConfig={config} onStart={start} />
          <footer className="app-version">v{APP_VERSION}</footer>
        </>
      )}

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
          onNewDraft={({ keepNames }) => {
            window.location.hash = '';
            setTournament(null);
            setStaleLink(false);
            if (!keepNames) clearSetup();
            setConfig(
              keepNames
                ? {
                    ...config,
                    teams: config.teams.map((t) => ({ name: t.name, seed: '' })),
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
