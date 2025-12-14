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

import { Player, GameState } from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * Props for the GamePhaseIndicator component.
 */
interface GamePhaseIndicatorProps {
  /** Human player position */
  humanPlayer?: Player;
}

/**
 * Get display name for game state.
 */
function getPhaseDisplayName(state: GameState): string {
  switch (state) {
    case GameState.GameStart:
      return "Starting";
    case GameState.Dealing:
      return "Dealing";
    case GameState.Bidding:
      return "Bidding";
    case GameState.PickingUpSkat:
      return "Skat Decision";
    case GameState.Discarding:
      return "Discarding";
    case GameState.Declaring:
      return "Announcing";
    case GameState.TrickPlaying:
      return "Playing";
    case GameState.GameOver:
      return "Game Over";
    default:
      return "Unknown";
  }
}

/**
 * Get phase icon.
 */
function getPhaseIcon(state: GameState): string {
  switch (state) {
    case GameState.GameStart:
      return "🎴";
    case GameState.Dealing:
      return "🃏";
    case GameState.Bidding:
      return "💬";
    case GameState.PickingUpSkat:
      return "🤔";
    case GameState.Discarding:
      return "↔️";
    case GameState.Declaring:
      return "📢";
    case GameState.TrickPlaying:
      return "🎯";
    case GameState.GameOver:
      return "🏁";
    default:
      return "❓";
  }
}

/**
 * Get player display name.
 */
function getPlayerDisplayName(
  player: Player,
  humanPlayer: Player,
  players: Record<Player, { name: string }>
): string {
  if (player === humanPlayer) {
    return "Your turn";
  }
  return `${players[player].name}'s turn`;
}

/**
 * GamePhaseIndicator shows the current game phase and active player.
 */
export function GamePhaseIndicator({
  humanPlayer = Player.Forehand,
}: GamePhaseIndicatorProps) {
  const { gameState, currentPlayer, players, declarer } = useGameStore();

  // Don't show during game over (GameResultSummary handles this)
  if (gameState === GameState.GameOver) {
    return null;
  }

  // Determine if it's the human's turn
  const isHumanTurn = currentPlayer === humanPlayer;

  // Show active player info for certain phases
  const showActivePlayer =
    gameState === GameState.Bidding ||
    gameState === GameState.PickingUpSkat ||
    gameState === GameState.Discarding ||
    gameState === GameState.Declaring ||
    gameState === GameState.TrickPlaying;

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.indicator,
          ...(isHumanTurn && showActivePlayer ? styles.yourTurn : {}),
        }}
      >
        {/* Phase icon and name */}
        <div style={styles.phaseRow}>
          <span style={styles.phaseIcon}>{getPhaseIcon(gameState)}</span>
          <span style={styles.phaseName}>{getPhaseDisplayName(gameState)}</span>
        </div>

        {/* Active player indicator */}
        {showActivePlayer && (
          <div
            style={{
              ...styles.turnIndicator,
              color: isHumanTurn ? "#ffd700" : "#aaa",
            }}
          >
            {getPlayerDisplayName(currentPlayer, humanPlayer, players)}
            {declarer !== null && currentPlayer === declarer && (
              <span style={styles.declarerBadge}>Declarer</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Styles for the GamePhaseIndicator component.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 50,
  },
  indicator: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: "20px",
    padding: "8px 16px",
    border: "1px solid #333",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.3s ease",
  },
  yourTurn: {
    borderColor: "#ffd700",
    boxShadow: "0 0 10px rgba(255, 215, 0, 0.3)",
  },
  phaseRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  phaseIcon: {
    fontSize: "16px",
  },
  phaseName: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  turnIndicator: {
    fontSize: "11px",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  declarerBadge: {
    padding: "2px 6px",
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: "3px",
    fontSize: "9px",
    fontWeight: "bold",
  },
};
