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

// ============================================================================
// Card Comparison Functions for Trick Evaluation
// ============================================================================

import { GameType, isGrand, isNull, getTrumpSuit } from "./gametype";

/**
 * Returns true if the card is a trump card in the given game type.
 */
export function isTrump(card: Card, gameType: GameType): boolean {
  // In Null games, there is no trump
  if (isNull(gameType)) {
    return false;
  }

  // Jacks are always trump in Suit and Grand games
  if (isJack(card)) {
    return true;
  }

  // In Grand games, only Jacks are trump
  if (isGrand(gameType)) {
    return false;
  }

  // In suit games, the trump suit cards are also trump
  const trumpSuit = getTrumpSuit(gameType);
  return trumpSuit !== null && card.suit === trumpSuit;
}

/**
 * Returns the trump order value for a card.
 * Higher value = stronger trump.
 * Jacks: CJ=4, SJ=3, HJ=2, DJ=1
 * Trump suit: A=14, T=13, K=12, Q=11, 9=10, 8=9, 7=8 (offset by 7)
 */
export function getTrumpOrder(card: Card, gameType: GameType): number {
  if (!isTrump(card, gameType)) {
    return 0;
  }

  // Jacks are highest trumps: CJ > SJ > HJ > DJ
  if (isJack(card)) {
    return 100 + (3 - card.suit); // Clubs=103, Spades=102, Hearts=101, Diamonds=100
  }

  // Non-Jack trump cards (only in suit games)
  // Order: A > T > K > Q > 9 > 8 > 7
  const rankOrder: Record<Rank, number> = {
    [Rank.Ace]: 7,
    [Rank.Ten]: 6,
    [Rank.King]: 5,
    [Rank.Queen]: 4,
    [Rank.Nine]: 3,
    [Rank.Eight]: 2,
    [Rank.Seven]: 1,
    [Rank.Jack]: 0, // Jacks handled above
  };

  return rankOrder[card.rank];
}

/**
 * Returns the suit order value for a card in non-trump context.
 * For Suit/Grand games: A > T > K > Q > 9 > 8 > 7
 * For Null games: A > K > Q > J > T > 9 > 8 > 7
 */
export function getSuitOrder(card: Card, gameType: GameType): number {
  if (isNull(gameType)) {
    // Null order: A > K > Q > J > T > 9 > 8 > 7
    const nullOrder: Record<Rank, number> = {
      [Rank.Ace]: 8,
      [Rank.King]: 7,
      [Rank.Queen]: 6,
      [Rank.Jack]: 5,
      [Rank.Ten]: 4,
      [Rank.Nine]: 3,
      [Rank.Eight]: 2,
      [Rank.Seven]: 1,
    };
    return nullOrder[card.rank];
  }

  // Suit/Grand order (excluding Jacks which are trump): A > T > K > Q > 9 > 8 > 7
  const suitOrder: Record<Rank, number> = {
    [Rank.Ace]: 7,
    [Rank.Ten]: 6,
    [Rank.King]: 5,
    [Rank.Queen]: 4,
    [Rank.Nine]: 3,
    [Rank.Eight]: 2,
    [Rank.Seven]: 1,
    [Rank.Jack]: 0, // Jacks are trump, shouldn't be compared here
  };

  return suitOrder[card.rank];
}

/**
 * Compares two cards to determine which wins a trick.
 * Returns positive if card1 beats card2, negative if card2 beats card1, 0 if equal.
 *
 * @param card1 The first card (played earlier or being compared)
 * @param card2 The second card (played later or being compared against)
 * @param leadSuit The suit that was led (first card in the trick)
 * @param gameType The current game type
 */
export function compareCards(
  card1: Card,
  card2: Card,
  leadSuit: Suit,
  gameType: GameType
): number {
  const trump1 = isTrump(card1, gameType);
  const trump2 = isTrump(card2, gameType);

  // If both are trump, compare trump order
  if (trump1 && trump2) {
    return getTrumpOrder(card1, gameType) - getTrumpOrder(card2, gameType);
  }

  // Trump beats non-trump
  if (trump1 && !trump2) {
    return 1;
  }
  if (!trump1 && trump2) {
    return -1;
  }

  // Neither is trump - must follow suit
  const followsSuit1 = getCardSuit(card1, gameType) === leadSuit;
  const followsSuit2 = getCardSuit(card2, gameType) === leadSuit;

  // Card that follows suit beats one that doesn't
  if (followsSuit1 && !followsSuit2) {
    return 1;
  }
  if (!followsSuit1 && followsSuit2) {
    return -1;
  }

  // Both follow suit (or both don't) - compare by suit order
  if (followsSuit1 && followsSuit2) {
    return getSuitOrder(card1, gameType) - getSuitOrder(card2, gameType);
  }

  // Neither follows suit - first card played wins (return 0, caller decides)
  return 0;
}

/**
 * Gets the effective suit of a card for following purposes.
 * In Suit/Grand games, Jacks don't belong to their printed suit.
 */
