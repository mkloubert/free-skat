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

import { useState, useCallback, useMemo } from "react";
import {
  Player,
  GameState,
  GameType,
  Contract,
  getGameTypeBaseValue,
} from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * Props for the AnnouncementPanel component.
 */
interface AnnouncementPanelProps {
  /** Human player position */
  humanPlayer?: Player;
}

/**
 * Get display name for game type.
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
 * Get symbol for game type.
 */
function getGameTypeSymbol(gameType: GameType): string {
  switch (gameType) {
    case GameType.Clubs:
      return "\u2663"; // ♣
    case GameType.Spades:
      return "\u2660"; // ♠
    case GameType.Hearts:
      return "\u2665"; // ♥
    case GameType.Diamonds:
      return "\u2666"; // ♦
    case GameType.Grand:
      return "G";
    case GameType.Null:
      return "N";
    default:
      return "?";
  }
}

/**
 * Available game types for selection (excluding Ramsch).
 */
const SELECTABLE_GAME_TYPES: GameType[] = [
  GameType.Clubs,
  GameType.Spades,
  GameType.Hearts,
  GameType.Diamonds,
  GameType.Grand,
  GameType.Null,
];

/**
 * AnnouncementPanel displays the game declaration interface.
 */
export function AnnouncementPanel({
  humanPlayer = Player.Forehand,
}: AnnouncementPanelProps) {
  const { gameState, currentBid, declarer, declareGame, skatPickedUp } =
    useGameStore();

  // Hand game is forced if skat was NOT picked up
  const isHandGameForced = !skatPickedUp;

  const [selectedGameType, setSelectedGameType] = useState<GameType>(
    GameType.Grand
  );
  const [handGame, setHandGame] = useState(isHandGameForced);
  const [schneiderAnnounced, setSchneiderAnnounced] = useState(false);
  const [schwarzAnnounced, setSchwarzAnnounced] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  // Ensure hand game is set correctly when forced
  const effectiveHandGame = isHandGameForced || handGame;

  // Calculate estimated game value - must be before early return
  const estimatedValue = useMemo(() => {
    const baseValue = getGameTypeBaseValue(selectedGameType);
    // Simplified calculation (assumes 1 matador)
    let multiplier = 2; // 1 matador + 1 game
    if (effectiveHandGame) multiplier++;
    if (schneiderAnnounced) multiplier++;
    if (schwarzAnnounced) multiplier++;
    if (ouvert) multiplier++;
    return baseValue * multiplier;
  }, [
    selectedGameType,
    effectiveHandGame,
    schneiderAnnounced,
    schwarzAnnounced,
    ouvert,
  ]);

  // Handle announcement confirmation - must be before early return
  const handleAnnounce = useCallback(() => {
    const contract: Contract = {
      gameType: selectedGameType,
      hand: effectiveHandGame,
      schneider: schneiderAnnounced,
      schwarz: schwarzAnnounced,
      ouvert,
    };
    declareGame(selectedGameType, contract);
  }, [
    selectedGameType,
    effectiveHandGame,
    schneiderAnnounced,
    schwarzAnnounced,
    ouvert,
    declareGame,
  ]);

  // Handle modifier changes with dependencies - must be before early return
  const handleSchneiderChange = useCallback((checked: boolean) => {
    setSchneiderAnnounced(checked);
    if (!checked) {
      setSchwarzAnnounced(false);
      setOuvert(false);
    }
  }, []);

  const handleSchwarzChange = useCallback((checked: boolean) => {
    setSchwarzAnnounced(checked);
    if (checked) {
      setSchneiderAnnounced(true);
    } else {
      setOuvert(false);
    }
  }, []);

  const handleOuvertChange = useCallback((checked: boolean) => {
    setOuvert(checked);
    if (checked) {
      setSchneiderAnnounced(true);
      setSchwarzAnnounced(true);
    }
  }, []);

  // Only show when it's time to declare and human is declarer (AFTER all hooks)
  if (gameState !== GameState.Declaring || declarer !== humanPlayer) {
    return null;
  }

  // Check if announcement meets bid
  const meetsBid = estimatedValue >= currentBid;

  const isNullGame = selectedGameType === GameType.Null;

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Declare Game</h2>

        {/* Bid reminder */}
        <div style={styles.bidReminder}>
          Your bid: <strong>{currentBid}</strong>
        </div>

        {/* Game type selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Game Type</h3>
          <div style={styles.gameTypeGrid}>
            {SELECTABLE_GAME_TYPES.map((gameType) => (
              <button
                key={gameType}
                onClick={() => setSelectedGameType(gameType)}
                style={{
                  ...styles.gameTypeButton,
                  ...(selectedGameType === gameType
                    ? styles.gameTypeSelected
                    : {}),
                  ...(gameType === GameType.Hearts ||
                    gameType === GameType.Diamonds
                    ? styles.redSuit
                    : styles.blackSuit),
                }}
              >
                <span style={styles.gameTypeSymbol}>
                  {getGameTypeSymbol(gameType)}
                </span>
                <span style={styles.gameTypeName}>
                  {getGameTypeName(gameType)}
                </span>
                <span style={styles.baseValue}>
                  Base: {getGameTypeBaseValue(gameType)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Modifiers (not for Null games) */}
        {!isNullGame && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Modifiers</h3>
            <div style={styles.modifiers}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={effectiveHandGame}
                  onChange={(e) => setHandGame(e.target.checked)}
                  disabled={isHandGameForced}
                />
                <span>
                  Hand (no skat pickup)
                  {isHandGameForced && " - required"}
                </span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={schneiderAnnounced}
                  onChange={(e) => handleSchneiderChange(e.target.checked)}
                  disabled={!effectiveHandGame}
                />
                <span>Schneider announced (90+ pts)</span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={schwarzAnnounced}
                  onChange={(e) => handleSchwarzChange(e.target.checked)}
                  disabled={!effectiveHandGame || !schneiderAnnounced}
                />
                <span>Schwarz announced (all tricks)</span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={ouvert}
                  onChange={(e) => handleOuvertChange(e.target.checked)}
                  disabled={!effectiveHandGame || !schwarzAnnounced}
                />
                <span>Ouvert (cards revealed)</span>
              </label>
            </div>
          </div>
        )}

        {/* Null modifiers */}
        {isNullGame && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Null Variant</h3>
            <div style={styles.modifiers}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={effectiveHandGame}
                  onChange={(e) => setHandGame(e.target.checked)}
                  disabled={isHandGameForced}
                />
                <span>
                  Hand (value: 35)
                  {isHandGameForced && " - required"}
                </span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={ouvert && !effectiveHandGame}
                  onChange={(e) => {
                    setOuvert(e.target.checked);
                    if (e.target.checked) setHandGame(false);
                  }}
                  disabled={isHandGameForced || effectiveHandGame}
                />
                <span>Ouvert (value: 46)</span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={ouvert && effectiveHandGame}
                  onChange={(e) => {
                    setOuvert(e.target.checked);
                    if (!isHandGameForced) {
                      setHandGame(e.target.checked);
                    }
                  }}
                />
                <span>Ouvert Hand (value: 59)</span>
              </label>
            </div>
          </div>
        )}

        {/* Estimated value display */}
        <div
          style={{
            ...styles.valueDisplay,
            backgroundColor: meetsBid
              ? "rgba(76, 175, 80, 0.2)"
              : "rgba(244, 67, 54, 0.2)",
          }}
        >
          <span>Estimated Value:</span>
          <strong style={{ color: meetsBid ? "#4caf50" : "#f44336" }}>
            {estimatedValue}
          </strong>
          {!meetsBid && (
            <span style={styles.warning}>Below bid! You may lose.</span>
          )}
        </div>

        {/* Announce button */}
        <button onClick={handleAnnounce} style={styles.announceButton}>
          Announce Game
        </button>
      </div>
    </div>
  );
}

