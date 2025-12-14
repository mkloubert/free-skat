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

import { Card, Suit, Rank } from "../../../shared";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_CORNER_RADIUS,
  CARD_COLORS,
  SUIT_SYMBOLS,
  RANK_DISPLAY,
} from "./constants";

/**
 * Gets the display symbol for a suit.
 */
function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case Suit.Clubs:
      return SUIT_SYMBOLS.clubs;
    case Suit.Spades:
      return SUIT_SYMBOLS.spades;
    case Suit.Hearts:
      return SUIT_SYMBOLS.hearts;
    case Suit.Diamonds:
      return SUIT_SYMBOLS.diamonds;
  }
}

/**
 * Gets the display text for a rank.
 */
function getRankDisplay(rank: Rank): string {
  switch (rank) {
    case Rank.Seven:
      return RANK_DISPLAY.seven;
    case Rank.Eight:
      return RANK_DISPLAY.eight;
    case Rank.Nine:
      return RANK_DISPLAY.nine;
    case Rank.Ten:
      return RANK_DISPLAY.ten;
    case Rank.Jack:
      return RANK_DISPLAY.jack;
    case Rank.Queen:
      return RANK_DISPLAY.queen;
    case Rank.King:
      return RANK_DISPLAY.king;
    case Rank.Ace:
      return RANK_DISPLAY.ace;
  }
}

/**
 * Returns true if the suit is red (Hearts, Diamonds).
 */
function isRedSuit(suit: Suit): boolean {
  return suit === Suit.Hearts || suit === Suit.Diamonds;
}

/**
 * Draws a rounded rectangle on a canvas context.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders a card face to a canvas and returns the image data URL.
 */
export function renderCardFace(card: Card): string {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Card background
  ctx.fillStyle = CARD_COLORS.background;
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
  ctx.fill();

  // Card border
  ctx.strokeStyle = CARD_COLORS.border;
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, CARD_WIDTH - 1, CARD_HEIGHT - 1, CARD_CORNER_RADIUS);
  ctx.stroke();

  // Set color based on suit
  const color = isRedSuit(card.suit) ? CARD_COLORS.red : CARD_COLORS.black;
  ctx.fillStyle = color;

  const rankText = getRankDisplay(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);

  // Top-left rank and suit
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(rankText, 5, 5);
  ctx.font = "16px Arial";
  ctx.fillText(suitSymbol, 5, 20);

  // Bottom-right rank and suit (rotated)
  ctx.save();
  ctx.translate(CARD_WIDTH - 5, CARD_HEIGHT - 5);
  ctx.rotate(Math.PI);
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(rankText, 0, 0);
  ctx.font = "16px Arial";
  ctx.fillText(suitSymbol, 0, 15);
  ctx.restore();

  // Center suit symbol (large)
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(suitSymbol, CARD_WIDTH / 2, CARD_HEIGHT / 2);

  return canvas.toDataURL();
}

/**
 * Renders a card back to a canvas and returns the image data URL.
 */
export function renderCardBack(): string {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Card background (blue)
  ctx.fillStyle = CARD_COLORS.back;
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
  ctx.fill();

  // Card border
  ctx.strokeStyle = CARD_COLORS.border;
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, CARD_WIDTH - 1, CARD_HEIGHT - 1, CARD_CORNER_RADIUS);
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = CARD_COLORS.backPattern;
  ctx.lineWidth = 2;
  roundRect(
    ctx,
    6,
    6,
    CARD_WIDTH - 12,
    CARD_HEIGHT - 12,
    CARD_CORNER_RADIUS - 2
  );
  ctx.stroke();

  // Diamond pattern
  ctx.fillStyle = CARD_COLORS.backPattern;
  const patternSize = 12;
  const offsetX = ((CARD_WIDTH - 12) % patternSize) / 2 + 10;
  const offsetY = ((CARD_HEIGHT - 12) % patternSize) / 2 + 10;

  for (let y = offsetY; y < CARD_HEIGHT - 10; y += patternSize) {
    for (let x = offsetX; x < CARD_WIDTH - 10; x += patternSize) {
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x - 4, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  return canvas.toDataURL();
}

/**
 * Renders a highlighted card (selected or hovered).
 */
export function renderCardHighlight(
  card: Card,
  highlightColor: string
): string {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH + 4;
  canvas.height = CARD_HEIGHT + 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Highlight border
  ctx.fillStyle = highlightColor;
  roundRect(ctx, 0, 0, CARD_WIDTH + 4, CARD_HEIGHT + 4, CARD_CORNER_RADIUS + 2);
  ctx.fill();

  // Draw the card face on top
  const cardCanvas = document.createElement("canvas");
  cardCanvas.width = CARD_WIDTH;
  cardCanvas.height = CARD_HEIGHT;
  const cardCtx = cardCanvas.getContext("2d");
  if (!cardCtx) throw new Error("Could not get canvas context");

  // Card background
  cardCtx.fillStyle = CARD_COLORS.background;
  roundRect(cardCtx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
  cardCtx.fill();

  // Card border
  cardCtx.strokeStyle = CARD_COLORS.border;
  cardCtx.lineWidth = 1;
  roundRect(
    cardCtx,
    0.5,
    0.5,
    CARD_WIDTH - 1,
    CARD_HEIGHT - 1,
    CARD_CORNER_RADIUS
  );
  cardCtx.stroke();

  const color = isRedSuit(card.suit) ? CARD_COLORS.red : CARD_COLORS.black;
  cardCtx.fillStyle = color;

  const rankText = getRankDisplay(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);

  // Top-left
  cardCtx.font = "bold 14px Arial";
  cardCtx.textAlign = "left";
  cardCtx.textBaseline = "top";
  cardCtx.fillText(rankText, 5, 5);
  cardCtx.font = "16px Arial";
  cardCtx.fillText(suitSymbol, 5, 20);

  // Bottom-right
  cardCtx.save();
  cardCtx.translate(CARD_WIDTH - 5, CARD_HEIGHT - 5);
  cardCtx.rotate(Math.PI);
  cardCtx.font = "bold 14px Arial";
  cardCtx.textAlign = "left";
  cardCtx.textBaseline = "top";
  cardCtx.fillText(rankText, 0, 0);
  cardCtx.font = "16px Arial";
  cardCtx.fillText(suitSymbol, 0, 15);
  cardCtx.restore();

  // Center
  cardCtx.font = "bold 36px Arial";
  cardCtx.textAlign = "center";
  cardCtx.textBaseline = "middle";
  cardCtx.fillText(suitSymbol, CARD_WIDTH / 2, CARD_HEIGHT / 2);

  // Draw card on highlight
  ctx.drawImage(cardCanvas, 2, 2);

  return canvas.toDataURL();
}

/**
 * Cache for rendered card images.
 */
const cardImageCache = new Map<string, string>();

/**
 * Gets or creates a cached card face image.
 */
export function getCardFaceImage(card: Card): string {
  const key = `face_${card.suit}_${card.rank}`;
  let image = cardImageCache.get(key);
  if (!image) {
    image = renderCardFace(card);
    cardImageCache.set(key, image);
  }
  return image;
}

/**
 * Gets or creates a cached card back image.
 */
export function getCardBackImage(): string {
  const key = "back";
  let image = cardImageCache.get(key);
  if (!image) {
    image = renderCardBack();
    cardImageCache.set(key, image);
  }
  return image;
}

/**
 * Clears the card image cache.
 */
export function clearCardImageCache(): void {
  cardImageCache.clear();
}
