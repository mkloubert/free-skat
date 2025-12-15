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

/**
 * Game flow functions for processing turns and game over.
 */

import type { KAPLAYCtx } from "kaplay";
import {
  Player,
  GameState,
  getLeftNeighbor,
  createTrick,
  addCardToTrick,
  determineTrickWinner,
} from "../../../shared";
import { useGameStore } from "../../state/gameStore";
import type { SceneState } from "./types";
import { updateLegalMoveHighlighting } from "./handManagement";
import { collectTrick, simulateOpponentPlay } from "./trickManagement";

/**
 * Processes the game flow after a card is played.
 */
export function processGameFlow(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // Check if trick is complete (all 3 cards played)
  const trickCards = store.currentTrick.cards;
  const playedCount = trickCards.filter((c) => c !== null).length;

  if (playedCount === 3) {
    // Determine winner using actual game rules
    const trick = createTrick(store.currentTrick.forehand);
    const playerOrder = [Player.Forehand, Player.Middlehand, Player.Rearhand];
    for (const player of playerOrder) {
      const card = trickCards[player];
      if (card) {
        addCardToTrick(trick, card, player);
      }
    }
    const winner = determineTrickWinner(trick, store.gameType);

    k.wait(0.5, () => {
      collectTrick(k, sceneState, winner, () => {
        // Get fresh state after trick is collected
        const currentState = useGameStore.getState();
        updateUI();

        // Check if game is over
        if (currentState.trickNumber >= 10) {
          showGameOver(k);
        } else {
          // The winner leads the next trick
          // Check if winner is an opponent (AI) - they need to play
          if (winner !== Player.Forehand) {
            // AI leads the next trick
            k.wait(0.5, () => {
              simulateOpponentPlay(k, sceneState, winner, () => {
                processGameFlow(k, sceneState, updateUI);
              });
            });
          } else {
            // Player's turn to lead - update legal moves
            updateLegalMoveHighlighting(k, sceneState, currentState);
          }
        }
      });
    });
  } else {
    // Next player's turn
    const nextPlayer = getLeftNeighbor(store.currentPlayer);
    store.setCurrentPlayer(nextPlayer);

    // Always update legal move highlighting (clears highlighting when not player's turn)
    const currentState = useGameStore.getState();
    updateLegalMoveHighlighting(k, sceneState, currentState);
    updateUI();

    if (nextPlayer !== Player.Forehand) {
      // AI plays
      k.wait(0.5, () => {
        simulateOpponentPlay(k, sceneState, nextPlayer, () => {
          processGameFlow(k, sceneState, updateUI);
        });
      });
    }
  }
}

/**
 * Triggers game over state transition.
 * The React GameResultSummary component handles the display.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function showGameOver(_k: KAPLAYCtx): void {
  const store = useGameStore.getState();

  console.log("[Game] All tricks played - transitioning to GameOver");
  console.log(
    `[Game] Final scores - Forehand: ${store.players[Player.Forehand].tricksPoints}, ` +
      `Middlehand: ${store.players[Player.Middlehand].tricksPoints}, ` +
      `Rearhand: ${store.players[Player.Rearhand].tricksPoints}`
  );

  // Transition to game over state - React GameResultSummary will display
  store.setGameState(GameState.GameOver);
}