/**
 * Styles for the AnnouncementPanel component.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 100,
    animation: "scaleIn 0.3s ease-out",
  },
  panel: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: "12px",
    padding: "24px",
    minWidth: "400px",
    maxWidth: "500px",
    border: "2px solid #444",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
  },
  title: {
    margin: "0 0 15px 0",
    fontSize: "22px",
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffd700",
  },
  bidReminder: {
    textAlign: "center",
    fontSize: "14px",
    color: "#aaa",
    marginBottom: "20px",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#888",
    marginBottom: "10px",
    textTransform: "uppercase",
  },
  gameTypeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  gameTypeButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px",
    border: "2px solid #444",
    borderRadius: "8px",
    backgroundColor: "#222",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  gameTypeSelected: {
    borderColor: "#ffd700",
    backgroundColor: "#333",
  },
  blackSuit: {
    color: "#fff",
  },
  redSuit: {
    color: "#ff6b6b",
  },
  gameTypeSymbol: {
    fontSize: "28px",
    marginBottom: "4px",
  },
  gameTypeName: {
    fontSize: "12px",
    fontWeight: "bold",
  },
  baseValue: {
    fontSize: "10px",
    color: "#888",
    marginTop: "2px",
  },
  modifiers: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    cursor: "pointer",
  },
  valueDisplay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "16px",
  },
  warning: {
    fontSize: "12px",
    color: "#f44336",
  },
  announceButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#ffd700",
    color: "#000",
    cursor: "pointer",
    transition: "transform 0.1s",
  },
};
