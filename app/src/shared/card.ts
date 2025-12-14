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

import {
  Suit,
  ALL_SUITS,
  getSuitCode,
  getSuitName,
  getSuitGermanName,
  suitFromCode,
} from "./suit";
import {
  Rank,
  ALL_RANKS,
  getRankCode,
  getRankName,
  getRankGermanName,
  getRankPoints,
  rankFromCode,
} from "./rank";

/**
 * Card represents a single playing card.
 */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/**
 * Creates a new card.
 */
export function createCard(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

/**
 * Returns a human-readable representation of a card.
 */
export function getCardName(card: Card): string {
  return `${getRankName(card.rank)} of ${getSuitName(card.suit)}`;
}

/**
 * Returns the German name of a card.
 */
export function getCardGermanName(card: Card): string {
  return `${getSuitGermanName(card.suit)} ${getRankGermanName(card.rank)}`;
}

/**
 * Returns the ISS protocol code for a card (e.g., "CA" for Ace of Clubs).
 */
export function getCardCode(card: Card): string {
  return getSuitCode(card.suit) + getRankCode(card.rank);
}

/**
 * Returns the point value of a card.
 */
export function getCardPoints(card: Card): number {
  return getRankPoints(card.rank);
}

/**
 * Returns true if the card is a Jack.
 */
export function isJack(card: Card): boolean {
  return card.rank === Rank.Jack;
}

/**
 * Parses a card from its ISS protocol code (e.g., "CA" for Ace of Clubs).
 */
export function cardFromCode(code: string): Card | null {
  if (code.length !== 2) {
    return null;
  }

  const suit = suitFromCode(code[0]);
  const rank = rankFromCode(code[1]);

  if (suit === null || rank === null) {
    return null;
  }

  return createCard(suit, rank);
}

/**
 * Compares two cards for equality.
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Creates a standard 32-card Skat deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push(createCard(suit, rank));
    }
  }

  return deck;
}

/**
 * Shuffles an array of cards in place using Fisher-Yates algorithm.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Hand represents a player's hand of cards.
 */
export interface Hand {
  cards: Card[];
}

/**
 * Creates a new empty hand.
 */
export function createHand(): Hand {
  return { cards: [] };
}

/**
 * Creates a hand with the given cards.
 */
export function createHandFromCards(cards: Card[]): Hand {
  return { cards: [...cards] };
}

/**
 * Adds a card to a hand.
 */
export function addCardToHand(hand: Hand, card: Card): void {
  hand.cards.push(card);
}

/**
 * Removes a card from a hand. Returns true if the card was found and removed.
 */
export function removeCardFromHand(hand: Hand, card: Card): boolean {
  const index = hand.cards.findIndex((c) => cardsEqual(c, card));
  if (index !== -1) {
    hand.cards.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Returns true if the hand contains the given card.
 */
export function handContains(hand: Hand, card: Card): boolean {
  return hand.cards.some((c) => cardsEqual(c, card));
}

/**
 * Returns true if the hand contains any card of the given suit (excluding Jacks).
 */
export function handHasSuit(hand: Hand, suit: Suit): boolean {
  return hand.cards.some((c) => c.suit === suit && c.rank !== Rank.Jack);
}

/**
 * Returns true if the hand contains any Jack.
 */
export function handHasJack(hand: Hand): boolean {
  return hand.cards.some((c) => c.rank === Rank.Jack);
}

/**
 * Returns the total point value of all cards in a hand.
 */
export function getHandPoints(hand: Hand): number {
  return hand.cards.reduce((sum, card) => sum + getCardPoints(card), 0);
}

/**
 * Returns the ISS protocol representation of a hand (cards separated by dots).
 */
export function getHandCode(hand: Hand): string {
  return hand.cards.map(getCardCode).join(".");
}

/**
 * Parses a hand from its ISS protocol representation.
 */
export function handFromCode(code: string): Hand | null {
  if (!code) {
    return createHand();
  }

  const parts = code.split(".");
  const hand = createHand();

  for (const part of parts) {
    if (part === "??") {
      // Hidden card placeholder - skip
      continue;
    }
    const card = cardFromCode(part);
    if (card === null) {
      return null;
    }
    addCardToHand(hand, card);
  }

  return hand;
}
