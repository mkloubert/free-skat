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
 * Card animation functions.
 */

import type { KAPLAYCtx } from "kaplay";
import { ANIMATION } from "../utils/constants";
import type { CardGameObj } from "./types";

/**
 * Flips a card with animation.
 */
export function flipCard(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  onComplete?: () => void
): void {
  if (!cardObj || !cardObj.cardData) {
    if (onComplete) onComplete();
    return;
  }

  const duration = ANIMATION.cardFlip;
  const cardData = cardObj.cardData;

  // First half: scale down horizontally
  k.tween(
    1,
    0,
    duration / 2,
    (val) => {
      if (cardObj) {
        cardObj.scaleTo(val, 1);
      }
    },
    k.easings.easeInQuad
  ).onEnd(() => {
    if (!cardObj || !cardObj.cardData) {
      if (onComplete) onComplete();
      return;
    }

    // Change the sprite by setting sprite property directly (KAPlay way)
    cardObj.faceUp = !cardObj.faceUp;
    const newSpriteName = cardObj.faceUp
      ? `card_${cardData.suit}_${cardData.rank}`
      : "card_back";
    (cardObj as unknown as { sprite: string }).sprite = newSpriteName;

    // Second half: scale back up
    k.tween(
      0,
      1,
      duration / 2,
      (val) => {
        if (cardObj) {
          cardObj.scaleTo(val, 1);
        }
      },
      k.easings.easeOutQuad
    ).onEnd(() => {
      if (onComplete) {
        onComplete();
      }
    });
  });
}

/**
 * Flips a card to a specific state (face-up or face-down).
 */
export function flipCardTo(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  faceUp: boolean,
  onComplete?: () => void
): void {
  if (!cardObj) {
    if (onComplete) onComplete();
    return;
  }
  if (cardObj.faceUp === faceUp) {
    if (onComplete) {
      onComplete();
    }
    return;
  }
  flipCard(k, cardObj, onComplete);
}

/**
 * Performs a shuffle animation on deck cards.
 */
export function animateShuffle(
  k: KAPLAYCtx,
  deckCards: CardGameObj[],
  centerX: number,
  centerY: number,
  onComplete?: () => void
): void {
  const shuffleRounds = 3;
  let currentRound = 0;

  function doShuffleRound(): void {
    if (currentRound >= shuffleRounds) {
      // Return all cards to center pile
      let completed = 0;
      for (let i = 0; i < deckCards.length; i++) {
        const card = deckCards[i];
        if (!card || !card.pos) {
          completed++;
          if (completed === deckCards.length && onComplete) {
            onComplete();
          }
          continue;
        }
        const startX = card.pos.x;
        const startY = card.pos.y;
        const targetY = centerY + i * 0.5;
        const delay = i * 0.01;
        k.wait(delay, () => {
          k.tween(
            0,
            1,
            0.15,
            (t) => {
              if (card && card.pos) {
                card.pos.x = startX + (centerX - startX) * t;
                card.pos.y = startY + (targetY - startY) * t;
              }
            },
            k.easings.easeOutQuad
          ).onEnd(() => {
            completed++;
            if (completed === deckCards.length && onComplete) {
              onComplete();
            }
          });
        });
      }
      return;
    }

    // Split deck into two halves and riffle
    const half = Math.floor(deckCards.length / 2);
    let completed = 0;

    for (let i = 0; i < deckCards.length; i++) {
      const card = deckCards[i];
      if (!card || !card.pos) {
        completed++;
        if (completed === deckCards.length) {
          currentRound++;
          k.wait(0.05, doShuffleRound);
        }
        continue;
      }
      const isLeftHalf = i < half;
      const targetX = centerX + (isLeftHalf ? -40 : 40);
      const targetY = centerY + (Math.random() - 0.5) * 20;
      const startX = card.pos.x;
      const startY = card.pos.y;

      k.tween(
        0,
        1,
        0.1,
        (t) => {
          if (card && card.pos) {
            card.pos.x = startX + (targetX - startX) * t;
            card.pos.y = startY + (targetY - startY) * t;
          }
        },
        k.easings.easeOutQuad
      ).onEnd(() => {
        // Return to center with slight random offset
        if (!card || !card.pos) {
          completed++;
          if (completed === deckCards.length) {
            currentRound++;
            k.wait(0.05, doShuffleRound);
          }
          return;
        }
        const returnStartX = card.pos.x;
        const returnStartY = card.pos.y;
        const returnTargetY = centerY + (Math.random() - 0.5) * 5;
        k.tween(
          0,
          1,
          0.1,
          (t) => {
            if (card && card.pos) {
              card.pos.x = returnStartX + (centerX - returnStartX) * t;
              card.pos.y = returnStartY + (returnTargetY - returnStartY) * t;
            }
          },
          k.easings.easeInQuad
        ).onEnd(() => {
          completed++;
          if (completed === deckCards.length) {
            currentRound++;
            k.wait(0.05, doShuffleRound);
          }
        });
      });
    }
  }

  doShuffleRound();
}

/**
 * Animates a card moving from one position to another.
 */
export function animateCardMove(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  targetX: number,
  targetY: number,
  duration: number,
  onComplete?: () => void
): void {
  if (!cardObj || !cardObj.pos) {
    if (onComplete) onComplete();
    return;
  }

  const startX = cardObj.pos.x;
  const startY = cardObj.pos.y;

  k.tween(
    0,
    1,
    duration,
    (t) => {
      if (cardObj && cardObj.pos) {
        cardObj.pos.x = startX + (targetX - startX) * t;
        cardObj.pos.y = startY + (targetY - startY) * t;
      }
    },
    k.easings.easeOutQuad
  ).onEnd(() => {
    if (onComplete) {
      onComplete();
    }
  });
}
