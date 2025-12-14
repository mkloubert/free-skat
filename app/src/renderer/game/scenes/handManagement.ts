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
 * Hand management functions for card positioning and highlighting.
 */

import type { KAPLAYCtx } from "kaplay";
import { Player, canPlayCard } from "../../../shared";
import type { GameStoreState } from "../../state/gameStore";
import {
  CARD_WIDTH,
  HAND_SETTINGS,
  ANIMATION,
  LAYERS,
} from "../utils/constants";
import type { CardGameObj, SceneState } from "./types";
import { animateCardMove } from "./cardAnimations";

/**
 * Calculates hand card positions with fan layout.
 */
export function calculateHandPositions(
  cardCount: number,
  centerX: number,
  y: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const totalWidth = (cardCount - 1) * HAND_SETTINGS.cardOverlap + CARD_WIDTH;
  const startX = centerX - totalWidth / 2 + CARD_WIDTH / 2;

  for (let i = 0; i < cardCount; i++) {
    positions.push({
      x: startX + i * HAND_SETTINGS.cardOverlap,
      y,
    });
  }

  return positions;
}

/**
 * Updates card positions for hover/selection effects.
 */
export function updateCardHoverState(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  isHovered: boolean,
  isSelected: boolean
): void {
  if (!cardObj || !cardObj.pos) return;

  let targetY = cardObj.baseY;

  if (isSelected) {
    targetY -= HAND_SETTINGS.selectedPopUp;
  } else if (isHovered) {
    targetY -= HAND_SETTINGS.hoverPopUp;
  }

  const startY = cardObj.pos.y;

  // Animate to target position
  k.tween(
    0,
    1,
    ANIMATION.cardHover,
    (t) => {
      if (cardObj && cardObj.pos) {
        cardObj.pos.y = startY + (targetY - startY) * t;
      }
    },
    k.easings.easeOutQuad
  );
}

/**
 * Updates legal move highlighting for all cards in hand.
 */
export function updateLegalMoveHighlighting(
  _k: KAPLAYCtx,
  sceneState: SceneState,
  gameState: GameStoreState
): void {
  const leadCard = gameState.currentTrick.cards.find((c) => c !== null) ?? null;
  const playerHand = gameState.players[Player.Forehand].hand;

  for (const cardObj of sceneState.playerCardObjects) {
    const isLegal = canPlayCard(
      cardObj.cardData,
      leadCard,
      playerHand,
      gameState.gameType
    );
    cardObj.isLegalMove = isLegal;

    // Visual feedback for legal/illegal moves
    if (isLegal) {
      cardObj.opacity = 1;
    } else {
      cardObj.opacity = 0.5;
    }
  }
}

/**
 * Repositions player hand cards after a card is played.
 */
export function repositionPlayerHand(
  k: KAPLAYCtx,
  sceneState: SceneState,
  centerX: number,
  y: number
): void {
  const cardCount = sceneState.playerCardObjects.length;
  const positions = calculateHandPositions(cardCount, centerX, y);

  for (let i = 0; i < sceneState.playerCardObjects.length; i++) {
    const cardObj = sceneState.playerCardObjects[i];
    const pos = positions[i];

    if (cardObj && pos) {
      cardObj.baseY = pos.y;

      // Update z-index
      cardObj.z = LAYERS.playerCards + i;

      // Animate to new position
      animateCardMove(k, cardObj, pos.x, pos.y, ANIMATION.cardMove);
    }
  }
}

/**
 * Repositions opponent hand cards after a card is played.
 */
export function repositionOpponentHand(
  k: KAPLAYCtx,
  opponentCards: CardGameObj[],
  centerX: number,
  y: number,
  rotation: number
): void {
  const cardCount = opponentCards.length;
  const positions = calculateHandPositions(cardCount, centerX, y);

  for (let i = 0; i < opponentCards.length; i++) {
    const cardObj = opponentCards[i];
    const pos = positions[i];

    if (cardObj && pos) {
      cardObj.baseY = pos.y;
      cardObj.angle = rotation;

      // Animate to new position
      animateCardMove(k, cardObj, pos.x, pos.y, ANIMATION.cardMove);
    }
  }
}
