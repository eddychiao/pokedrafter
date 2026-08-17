import type { Pokemon } from '../types';
import { LEVEL } from '../lib/battle';
import { TypeBadge } from './TypeBadge';

export function ShinyChip() {
  return <span className="shiny-chip">✨ shiny</span>;
}

export function TamperBadge() {
  return (
    <span className="tamper-badge" title="Manually set in admin mode">
      ⚙ set
    </span>
  );
}

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
      <div className="poke-pop-name">
        {pokemon.name}
        <span className="level-tag">Lv.{LEVEL}</span>
        {pokemon.shiny && <ShinyChip />}
        {pokemon.manual && <TamperBadge />}
      </div>
      <div className="poke-pop-types">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
      <div className="poke-pop-stats">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>
      <div className="poke-pop-moves">
        {pokemon.moves.map((m) => (
          <span className="poke-pop-move" key={m.name}>
            {m.name} <TypeBadge type={m.type} />
          </span>
        ))}
      </div>
    </div>
  );
}