export function getCardSuit(card: Card, gameType: GameType): Suit {
  // In Null games, all cards belong to their printed suit
  if (isNull(gameType)) {
    return card.suit;
  }

  // In Suit/Grand games, Jacks are trump and don't belong to a suit
  // For the purpose of following suit, we return a special value
  // But since Jacks are always trump, this shouldn't matter for following
  return card.suit;
}

// ============================================================================
// Card Sorting Functions
// ============================================================================

/**
 * Sorts cards by suit first (Clubs > Spades > Hearts > Diamonds),
 * then by rank within each suit.
 */
export function sortBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return a.suit - b.suit;
    }
    return b.rank - a.rank;
  });
}

/**
 * Sorts cards by rank first, then by suit within each rank.
 */
export function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.rank !== b.rank) {
      return b.rank - a.rank;
    }
    return a.suit - b.suit;
  });
}

/**
 * Returns the sort order for Null games (A > K > Q > J > T > 9 > 8 > 7)
 */
function nullRankOrder(rank: Rank): number {
  const order: Record<Rank, number> = {
    [Rank.Ace]: 8,
    [Rank.King]: 7,
    [Rank.Queen]: 6,
    [Rank.Jack]: 5,
    [Rank.Ten]: 4,
    [Rank.Nine]: 3,
    [Rank.Eight]: 2,
    [Rank.Seven]: 1,
  };
  return order[rank];
}

/**
 * Returns the sort order for Suit/Grand games (A > T > K > Q > 9 > 8 > 7)
 */
function suitRankOrder(rank: Rank): number {
  const order: Record<Rank, number> = {
    [Rank.Ace]: 7,
    [Rank.Ten]: 6,
    [Rank.King]: 5,
    [Rank.Queen]: 4,
    [Rank.Nine]: 3,
    [Rank.Eight]: 2,
    [Rank.Seven]: 1,
    [Rank.Jack]: 0,
  };
  return order[rank];
}

/**
 * Sorts cards for display during a game.
 * In Suit/Grand games: Jacks first (CJ, SJ, HJ, DJ), then trump suit, then other suits.
 * In Null games: Standard suit sorting (no special trump handling).
 */
export function sortForGame(cards: Card[], gameType: GameType): Card[] {
  const sorted = [...cards];

  if (isNull(gameType)) {
    sorted.sort((a, b) => {
      if (a.suit !== b.suit) {
        return a.suit - b.suit;
      }
      return nullRankOrder(b.rank) - nullRankOrder(a.rank);
    });
    return sorted;
  }

  const trumpSuit = getTrumpSuit(gameType);

  sorted.sort((a, b) => {
    const aIsJack = isJack(a);
    const bIsJack = isJack(b);

    // Jacks come first
    if (aIsJack && !bIsJack) return -1;
    if (!aIsJack && bIsJack) return 1;

    // Both are Jacks: sort by suit (C > S > H > D)
    if (aIsJack && bIsJack) {
      return a.suit - b.suit;
    }

    // Neither is Jack
    const aIsTrump = trumpSuit !== null && a.suit === trumpSuit;
    const bIsTrump = trumpSuit !== null && b.suit === trumpSuit;

    // Trump suit comes after Jacks but before other suits
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // Same trump status: sort by suit, then by rank
    if (a.suit !== b.suit) {
      return a.suit - b.suit;
    }

    return suitRankOrder(b.rank) - suitRankOrder(a.rank);
  });

  return sorted;
}

/**
 * Sorts a hand's cards for display during a game.
 */
export function sortHand(hand: Hand, gameType: GameType): Hand {
  return { cards: sortForGame(hand.cards, gameType) };
}

/**
 * Determines if a card can legally be played given the lead suit and hand.
 */
export function canPlayCard(
  card: Card,
  leadCard: Card | null,
  hand: Hand,
  gameType: GameType
): boolean {
  // If no lead card, any card can be played
  if (leadCard === null) {
    return true;
  }

  // Check if player must follow suit
  const leadIsTrump = isTrump(leadCard, gameType);
  const cardIsTrump = isTrump(card, gameType);

  if (leadIsTrump) {
    // Trump was led - must play trump if possible
    const hasTrump = hand.cards.some((c) => isTrump(c, gameType));
    if (hasTrump) {
      return cardIsTrump;
    }
    // No trump - can play anything
    return true;
  }

  // Non-trump was led
  const leadSuit = getCardSuit(leadCard, gameType);

  // Check if player has the led suit (excluding trumps in suit/grand games)
  const hasSuit = hand.cards.some((c) => {
    if (isTrump(c, gameType)) {
      return false; // Trump cards don't count as following suit
    }
    return c.suit === leadSuit;
  });

  if (hasSuit) {
    // Must follow suit
    if (cardIsTrump) {
      return false; // Can't play trump when you have the led suit
    }
    return card.suit === leadSuit;
  }

  // Don't have the led suit - can play anything
  return true;
}
