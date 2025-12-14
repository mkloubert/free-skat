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
  Card,
  Suit,
  Rank,
  getCardPoints,
  cardsEqual,
} from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * Props for the SkatSelectionUI component.
 */
interface SkatSelectionUIProps {
  /** Human player position */
  humanPlayer?: Player;
}

/**
 * Get suit symbol for display.
 */
function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case Suit.Clubs:
      return "\u2663"; // ♣
    case Suit.Spades:
      return "\u2660"; // ♠
    case Suit.Hearts:
      return "\u2665"; // ♥
    case Suit.Diamonds:
      return "\u2666"; // ♦
    default:
      return "?";
  }
}

/**
 * Get short rank name for display.
 */
function getShortRankName(rank: Rank): string {
  switch (rank) {
    case Rank.Seven:
      return "7";
    case Rank.Eight:
      return "8";
    case Rank.Nine:
      return "9";
    case Rank.Ten:
      return "T";
    case Rank.Jack:
      return "J";
    case Rank.Queen:
      return "Q";
    case Rank.King:
      return "K";
    case Rank.Ace:
      return "A";
    default:
      return "?";
  }
}

/**
 * Card display component.
 */
function CardDisplay({
  card,
  selected,
  onClick,
  disabled,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  const points = getCardPoints(card);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        ...cardStyles.card,
        ...(selected ? cardStyles.selected : {}),
        ...(disabled ? cardStyles.disabled : {}),
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <span
        style={{
          ...cardStyles.rank,
          color: isRed ? "#ff4444" : "#fff",
        }}
      >
        {getShortRankName(card.rank)}
      </span>
      <span
        style={{
          ...cardStyles.suit,
          color: isRed ? "#ff4444" : "#fff",
        }}
      >
        {getSuitSymbol(card.suit)}
      </span>
      {points > 0 && <span style={cardStyles.points}>{points}</span>}
    </div>
  );
}

/**
 * Card styles.
 */
const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "50px",
    height: "70px",
    backgroundColor: "#f0f0f0",
    border: "2px solid #888",
    borderRadius: "6px",
    transition: "transform 0.1s, border-color 0.1s",
  },
  selected: {
    borderColor: "#ffd700",
    transform: "translateY(-8px)",
    boxShadow: "0 4px 12px rgba(255, 215, 0, 0.4)",
  },
  disabled: {
    opacity: 0.5,
  },
  rank: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  suit: {
    fontSize: "24px",
  },
  points: {
    fontSize: "10px",
    color: "#666",
    marginTop: "2px",
  },
};

/**
 * SkatSelectionUI displays the skat pickup and discard interface.
 */
