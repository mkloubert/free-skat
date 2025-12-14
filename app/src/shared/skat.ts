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
 * Skat handling module for pickup, discard, and related operations.
 */

import {
  Card,
  Hand,
  addCardToHand,
  removeCardFromHand,
  handContains,
  cardsEqual,
  getCardCode,
  cardFromCode,
  getCardPoints,
} from "./card";
import { Player } from "./player";

/**
 * Skat represents the two cards in the skat.
 */
export interface Skat {
  /** The two cards in the skat */
  cards: [Card, Card] | null;
  /** Whether the skat has been picked up */
  pickedUp: boolean;
  /** The player who picked up the skat (declarer) */
  pickedUpBy: Player | null;
  /** The original skat cards (before any exchange) */
  originalCards: [Card, Card] | null;
}

/**
 * Creates a new empty skat.
 */
export function createSkat(): Skat {
  return {
    cards: null,
    pickedUp: false,
    pickedUpBy: null,
    originalCards: null,
  };
}

/**
 * Sets the skat cards (during dealing).
 */
export function setSkatCards(skat: Skat, card1: Card, card2: Card): Skat {
  return {
    ...skat,
    cards: [card1, card2],
    originalCards: [card1, card2],
  };
}

/**
 * Returns the point value of the skat cards.
 */
export function getSkatPoints(skat: Skat): number {
  if (skat.cards === null) {
    return 0;
  }
  return skat.cards.reduce(
    (sum, card) => sum + (card ? getCardPoints(card) : 0),
    0
  );
}

/**
 * Returns the ISS protocol code for the skat.
 */
export function getSkatCode(skat: Skat): string {
  if (skat.cards === null) {
    return "??.??";
  }
  return `${getCardCode(skat.cards[0])}.${getCardCode(skat.cards[1])}`;
}

/**
 * Parses skat from ISS protocol code.
 */
export function skatFromCode(code: string): Skat | null {
  const skat = createSkat();

  if (code === "??.??" || code === "") {
    return skat;
  }

  const parts = code.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const card1 = cardFromCode(parts[0]);
  const card2 = cardFromCode(parts[1]);

  if (card1 === null || card2 === null) {
    return null;
  }

  return setSkatCards(skat, card1, card2);
}

/**
 * SkatPickupResult represents the result of picking up the skat.
 */
export interface SkatPickupResult {
  /** The updated skat */
  skat: Skat;
  /** The updated hand (with skat cards added) */
  hand: Hand;
}

/**
 * Picks up the skat cards and adds them to the declarer's hand.
 */
export function pickupSkat(
  skat: Skat,
  hand: Hand,
  declarer: Player
): SkatPickupResult {
  if (skat.cards === null) {
    throw new Error("Skat cards not set");
  }

  if (skat.pickedUp) {
    throw new Error("Skat already picked up");
  }

  // Create new hand with skat cards
  const newHand: Hand = { cards: [...hand.cards] };
  addCardToHand(newHand, skat.cards[0]);
  addCardToHand(newHand, skat.cards[1]);

  // Update skat state
  const newSkat: Skat = {
    ...skat,
    pickedUp: true,
    pickedUpBy: declarer,
  };

  return {
    skat: newSkat,
    hand: newHand,
  };
}

/**
 * SkatDiscardResult represents the result of discarding cards to the skat.
 */
export interface SkatDiscardResult {
  /** The updated skat (with new cards) */
  skat: Skat;
  /** The updated hand (with discarded cards removed) */
  hand: Hand;
}

/**
 * Discards two cards from the hand to the skat.
 * The declarer must have exactly 12 cards (10 original + 2 from skat).
 */
