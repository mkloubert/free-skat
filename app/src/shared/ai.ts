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
 * AI player module - provides computer opponent implementations.
 */

import {
  Card,
  Hand,
  isJack,
  isTrump,
  getCardPoints,
  sortForGame,
} from "./card";
import { Suit, ALL_SUITS } from "./suit";
import { Rank } from "./rank";
import { Player } from "./player";
import {
  GameType,
  isSuitGame,
  isGrand,
  isNull,
  getTrumpSuit,
  getGameTypeBaseValue,
  SUIT_GAME_TYPES,
} from "./gametype";
import { Trick, getLeadCard } from "./trick";
import {
  BiddingState,
  BiddingAction,
  BiddingResult,
  BID_ORDER,
  MIN_BID,
  isValidNextBid,
} from "./bidding";
import { SkatRule, getRule } from "./rules";
import {
  GameAnnouncement,
  createAnnouncement,
  createHandAnnouncement,
} from "./announcement";

/**
 * AIPlayer interface defines the contract for AI implementations.
 */
export interface AIPlayer {
  /** AI player name */
  readonly name: string;

  /** Decides the bidding action */
  decideBid(
    hand: Hand,
    biddingState: BiddingState,
    player: Player
  ): AIBidDecision;

  /** Decides whether to pick up skat */
  decidePickupSkat(hand: Hand): boolean;

  /** Selects cards to discard to skat */
  selectDiscards(hand: Hand, gameType: GameType): [Card, Card];

  /** Decides the game announcement */
  decideAnnouncement(
    hand: Hand,
    bidValue: number,
    handGame: boolean
  ): GameAnnouncement;

  /** Selects a card to play */
  selectCard(
    hand: Hand,
    trick: Trick,
    gameType: GameType,
    rule: SkatRule
  ): Card;
}

/**
 * AI bid decision.
 */
export interface AIBidDecision {
  action: BiddingAction;
  bidValue?: number;
}

/**
 * Hand evaluation result for bidding decisions.
 */
export interface HandEvaluation {
  /** Estimated maximum safe bid value */
  maxBid: number;
  /** Best game type for this hand */
  bestGameType: GameType;
  /** Number of trump cards (including Jacks) */
  trumpCount: number;
  /** Number of Jacks */
  jackCount: number;
  /** Which Jacks are held */
  jacks: Suit[];
  /** Matador count (positive = with, negative = without) */
  matadors: number;
  /** Total point value of cards */
  totalPoints: number;
  /** Strength score (0-100) */
  strength: number;
  /** Recommended to play hand (no skat pickup) */
  recommendHand: boolean;
}

/**
 * Evaluates a hand for bidding purposes.
 */
