import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  PlayerColor, TURN_ORDER_2P, TURN_ORDER_4P,
  COLOR_HEX, createInitialTokens, getPlayerPath, SAFE_ZONE_CELLS,
} from '@/game/ludoData';
import { playPop, playCapture, playFanfare } from '@/game/sounds';
import LudoBoard from './LudoBoard';
import { Button } from '@/components/ui/button';

const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 72], [72, 28]],
  3: [[28, 72], [50, 50], [72, 28]],
  4: [[28, 28], [28, 72], [72, 28], [72, 72]],
  5: [[28, 28], [28, 72], [50, 50], [72, 28], [72, 72]],
  6: [[28, 22], [28, 50], [28, 78], [72, 22], [72, 50], [72, 78]],
};

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 72], [72, 28]],
  3: [[28, 72], [50, 50], [72, 28]],
  4: [[28, 28], [28, 72], [72, 28], [72, 72]],
  5: [[28, 28], [28, 72], [50, 50], [72, 28], [72, 72]],
  6: [[28, 22], [28, 50], [28, 78], [72, 22], [72, 50], [72, 78]],
};

const LudoGame = () => {
  const [mode, setMode] = useState<2 | 4 | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>('green');
  const [tokens, setTokens] = useState(createInitialTokens());
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [displayDice, setDisplayDice] = useState(1);
  const [diceRolled, setDiceRolled] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);

  const paths = useMemo(() => ({
    green: getPlayerPath('green'),
    yellow: getPlayerPath('yellow'),
    blue: getPlayerPath('blue'),
    red: getPlayerPath('red'),
  }), []);

  const activePlayers = mode === 2 ? TURN_ORDER_2P : TURN_ORDER_4P;

  const getValidMoves = useCallback((player: PlayerColor, dice: number): number[] => {
    return tokens[player]
      .filter(t => {
        if (t.pathIndex === 57) return false;
        if (t.pathIndex === -1) return dice === 6;
        return t.pathIndex + dice <= 57;
      })
      .map(t => t.id);
  }, [tokens]);

  const validMoves = useMemo(() => {
    if (!diceRolled || diceValue === null || isMoving) return [];
    return getValidMoves(currentPlayer, diceValue);
  }, [diceRolled, diceValue, isMoving, currentPlayer, getValidMoves]);

  // Win detection
  useEffect(() => {
    if (!mode) return;
    const ap = mode === 2 ? TURN_ORDER_2P : TURN_ORDER_4P;
    for (const color of ap) {
      if (tokens[color].every(t => t.pathIndex === 57)) {
        setWinner(color);
        playFanfare();
        return;
      }
    }
  }, [tokens, mode]);

  const advancePlayer = useCallback(() => {
    setDiceRolled(false);
    setDiceValue(null);
    setConsecutiveSixes(0);
    setCurrentPlayer(prev => {
      const order = mode === 2 ? TURN_ORDER_2P : TURN_ORDER_4P;
      return order[(order.indexOf(prev) + 1) % order.length];
    });
  }, [mode]);

  // Auto-pass when no valid moves
  useEffect(() => {
    if (!diceRolled || diceValue === null || isMoving || isRolling || winner) return;
    if (validMoves.length === 0) {
      const timer = setTimeout(() => advancePlayer(), 1200);
      return () => clearTimeout(timer);
    }
  }, [diceRolled, diceValue, isMoving, isRolling, winner, validMoves, advancePlayer]);

  const rollDiceWithValue = useCallback((forcedValue?: number) => {
    if (isRolling || isMoving || diceRolled || winner) return;
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDisplayDice(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const value = forcedValue ?? (Math.floor(Math.random() * 6) + 1);
        setDiceValue(value);
        setDisplayDice(value);
        setDiceRolled(true);
        setIsRolling(false);
      }
    }, 60);
  }, [isRolling, isMoving, diceRolled, winner]);

  const rollDice = useCallback(() => rollDiceWithValue(), [rollDiceWithValue]);
  const rollSix = useCallback(() => rollDiceWithValue(6), [rollDiceWithValue]);

  const handleTokenClick = useCallback(async (color: PlayerColor, tokenId: number) => {
    if (isMoving || !diceRolled || diceValue === null || winner) return;
    if (color !== currentPlayer) return;

    const currentValidMoves = getValidMoves(currentPlayer, diceValue);
    if (!currentValidMoves.includes(tokenId)) return;

    const token = tokens[color][tokenId];
    const dice = diceValue;
    const playerPath = paths[color];
    const currentSixes = consecutiveSixes;

    setIsMoving(true);

    let finalPathIndex: number;

    if (token.pathIndex === -1) {
      // Bring out token
      finalPathIndex = 0;
      playPop();
      setTokens(prev => ({
        ...prev,
        [color]: prev[color].map(t => t.id === tokenId ? { ...t, pathIndex: 0 } : t),
      }));
      await delay(300);
    } else {
      // Move step by step
      finalPathIndex = token.pathIndex + dice;
      for (let step = 1; step <= dice; step++) {
        await delay(300);
        playPop();
        const newIdx = token.pathIndex + step;
        setTokens(prev => ({
          ...prev,
          [color]: prev[color].map(t => t.id === tokenId ? { ...t, pathIndex: newIdx } : t),
        }));
      }
    }

    // Check capture (only on common path cells, indices 0-50)
    if (finalPathIndex >= 0 && finalPathIndex <= 50) {
      const finalCell = playerPath[finalPathIndex];
      const cellKey = `${finalCell[0]},${finalCell[1]}`;
      if (!SAFE_ZONE_CELLS.has(cellKey)) {
        const order = mode === 2 ? TURN_ORDER_2P : TURN_ORDER_4P;
        for (const oppColor of order) {
          if (oppColor === color) continue;
          const oppPath = paths[oppColor];
          setTokens(prev => {
            let captured = false;
            const updated = {
              ...prev,
              [oppColor]: prev[oppColor].map(t => {
                if (t.pathIndex >= 0 && t.pathIndex <= 50) {
                  const tCell = oppPath[t.pathIndex];
                  if (tCell[0] === finalCell[0] && tCell[1] === finalCell[1]) {
                    captured = true;
                    return { ...t, pathIndex: -1 };
                  }
                }
                return t;
              }),
            };
            if (captured) setTimeout(() => playCapture(), 0);
            return updated;
          });
        }
      }
    }

    await delay(200);
    setIsMoving(false);
    setDiceRolled(false);
    setDiceValue(null);

    // Handle turn
    if (dice === 6) {
      const newSixes = currentSixes + 1;
      if (newSixes >= 3) {
        setConsecutiveSixes(0);
        setTimeout(() => {
          setCurrentPlayer(prev => {
            const order = mode === 2 ? TURN_ORDER_2P : TURN_ORDER_4P;
            return order[(order.indexOf(prev) + 1) % order.length];
          });
        }, 400);
      } else {
        setConsecutiveSixes(newSixes);
        // Player rolls again — diceRolled already false
      }
    } else {
      setConsecutiveSixes(0);
      setTimeout(() => {
        setCurrentPlayer(prev => {
          const order = mode === 2 ? TURN_ORDER_2P : TURN_ORDER_4P;
          return order[(order.indexOf(prev) + 1) % order.length];
        });
      }, 400);
    }
  }, [isMoving, diceRolled, diceValue, winner, currentPlayer, tokens, paths, mode, consecutiveSixes, getValidMoves]);

  const startGame = (m: 2 | 4) => {
    setMode(m);
    setTokens(createInitialTokens());
    setCurrentPlayer('green');
    setDiceValue(null);
    setDiceRolled(false);
    setWinner(null);
    setConsecutiveSixes(0);
  };

  const restartGame = () => {
    setMode(null);
    setTokens(createInitialTokens());
    setCurrentPlayer('green');
    setDiceValue(null);
    setDiceRolled(false);
    setIsRolling(false);
    setIsMoving(false);
    setWinner(null);
    setConsecutiveSixes(0);
  };

  // Setup screen
  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-8 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎲</div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Ludo King</h1>
          <p className="text-muted-foreground text-lg">Choose your game mode</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => startGame(2)} size="lg" className="text-lg px-8 py-6">
            👥 2 Players
          </Button>
          <Button onClick={() => startGame(4)} size="lg" className="text-lg px-8 py-6">
            👥👥 4 Players
          </Button>
        </div>
      </div>
    );
  }

  const diceDisplay = isRolling ? displayDice : (diceValue ?? 1);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">🎲 Ludo King</h1>
        <Button variant="outline" size="sm" onClick={restartGame}>New Game</Button>
      </div>

      {/* Turn indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full shadow-md"
          style={{ backgroundColor: COLOR_HEX[currentPlayer] }} />
        <span className="font-semibold capitalize text-foreground">
          {currentPlayer}'s Turn
        </span>
        {consecutiveSixes > 0 && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            🔥 {consecutiveSixes}× six
          </span>
        )}
        {diceRolled && validMoves.length === 0 && (
          <span className="text-sm text-muted-foreground italic">(No moves — passing...)</span>
        )}
      </div>

      {/* Board with integrated dice */}
      <div className="w-full flex justify-center" style={{ maxWidth: '95vmin' }}>
        <LudoBoard
          tokens={tokens}
          activePlayers={activePlayers}
          paths={paths}
          validMoveTokens={validMoves}
          currentPlayer={currentPlayer}
          onTokenClick={handleTokenClick}
          diceValue={diceDisplay}
          isRolling={isRolling}
          canRoll={!diceRolled && !isRolling && !isMoving && !winner}
          onRoll={rollDice}
          onRollSix={rollSix}
        />
      </div>

      {diceRolled && validMoves.length > 0 && !isMoving && (
        <p className="text-sm text-muted-foreground animate-pulse mt-2">
          Tap a glowing token to move
        </p>
      )}

      {/* Score strip */}
      <div className="mt-4 flex gap-3">
        {activePlayers.map(color => {
          const finished = tokens[color].filter(t => t.pathIndex === 57).length;
          return (
            <div key={color} className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                backgroundColor: COLOR_HEX[color] + '22',
                border: currentPlayer === color ? `2px solid ${COLOR_HEX[color]}` : '2px solid transparent',
              }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HEX[color] }} />
              <span className="text-xs font-semibold capitalize">{color}</span>
              <span className="text-xs text-muted-foreground">{finished}/4</span>
            </div>
          );
        })}
      </div>

      {/* Winner overlay */}
      {winner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-background rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4 animate-scale-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold capitalize mb-2"
              style={{ color: COLOR_HEX[winner] }}>
              {winner} Wins!
            </h2>
            <p className="text-muted-foreground mb-6">Congratulations! 🎉</p>
            <Button onClick={restartGame} size="lg" className="px-8">
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LudoGame;
