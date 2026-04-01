import { PlayerColor, COLOR_HEX, COLOR_DARK, COLOR_LIGHT } from '@/game/ludoData';
import LudoDice from './LudoDice';

interface PlayerPanelProps {
  color: PlayerColor;
  finished: number;
  isActive: boolean;
  diceValue: number;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onRollSix: () => void;
  consecutiveSixes: number;
  noMoves: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const PlayerPanel = ({
  color, finished, isActive, diceValue, isRolling, canRoll,
  onRoll, onRollSix, consecutiveSixes, noMoves, position,
}: PlayerPanelProps) => {
  const isHorizontal = position === 'top' || position === 'bottom';

  return (
    <div
      className={`flex items-center gap-2 transition-all duration-400 ${
        isHorizontal ? 'flex-row' : 'flex-col'
      }`}
      style={{
        opacity: isActive ? 1 : 0.5,
        transform: isActive ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 0.4s, transform 0.4s',
      }}
    >
      {/* Player info */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
        isHorizontal ? '' : 'flex-col'
      }`}
        style={{
          backgroundColor: isActive ? COLOR_HEX[color] + '25' : COLOR_HEX[color] + '10',
          border: isActive ? `2px solid ${COLOR_HEX[color]}` : '2px solid transparent',
          minWidth: isHorizontal ? '80px' : undefined,
        }}
      >
        <div className="w-4 h-4 rounded-full shadow-sm"
          style={{ backgroundColor: COLOR_HEX[color] }} />
        <div className={`flex ${isHorizontal ? 'flex-row items-center gap-1.5' : 'flex-col items-center gap-0.5'}`}>
          <span className="text-xs font-bold capitalize text-foreground">{color}</span>
          <span className="text-[10px] font-semibold text-muted-foreground">{finished}/4</span>
        </div>
      </div>

      {/* Dice */}
      <div className="transition-all duration-400"
        style={{
          transform: isActive ? 'scale(1)' : 'scale(0.75)',
          pointerEvents: isActive ? 'auto' : 'none',
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

      {/* Status indicators */}
      {isActive && consecutiveSixes > 0 && (
        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          🔥 {consecutiveSixes}×6
        </span>
      )}
      {isActive && noMoves && (
        <span className="text-[10px] text-muted-foreground italic whitespace-nowrap">Pass...</span>
      )}
    </div>
  );
};

export default PlayerPanel;