export function evaluateHand(hand: Hand): HandEvaluation {
  const cards = hand.cards;

  // Count Jacks
  const jacks: Suit[] = [];
  for (const card of cards) {
    if (isJack(card)) {
      jacks.push(card.suit);
    }
  }
  const jackCount = jacks.length;

  // Calculate matadors
  const matadors = calculateMatadors(jacks);

  // Count cards per suit (excluding Jacks)
  const suitCounts = new Map<Suit, number>();
  const suitPoints = new Map<Suit, number>();
  for (const suit of ALL_SUITS) {
    suitCounts.set(suit, 0);
    suitPoints.set(suit, 0);
  }

  for (const card of cards) {
    if (!isJack(card)) {
      suitCounts.set(card.suit, suitCounts.get(card.suit)! + 1);
      suitPoints.set(
        card.suit,
        suitPoints.get(card.suit)! + getCardPoints(card)
      );
    }
  }

  // Find best suit for trump
  let bestSuit = Suit.Clubs;
  let bestSuitScore = -1;

  for (const suit of ALL_SUITS) {
    const count = suitCounts.get(suit)!;
    const points = suitPoints.get(suit)!;
    // Score = count * 10 + points (prefer length over points)
    const score = count * 10 + points;
    if (score > bestSuitScore) {
      bestSuitScore = score;
      bestSuit = suit;
    }
  }

  // Determine best game type
  let bestGameType: GameType;
  let trumpCount: number;

  if (jackCount >= 3) {
    // With 3+ Jacks, Grand is often best
    bestGameType = GameType.Grand;
    trumpCount = jackCount;
  } else if (suitCounts.get(bestSuit)! >= 4) {
    // Long suit - play suit game
    bestGameType = suitToGameType(bestSuit);
    trumpCount = jackCount + suitCounts.get(bestSuit)!;
  } else if (jackCount >= 2) {
    // 2 Jacks with decent suits
    bestGameType = suitToGameType(bestSuit);
    trumpCount = jackCount + suitCounts.get(bestSuit)!;
  } else {
    // Weak hand - might need to pass or play Null
    if (canPlayNull(cards)) {
      bestGameType = GameType.Null;
      trumpCount = 0;
    } else {
      bestGameType = suitToGameType(bestSuit);
      trumpCount = jackCount + suitCounts.get(bestSuit)!;
    }
  }

  // Calculate total points
  const totalPoints = cards.reduce((sum, c) => sum + getCardPoints(c), 0);

  // Calculate strength score (0-100)
  let strength = 0;
  strength += jackCount * 15; // Jacks are valuable
  strength += Math.min(trumpCount, 7) * 5; // Trump length
  strength += Math.min(totalPoints, 60) / 2; // Card points

  // Calculate max bid
  const baseValue = getGameTypeBaseValue(bestGameType);
  const multiplier = Math.abs(matadors) + 1;
  let maxBid = baseValue * multiplier;

  // Reduce max bid for weak hands
  if (strength < 30) {
    maxBid = Math.min(maxBid, MIN_BID);
  } else if (strength < 50) {
    maxBid = Math.floor(maxBid * 0.7);
  }

  // Find closest valid bid
  maxBid = findClosestBid(maxBid);

  // Recommend hand game for strong hands
  const recommendHand = strength >= 60 && trumpCount >= 5;

  return {
    maxBid,
    bestGameType,
    trumpCount,
    jackCount,
    jacks,
    matadors,
    totalPoints,
    strength,
    recommendHand,
  };
}

/**
 * Calculates matadors from Jacks held.
 */
function calculateMatadors(jacks: Suit[]): number {
  const hasClubJack = jacks.includes(Suit.Clubs);
  const hasSpadeJack = jacks.includes(Suit.Spades);
  const hasHeartJack = jacks.includes(Suit.Hearts);
  const hasDiamondJack = jacks.includes(Suit.Diamonds);

  if (hasClubJack) {
    // Count "with" matadors
    let count = 1;
    if (hasSpadeJack) {
      count++;
      if (hasHeartJack) {
        count++;
        if (hasDiamondJack) {
          count++;
        }
      }
    }
    return count;
  } else {
    // Count "without" matadors
    let count = -1;
    if (!hasSpadeJack) {
      count--;
      if (!hasHeartJack) {
        count--;
        if (!hasDiamondJack) {
          count--;
        }
      }
    }
    return count;
  }
}

/**
 * Checks if hand is suitable for Null.
 */
function canPlayNull(cards: Card[]): boolean {
  // Check for low cards in each suit
  let lowCardCount = 0;
  for (const card of cards) {
    if (
      card.rank === Rank.Seven ||
      card.rank === Rank.Eight ||
      card.rank === Rank.Nine
    ) {
      lowCardCount++;
    }
  }
  return lowCardCount >= 6;
}

/**
 * Converts suit to game type.
 */
function suitToGameType(suit: Suit): GameType {
  switch (suit) {
    case Suit.Clubs:
      return GameType.Clubs;
    case Suit.Spades:
      return GameType.Spades;
    case Suit.Hearts:
      return GameType.Hearts;
    case Suit.Diamonds:
      return GameType.Diamonds;
  }
}

/**
 * Finds the closest valid bid value.
 */
function findClosestBid(value: number): number {
  for (const bid of BID_ORDER) {
    if (bid >= value) {
      return bid;
    }
  }
  return BID_ORDER[BID_ORDER.length - 1];
}