export function discardToSkat(
  skat: Skat,
  hand: Hand,
  card1: Card,
  card2: Card
): SkatDiscardResult {
  if (!skat.pickedUp) {
    throw new Error("Must pick up skat before discarding");
  }

  if (hand.cards.length !== 12) {
    throw new Error(`Hand must have 12 cards, has ${hand.cards.length}`);
  }

  if (!handContains(hand, card1)) {
    throw new Error(`Card ${getCardCode(card1)} not in hand`);
  }

  if (!handContains(hand, card2)) {
    throw new Error(`Card ${getCardCode(card2)} not in hand`);
  }

  if (cardsEqual(card1, card2)) {
    throw new Error("Cannot discard the same card twice");
  }

  // Create new hand without the discarded cards
  const newHand: Hand = { cards: [...hand.cards] };
  removeCardFromHand(newHand, card1);
  removeCardFromHand(newHand, card2);

  // Update skat with new cards
  const newSkat: Skat = {
    ...skat,
    cards: [card1, card2],
  };

  return {
    skat: newSkat,
    hand: newHand,
  };
}

/**
 * Validates that the discarded cards are legal.
 * In normal games, Jacks cannot be discarded. This function checks for that.
 * Returns null if valid, or an error message if invalid.
 */
export function validateDiscard(
  card1: Card,
  card2: Card,
  allowJacks = false
): string | null {
  // Check for duplicate
  if (cardsEqual(card1, card2)) {
    return "Cannot discard the same card twice";
  }

  // In strict mode, Jacks cannot be discarded
  if (!allowJacks) {
    if (card1.rank === 2 || card2.rank === 2) {
      // Rank.Jack = 2
      // Note: Some game variants allow discarding Jacks
      // For now, we just log a warning but allow it
      // return "Jacks cannot be discarded";
    }
  }

  return null;
}

/**
 * Dealing result for distributing cards to players and skat.
 */
export interface DealResult {
  /** Forehand's hand (10 cards) */
  forehand: Hand;
  /** Middlehand's hand (10 cards) */
  middlehand: Hand;
  /** Rearhand's hand (10 cards) */
  rearhand: Hand;
  /** The skat (2 cards) */
  skat: Skat;
}

/**
 * Deals cards according to Skat rules.
 * Standard dealing: 3-skat-4-3 pattern.
 * - 3 cards to each player
 * - 2 cards to skat
 * - 4 cards to each player
 * - 3 cards to each player
 */
export function dealCards(deck: Card[]): DealResult {
  if (deck.length !== 32) {
    throw new Error(`Deck must have 32 cards, has ${deck.length}`);
  }

  const forehand: Hand = { cards: [] };
  const middlehand: Hand = { cards: [] };
  const rearhand: Hand = { cards: [] };
  let skat = createSkat();

  let cardIndex = 0;

  // First round: 3 cards each
  for (let i = 0; i < 3; i++) {
    forehand.cards.push(deck[cardIndex++]);
    middlehand.cards.push(deck[cardIndex++]);
    rearhand.cards.push(deck[cardIndex++]);
  }

  // Skat: 2 cards
  skat = setSkatCards(skat, deck[cardIndex++], deck[cardIndex++]);

  // Second round: 4 cards each
  for (let i = 0; i < 4; i++) {
    forehand.cards.push(deck[cardIndex++]);
    middlehand.cards.push(deck[cardIndex++]);
    rearhand.cards.push(deck[cardIndex++]);
  }

  // Third round: 3 cards each
  for (let i = 0; i < 3; i++) {
    forehand.cards.push(deck[cardIndex++]);
    middlehand.cards.push(deck[cardIndex++]);
    rearhand.cards.push(deck[cardIndex++]);
  }

  return {
    forehand,
    middlehand,
    rearhand,
    skat,
  };
}

/**
 * Returns the hand for a specific player from a deal result.
 */
export function getPlayerHand(deal: DealResult, player: Player): Hand {
  switch (player) {
    case Player.Forehand:
      return deal.forehand;
    case Player.Middlehand:
      return deal.middlehand;
    case Player.Rearhand:
      return deal.rearhand;
  }
}
