import { useMemo } from 'react';
import {
  PlayerColor, TokenState, PLAYER_COLORS, COMMON_PATH,
  HOME_STRETCHES, HOME_POSITIONS, SAFE_ZONE_CELLS,
  COLOR_HEX, COLOR_LIGHT, COLOR_DARK, getTokenGridPos,
} from '@/game/ludoData';

interface LudoBoardProps {
  tokens: Record<PlayerColor, TokenState[]>;
  activePlayers: PlayerColor[];
  paths: Record<PlayerColor, [number, number][]>;
  validMoveTokens: number[];
  currentPlayer: PlayerColor;
  onTokenClick: (color: PlayerColor, tokenId: number) => void;
}

function getCellBg(r: number, c: number): string {
  if (r < 6 && c < 6) return (r >= 1 && r <= 4 && c >= 1 && c <= 4) ? '#ffffff' : COLOR_HEX.green;
  if (r < 6 && c > 8) return (r >= 1 && r <= 4 && c >= 10 && c <= 13) ? '#ffffff' : COLOR_HEX.yellow;
  if (r > 8 && c < 6) return (r >= 10 && r <= 13 && c >= 1 && c <= 4) ? '#ffffff' : COLOR_HEX.red;
  if (r > 8 && c > 8) return (r >= 10 && r <= 13 && c >= 10 && c <= 13) ? '#ffffff' : COLOR_HEX.blue;

  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
    if (r === 7 && c === 7) return '#f5f5f5';
    if (r === 6 && c === 6) return COLOR_HEX.green;
    if (r === 6 && c === 7) return COLOR_HEX.yellow;
    if (r === 6 && c === 8) return COLOR_HEX.yellow;
    if (r === 7 && c === 6) return COLOR_HEX.green;
    if (r === 7 && c === 8) return COLOR_HEX.blue;
    if (r === 8 && c === 6) return COLOR_HEX.red;
    if (r === 8 && c === 7) return COLOR_HEX.red;
    if (r === 8 && c === 8) return COLOR_HEX.blue;
  }

  for (const color of PLAYER_COLORS) {
    if (HOME_STRETCHES[color].some(([hr, hc]) => hr === r && hc === c))
      return COLOR_LIGHT[color];
  }
  return '#ffffff';
}

function getHomeSpotColor(r: number, c: number): PlayerColor | null {
  for (const color of PLAYER_COLORS) {
    if (HOME_POSITIONS[color].some(([hr, hc]) => hr === r && hc === c)) return color;
  }
  return null;
}

function isPathCell(r: number, c: number): boolean {
  return COMMON_PATH.some(([pr, pc]) => pr === r && pc === c);
}

const LudoBoard = ({
  tokens, activePlayers, paths, validMoveTokens, currentPlayer, onTokenClick,
}: LudoBoardProps) => {
  const cells = useMemo(() => {
    const result = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const bg = getCellBg(r, c);
        const isSafe = SAFE_ZONE_CELLS.has(`${r},${c}`);
        const homeSpot = getHomeSpotColor(r, c);
        const isPath = isPathCell(r, c);
        const isHomeStretch = PLAYER_COLORS.some(col =>
          HOME_STRETCHES[col].some(([hr, hc]) => hr === r && hc === c)
        );

        result.push(
          <div
            key={`${r}-${c}`}
            className="relative flex items-center justify-center"
            style={{
              backgroundColor: bg,
              border: (isPath || isHomeStretch) ? '0.5px solid rgba(0,0,0,0.15)' : '0.5px solid rgba(0,0,0,0.05)',
            }}
          >
            {isSafe && (
              <span className="absolute text-amber-500 font-bold select-none"
                style={{ fontSize: 'clamp(6px, 1.8vw, 16px)' }}>★</span>
            )}
            {homeSpot && (
              <div className="w-3/5 h-3/5 rounded-full"
                style={{ border: `2px solid ${COLOR_HEX[homeSpot]}`, opacity: 0.3 }} />
            )}
          </div>
        );
      }
    }
    return result;
  }, []);

  const tokenElements = (() => {
    const posMap = new Map<string, { token: TokenState; pos: [number, number] }[]>();
    for (const color of activePlayers) {
      for (const token of tokens[color]) {
        if (token.pathIndex === 57) {
          // Show finished tokens at center
          const pos: [number, number] = [7, 7];
          const key = `${pos[0]},${pos[1]}`;
          if (!posMap.has(key)) posMap.set(key, []);
          posMap.get(key)!.push({ token, pos });
          continue;
        }
        const pos = getTokenGridPos(token, paths);
        const key = `${pos[0]},${pos[1]}`;
        if (!posMap.has(key)) posMap.set(key, []);
        posMap.get(key)!.push({ token, pos });
      }
    }

    const elements: JSX.Element[] = [];
    const cellPct = 100 / 15;
    const offsets4 = [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]];

    posMap.forEach((group) => {
      group.forEach(({ token, pos }, idx) => {
        const [r, c] = pos;
        const isMovable = token.color === currentPlayer &&
          validMoveTokens.includes(token.id) && token.pathIndex !== 57;
        const sz = group.length > 2 ? 0.45 : group.length > 1 ? 0.55 : 0.7;
        let offR = 0, offC = 0;
        if (group.length > 1) {
          const off = offsets4[idx % 4];
          offR = off[0] * cellPct;
          offC = off[1] * cellPct;
        }

        elements.push(
          <div
            key={`t-${token.color}-${token.id}-${token.pathIndex}`}
            className={`absolute rounded-full ${isMovable ? 'ring-2 ring-white cursor-pointer' : 'cursor-default'}`}
            style={{
              top: `${r * cellPct + (1 - sz) * cellPct / 2 + offR}%`,
              left: `${c * cellPct + (1 - sz) * cellPct / 2 + offC}%`,
              width: `${sz * cellPct}%`,
              height: `${sz * cellPct}%`,
              background: `radial-gradient(circle at 35% 35%, ${COLOR_LIGHT[token.color]}, ${COLOR_HEX[token.color]}, ${COLOR_DARK[token.color]})`,
              boxShadow: isMovable
                ? `0 0 8px 2px ${COLOR_HEX[token.color]}, 0 2px 4px rgba(0,0,0,0.3)`
                : '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: isMovable ? 20 : 10,
              animation: 'token-bounce 0.3s ease-out',
              transition: 'box-shadow 0.2s',
            }}
            onClick={() => isMovable && onTokenClick(token.color, token.id)}
          />
        );
      });
    });
    return elements;
  })();

  return (
    <div className="relative w-full mx-auto" style={{ aspectRatio: '1', maxWidth: '600px' }}>
      <div
        className="absolute inset-0 rounded-lg overflow-hidden shadow-xl"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)',
          gridTemplateRows: 'repeat(15, 1fr)',
          border: '3px solid #333',
        }}
      >
        {cells}
      </div>
      {tokenElements}
    </div>
  );
};

export default LudoBoard;
