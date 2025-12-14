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
 * Trick management functions for playing and collecting cards.
 */

import type { KAPLAYCtx } from "kaplay";
import { Player, canPlayCard } from "../../../shared";
import { useGameStore } from "../../state/gameStore";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TABLE_POSITIONS,
  TRICK_POSITIONS,
  LAYERS,
  ANIMATION,
  HAND_SETTINGS,
} from "../utils/constants";
import type { CardGameObj, SceneState } from "./types";
import { animateCardMove, flipCard } from "./cardAnimations";
import { calculateHandPositions } from "./handManagement";

/**
 * Plays a card from the player's hand to the trick area.
 */
export function playCardToTrick(
  k: KAPLAYCtx,
  sceneState: SceneState,
  cardObj: CardGameObj,
  player: Player,
  onComplete?: () => void
): void {
  const store = useGameStore.getState();

  // Get target position based on player
  const positions = {
    [Player.Forehand]: TRICK_POSITIONS.forehand,
    [Player.Middlehand]: TRICK_POSITIONS.middlehand,
    [Player.Rearhand]: TRICK_POSITIONS.rearhand,
  };
  const targetPos = positions[player];

  // Update z-index for played card
  cardObj.z = LAYERS.playedCards + player;

  // Animate card to trick position
  animateCardMove(
    k,
    cardObj,
    targetPos.x,
    targetPos.y,
    ANIMATION.cardMove,
    () => {
      // Store the card in trick objects
      sceneState.trickCardObjects[player] = cardObj;

      // Update game store
      store.playCard(player, cardObj.cardData);

      // Remove from player's hand objects if it's the human player
      if (player === Player.Forehand) {
        const index = sceneState.playerCardObjects.indexOf(cardObj);
        if (index !== -1) {
          sceneState.playerCardObjects.splice(index, 1);
        }
        // Reposition remaining cards
        repositionPlayerHand(k, sceneState);
      }

      if (onComplete) {
        onComplete();
      }
    }
  );
}

/**
 * Repositions player's hand cards after a card is played.
 */
export function repositionPlayerHand(
  k: KAPLAYCtx,
  sceneState: SceneState
): void {
  const positions = calculateHandPositions(
    sceneState.playerCardObjects.length,
    TABLE_POSITIONS.players.forehand.x,
    HAND_SETTINGS.playerHandY
  );

  for (let i = 0; i < sceneState.playerCardObjects.length; i++) {
    const cardObj = sceneState.playerCardObjects[i];
    const pos = positions[i];
    cardObj.baseY = pos.y;
    cardObj.z = LAYERS.playerCards + i;

    animateCardMove(k, cardObj, pos.x, pos.y, ANIMATION.cardMove);
  }
}

/**
 * Simulates opponent playing a card.
 */
export function simulateOpponentPlay(
  k: KAPLAYCtx,
  sceneState: SceneState,
  player: Player,
  onComplete?: () => void
): void {
  const store = useGameStore.getState();
  const opponentIndex = player === Player.Middlehand ? 0 : 1;
  const opponentCards = sceneState.opponentCardObjects[opponentIndex];

  if (opponentCards.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  // Get lead card for legal move check
  const leadCard = store.currentTrick.cards.find((c) => c !== null) ?? null;
  const playerHand = store.players[player].hand;

  // Find a legal card to play (simple AI: first legal card)
  let cardToPlay: CardGameObj | null = null;
  for (const cardObj of opponentCards) {
    if (canPlayCard(cardObj.cardData, leadCard, playerHand, store.gameType)) {
      cardToPlay = cardObj;
      break;
    }
  }

  if (!cardToPlay) {
    cardToPlay = opponentCards[0]; // Fallback
  }

  const selectedCard = cardToPlay;

  // Flip card face up first
  flipCard(k, selectedCard, () => {
    // Then animate to trick position
    playCardToTrick(k, sceneState, selectedCard, player, () => {
      // Remove from opponent's cards
      const index = opponentCards.indexOf(selectedCard);
      if (index !== -1) {
        opponentCards.splice(index, 1);
      }

      if (onComplete) {
        onComplete();
      }
    });
  });
}

/**
 * Collects the trick cards and moves them to the winner.
 */
export function collectTrick(
  k: KAPLAYCtx,
  sceneState: SceneState,
  winner: Player,
  onComplete?: () => void
): void {
  const store = useGameStore.getState();

  // Determine collection position based on winner (matches TABLE_POSITIONS layout)
  const collectPositions = {
    [Player.Forehand]: { x: CANVAS_WIDTH - 80, y: CANVAS_HEIGHT - 40 },
    [Player.Middlehand]: { x: 40, y: CANVAS_HEIGHT / 2 + 80 }, // Left side
    [Player.Rearhand]: { x: CANVAS_WIDTH - 40, y: CANVAS_HEIGHT / 2 + 80 }, // Right side
  };
  const collectPos = collectPositions[winner];

  let completed = 0;
  const trickCards = sceneState.trickCardObjects.filter(
    (c): c is CardGameObj => c !== null
  );

  if (trickCards.length === 0) {
    store.completeTrick(winner);
    store.startNewTrick(winner);
    if (onComplete) onComplete();
    return;
  }

  for (const cardObj of trickCards) {
    animateCardMove(
      k,
      cardObj,
      collectPos.x,
      collectPos.y,
      ANIMATION.trickCollect,
      () => {
        // Fade out and destroy
        k.tween(1, 0, 0.2, (val) => (cardObj.opacity = val)).onEnd(() => {
          cardObj.destroy();
        });

        completed++;
        if (completed === trickCards.length) {
          // Clear trick objects
          sceneState.trickCardObjects = [null, null, null];

          // Update store
          store.completeTrick(winner);
          store.startNewTrick(winner);

          if (onComplete) {
            onComplete();
          }
        }
      }
    );
  }
}
