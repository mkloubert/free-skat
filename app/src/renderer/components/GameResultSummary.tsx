// Copyright 2025 Marcel Joachim Kloubert (https://marcel.coffee)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useCallback, useMemo } from "react";
import {
  Player,
  GameState,
  GameType,
  getGameTypeBaseValue,
} from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * Props for the GameResultSummary component.
 */
interface GameResultSummaryProps {
  /** Human player position */
  humanPlayer?: Player;
  /** Callback when user wants to start a new game */
  onNewGame?: () => void;
}

/**
 * Get game type display name.
 */
function getGameTypeName(gameType: GameType): string {
  switch (gameType) {
    case GameType.Clubs:
      return "Clubs";
    case GameType.Spades:
      return "Spades";
    case GameType.Hearts:
      return "Hearts";
    case GameType.Diamonds:
      return "Diamonds";
    case GameType.Grand:
      return "Grand";
    case GameType.Null:
      return "Null";
    case GameType.Ramsch:
      return "Ramsch";
    default:
      return "Unknown";
  }
}

/**
 * Get game type symbol.
 */
function getGameTypeSymbol(gameType: GameType): string {
  switch (gameType) {
    case GameType.Clubs:
      return "\u2663";
    case GameType.Spades:
      return "\u2660";
    case GameType.Hearts:
      return "\u2665";
    case GameType.Diamonds:
      return "\u2666";
    case GameType.Grand:
      return "G";
    case GameType.Null:
      return "N";
    case GameType.Ramsch:
      return "R";
    default:
      return "?";
  }
}

/**
 * GameResultSummary shows the result of a completed game.
 */
