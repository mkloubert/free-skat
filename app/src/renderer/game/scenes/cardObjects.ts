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
 * Card object creation and sprite loading functions.
 */

import type { KAPLAYCtx } from "kaplay";
import type { Card, Player } from "../../../shared";
import { getCardFaceImage, getCardBackImage } from "../utils/cardRenderer";
import type { CardGameObj } from "./types";

/**
 * Loads card sprites into KAPlay.
 */
export function loadCardSprites(k: KAPLAYCtx, cards: Card[]): void {
  // Load card back
  const backImage = getCardBackImage();
  k.loadSprite("card_back", backImage);
  console.log("[CardSprites] Loaded card_back");

  // Load all card faces - use a Set to avoid duplicate loads
  const loadedSprites = new Set<string>();
  for (const card of cards) {
    const spriteName = `card_${card.suit}_${card.rank}`;
    if (!loadedSprites.has(spriteName)) {
      const faceImage = getCardFaceImage(card);
      k.loadSprite(spriteName, faceImage);
      loadedSprites.add(spriteName);
      console.log(`[CardSprites] Loaded ${spriteName}`);
    }
  }
  console.log(`[CardSprites] Total loaded: ${loadedSprites.size} face sprites`);
}

/**
 * Creates a card game object.
 */
export function createCardObject(
  k: KAPLAYCtx,
  card: Card,
  x: number,
  y: number,
  faceUp: boolean,
  zIndex: number,
  owner: Player | "skat"
): CardGameObj {
  const spriteName = faceUp ? `card_${card.suit}_${card.rank}` : "card_back";

  const obj = k.add([
    k.sprite(spriteName),
    k.pos(x, y),
    k.anchor("center"),
    k.area(),
    k.scale(1),
    k.rotate(0),
    k.opacity(1),
    k.z(zIndex),
    {
      cardData: card,
      faceUp,
      selected: false,
      baseY: y,
      isLegalMove: true,
      owner,
    },
  ]) as CardGameObj;

  return obj;
}
