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

import { useMemo } from "react";
import {
  Player,
  GameState,
  GameType,
} from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * Props for the ScoreDisplay component.
 */
interface ScoreDisplayProps {
  /** Human player position */
  humanPlayer?: Player;
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
 * ScoreDisplay shows the running score during trick play.
 */
export function ScoreDisplay({
  humanPlayer = Player.Forehand,
}: ScoreDisplayProps) {
  const {
    gameState,
    gameType,
    declarer,
    players,
    trickNumber,
    contract,
    sessionScores,
  } = useGameStore();

  // Calculate points for declarer and opponents
  // Note: All hooks must be called before any early returns
  const declarerPoints = useMemo(() => {
    if (declarer === null) {
      // Ramsch - show all players
      return null;
    }
    return players[declarer].tricksPoints;
  }, [declarer, players]);

  const opponentPoints = useMemo(() => {
    if (declarer === null) return null;
    return Object.entries(players)
      .filter(([key]) => Number(key) !== declarer)
      .reduce((sum, [, data]) => sum + data.tricksPoints, 0);
  }, [declarer, players]);

  // Calculate tricks won
  const declarerTricks = useMemo(() => {
    if (declarer === null) return null;
    return players[declarer].tricksWon;
  }, [declarer, players]);

  const opponentTricks = useMemo(() => {
    if (declarer === null) return null;
    return Object.entries(players)
      .filter(([key]) => Number(key) !== declarer)
      .reduce((sum, [, data]) => sum + data.tricksWon, 0);
  }, [declarer, players]);

  // Only show during trick playing (after all hooks are called)
  if (gameState !== GameState.TrickPlaying) {
    return null;
  }

  // Determine if human is declarer
  const isHumanDeclarer = declarer === humanPlayer;

  // Calculate target points (for non-Null games)
  const targetPoints = gameType === GameType.Null ? null : 61;
  const schneiderTarget = 90;

  // Get color based on game type
  const isRedSuit =
    gameType === GameType.Hearts || gameType === GameType.Diamonds;

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {/* Game type indicator */}
        <div style={styles.gameType}>
          <span
            style={{
              ...styles.gameTypeSymbol,
              color: isRedSuit ? "#ff6b6b" : "#fff",
            }}
          >
            {getGameTypeSymbol(gameType)}
          </span>
          <span style={styles.gameTypeName}>{getGameTypeName(gameType)}</span>
        </div>

        {/* Trick counter */}
        <div style={styles.trickCounter}>
          Trick {Math.min(trickNumber + 1, 10)} / 10
        </div>

        {/* Normal game score (declarer vs opponents) */}
        {declarer !== null && (
          <div style={styles.scoreSection}>
            {/* Declarer score */}
            <div
              style={{
                ...styles.scoreBox,
                ...(isHumanDeclarer ? styles.highlightBox : {}),
              }}
            >
              <div style={styles.scoreLabel}>
                {isHumanDeclarer ? "You (Declarer)" : "Declarer"}
              </div>
              <div style={styles.scoreValue}>{declarerPoints}</div>
              <div style={styles.trickCount}>{declarerTricks} tricks</div>
              {targetPoints && (
                <div style={styles.progress}>
                  <div
                    style={{
                      ...styles.progressBar,
                      width: `${Math.min((declarerPoints! / targetPoints) * 100, 100)}%`,
                      backgroundColor:
                        declarerPoints! >= targetPoints ? "#4caf50" : "#ffd700",
                    }}
                  />
                </div>
              )}
            </div>

            <div style={styles.vs}>vs</div>

            {/* Opponents score */}
            <div
              style={{
                ...styles.scoreBox,
                ...(!isHumanDeclarer ? styles.highlightBox : {}),
              }}
            >
              <div style={styles.scoreLabel}>
                {!isHumanDeclarer ? "Your Team" : "Opponents"}
              </div>
              <div style={styles.scoreValue}>{opponentPoints}</div>
              <div style={styles.trickCount}>{opponentTricks} tricks</div>
              {targetPoints && (
                <div style={styles.progress}>
                  <div
                    style={{
                      ...styles.progressBar,
                      width: `${Math.min((opponentPoints! / (120 - targetPoints + 1)) * 100, 100)}%`,
                      backgroundColor:
                        opponentPoints! >= 120 - targetPoints + 1
                          ? "#4caf50"
                          : "#2196f3",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ramsch score (all players) */}
        {declarer === null && (
          <div style={styles.ramschSection}>
            {[Player.Forehand, Player.Middlehand, Player.Rearhand].map(
              (player) => (
                <div
                  key={player}
                  style={{
                    ...styles.ramschPlayer,
                    ...(player === humanPlayer ? styles.highlightBox : {}),
                  }}
                >
                  <div style={styles.ramschName}>
                    {player === humanPlayer ? "You" : players[player].name}
                  </div>
                  <div style={styles.ramschPoints}>
                    {players[player].tricksPoints}
                  </div>
                  <div style={styles.ramschTricks}>
                    {players[player].tricksWon} tricks
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Game goal reminder */}
        {gameType !== GameType.Null && gameType !== GameType.Ramsch && (
          <div style={styles.goalReminder}>
            {isHumanDeclarer
              ? `Need ${targetPoints}+ to win`
              : `Stop declarer at ${targetPoints - 1}`}
            {declarerPoints! >= schneiderTarget && (
              <span style={styles.schneiderBadge}>Schneider!</span>
            )}
          </div>
        )}

        {/* Null game reminder */}
        {gameType === GameType.Null && (
          <div style={styles.goalReminder}>
            {isHumanDeclarer
              ? "Take no tricks to win"
              : "Force declarer to take a trick"}
          </div>
        )}

        {/* Ramsch reminder */}
        {gameType === GameType.Ramsch && (
          <div style={styles.goalReminder}>
            Avoid taking points! Lowest score wins.
          </div>
        )}

        {/* Contract modifiers */}
        {contract && (
          <div style={styles.modifiers}>
            {contract.hand && <span style={styles.modifierBadge}>Hand</span>}
            {contract.schneider && (
              <span style={styles.modifierBadge}>Schneider</span>
            )}
            {contract.schwarz && (
              <span style={styles.modifierBadge}>Schwarz</span>
            )}
            {contract.ouvert && <span style={styles.modifierBadge}>Ouvert</span>}
          </div>
        )}

        {/* Session scores */}
        {(sessionScores[Player.Forehand] !== 0 ||
          sessionScores[Player.Middlehand] !== 0 ||
          sessionScores[Player.Rearhand] !== 0) && (
            <div style={styles.sessionSection}>
              <div style={styles.sessionTitle}>Session</div>
              <div style={styles.sessionScores}>
                <span
                  style={{
                    ...styles.sessionScore,
                    color:
                      sessionScores[humanPlayer] > 0
                        ? "#4caf50"
                        : sessionScores[humanPlayer] < 0
                          ? "#f44336"
                          : "#aaa",
                  }}
                >
                  You: {sessionScores[humanPlayer]}
                </span>
                {[Player.Forehand, Player.Middlehand, Player.Rearhand]
                  .filter((p) => p !== humanPlayer)
                  .map((p) => (
                    <span
                      key={p}
                      style={{
                        ...styles.sessionScore,
                        color:
                          sessionScores[p] > 0
                            ? "#4caf50"
                            : sessionScores[p] < 0
                              ? "#f44336"
                              : "#aaa",
                      }}
                    >
                      {players[p].name}: {sessionScores[p]}
                    </span>
                  ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

/**
 * Styles for the ScoreDisplay component.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "10px",
    right: "10px",
    zIndex: 50,
  },
  panel: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: "10px",
    padding: "15px",
    minWidth: "200px",
    border: "1px solid #333",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  gameType: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "10px",
    paddingBottom: "10px",
    borderBottom: "1px solid #444",
  },
  gameTypeSymbol: {
    fontSize: "24px",
  },
  gameTypeName: {
    fontSize: "16px",
    fontWeight: "bold",
  },
  trickCounter: {
    textAlign: "center",
    fontSize: "12px",
    color: "#888",
    marginBottom: "15px",
  },
  scoreSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  scoreBox: {
    flex: 1,
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
    textAlign: "center",
  },
  highlightBox: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    border: "1px solid rgba(255, 215, 0, 0.3)",
  },
  scoreLabel: {
    fontSize: "10px",
    color: "#888",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  scoreValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#ffd700",
  },
  trickCount: {
    fontSize: "11px",
    color: "#666",
    marginTop: "2px",
  },
  progress: {
    height: "4px",
    backgroundColor: "#333",
    borderRadius: "2px",
    marginTop: "8px",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    transition: "width 0.3s ease",
  },
  vs: {
    fontSize: "12px",
    color: "#666",
  },
  ramschSection: {
    display: "flex",
    gap: "8px",
    marginBottom: "10px",
  },
  ramschPlayer: {
    flex: 1,
    padding: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "6px",
    textAlign: "center",
  },
  ramschName: {
    fontSize: "10px",
    color: "#888",
    marginBottom: "4px",
  },
  ramschPoints: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#ff6b6b",
  },
  ramschTricks: {
    fontSize: "10px",
    color: "#666",
  },
  goalReminder: {
    textAlign: "center",
    fontSize: "11px",
    color: "#888",
    paddingTop: "8px",
    borderTop: "1px solid #333",
  },
  schneiderBadge: {
    marginLeft: "8px",
    padding: "2px 6px",
    backgroundColor: "#ff9800",
    color: "#000",
    borderRadius: "3px",
    fontSize: "10px",
    fontWeight: "bold",
  },
  modifiers: {
    display: "flex",
    justifyContent: "center",
    gap: "6px",
    marginTop: "10px",
    flexWrap: "wrap",
  },
  modifierBadge: {
    padding: "3px 8px",
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "bold",
  },
  sessionSection: {
    marginTop: "12px",
    paddingTop: "10px",
    borderTop: "1px solid #333",
  },
  sessionTitle: {
    fontSize: "10px",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: "6px",
    textAlign: "center",
  },
  sessionScores: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  sessionScore: {
    fontSize: "11px",
    textAlign: "center",
  },
};