export function GameResultSummary({
  humanPlayer = Player.Forehand,
  onNewGame,
}: GameResultSummaryProps) {
  const {
    gameState,
    gameType,
    declarer,
    players,
    contract,
    currentBid,
    resetGame,
  } = useGameStore();

  // Only show at game end
  if (gameState !== GameState.GameOver) {
    return null;
  }

  // Calculate final scores
  const declarerPoints = useMemo(() => {
    if (declarer === null) return null;
    return players[declarer].tricksPoints;
  }, [declarer, players]);

  const declarerTricks = useMemo(() => {
    if (declarer === null) return null;
    return players[declarer].tricksWon;
  }, [declarer, players]);

  const opponentPoints = useMemo(() => {
    if (declarer === null) return null;
    return Object.entries(players)
      .filter(([key]) => Number(key) !== declarer)
      .reduce((sum, [, data]) => sum + data.tricksPoints, 0);
  }, [declarer, players]);

  // Determine win condition
  const isNullGame = gameType === GameType.Null;
  const isRamsch = gameType === GameType.Ramsch;

  // Declarer win conditions
  const declarerWon = useMemo(() => {
    if (declarer === null) return false;

    if (isNullGame) {
      // Null: declarer wins if they took 0 tricks
      return declarerTricks === 0;
    }

    // Normal games: need 61+ points
    return declarerPoints! >= 61;
  }, [declarer, declarerPoints, declarerTricks, isNullGame]);

  // Schneider/Schwarz detection
  const isSchneider =
    !isNullGame && declarerPoints !== null && declarerPoints >= 90;
  const isSchwarz = !isNullGame && declarerTricks === 10;
  const opponentSchneider =
    !isNullGame && declarerPoints !== null && declarerPoints < 31;
  const opponentSchwarz =
    !isNullGame && declarerTricks !== null && declarerTricks === 0;

  // Calculate game value (simplified)
  const gameValue = useMemo(() => {
    if (isRamsch || gameType === null) return 0;

    const baseValue = getGameTypeBaseValue(gameType);
    let multiplier = 2; // 1 matador + 1 game (simplified)

    if (contract?.hand) multiplier++;
    if (isSchneider) multiplier++;
    if (isSchwarz) multiplier++;
    if (contract?.schneider) multiplier++;
    if (contract?.schwarz) multiplier++;
    if (contract?.ouvert) multiplier++;

    return baseValue * multiplier;
  }, [gameType, contract, isSchneider, isSchwarz, isRamsch]);

  // Check overbid
  const overbid = currentBid > 0 && gameValue < currentBid;

  // Calculate final score
  const finalScore = useMemo(() => {
    if (isRamsch) {
      // Ramsch: loser gets negative points
      const maxPoints = Math.max(
        ...Object.values(players).map((p) => p.tricksPoints)
      );
      return -maxPoints;
    }

    if (!declarerWon || overbid) {
      // Lost: -2 × game value (or overbid value)
      const lossValue = overbid ? currentBid : gameValue;
      return -2 * lossValue;
    }

    return gameValue;
  }, [
    isRamsch,
    declarerWon,
    overbid,
    currentBid,
    gameValue,
    players,
  ]);

  // Determine if human won
  const humanWon = useMemo(() => {
    if (isRamsch) {
      // In Ramsch, player with lowest points wins
      const humanPoints = players[humanPlayer].tricksPoints;
      return Object.values(players).every((p) => p.tricksPoints >= humanPoints);
    }

    if (declarer === humanPlayer) {
      return declarerWon && !overbid;
    }

    return !declarerWon || overbid;
  }, [
    isRamsch,
    declarer,
    humanPlayer,
    declarerWon,
    overbid,
    players,
  ]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    resetGame();
    onNewGame?.();
  }, [resetGame, onNewGame]);

  // Get color based on game type
  const isRedSuit =
    gameType === GameType.Hearts || gameType === GameType.Diamonds;

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {/* Result header */}
        <div
          style={{
            ...styles.header,
            backgroundColor: humanWon
              ? "rgba(76, 175, 80, 0.2)"
              : "rgba(244, 67, 54, 0.2)",
          }}
        >
          <div style={styles.resultEmoji}>{humanWon ? "🎉" : "😞"}</div>
          <h2
            style={{
              ...styles.resultText,
              color: humanWon ? "#4caf50" : "#f44336",
            }}
          >
            {humanWon ? "Victory!" : "Defeat"}
          </h2>
        </div>

        {/* Game type */}
        <div style={styles.gameInfo}>
          <span
            style={{
              ...styles.gameTypeSymbol,
              color: isRedSuit ? "#ff6b6b" : "#fff",
            }}
          >
            {getGameTypeSymbol(gameType)}
          </span>
          <span style={styles.gameTypeName}>{getGameTypeName(gameType)}</span>
          {contract && (
            <div style={styles.contractModifiers}>
              {contract.hand && <span style={styles.badge}>Hand</span>}
              {contract.schneider && (
                <span style={styles.badge}>Schneider</span>
              )}
              {contract.schwarz && (
                <span style={styles.badge}>Schwarz</span>
              )}
              {contract.ouvert && <span style={styles.badge}>Ouvert</span>}
            </div>
          )}
        </div>

        {/* Score breakdown */}
        {!isRamsch && declarer !== null && (
          <div style={styles.scoreBreakdown}>
            <div style={styles.scoreRow}>
              <span style={styles.scoreLabel}>Declarer Points:</span>
              <span
                style={{
                  ...styles.scoreValue,
                  color:
                    declarerPoints! >= 61
                      ? "#4caf50"
                      : declarerPoints! >= 31
                        ? "#ff9800"
                        : "#f44336",
                }}
              >
                {declarerPoints}
              </span>
            </div>
            <div style={styles.scoreRow}>
              <span style={styles.scoreLabel}>Opponent Points:</span>
              <span style={styles.scoreValue}>{opponentPoints}</span>
            </div>
            <div style={styles.scoreRow}>
              <span style={styles.scoreLabel}>Tricks Won:</span>
              <span style={styles.scoreValue}>{declarerTricks} / 10</span>
            </div>

            {/* Achievements */}
            {isSchneider && !opponentSchneider && (
              <div style={styles.achievement}>
                <span style={styles.achievementIcon}>⭐</span>
                Schneider achieved!
              </div>
            )}
            {isSchwarz && (
              <div style={styles.achievement}>
                <span style={styles.achievementIcon}>🌟</span>
                Schwarz achieved!
              </div>
            )}
            {opponentSchneider && (
              <div style={{ ...styles.achievement, color: "#f44336" }}>
                <span style={styles.achievementIcon}>💔</span>
                Schneider against declarer!
              </div>
            )}
            {opponentSchwarz && (
              <div style={{ ...styles.achievement, color: "#f44336" }}>
                <span style={styles.achievementIcon}>💀</span>
                Schwarz against declarer!
              </div>
            )}

            {/* Overbid warning */}
            {overbid && (
              <div style={styles.overbid}>
                <span style={styles.overbidIcon}>⚠️</span>
                Overbid! Bid {currentBid} &gt; Game value {gameValue}
              </div>
            )}
          </div>
        )}

        {/* Ramsch results */}
        {isRamsch && (
          <div style={styles.ramschResults}>
            <h3 style={styles.sectionTitle}>Final Points</h3>
            {[Player.Forehand, Player.Middlehand, Player.Rearhand].map(
              (player) => {
                const isWinner = Object.values(players).every(
                  (p) => p.tricksPoints >= players[player].tricksPoints
                );
                const isLoser =
                  players[player].tricksPoints ===
                  Math.max(...Object.values(players).map((p) => p.tricksPoints));

                return (
                  <div
                    key={player}
                    style={{
                      ...styles.ramschPlayer,
                      ...(isWinner ? styles.ramschWinner : {}),
                      ...(isLoser ? styles.ramschLoser : {}),
                    }}
                  >
                    <span>
                      {player === humanPlayer ? "You" : players[player].name}
                    </span>
                    <span style={styles.ramschPoints}>
                      {players[player].tricksPoints}
                    </span>
                    {isWinner && <span style={styles.winnerBadge}>Winner!</span>}
                    {isLoser && !isWinner && (
                      <span style={styles.loserBadge}>
                        -{players[player].tricksPoints}
                      </span>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* Game value and final score */}
        <div style={styles.finalScore}>
          {!isRamsch && (
            <>
              <div style={styles.valueRow}>
                <span>Game Value:</span>
                <span>{gameValue}</span>
              </div>
              <div style={styles.valueRow}>
                <span>Bid:</span>
                <span>{currentBid}</span>
              </div>
            </>
          )}
          <div
            style={{
              ...styles.valueRow,
              ...styles.totalScore,
              color: finalScore >= 0 ? "#4caf50" : "#f44336",
            }}
          >
            <span>Score:</span>
            <span>
              {finalScore >= 0 ? "+" : ""}
              {finalScore}
            </span>
          </div>
        </div>

        {/* New game button */}
        <button onClick={handleNewGame} style={styles.newGameButton}>
          New Game
        </button>
      </div>
    </div>
  );
}

/**
 * Styles for the GameResultSummary component.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 200,
    animation: "scaleIn 0.4s ease-out",
  },
  panel: {
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: "16px",
    padding: "24px",
    minWidth: "350px",
    maxWidth: "450px",
    border: "2px solid #444",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 8px 40px rgba(0, 0, 0, 0.7)",
  },
  header: {
    textAlign: "center",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "20px",
  },
  resultEmoji: {
    fontSize: "48px",
    marginBottom: "10px",
  },
  resultText: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "bold",
  },
  gameInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  gameTypeSymbol: {
    fontSize: "32px",
  },
  gameTypeName: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  contractModifiers: {
    display: "flex",
    gap: "6px",
    marginLeft: "10px",
  },
  badge: {
    padding: "4px 8px",
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  scoreBreakdown: {
    padding: "15px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    marginBottom: "15px",
  },
  scoreRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #333",
  },
  scoreLabel: {
    fontSize: "14px",
    color: "#aaa",
  },
  scoreValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#fff",
  },
  achievement: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    marginTop: "10px",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: "6px",
    color: "#4caf50",
    fontSize: "14px",
    fontWeight: "bold",
  },
  achievementIcon: {
    fontSize: "20px",
  },
  overbid: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    marginTop: "10px",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: "6px",
    color: "#f44336",
    fontSize: "14px",
    fontWeight: "bold",
  },
  overbidIcon: {
    fontSize: "20px",
  },
  ramschResults: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "12px",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: "10px",
    textAlign: "center",
  },
  ramschPlayer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  ramschWinner: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderLeft: "3px solid #4caf50",
  },
  ramschLoser: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    borderLeft: "3px solid #f44336",
  },
  ramschPoints: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  winnerBadge: {
    padding: "4px 8px",
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  loserBadge: {
    padding: "4px 8px",
    backgroundColor: "#f44336",
    color: "#fff",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  finalScore: {
    padding: "15px",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: "10px",
    marginBottom: "20px",
  },
  valueRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: "14px",
    color: "#aaa",
  },
  totalScore: {
    fontSize: "20px",
    fontWeight: "bold",
    paddingTop: "10px",
    marginTop: "10px",
    borderTop: "1px solid #444",
  },
  newGameButton: {
    width: "100%",
    padding: "16px",
    fontSize: "18px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#ffd700",
    color: "#000",
    cursor: "pointer",
    transition: "transform 0.1s",
  },
};
