import { useEffect, useState } from 'react';

interface Props {
  done: number;
  total: number;
}

const FLAVOR_LINES = [
  'Consulting the Pokédex...',
  'Waking up Snorlax...',
  'Untangling a Tangela...',
  'Charging Pikachu\'s cheeks...',
  'Polishing Poké Balls...',
  'Asking Professor Oak nicely...',
  'Rolling for shininess...',
  'Teaching Magikarp to Splash...',
  'Bribing the gym leader...',
  'Calculating type matchups...',
  'Feeding the Miltank...',
  'Untying Team Rocket...',
  'Warming up the trainers...',
  'Checking IVs (don\'t tell anyone)...',
];

export function LoadingScreen({ done, total }: Props) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setLineIndex((i) => (i + 1) % FLAVOR_LINES.length),
      1100,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading">
      <p>
        Summoning Pokémon... {done}/{total}
      </p>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <p className="loading-flavor">{FLAVOR_LINES[lineIndex]}</p>
    </div>
  );
}