// ============================================================================
// Random AI Player
// ============================================================================

/**
 * RandomAI makes random legal moves.
 */
export class RandomAI implements AIPlayer {
  readonly name = "Random AI";

  decideBid(
    hand: Hand,
    biddingState: BiddingState,
    player: Player
  ): AIBidDecision {
    // 50% chance to pass
    if (Math.random() < 0.5) {
      return { action: BiddingAction.Pass };
    }

    if (biddingState.isActiveBidding) {
      // Need to bid
      const minBid =
        biddingState.currentBid > 0 ? biddingState.currentBid + 1 : MIN_BID;
      const nextBid = findClosestBid(minBid);

      if (nextBid <= 24) {
        // Only bid low values randomly
        return { action: BiddingAction.Bid, bidValue: nextBid };
      }
      return { action: BiddingAction.Pass };
    } else {
      // Need to respond
      if (biddingState.currentBid <= 18) {
        return { action: BiddingAction.Hold };
      }
      return { action: BiddingAction.Pass };
    }
  }

  decidePickupSkat(_hand: Hand): boolean {
    return Math.random() < 0.7; // 70% pickup
  }

  selectDiscards(hand: Hand, gameType: GameType): [Card, Card] {
    const sorted = sortForGame(hand.cards, gameType);
    // Discard last two cards (weakest after sorting)
    return [sorted[sorted.length - 1], sorted[sorted.length - 2]];
  }

  decideAnnouncement(
    hand: Hand,
    _bidValue: number,
    handGame: boolean
  ): GameAnnouncement {
    const evaluation = evaluateHand(hand);
    if (handGame) {
      return createHandAnnouncement(evaluation.bestGameType);
    }
    return createAnnouncement(evaluation.bestGameType);
  }

  selectCard(
    hand: Hand,
    trick: Trick,
    gameType: GameType,
    rule: SkatRule
  ): Card {
    const legalMoves = rule.getLegalMoves(hand, getLeadCard(trick));
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }
}

// ============================================================================
// Basic AI Player
// ============================================================================

/**
 * BasicAI uses simple heuristics for decision making.
 */
export class BasicAI implements AIPlayer {
  readonly name = "Basic AI";

  decideBid(
    hand: Hand,
    biddingState: BiddingState,
    player: Player
  ): AIBidDecision {
    const evaluation = evaluateHand(hand);

    if (biddingState.isActiveBidding) {
      // Need to make a bid
      const minBid =
        biddingState.currentBid > 0 ? biddingState.currentBid + 1 : MIN_BID;

      if (minBid > evaluation.maxBid) {
        return { action: BiddingAction.Pass };
      }

      const nextBid = findClosestBid(minBid);
      if (nextBid <= evaluation.maxBid) {
        return { action: BiddingAction.Bid, bidValue: nextBid };
      }

      return { action: BiddingAction.Pass };
    } else {
      // Need to respond (hold or pass)
      if (biddingState.currentBid <= evaluation.maxBid) {
        return { action: BiddingAction.Hold };
      }
      return { action: BiddingAction.Pass };
    }
  }

  decidePickupSkat(hand: Hand): boolean {
    const evaluation = evaluateHand(hand);
    // Don't pickup if hand is already strong
    return !evaluation.recommendHand;
  }

  selectDiscards(hand: Hand, gameType: GameType): [Card, Card] {
    const cards = [...hand.cards];

    // Sort by value for discarding
    const discardCandidates = cards
      .filter((c) => !isJack(c)) // Never discard Jacks
      .filter((c) => !isTrump(c, gameType)) // Prefer non-trump
      .sort((a, b) => {
        // Prefer discarding high-point non-trump cards
        const pointsDiff = getCardPoints(b) - getCardPoints(a);
        if (pointsDiff !== 0) return pointsDiff;
        return 0;
      });

    if (discardCandidates.length >= 2) {
      return [discardCandidates[0], discardCandidates[1]];
    }

    // Fallback: discard lowest value cards
    const sorted = sortForGame(cards, gameType);
    return [sorted[sorted.length - 1], sorted[sorted.length - 2]];
  }