export function SkatSelectionUI({
  humanPlayer = Player.Forehand,
}: SkatSelectionUIProps) {
  const {
    gameState,
    skat,
    declarer,
    players,
    pickUpSkat,
    discardToSkat,
    setGameState,
  } = useGameStore();

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  // Toggle card selection for discarding
  // Note: All hooks must be called before any early returns
  const toggleCardSelection = useCallback((card: Card) => {
    setSelectedCards((prev) => {
      const isSelected = prev.some((c) => cardsEqual(c, card));
      if (isSelected) {
        return prev.filter((c) => !cardsEqual(c, card));
      } else if (prev.length < 2) {
        return [...prev, card];
      }
      return prev;
    });
  }, []);

  // Handle skat pickup
  const handlePickup = useCallback(() => {
    console.log("[SkatSelectionUI] handlePickup called, declarer:", declarer);
    pickUpSkat();
    console.log("[SkatSelectionUI] pickUpSkat() completed");
  }, [pickUpSkat, declarer]);

  // Handle play hand (no pickup)
  const handlePlayHand = useCallback(() => {
    setGameState(GameState.Declaring);
  }, [setGameState]);

  // Handle discard confirmation
  const handleDiscard = useCallback(() => {
    if (selectedCards.length === 2) {
      discardToSkat(selectedCards);
      setSelectedCards([]);
    }
  }, [selectedCards, discardToSkat]);

  // Calculate total points in selected cards
  const selectedPoints = useMemo(() => {
    return selectedCards.reduce((sum, card) => sum + getCardPoints(card), 0);
  }, [selectedCards]);

  // Calculate total skat points
  const skatPoints = useMemo(() => {
    return skat.reduce((sum, card) => sum + getCardPoints(card), 0);
  }, [skat]);

  // Get human player's hand
  const hand = players[humanPlayer]?.hand;

  // Only show when human is declarer and in skat-related states (after all hooks)
  const showPickup =
    gameState === GameState.PickingUpSkat && declarer === humanPlayer;
  const showDiscard =
    gameState === GameState.Discarding && declarer === humanPlayer;

  if (!showPickup && !showDiscard) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {/* Skat Pickup Phase */}
        {showPickup && (
          <>
            <h2 style={styles.title}>Skat</h2>
            <p style={styles.description}>
              You won the bidding! Do you want to pick up the skat?
            </p>

            {/* Show skat cards face down */}
            <div style={styles.skatCards}>
              <div style={styles.faceDownCard}>?</div>
              <div style={styles.faceDownCard}>?</div>
            </div>

            <div style={styles.actions}>
              <button
                onClick={handlePickup}
                style={{ ...styles.button, ...styles.pickupButton }}
              >
                Pick Up Skat
              </button>
              <button
                onClick={handlePlayHand}
                style={{ ...styles.button, ...styles.handButton }}
              >
                Play Hand
              </button>
            </div>

            <p style={styles.hint}>
              Playing Hand gives +1 multiplier but you cannot see the skat.
            </p>
          </>
        )}

        {/* Skat Discard Phase */}
        {showDiscard && (
          <>
            <h2 style={styles.title}>Discard to Skat</h2>
            <p style={styles.description}>
              Select 2 cards to discard to the skat.
            </p>

            {/* Show the skat cards picked up */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Skat Cards (Points: {skatPoints})
              </h3>
              <div style={styles.cardRow}>
                {skat.map((card, idx) => (
                  <CardDisplay key={idx} card={card} disabled />
                ))}
              </div>
            </div>

            {/* Show player's hand for selection */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Your Hand ({hand?.cards.length ?? 0} cards)
              </h3>
              <div style={styles.cardGrid}>
                {hand?.cards.map((card, idx) => (
                  <CardDisplay
                    key={idx}
                    card={card}
                    selected={selectedCards.some((c) => cardsEqual(c, card))}
                    onClick={() => toggleCardSelection(card)}
                  />
                ))}
              </div>
            </div>

            {/* Selection summary */}
            <div style={styles.selectionSummary}>
              <span>
                Selected: {selectedCards.length}/2 (Points: {selectedPoints})
              </span>
              {selectedCards.length === 2 && (
                <span style={styles.readyText}>Ready to discard!</span>
              )}
            </div>

            {/* Discard button */}
            <button
              onClick={handleDiscard}
              disabled={selectedCards.length !== 2}
              style={{
                ...styles.button,
                ...styles.discardButton,
                opacity: selectedCards.length !== 2 ? 0.5 : 1,
              }}
            >
              Discard Selected Cards
            </button>

            <p style={styles.hint}>
              Tip: Discard high-point cards you cannot protect or use.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Styles for the SkatSelectionUI component.
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
    maxWidth: "600px",
    border: "2px solid #444",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "22px",
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffd700",
  },
  description: {
    textAlign: "center",
    fontSize: "14px",
    color: "#aaa",
    marginBottom: "20px",
  },
  skatCards: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginBottom: "20px",
  },
  faceDownCard: {
    width: "60px",
    height: "85px",
    backgroundColor: "#2a4d2a",
    border: "2px solid #3a6d3a",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    color: "#5a8d5a",
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginBottom: "15px",
  },
  button: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "transform 0.1s",
  },
  pickupButton: {
    backgroundColor: "#4caf50",
    color: "#fff",
  },
  handButton: {
    backgroundColor: "#ff9800",
    color: "#fff",
  },
  discardButton: {
    width: "100%",
    backgroundColor: "#ffd700",
    color: "#000",
    padding: "14px",
    fontSize: "16px",
  },
  hint: {
    textAlign: "center",
    fontSize: "12px",
    color: "#666",
    fontStyle: "italic",
    marginTop: "10px",
  },
  section: {
    marginBottom: "15px",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#888",
    marginBottom: "10px",
    textTransform: "uppercase",
  },
  cardRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },
  cardGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "8px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  selectionSummary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "6px",
    marginBottom: "15px",
    fontSize: "14px",
  },
  readyText: {
    color: "#4caf50",
    fontWeight: "bold",
  },
};
