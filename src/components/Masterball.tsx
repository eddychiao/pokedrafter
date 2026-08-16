const MASTER_BALL_SPRITE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png';

export function Masterball({ size = 40 }: { size?: number }) {
  return (
    <img
      src={MASTER_BALL_SPRITE}
      width={size}
      height={size}
      alt=""
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