  decideAnnouncement(
    hand: Hand,
    bidValue: number,
    handGame: boolean
  ): GameAnnouncement {
    const evaluation = evaluateHand(hand);

    // Check if Null is better
    if (evaluation.bestGameType === GameType.Null) {
      if (handGame) {
        return createHandAnnouncement(GameType.Null);
      }
      return createAnnouncement(GameType.Null);
    }

    // Use evaluated best game type
    if (handGame) {
      return createHandAnnouncement(evaluation.bestGameType);
    }
    return createAnnouncement(evaluation.bestGameType);
  }

  selectCard(
    hand: Hand,
    trick: Trick,
    gameType: GameType,
    rule: SkatRule
  ): Card {
    const legalMoves = rule.getLegalMoves(hand, getLeadCard(trick));

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    const leadCard = getLeadCard(trick);

    if (leadCard === null) {
      // We are leading - play strategically
      return this.selectLeadCard(legalMoves, gameType);
    }

    // Following - try to win or minimize loss
    return this.selectFollowCard(legalMoves, trick, gameType, rule);
  }

  private selectLeadCard(legalMoves: Card[], gameType: GameType): Card {
    // Prefer leading with trump to draw out opponent's trump
    const trumpCards = legalMoves.filter((c) => isTrump(c, gameType));
    if (trumpCards.length > 0 && trumpCards.length <= 4) {
      // Lead trump if we have some but not too many
      return trumpCards[0];
    }

    // Lead with Aces (high value, likely to win)
    const aces = legalMoves.filter((c) => c.rank === Rank.Ace && !isJack(c));
    if (aces.length > 0) {
      return aces[0];
    }

    // Lead with low cards
    const lowCards = legalMoves
      .filter((c) => !isTrump(c, gameType))
      .sort((a, b) => getCardPoints(a) - getCardPoints(b));

    if (lowCards.length > 0) {
      return lowCards[0];
    }

    return legalMoves[0];
  }

  private selectFollowCard(
    legalMoves: Card[],
    trick: Trick,
    gameType: GameType,
    rule: SkatRule
  ): Card {
    const leadCard = getLeadCard(trick)!;

    // Calculate current winning card
    let winningCard = leadCard;
    for (const tc of trick.cards) {
      if (rule.compareCards(tc.card, winningCard, leadCard.suit) > 0) {
        winningCard = tc.card;
      }
    }

    // Try to win with minimum card
    const winningMoves = legalMoves.filter(
      (c) => rule.compareCards(c, winningCard, leadCard.suit) > 0
    );

    if (winningMoves.length > 0) {
      // Play lowest winning card
      winningMoves.sort((a, b) => {
        const orderA = rule.isTrump(a)
          ? rule.getTrumpOrder(a)
          : rule.getSuitOrder(a);
        const orderB = rule.isTrump(b)
          ? rule.getTrumpOrder(b)
          : rule.getSuitOrder(b);
        return orderA - orderB;
      });
      return winningMoves[0];
    }

    // Can't win - play lowest value card
    const sortedByPoints = [...legalMoves].sort(
      (a, b) => getCardPoints(a) - getCardPoints(b)
    );
    return sortedByPoints[0];
  }
}

// ============================================================================
// AI Factory
// ============================================================================

/**
 * AI difficulty levels.
 */
export enum AIDifficulty {
  Random = 0,
  Easy = 1,
  Medium = 2,
}

/**
 * Creates an AI player with the given difficulty.
 */
export function createAI(difficulty: AIDifficulty): AIPlayer {
  switch (difficulty) {
    case AIDifficulty.Random:
      return new RandomAI();
    case AIDifficulty.Easy:
    case AIDifficulty.Medium:
      return new BasicAI();
    default:
      return new BasicAI();
  }
}

/**
 * Default AI instances for quick access.
 */
export const AI = {
  random: new RandomAI(),
  basic: new BasicAI(),
};
