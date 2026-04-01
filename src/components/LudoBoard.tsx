import { useMemo } from 'react';
import {
  PlayerColor, TokenState, PLAYER_COLORS, COMMON_PATH,
  HOME_STRETCHES, HOME_POSITIONS, SAFE_ZONE_CELLS,
  COLOR_HEX, COLOR_LIGHT, COLOR_DARK, getTokenGridPos,
} from '@/game/ludoData';
import LudoDice from './LudoDice';

interface LudoBoardProps {
  tokens: Record<PlayerColor, TokenState[]>;
  activePlayers: PlayerColor[];
  paths: Record<PlayerColor, [number, number][]>;
  validMoveTokens: number[];
  currentPlayer: PlayerColor;
  onTokenClick: (color: PlayerColor, tokenId: number) => void;
  // Dice props
  diceValue: number;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onRollSix: () => void;
}

function getCellBg(r: number, c: number): string {
  if (r < 6 && c < 6) return COLOR_HEX.green;
  if (r < 6 && c > 8) return COLOR_HEX.yellow;
  if (r > 8 && c < 6) return COLOR_HEX.red;
  if (r > 8 && c > 8) return COLOR_HEX.blue;
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'center';
  for (const color of PLAYER_COLORS) {
    if (HOME_STRETCHES[color].some(([hr, hc]) => hr === r && hc === c))
      return COLOR_LIGHT[color];
  }
  return '#FFFFFF';
}

