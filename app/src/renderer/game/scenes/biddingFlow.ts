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
 * Bidding flow functions for AI bidding and phase transitions.
 */

import type { KAPLAYCtx } from "kaplay";
import {
  Player,
  GameState,
  BiddingResult,
  BiddingAction,
  createHandFromCards,
  AI,
} from "../../../shared";
import { useGameStore } from "../../state/gameStore";
import type { SceneState } from "./types";
import { updateLegalMoveHighlighting } from "./handManagement";
import { processAISkatDecision } from "./skatFlow";

/** AI delay between bidding actions in milliseconds */
export const AI_BIDDING_DELAY = 800;

/**
 * Processes AI bidding actions until it's the human player's turn or bidding is complete.
 */
export function processAIBidding(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();
  const humanPlayer = Player.Forehand;

  // Check if bidding is still in progress
  if (store.gameState !== GameState.Bidding) {
    return;
  }

  // Check if bidding is complete
  if (store.bidding.result !== BiddingResult.InProgress) {
    handleBiddingComplete(k, sceneState, updateUI);
    return;
  }

  // Check if it's the human player's turn
  if (store.currentPlayer === humanPlayer) {
    updateUI();
    return;
  }

  // AI's turn - process after delay
  k.wait(AI_BIDDING_DELAY / 1000, () => {
    performAIBiddingAction(k, sceneState, updateUI);
  });
}

/**
 * Performs a single AI bidding action.
 */
export function performAIBiddingAction(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // Check if bidding is still in progress before acting
  if (store.gameState !== GameState.Bidding) {
    console.log("[AI Bidding] Game state is not Bidding, skipping AI action");
    return;
  }

  if (store.bidding.result !== BiddingResult.InProgress) {
    console.log("[AI Bidding] Bidding already complete, skipping AI action");
    handleBiddingComplete(k, sceneState, updateUI);
    return;
  }

  // Check if it's actually an AI's turn (not human)
  if (store.currentPlayer === Player.Forehand) {
    console.log("[AI Bidding] It's human's turn, skipping AI action");
    return;
  }

  const aiPlayer = store.currentPlayer;

  // Get AI's hand
  const hand = createHandFromCards(store.players[aiPlayer].hand.cards);

  // Get AI decision
  const decision = AI.basic.decideBid(hand, store.bidding, aiPlayer);

  console.log(
    `[AI Bidding] ${Player[aiPlayer]} decides: ${BiddingAction[decision.action]}${decision.bidValue ? ` (${decision.bidValue})` : ""}`
  );

  // Execute the decision
  if (decision.action === BiddingAction.Bid && decision.bidValue) {
    store.placeBid(aiPlayer, decision.bidValue);
  } else if (decision.action === BiddingAction.Hold) {
    store.holdBid(aiPlayer);
  } else {
    store.passBid(aiPlayer);
  }

  updateUI();

  // Continue processing
  processAIBidding(k, sceneState, updateUI);
}

/**
 * Handles bidding completion and transitions to the next phase.
 */
export function handleBiddingComplete(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  console.log(
    `[Bidding Complete] Result: ${BiddingResult[store.bidding.result]}, Declarer: ${store.declarer !== null ? Player[store.declarer] : "None"}, Final Bid: ${store.bidding.finalBid}`
  );

  if (store.bidding.result === BiddingResult.AllPassed) {
    // Ramsch - proceed to trick playing
    console.log("[Bidding] All passed - starting Ramsch");
    store.setGameState(GameState.TrickPlaying);
    updateUI();
    updateLegalMoveHighlighting(k, sceneState, store);
  } else if (store.bidding.result === BiddingResult.HasDeclarer) {
    // A declarer was found - proceed to skat picking
    console.log(
      `[Bidding] Declarer is ${Player[store.declarer!]} at ${store.bidding.finalBid}`
    );
    // The store should already be in PickingUpSkat state
    updateUI();

    // Trigger AI skat decision if AI is declarer
    processAISkatDecision(k, sceneState, updateUI);
  }
}
