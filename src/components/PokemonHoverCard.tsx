import type { Pokemon } from '../types';
import { LEVEL } from '../lib/battle';
import { ITEM_SPRITES } from '../lib/itemSprites';
import { TypeBadge } from './TypeBadge';

export function ShinyChip() {
  return <span className="shiny-chip">✨ shiny</span>;
}

/** Pixel-art rendition of the games' status-screen Pokérus icon (pink smiley face). */
export function PokerusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" style={{ imageRendering: 'pixelated' }}>
      <rect x="0" y="0" width="8" height="8" rx="1.5" fill="#e864b8" />
      <rect x="1.5" y="2" width="1.5" height="2" fill="#5c1141" />
      <rect x="5" y="2" width="1.5" height="2" fill="#5c1141" />
      <path d="M1.5 5.5 L2.5 6.5 L3.25 5.75 L4 6.5 L4.75 5.75 L5.5 6.5 L6.5 5.5" stroke="#5c1141" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

export function PokerusChip() {
  return (
    <span className="pokerus-chip" title="Pokérus — slightly boosted stats">
      <PokerusIcon /> pkrs
    </span>
  );
}

export function BerryChip({ berry }: { berry: 'oran' | 'sitrus' }) {
  const label = berry === 'oran' ? 'Oran Berry' : 'Sitrus Berry';
  const heal = berry === 'oran' ? '10%' : '25%';
  return (
    <span
      className="berry-chip"
      title={`${label} — heals ${heal} of max HP once per battle when HP drops below half`}
    >
      <img src={ITEM_SPRITES[berry]} alt={label} width={16} height={16} /> {berry}
    </span>
  );
}

export function TamperBadge() {
  return (
    <span className="tamper-badge" title="Manually set in admin mode">
      ⚙ set
    </span>
  );
}

const MAX_STAT = 255;

export function PokemonStatCard({ pokemon }: { pokemon: Pokemon }) {
  const rows: [string, number][] = [
    ['HP', pokemon.stats.hp],
    ['Atk', pokemon.stats.attack],
    ['Def', pokemon.stats.defense],
    ['SpA', pokemon.stats.specialAttack],
    ['SpD', pokemon.stats.specialDefense],
    ['Spe', pokemon.stats.speed],
  ];
  return (
    <div className="hover-pop poke-pop">
      <div className="poke-pop-header">
        <span className="poke-pop-name">
          {pokemon.name}
          <span className="level-tag">Lv.{LEVEL}</span>
        </span>
        {pokemon.shiny && <ShinyChip />}
        {pokemon.pokerus && <PokerusChip />}
        {pokemon.berry && <BerryChip berry={pokemon.berry} />}
        {pokemon.manual && <TamperBadge />}
      </div>
      <div className="poke-pop-types">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>

      <div className="poke-pop-section-label">Base stats</div>
      <div className="poke-pop-stats">
        {rows.map(([label, value]) => (
          <div className="poke-pop-stat-row" key={label}>
            <span className="stat-label">{label}</span>
            <span className="stat-bar-track">
              <span
                className="stat-bar-fill"
                style={{ width: `${Math.min(100, (value / MAX_STAT) * 100)}%` }}
              />
            </span>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="poke-pop-section-label">Moves</div>
      <div className="poke-pop-moves">
        {pokemon.moves.map((m) => (
          <div className="poke-pop-move" key={m.name}>
            <span className="poke-pop-move-name">{m.name}</span>
            <TypeBadge type={m.type} />
          </div>
        ))}
      </div>
    </div>
  );
}