function isInHomeBase(r: number, c: number): boolean {
  return (r >= 1 && r <= 4 && c >= 1 && c <= 4) ||
    (r >= 1 && r <= 4 && c >= 10 && c <= 13) ||
    (r >= 10 && r <= 13 && c >= 1 && c <= 4) ||
    (r >= 10 && r <= 13 && c >= 10 && c <= 13);
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

// Dice position: placed beside each player's home base in the path corridor
// Green (top-left) → right side, Yellow (top-right) → bottom side
// Red (bottom-left) → top side, Blue (bottom-right) → left side
const DICE_POSITIONS: Record<PlayerColor, { top: string; left: string }> = {
  green: { top: '1%', left: '41%' },    // right of green base, in top path corridor
  yellow: { top: '41%', left: '93%' },   // below yellow base, in right path corridor  
  red: { top: '55%', left: '1%' },       // above red base, in left path corridor
  blue: { top: '93%', left: '55%' },     // left of blue base, in bottom path corridor
};

const LudoBoard = ({
  tokens, activePlayers, paths, validMoveTokens, currentPlayer, onTokenClick,
  diceValue, isRolling, canRoll, onRoll, onRollSix,
}: LudoBoardProps) => {
  const cells = useMemo(() => {
    const result = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const bgType = getCellBg(r, c);
        const isSafe = SAFE_ZONE_CELLS.has(`${r},${c}`);
        const isPath = isPathCell(r, c);
        const inHomeBase = isInHomeBase(r, c);
        const isHomeStretch = PLAYER_COLORS.some(col =>
          HOME_STRETCHES[col].some(([hr, hc]) => hr === r && hc === c)
        );
        const isCenter = bgType === 'center';

        if (isCenter) {
          result.push(<div key={`${r}-${c}`} className="relative" />);
          continue;
        }

        let bg = bgType;
        let border = '0.5px solid rgba(0,0,0,0.08)';
        if (inHomeBase) {
          bg = '#FFFFFF';
          border = 'none';
        } else if (isPath || isHomeStretch) {
          border = '0.5px solid rgba(0,0,0,0.12)';
        }

        result.push(
          <div
            key={`${r}-${c}`}
            className="relative flex items-center justify-center"
            style={{ backgroundColor: bg, border }}
          >
            {isSafe && (
              <span className="absolute text-amber-400 font-bold select-none drop-shadow-sm"
                style={{ fontSize: 'clamp(7px, 2vw, 18px)' }}>★</span>
            )}
          </div>
        );
      }
    }
    return result;
  }, []);

  const centerOverlay = useMemo(() => {
    const cellPct = 100 / 15;
    return (
      <div className="absolute overflow-hidden"
        style={{
          top: `${cellPct * 6}%`, left: `${cellPct * 6}%`,
          width: `${cellPct * 3}%`, height: `${cellPct * 3}%`, zIndex: 5,
        }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <polygon points="0,0 50,50 0,100" fill={COLOR_HEX.green} />
          <polygon points="0,0 100,0 50,50" fill={COLOR_HEX.yellow} />
          <polygon points="100,0 100,100 50,50" fill={COLOR_HEX.blue} />
          <polygon points="0,100 50,50 100,100" fill={COLOR_HEX.red} />
          <circle cx="50" cy="50" r="12" fill="white" stroke="#ddd" strokeWidth="1" />
          <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }, []);

  // Home base white boxes with token spots
  const homeBaseOverlays = useMemo(() => {
    const cellPct = 100 / 15;
    const bases: { r: number; c: number; color: PlayerColor }[] = [
      { r: 0, c: 0, color: 'green' },
      { r: 0, c: 9, color: 'yellow' },
      { r: 9, c: 0, color: 'red' },
      { r: 9, c: 9, color: 'blue' },
    ];
    return bases.map(({ r, c, color }) => (
      <div key={`home-${color}`} className="absolute"
        style={{
          top: `${(r + 1) * cellPct + 0.3}%`, left: `${(c + 1) * cellPct + 0.3}%`,
          width: `${4 * cellPct - 0.6}%`, height: `${4 * cellPct - 0.6}%`,
          backgroundColor: '#FFFFFF',
          borderRadius: 'clamp(4px, 1.5vw, 12px)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 2,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
          gap: 'clamp(2px, 0.8vw, 8px)', padding: 'clamp(4px, 1.5vw, 16px)',
        }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 35%, ${COLOR_LIGHT[color]}, ${COLOR_HEX[color]})`,
              border: `2px solid ${COLOR_DARK[color]}`,
              opacity: 0.3,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </div>
    ));
  }, []);

  // Dice overlays on home bases
  const diceOverlays = activePlayers.map(color => {
    const pos = DICE_POSITIONS[color];
    const isActive = color === currentPlayer;

    return (
      <div
        key={`dice-${color}`}
        className="absolute flex items-center justify-center transition-all duration-500"
        style={{
          top: pos.top,
          left: pos.left,
          width: 'clamp(40px, 8%, 56px)',
          height: 'clamp(50px, 10%, 70px)',
          zIndex: isActive ? 30 : 3,
          opacity: isActive ? 1 : 0.25,
          pointerEvents: isActive ? 'auto' : 'none',
          transform: isActive ? 'scale(1)' : 'scale(0.6)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <LudoDice
          value={diceValue}
          color={color}
          isRolling={isActive && isRolling}
          canRoll={isActive && canRoll}
          onRoll={onRoll}
          onRollSix={onRollSix}
        />
      </div>
    );
  });

  const tokenElements = (() => {
    const posMap = new Map<string, { token: TokenState; pos: [number, number] }[]>();
    for (const color of activePlayers) {
      for (const token of tokens[color]) {
        if (token.pathIndex === 57) {
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
            className={`absolute rounded-full ${isMovable ? 'cursor-pointer' : 'cursor-default'}`}
            style={{
              top: `${r * cellPct + (1 - sz) * cellPct / 2 + offR}%`,
              left: `${c * cellPct + (1 - sz) * cellPct / 2 + offC}%`,
              width: `${sz * cellPct}%`, height: `${sz * cellPct}%`,
              background: `radial-gradient(circle at 30% 30%, ${COLOR_LIGHT[token.color]} 0%, ${COLOR_HEX[token.color]} 50%, ${COLOR_DARK[token.color]} 100%)`,
              boxShadow: isMovable
                ? `0 0 10px 3px ${COLOR_HEX[token.color]}, 0 0 20px 5px ${COLOR_HEX[token.color]}44, 0 3px 6px rgba(0,0,0,0.3)`
                : `0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)`,
              border: `2px solid ${COLOR_DARK[token.color]}`,
              zIndex: isMovable ? 20 : 10,
              animation: 'token-bounce 0.3s ease-out',
              transition: 'box-shadow 0.2s, transform 0.2s',
              transform: isMovable ? 'scale(1.1)' : 'scale(1)',
            }}
            onClick={() => isMovable && onTokenClick(token.color, token.id)}
          >
            <div className="absolute rounded-full"
              style={{
                top: '15%', left: '15%', width: '35%', height: '35%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
              }}
            />
          </div>
        );
      });
    });
    return elements;
  })();

  return (
    <div className="relative w-full mx-auto" style={{ aspectRatio: '1', maxWidth: '600px' }}>
      <div className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)',
          gridTemplateRows: 'repeat(15, 1fr)',
          border: '4px solid #5D4037',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 2px rgba(255,255,255,0.1)',
          background: '#F5F0E8',
          borderRadius: 'clamp(8px, 2vw, 20px)',
        }}>
        {cells}
      </div>
      {homeBaseOverlays}
      {centerOverlay}
      {diceOverlays}
      {tokenElements}
    </div>
  );
};

export default LudoBoard;
