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
 * Skat flow functions for AI skat decisions and phase transitions.
 */

import type { KAPLAYCtx } from "kaplay";
import {
  Player,
  GameState,
  GameType,
  createHandFromCards,
  AI,
  sortForGame,
} from "../../../shared";
import { useGameStore } from "../../state/gameStore";
import type { SceneState } from "./types";
import { HAND_SETTINGS, TABLE_POSITIONS, LAYERS } from "../utils/constants";
import { createCardObject } from "./cardObjects";
import { flipCardTo } from "./cardAnimations";
import {
  calculateHandPositions,
  updateLegalMoveHighlighting,
} from "./handManagement";

/** AI delay for skat decisions in milliseconds */
export const AI_SKAT_DELAY = 1000;

/**
 * Processes AI skat decision when AI is declarer.
 */
export function processAISkatDecision(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();
  const humanPlayer = Player.Forehand;

  // Only process if we're in skat pickup phase and AI is declarer
  if (store.gameState !== GameState.PickingUpSkat) {
    return;
  }

  // If human is declarer, let the UI handle it
  if (store.declarer === humanPlayer) {
    updateUI();
    return;
  }

  // AI declarer - make decision after delay
  k.wait(AI_SKAT_DELAY / 1000, () => {
    performAISkatPickup(k, sceneState, updateUI);
  });
}

/**
 * Performs AI skat pickup decision.
 */
function performAISkatPickup(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // This function is only called for AI declarers (not Forehand/human)
  if (store.declarer === null) {
    return;
  }

  const aiPlayer = store.declarer;
  const hand = createHandFromCards(store.players[aiPlayer].hand.cards);

  // AI decides whether to pick up skat
  const shouldPickup = AI.basic.decidePickupSkat(hand);

  console.log(
    `[AI Skat] ${Player[aiPlayer]} decides: ${shouldPickup ? "Pick up Skat" : "Play Hand"}`
  );

  if (shouldPickup) {
    // Pick up skat
    store.pickUpSkat();
    updateUI();

    // Now AI needs to discard 2 cards
    k.wait(AI_SKAT_DELAY / 1000, () => {
      performAISkatDiscard(k, sceneState, updateUI);
    });
  } else {
    // Play hand - go directly to declaring
    store.setGameState(GameState.Declaring);
    updateUI();

    // AI announces game
    k.wait(AI_SKAT_DELAY / 1000, () => {
      performAIGameAnnouncement(k, sceneState, updateUI);
    });
  }
}

/**
 * Performs AI skat discard selection.
 */
function performAISkatDiscard(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // This function is only called for AI declarers (not Forehand/human)
  if (store.declarer === null) {
    return;
  }

  const aiPlayer = store.declarer;
  const hand = createHandFromCards(store.players[aiPlayer].hand.cards);

  // AI selects cards to discard (uses Grand as default for now)
  const discards = AI.basic.selectDiscards(hand, GameType.Grand);

  console.log(
    `[AI Skat] ${Player[aiPlayer]} discards: ${discards.map((c) => `${c.suit}${c.rank}`).join(", ")}`
  );

  // Discard the cards
  store.discardToSkat(discards);
  updateUI();

  // Now AI announces game
  k.wait(AI_SKAT_DELAY / 1000, () => {
    performAIGameAnnouncement(k, sceneState, updateUI);
  });
}

/**
 * Performs AI game announcement.
 */
function performAIGameAnnouncement(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // This function is only called for AI declarers (not Forehand/human)
  if (store.declarer === null) {
    return;
  }

  const aiPlayer = store.declarer;
  const hand = createHandFromCards(store.players[aiPlayer].hand.cards);
  const isHandGame = store.contract?.hand ?? false;
  const bidValue = store.currentBid;

  // AI decides announcement - returns GameAnnouncement with contract property
  const announcement = AI.basic.decideAnnouncement(hand, bidValue, isHandGame);
  const contract = announcement.contract;

  console.log(
    `[AI Skat] ${Player[aiPlayer]} announces: ${GameType[contract.gameType]}`
  );

  // Declare the game
  store.declareGame(contract.gameType, contract);

  updateUI();

  // Start trick playing
  k.wait(500 / 1000, () => {
    startTrickPlaying(k, sceneState, updateUI);
  });
}

/**
 * Starts the trick playing phase.
 */
export function startTrickPlaying(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  console.log(
    `[Game] Starting trick playing - Game Type: ${GameType[store.gameType]}`
  );

  // Re-sort and recreate player cards based on game type
  resortPlayerCards(k, sceneState, store.gameType);

  updateUI();

  // Update legal move highlighting
  updateLegalMoveHighlighting(k, sceneState, store);
}

/**
 * Re-sorts and recreates player cards based on the declared game type.
 */
function resortPlayerCards(
  k: KAPLAYCtx,
  sceneState: SceneState,
  gameType: GameType
): void {
  const store = useGameStore.getState();

  // Clear old player card objects
  for (const card of sceneState.playerCardObjects) {
    if (card && card.destroy) {
      card.destroy();
    }
  }
  sceneState.playerCardObjects = [];

  // Get and sort player cards
  const sortedCards = sortForGame(
    store.players[Player.Forehand].hand.cards,
    gameType
  );

  // Create new card objects
  const positions = calculateHandPositions(
    sortedCards.length,
    TABLE_POSITIONS.players.forehand.x,
    HAND_SETTINGS.playerHandY
  );

  for (let i = 0; i < sortedCards.length; i++) {
    const card = sortedCards[i];
    const pos = positions[i];
    const cardObj = createCardObject(
      k,
      card,
      pos.x,
      pos.y,
      true,
      LAYERS.playerCards + i,
      Player.Forehand
    );
    cardObj.baseY = pos.y;
    sceneState.playerCardObjects.push(cardObj);
  }

  // Card interactions will be re-setup by the gameScene store subscription
  // when the game state changes to TrickPlaying
}

/**
 * Handles human player picking up skat - updates visual cards.
 */
export function handleHumanSkatPickup(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  // Flip skat cards face up
  for (const skatCard of sceneState.skatCardObjects) {
    if (skatCard && !skatCard.faceUp) {
      flipCardTo(k, skatCard, true);
    }
  }

  // Add skat cards to player's visual hand
  // This will be handled by the UI component showing the cards
  updateUI();
}

/**
 * Handles human player discarding cards - updates visual cards.
 */
export function handleHumanSkatDiscard(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // Remove skat card objects from display
  for (const skatCard of sceneState.skatCardObjects) {
    if (skatCard && skatCard.destroy) {
      skatCard.destroy();
    }
  }
  sceneState.skatCardObjects = [];

  // Re-create player hand with remaining cards
  resortPlayerCards(k, sceneState, store.gameType);

  updateUI();
}
