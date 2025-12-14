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

import { useState, useEffect } from "react";
import { GameState, GameType } from "../../shared";
import { useGameStore } from "../state/gameStore";

/**
 * RamschNotification displays a notification when Ramsch starts.
 */
export function RamschNotification() {
  const { gameState, gameType, declarer } = useGameStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show notification when Ramsch starts
  useEffect(() => {
    if (
      gameState === GameState.TrickPlaying &&
      gameType === GameType.Ramsch &&
      declarer === null &&
      !dismissed
    ) {
      setVisible(true);
    }
  }, [gameState, gameType, declarer, dismissed]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        setDismissed(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Reset dismissed state when game restarts
  useEffect(() => {
    if (gameState === GameState.GameStart || gameState === GameState.Dealing) {
      setDismissed(false);
    }
  }, [gameState]);

  if (!visible) {
    return null;
  }

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.notification}>
        <div style={styles.icon}>R</div>
        <h2 style={styles.title}>Ramsch!</h2>
        <p style={styles.description}>
          All players passed. This round is a Ramsch game.
        </p>
        <div style={styles.rules}>
          <div style={styles.ruleItem}>
            <span style={styles.bullet}>•</span>
            <span>No declarer - everyone plays for themselves</span>
          </div>
          <div style={styles.ruleItem}>
            <span style={styles.bullet}>•</span>
            <span>Jacks are trumps (like Grand)</span>
          </div>
          <div style={styles.ruleItem}>
            <span style={styles.bullet}>•</span>
            <span>Avoid taking points - lowest score wins!</span>
          </div>
        </div>
        <button onClick={handleDismiss} style={styles.button}>
          Start Game
        </button>
      </div>
    </div>
  );
}

/**
 * Styles for the RamschNotification component.
 */
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 100,
    animation: "fadeIn 0.3s ease-out",
  },
  notification: {
    backgroundColor: "rgba(20, 20, 40, 0.95)",
    borderRadius: "16px",
    padding: "30px",
    maxWidth: "400px",
    textAlign: "center",
    border: "3px solid #9c27b0",
    boxShadow: "0 8px 32px rgba(156, 39, 176, 0.3)",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    animation: "popIn 0.4s ease-out",
  },
  icon: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#9c27b0",
    color: "#fff",
    fontSize: "32px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px auto",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "28px",
    fontWeight: "bold",
    color: "#e1bee7",
  },
  description: {
    fontSize: "14px",
    color: "#aaa",
    marginBottom: "20px",
  },
  rules: {
    textAlign: "left",
    marginBottom: "25px",
  },
  ruleItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "10px",
    fontSize: "14px",
    color: "#ddd",
  },
  bullet: {
    color: "#9c27b0",
    fontWeight: "bold",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#9c27b0",
    color: "#fff",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
