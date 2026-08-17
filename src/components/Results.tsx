import { useState } from 'react';
import type { DraftConfig, Standing } from '../types';
import { shareUrl } from '../lib/share';
import { PokemonStatCard } from './PokemonHoverCard';

export interface NewDraftOptions {
  keepNames: boolean;
  keepSeeds: boolean;
}

interface Props {
  standings: Standing[];
  config: DraftConfig;
  onReplay: () => void;
  onNewDraft: (options: NewDraftOptions) => void;
}

export function Results({ standings, config, onReplay, onNewDraft }: Props) {
  const [copied, setCopied] = useState('');
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [keepNames, setKeepNames] = useState(true);
  const [keepSeeds, setKeepSeeds] = useState(false);

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const resultsText = [
    'Fantasy Football Draft Order',
    ...standings.map(
      (s, i) =>
        `${i + 1}. ${s.combatant.team.name} — ${s.combatant.pokemon.name} (${s.wins}W-${s.losses}L)`,
    ),
    '',
    shareUrl(config),
  ].join('\n');

  return (
    <div className="results">
      <h2>Draft Order</h2>
      <ol className="standings">
        {standings.map((s, i) => (
          <li key={s.combatant.team.name} className={`standing rank-${i + 1}`}>
            <span className="rank">#{i + 1}</span>
            <span className="hover-wrap">
              <img src={s.combatant.pokemon.spriteUrl} alt={s.combatant.pokemon.name} />
              <PokemonStatCard pokemon={s.combatant.pokemon} />
            </span>
            <div className="standing-info">
              <span className="standing-team">
                <img
                  className="trainer-sprite"
                  src={s.combatant.trainer.spriteUrl}
                  alt={s.combatant.trainer.name}
                  title={s.combatant.trainer.name}
                />
                {s.combatant.team.name}
                <span className="standing-trainer-name">({s.combatant.trainer.name})</span>
              </span>
              <span className="standing-pokemon">
                {s.combatant.pokemon.name}
                {s.combatant.pokemon.shiny && <span className="shiny-chip">✨ shiny</span>}
                {s.combatant.pokemon.manual && (
                  <span className="tamper-badge" title="Manually set in admin mode">
                    ⚙ set
                  </span>
                )}
              </span>
            </div>
            <div className="record">
              <span className="record-wl-badge">
                {s.wins}W – {s.losses}L
              </span>
              <span className="record-dmg-line dmg-dealt">{s.damageDealt} dealt</span>
              <span className="record-dmg-line dmg-taken">{s.damageTaken} taken</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="results-actions">
        <button className="primary" onClick={() => copy('link', shareUrl(config))}>
          {copied === 'link' ? 'Link copied!' : 'Copy share link'}
        </button>
        <button onClick={() => copy('text', resultsText)}>
          {copied === 'text' ? 'Copied!' : 'Copy results text'}
        </button>
        <button onClick={onReplay}>Replay battles</button>
        <button onClick={() => setShowNewDraft(true)}>New draft</button>
      </div>

      {showNewDraft && (
        <div className="keep-seeds-ask">
          <span>Carry anything over?</span>
          <label>
            <input
              type="checkbox"
              checked={keepNames}
              onChange={(e) => setKeepNames(e.target.checked)}
            />
            Keep team names
          </label>
          <label>
            <input
              type="checkbox"
              checked={keepSeeds}
              onChange={(e) => setKeepSeeds(e.target.checked)}
            />
            Keep seeds
          </label>
          <button className="primary" onClick={() => onNewDraft({ keepNames, keepSeeds })}>
            Go
          </button>
          <button onClick={() => setShowNewDraft(false)}>Cancel</button>
        </div>
      )}
      <p className="hint">
        The share link re-runs the exact same simulation — anyone who opens it sees identical
        battles and the same draft order.
      </p>
    </div>
  );
}
