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
import { Player, GameState, BID_ORDER, BiddingResult } from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * Props for the BiddingPanel component.
 */
interface BiddingPanelProps {
  /** Human player position */
  humanPlayer?: Player;
}

/**
 * Get player display name based on position.
 */
function getPlayerName(player: Player, humanPlayer: Player): string {
  if (player === humanPlayer) return "You";
  switch (player) {
    case Player.Forehand:
      return "Forehand";
    case Player.Middlehand:
      return "Middlehand";
    case Player.Rearhand:
      return "Rearhand";
    default:
      return "Unknown";
  }
}

/**
 * BiddingPanel displays the bidding interface during the bidding phase.
 */
export function BiddingPanel({ humanPlayer = Player.Forehand }: BiddingPanelProps) {
  const {
    gameState,
    currentBid,
    currentPlayer,
    highestBidder,
    passedPlayers,
    bidding,
    placeBid,
    holdBid,
    passBid,
  } = useGameStore();

  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  // Get available bids (must be higher than current)
  // Note: All hooks must be called before any early returns
  const availableBids = useMemo(() => {
    return BID_ORDER.filter((bid) => bid > currentBid);
  }, [currentBid]);

  // Handle bid action
  const handleBid = useCallback(() => {
    if (selectedBid !== null && selectedBid > currentBid) {
      placeBid(humanPlayer, selectedBid);
      setSelectedBid(null);
    }
  }, [selectedBid, currentBid, humanPlayer, placeBid]);

  // Handle hold action (accept current bid)
  const handleHold = useCallback(() => {
    if (currentBid > 0) {
      holdBid(humanPlayer);
    }
  }, [currentBid, humanPlayer, holdBid]);

  // Handle pass action
  const handlePass = useCallback(() => {
    passBid(humanPlayer);
  }, [humanPlayer, passBid]);

  // Select next available bid
  const handleQuickBid = useCallback(() => {
    const nextBid = availableBids[0];
    if (nextBid) {
      placeBid(humanPlayer, nextBid);
    }
  }, [availableBids, humanPlayer, placeBid]);

  // Only show during bidding phase (after all hooks)
  if (gameState !== GameState.Bidding) {
    return null;
  }

  // Check if it's the human player's turn
  const isMyTurn = currentPlayer === humanPlayer;

  // Check if human player has passed
  const hasPassed = passedPlayers.includes(humanPlayer);

  // Check if bidding is complete
  const biddingComplete = bidding.result !== BiddingResult.InProgress;

  // Check if we should bid or respond (hold/pass)
  const shouldBid = bidding.isActiveBidding;
  const shouldRespond = !bidding.isActiveBidding && currentBid > 0;

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Bidding</h2>

        {/* Current bid display */}
        <div style={styles.bidDisplay}>
          <span style={styles.bidLabel}>Current Bid:</span>
          <span style={styles.bidValue}>
            {currentBid > 0 ? currentBid : "None"}
          </span>
          {highestBidder !== null && (
            <span style={styles.bidder}>
              by {getPlayerName(highestBidder, humanPlayer)}
            </span>
          )}
        </div>

        {/* Active player indicator */}
        <div style={styles.turnIndicator}>
          {isMyTurn ? (
            <span style={styles.yourTurn}>Your Turn</span>
          ) : (
            <span style={styles.waiting}>
              Waiting for {getPlayerName(currentPlayer, humanPlayer)}...
            </span>
          )}
        </div>

        {/* Passed players */}
        {passedPlayers.length > 0 && (
          <div style={styles.passedList}>
            Passed:{" "}
            {passedPlayers
              .map((p) => getPlayerName(p, humanPlayer))
              .join(", ")}
          </div>
        )}

        {/* Action buttons (only if it's human's turn and hasn't passed) */}
        {isMyTurn && !hasPassed && !biddingComplete && (
          <div style={styles.actions}>
            {/* Bidding mode: Quick bid button */}
            {shouldBid && availableBids.length > 0 && (
              <button
                onClick={handleQuickBid}
                style={{ ...styles.button, ...styles.bidButton }}
              >
                Bid {availableBids[0]}
              </button>
            )}

            {/* Response mode: Hold button */}
            {shouldRespond && (
              <button
                onClick={handleHold}
                style={{ ...styles.button, ...styles.holdButton }}
              >
                Hold ({currentBid})
              </button>
            )}

            {/* Pass button (always available) */}
            <button
              onClick={handlePass}
              style={{ ...styles.button, ...styles.passButton }}
            >
              Pass
            </button>
          </div>
        )}

        {/* Bid selector for advanced bidding (only in bidding mode) */}
        {isMyTurn && !hasPassed && !biddingComplete && shouldBid && availableBids.length > 0 && (
          <div style={styles.bidSelector}>
            <select
              value={selectedBid ?? ""}
              onChange={(e) =>
                setSelectedBid(e.target.value ? parseInt(e.target.value) : null)
              }
              style={styles.select}
            >
              <option value="">Select bid...</option>
              {availableBids.slice(0, 10).map((bid) => (
                <option key={bid} value={bid}>
                  {bid}
                </option>
              ))}
            </select>
            <button
              onClick={handleBid}
              disabled={selectedBid === null}
              style={{
                ...styles.button,
                ...styles.bidButton,
                opacity: selectedBid === null ? 0.5 : 1,
              }}
            >
              Bid
            </button>
          </div>
        )}

        {/* If human has passed */}
        {hasPassed && (
          <div style={styles.passedMessage}>
            You have passed. Waiting for others...
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Styles for the BiddingPanel component.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 100,
    animation: "fadeSlideIn 0.3s ease-out",
  },
  panel: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: "12px",
    padding: "20px",
    minWidth: "300px",
    border: "2px solid #444",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
  },
  title: {
    margin: "0 0 15px 0",
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffd700",
  },
  bidDisplay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "15px",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
  },
  bidLabel: {
    fontSize: "14px",
    color: "#aaa",
  },
  bidValue: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#4caf50",
  },
  bidder: {
    fontSize: "12px",
    color: "#888",
  },
  turnIndicator: {
    textAlign: "center",
    marginBottom: "15px",
  },
  yourTurn: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#4caf50",
    animation: "pulse 1s infinite",
  },
  waiting: {
    fontSize: "14px",
    color: "#888",
  },
  passedList: {
    fontSize: "12px",
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: "15px",
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "15px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "transform 0.1s, opacity 0.1s",
  },
  bidButton: {
    backgroundColor: "#4caf50",
    color: "#fff",
  },
  holdButton: {
    backgroundColor: "#ff9800",
    color: "#fff",
  },
  passButton: {
    backgroundColor: "#f44336",
    color: "#fff",
  },
  bidSelector: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginTop: "10px",
    paddingTop: "10px",
    borderTop: "1px solid #444",
  },
  select: {
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#333",
    color: "#fff",
    cursor: "pointer",
  },
  passedMessage: {
    textAlign: "center",
    fontSize: "14px",
    color: "#888",
    fontStyle: "italic",
  },
};
