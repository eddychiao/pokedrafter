import type { Pokemon } from '../types';
import { LEVEL } from '../lib/battle';
import { TypeBadge } from './TypeBadge';

export function ShinyChip() {
  return <span className="shiny-chip">✨ shiny</span>;
}

export function PokerusChip() {
  return (
    <span className="pokerus-chip" title="Pokérus — slightly boosted stats">
      🦠 pkrs
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
