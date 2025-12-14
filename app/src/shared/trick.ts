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

import { Card, getCardPoints, getCardCode, compareCards } from "./card";
import { Player, getLeftNeighbor } from "./player";
import { GameType, isNull } from "./gametype";
import { Suit } from "./suit";

/**
 * TrickCard represents a card played in a trick along with who played it.
 */
export interface TrickCard {
  card: Card;
  player: Player;
}

/**
 * Trick represents a single trick in a Skat game.
 */
export interface Trick {
  /** The player who led the trick (played first card) */
  forehand: Player;
  /** Cards played in order */
  cards: TrickCard[];
  /** The winner of the trick (determined after all 3 cards played) */
  winner: Player | null;
}

/**
 * Creates a new empty trick.
 */
export function createTrick(forehand: Player): Trick {
  return {
    forehand,
    cards: [],
    winner: null,
  };
}

/**
 * Returns true if the trick is complete (3 cards played).
 */
export function isTrickComplete(trick: Trick): boolean {
  return trick.cards.length === 3;
}

/**
 * Adds a card to the trick.
 */
export function addCardToTrick(trick: Trick, card: Card, player: Player): void {
  if (isTrickComplete(trick)) {
    throw new Error("Trick is already complete");
  }
  trick.cards.push({ card, player });
}

/**
 * Returns the lead card of the trick (first card played).
 */
export function getLeadCard(trick: Trick): Card | null {
  if (trick.cards.length === 0) {
    return null;
  }
  return trick.cards[0].card;
}

/**
 * Returns the lead suit of the trick.
 * For non-Null games, if a Jack is led, trump was led (not a suit).
 */
export function getLeadSuit(trick: Trick, gameType: GameType): Suit | null {
  const leadCard = getLeadCard(trick);
  if (leadCard === null) {
    return null;
  }

  // In Null games, Jacks belong to their printed suit
  if (isNull(gameType)) {
    return leadCard.suit;
  }

  // In Suit/Grand games, if Jack is led, it's trump (not a specific suit)
  // Return the printed suit for comparison purposes, but isTrump() will handle it
  return leadCard.suit;
}

/**
 * Determines the winner of a complete trick.
 */
export function determineTrickWinner(trick: Trick, gameType: GameType): Player {
  if (!isTrickComplete(trick)) {
    throw new Error("Cannot determine winner of incomplete trick");
  }

  const leadCard = trick.cards[0].card;
  const leadSuit = leadCard.suit;

  let winningIndex = 0;
  let winningCard = trick.cards[0].card;

  for (let i = 1; i < trick.cards.length; i++) {
    const currentCard = trick.cards[i].card;
    const comparison = compareCards(
      currentCard,
      winningCard,
      leadSuit,
      gameType
    );

    if (comparison > 0) {
      winningIndex = i;
      winningCard = currentCard;
    }
  }

  return trick.cards[winningIndex].player;
}

/**
 * Calculates the total points in a trick.
 */
export function getTrickPoints(trick: Trick): number {
  return trick.cards.reduce((sum, tc) => sum + getCardPoints(tc.card), 0);
}

/**
 * Returns the next player to play in this trick.
 */
export function getNextPlayer(trick: Trick): Player | null {
  if (isTrickComplete(trick)) {
    return null;
  }

  if (trick.cards.length === 0) {
    return trick.forehand;
  }

  const lastPlayer = trick.cards[trick.cards.length - 1].player;
  return getLeftNeighbor(lastPlayer);
}

/**
 * Returns a string representation of the trick for ISS protocol.
 */
export function getTrickCode(trick: Trick): string {
  return trick.cards.map((tc) => getCardCode(tc.card)).join(".");
}

/**
 * Completes a trick by determining the winner.
 */
export function completeTrick(trick: Trick, gameType: GameType): void {
  if (!isTrickComplete(trick)) {
    throw new Error("Cannot complete an incomplete trick");
  }
  trick.winner = determineTrickWinner(trick, gameType);
}

/**
 * Gets all cards from a trick as an array.
 */
export function getTrickCards(trick: Trick): Card[] {
  return trick.cards.map((tc) => tc.card);
}

/**
 * Returns the card played by a specific player in this trick, if any.
 */
export function getCardByPlayer(trick: Trick, player: Player): Card | null {
  const trickCard = trick.cards.find((tc) => tc.player === player);
  return trickCard ? trickCard.card : null;
}
