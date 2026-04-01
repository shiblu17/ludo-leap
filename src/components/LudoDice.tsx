import { PlayerColor, COLOR_HEX, COLOR_DARK } from '@/game/ludoData';

const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 72], [72, 28]],
  3: [[28, 72], [50, 50], [72, 28]],
  4: [[28, 28], [28, 72], [72, 28], [72, 72]],
  5: [[28, 28], [28, 72], [50, 50], [72, 28], [72, 72]],
  6: [[28, 22], [28, 50], [28, 78], [72, 22], [72, 50], [72, 78]],
};

interface DiceProps {
  value: number;
  color: PlayerColor;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onRollSix: () => void;
}

const LudoDice = ({ value, color, isRolling, canRoll, onRoll, onRollSix }: DiceProps) => {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Dice */}
      <div
        className={`relative cursor-${canRoll ? 'pointer' : 'default'}`}
        style={{
          width: 'clamp(40px, 8vmin, 56px)',
          height: 'clamp(40px, 8vmin, 56px)',
        }}
        onClick={canRoll ? onRoll : undefined}
      >
        {/* Dice shadow */}
        <div className="absolute inset-0 rounded-xl"
          style={{
            background: COLOR_DARK[color],
            transform: 'translateY(3px)',
            borderRadius: 'clamp(6px, 1.5vmin, 12px)',
          }}
        />
        {/* Dice body */}
        <div
          className={`absolute inset-0 rounded-xl ${isRolling ? 'animate-dice-spin' : ''}`}
          style={{
            background: `linear-gradient(145deg, #FFFFFF 0%, #F0F0F0 100%)`,
            border: `2.5px solid ${COLOR_HEX[color]}`,
            borderRadius: 'clamp(6px, 1.5vmin, 12px)',
            boxShadow: `0 2px 8px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.8)`,
          }}
        >
          {DICE_DOTS[value]?.map(([top, left], i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 'clamp(5px, 1.3vmin, 8px)',
                height: 'clamp(5px, 1.3vmin, 8px)',
                top: `${top}%`,
                left: `${left}%`,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle at 40% 40%, ${COLOR_HEX[color]}, ${COLOR_DARK[color]})`,
                boxShadow: `0 1px 2px rgba(0,0,0,0.2)`,
              }}
            />
          ))}
        </div>

        {/* Tap hint pulse */}
        {canRoll && !isRolling && (
          <div className="absolute inset-0 rounded-xl animate-dice-pulse"
            style={{
              border: `2px solid ${COLOR_HEX[color]}`,
              borderRadius: 'clamp(6px, 1.5vmin, 12px)',
            }}
          />
        )}
      </div>

      {/* Roll 6 button */}
      {canRoll && !isRolling && (
        <button
          onClick={onRollSix}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: COLOR_HEX[color] + '22',
            color: COLOR_DARK[color],
            border: `1.5px solid ${COLOR_HEX[color]}88`,
          }}
        >
          6️⃣
        </button>
      )}
    </div>
  );
};

export default LudoDice;
