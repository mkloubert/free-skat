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
 * Skat rules module - provides rule implementations for all game types.
 */

import {
  Card,
  Hand,
  isTrump,
  getTrumpOrder,
  getSuitOrder,
  compareCards,
  canPlayCard,
  isJack,
  getCardPoints,
} from "./card";
import { Suit } from "./suit";
import { Rank } from "./rank";
import {
  GameType,
  isNull,
  isGrand,
  isSuitGame,
  isRamsch,
  getTrumpSuit,
  getGameTypeBaseValue,
} from "./gametype";
import { Trick, getLeadCard, getTrickPoints } from "./trick";
import { Player } from "./player";

/**
 * SkatRule interface defines the contract for game rule implementations.
 */
export interface SkatRule {
  /** The game type this rule handles */
  readonly gameType: GameType;

  /** Returns true if the card is a trump card */
  isTrump(card: Card): boolean;

  /** Returns the trump order value (higher = stronger) */
  getTrumpOrder(card: Card): number;

  /** Returns the suit order value for non-trump cards */
  getSuitOrder(card: Card): number;

  /** Compares two cards to determine trick winner */
  compareCards(card1: Card, card2: Card, leadSuit: Suit): number;

  /** Checks if a card can legally be played */
  canPlayCard(card: Card, leadCard: Card | null, hand: Hand): boolean;

  /** Returns all legal moves for the current hand and lead card */
  getLegalMoves(hand: Hand, leadCard: Card | null): Card[];

  /** Calculates points won by declarer */
  calculateDeclarerPoints(declarerTricks: Trick[]): number;

  /** Determines if declarer won the game */
  isDeclarerWinner(declarerPoints: number, declarerTrickCount: number): boolean;

  /** Calculates the game multiplier (matadors + modifiers) */
  calculateMultiplier(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number;

  /** Calculates the final game value */
  calculateGameValue(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number;
}

/**
 * Game modifiers that affect scoring.
 */
export interface GameModifiers {
  hand: boolean;
  schneider: boolean;
  schneiderAnnounced: boolean;
  schwarz: boolean;
  schwarzAnnounced: boolean;
  ouvert: boolean;
}

/**
 * Creates default game modifiers.
 */
export function createDefaultModifiers(): GameModifiers {
  return {
    hand: false,
    schneider: false,
    schneiderAnnounced: false,
    schwarz: false,
    schwarzAnnounced: false,
    ouvert: false,
  };
}

/**
 * Abstract base class for Skat rules with common functionality.
 */
abstract class BaseSkatRule implements SkatRule {
  abstract readonly gameType: GameType;

  isTrump(card: Card): boolean {
    return isTrump(card, this.gameType);
  }

  getTrumpOrder(card: Card): number {
    return getTrumpOrder(card, this.gameType);
  }

  getSuitOrder(card: Card): number {
    return getSuitOrder(card, this.gameType);
  }

  compareCards(card1: Card, card2: Card, leadSuit: Suit): number {
    return compareCards(card1, card2, leadSuit, this.gameType);
  }

  canPlayCard(card: Card, leadCard: Card | null, hand: Hand): boolean {
    return canPlayCard(card, leadCard, hand, this.gameType);
  }

  getLegalMoves(hand: Hand, leadCard: Card | null): Card[] {
    return hand.cards.filter((card) => this.canPlayCard(card, leadCard, hand));
  }

  calculateDeclarerPoints(declarerTricks: Trick[]): number {
    return declarerTricks.reduce(
      (sum, trick) => sum + getTrickPoints(trick),
      0
    );
  }

  abstract isDeclarerWinner(
    declarerPoints: number,
    declarerTrickCount: number
  ): boolean;

  abstract calculateMultiplier(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number;

  abstract calculateGameValue(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number;
}

/**
 * Rule implementation for Suit games (Clubs, Spades, Hearts, Diamonds).
 */
class SuitRule extends BaseSkatRule {
  readonly gameType: GameType;

  constructor(gameType: GameType) {
    super();
    if (!isSuitGame(gameType)) {
      throw new Error(`Invalid game type for SuitRule: ${gameType}`);
    }
    this.gameType = gameType;
  }

  isDeclarerWinner(
    declarerPoints: number,
    declarerTrickCount: number
  ): boolean {
    // Declarer needs 61+ points to win
    return declarerPoints >= 61;
  }

  calculateMultiplier(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number {
    const matadors = this.countMatadors(declarerHand, skatCards);
    let multiplier = Math.abs(matadors) + 1; // "with" or "without" X, game

    if (modifiers.hand) multiplier++;
    if (modifiers.schneider) multiplier++;
    if (modifiers.schneiderAnnounced) multiplier++;
    if (modifiers.schwarz) multiplier++;
    if (modifiers.schwarzAnnounced) multiplier++;
    if (modifiers.ouvert) multiplier++;

    return multiplier;
  }

  calculateGameValue(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number {
    const baseValue = getGameTypeBaseValue(this.gameType);
    const multiplier = this.calculateMultiplier(
      declarerHand,
      skatCards,
      modifiers
    );
    return baseValue * multiplier;
  }

  /**
   * Counts matadors (consecutive jacks + trump suit cards from top).
   * Positive = "with", negative = "without".
   */
  private countMatadors(declarerHand: Card[], skatCards: Card[]): number {
    const allCards = [...declarerHand, ...skatCards];
    const trumpSuit = getTrumpSuit(this.gameType);

    // Jack order: CJ, SJ, HJ, DJ
    const jackSuits = [Suit.Clubs, Suit.Spades, Suit.Hearts, Suit.Diamonds];

    // Check if we have Club Jack (highest)
    const hasClubJack = allCards.some(
      (c) => c.rank === Rank.Jack && c.suit === Suit.Clubs
    );

    let matadors = 0;

    if (hasClubJack) {
      // Count "with" - consecutive jacks we have
      matadors = 1;
      for (let i = 1; i < jackSuits.length; i++) {
        const hasJack = allCards.some(
          (c) => c.rank === Rank.Jack && c.suit === jackSuits[i]
        );
        if (hasJack) {
          matadors++;
        } else {
          break;
        }
      }

      // Continue with trump suit cards if we have all 4 jacks
      if (matadors === 4 && trumpSuit !== null) {
        const trumpRanks = [
          Rank.Ace,
          Rank.Ten,
          Rank.King,
          Rank.Queen,
          Rank.Nine,
          Rank.Eight,
          Rank.Seven,
        ];
        for (const rank of trumpRanks) {
          const hasTrumpCard = allCards.some(
            (c) => c.rank === rank && c.suit === trumpSuit
          );
          if (hasTrumpCard) {
            matadors++;
          } else {
            break;
          }
        }
      }
    } else {
      // Count "without" - consecutive jacks we don't have
      matadors = -1;
      for (let i = 1; i < jackSuits.length; i++) {
        const hasJack = allCards.some(
          (c) => c.rank === Rank.Jack && c.suit === jackSuits[i]
        );
        if (!hasJack) {
          matadors--;
        } else {
          break;
        }
      }
    }

    return matadors;
  }
}

/**
 * Rule implementation for Grand games (only Jacks are trump).
 */
class GrandRule extends BaseSkatRule {
  readonly gameType = GameType.Grand;

  isDeclarerWinner(
    declarerPoints: number,
    declarerTrickCount: number
  ): boolean {
    return declarerPoints >= 61;
  }

  calculateMultiplier(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number {
    const matadors = this.countMatadors(declarerHand, skatCards);
    let multiplier = Math.abs(matadors) + 1;

    if (modifiers.hand) multiplier++;
    if (modifiers.schneider) multiplier++;
    if (modifiers.schneiderAnnounced) multiplier++;
    if (modifiers.schwarz) multiplier++;
    if (modifiers.schwarzAnnounced) multiplier++;
    if (modifiers.ouvert) multiplier++;

    return multiplier;
  }

  calculateGameValue(
    declarerHand: Card[],
    skatCards: Card[],
    modifiers: GameModifiers
  ): number {
    const baseValue = getGameTypeBaseValue(GameType.Grand); // 24
    const multiplier = this.calculateMultiplier(
      declarerHand,
      skatCards,
      modifiers
    );
    return baseValue * multiplier;
  }

  /**
   * Counts matadors for Grand (only Jacks count).
   */
  private countMatadors(declarerHand: Card[], skatCards: Card[]): number {
    const allCards = [...declarerHand, ...skatCards];
    const jackSuits = [Suit.Clubs, Suit.Spades, Suit.Hearts, Suit.Diamonds];

    const hasClubJack = allCards.some(
      (c) => c.rank === Rank.Jack && c.suit === Suit.Clubs
    );

    let matadors = 0;

    if (hasClubJack) {
      matadors = 1;
      for (let i = 1; i < jackSuits.length; i++) {
        const hasJack = allCards.some(
          (c) => c.rank === Rank.Jack && c.suit === jackSuits[i]
        );
        if (hasJack) {
          matadors++;
        } else {
          break;
        }
      }
    } else {
      matadors = -1;
      for (let i = 1; i < jackSuits.length; i++) {
        const hasJack = allCards.some(
          (c) => c.rank === Rank.Jack && c.suit === jackSuits[i]
        );
        if (!hasJack) {
          matadors--;
        } else {
          break;
        }
      }
    }

    return matadors;
  }
}

/**
 * Rule implementation for Null games (no trump, declarer must take no tricks).
 */
class NullRule extends BaseSkatRule {
  readonly gameType = GameType.Null;

  isDeclarerWinner(
    declarerPoints: number,
    declarerTrickCount: number
  ): boolean {
    // Declarer wins if they take NO tricks
    return declarerTrickCount === 0;
  }

  calculateMultiplier(
    _declarerHand: Card[],
    _skatCards: Card[],
    _modifiers: GameModifiers
  ): number {
    // Null games don't use multipliers
    return 1;
  }

  calculateGameValue(
    _declarerHand: Card[],
    _skatCards: Card[],
    modifiers: GameModifiers
  ): number {
    // Null games have fixed values
    if (modifiers.hand && modifiers.ouvert) {
      return 59; // Null Hand Ouvert
    }
    if (modifiers.ouvert) {
      return 46; // Null Ouvert
    }
    if (modifiers.hand) {
      return 35; // Null Hand
    }
    return 23; // Null
  }
}

/**
 * Rule implementation for Ramsch (everyone tries to take fewest points).
 */
class RamschRule extends BaseSkatRule {
  readonly gameType = GameType.Ramsch;

  // In Ramsch, Jacks are trump like in Grand
  isTrump(card: Card): boolean {
    return isJack(card);
  }

  isDeclarerWinner(
    _declarerPoints: number,
    _declarerTrickCount: number
  ): boolean {
    // Ramsch doesn't have a declarer in the traditional sense
    // The player with the most points loses
    return false;
  }

  calculateMultiplier(
    _declarerHand: Card[],
    _skatCards: Card[],
    _modifiers: GameModifiers
  ): number {
    return 1;
  }

  calculateGameValue(
    _declarerHand: Card[],
    _skatCards: Card[],
    _modifiers: GameModifiers
  ): number {
    // Ramsch value depends on the loser's points
    // This is calculated at game end
    return 0;
  }
}

/**
 * RamschResult for determining Ramsch game outcome.
 */
export interface RamschResult {
  /** Player who lost (took most points) */
  loser: Player;
  /** Points taken by each player */
  playerPoints: Map<Player, number>;
  /** The loser's final score (negative) */
  loserScore: number;
  /** True if someone achieved Durchmarsch (won all tricks) */
  durchmarsch: boolean;
  /** Player who achieved Durchmarsch, if any */
  durchmarschPlayer: Player | null;
  /** Players who achieved Jungfrau (0 points) */
  jungfrauPlayers: Player[];
}

/**
 * Calculates Ramsch result from player tricks.
 */
export function calculateRamschResult(
  playerTricks: Map<Player, Trick[]>
): RamschResult {
  const playerPoints = new Map<Player, number>();
  let maxPoints = -1;
  let loser: Player = Player.Forehand;
  let durchmarsch = false;
  let durchmarschPlayer: Player | null = null;
  const jungfrauPlayers: Player[] = [];

  // Calculate points for each player
  for (const [player, tricks] of playerTricks) {
    const points = tricks.reduce(
      (sum, trick) => sum + getTrickPoints(trick),
      0
    );
    playerPoints.set(player, points);

    // Check for Durchmarsch (all 120 points = all tricks)
    if (points === 120) {
      durchmarsch = true;
      durchmarschPlayer = player;
    }

    // Check for Jungfrau
    if (points === 0) {
      jungfrauPlayers.push(player);
    }

    // Track loser
    if (points > maxPoints) {
      maxPoints = points;
      loser = player;
    }
  }

  // Calculate score
  let loserScore: number;
  if (durchmarsch) {
    // Durchmarsch: Winner gets +120
    loserScore = 0; // No loser in this case
  } else {
    // Normal Ramsch: Loser gets negative points
    loserScore = -maxPoints;

    // Double if Jungfrau (someone took 0 points)
    if (jungfrauPlayers.length > 0) {
      loserScore *= 2;
    }
  }

  return {
    loser,
    playerPoints,
    loserScore,
    durchmarsch,
    durchmarschPlayer,
    jungfrauPlayers,
  };
}

// ============================================================================
// Rule Factory
// ============================================================================

/**
 * Cache for rule instances (singleton per game type).
 */
const ruleCache = new Map<GameType, SkatRule>();

/**
 * Gets the rule implementation for a game type.
 */
export function getRule(gameType: GameType): SkatRule {
  // Check cache first
  let rule = ruleCache.get(gameType);
  if (rule) {
    return rule;
  }

  // Create new rule instance
  if (isSuitGame(gameType)) {
    rule = new SuitRule(gameType);
  } else if (isGrand(gameType)) {
    rule = new GrandRule();
  } else if (isNull(gameType)) {
    rule = new NullRule();
  } else if (isRamsch(gameType)) {
    rule = new RamschRule();
  } else {
    throw new Error(`Unknown game type: ${gameType}`);
  }

  // Cache and return
  ruleCache.set(gameType, rule);
  return rule;
}

/**
 * Clears the rule cache (useful for testing).
 */
export function clearRuleCache(): void {
  ruleCache.clear();
}

// ============================================================================
// Scoring Helpers
// ============================================================================

/**
 * Determines if Schneider was achieved (90+ points).
 */
export function isSchneider(points: number): boolean {
  return points >= 90;
}

/**
 * Determines if Schwarz was achieved (all tricks).
 */
export function isSchwarz(trickCount: number): boolean {
  return trickCount === 10;
}

/**
 * Determines if declarer was Schneider'd (less than 31 points).
 */
export function isDeclarerSchneider(declarerPoints: number): boolean {
  return declarerPoints < 31;
}

/**
 * Determines if declarer was Schwarz'd (0 tricks).
 */
export function isDeclarerSchwarz(declarerTrickCount: number): boolean {
  return declarerTrickCount === 0;
}

/**
 * GameResult represents the outcome of a completed game.
 */
export interface GameResult {
  /** The game type played */
  gameType: GameType;
  /** The declarer (null for Ramsch) */
  declarer: Player | null;
  /** Whether declarer won */
  declarerWon: boolean;
  /** Points taken by declarer */
  declarerPoints: number;
  /** Tricks won by declarer */
  declarerTricks: number;
  /** The bid value */
  bidValue: number;
  /** The calculated game value */
  gameValue: number;
  /** Whether declarer overbid */
  overbid: boolean;
  /** Final score (positive for win, negative for loss) */
  score: number;
  /** Schneider achieved */
  schneider: boolean;
  /** Schwarz achieved */
  schwarz: boolean;
  /** Modifiers that were in effect */
  modifiers: GameModifiers;
}

/**
 * Calculates the final game result.
 */
export function calculateGameResult(
  gameType: GameType,
  declarer: Player,
  declarerHand: Card[],
  skatCards: Card[],
  declarerTricks: Trick[],
  bidValue: number,
  modifiers: GameModifiers
): GameResult {
  const rule = getRule(gameType);

  const declarerPoints = rule.calculateDeclarerPoints(declarerTricks);
  const declarerTrickCount = declarerTricks.length;
  const declarerWon = rule.isDeclarerWinner(declarerPoints, declarerTrickCount);

  // Update modifiers with achieved schneider/schwarz
  const achievedSchneider = isSchneider(declarerPoints);
  const achievedSchwarz = isSchwarz(declarerTrickCount);

  const finalModifiers: GameModifiers = {
    ...modifiers,
    schneider: achievedSchneider || modifiers.schneiderAnnounced,
    schwarz: achievedSchwarz || modifiers.schwarzAnnounced,
  };

  // Calculate game value
  const gameValue = rule.calculateGameValue(
    declarerHand,
    skatCards,
    finalModifiers
  );

  // Check overbid
  const overbid = gameValue < bidValue;

  // Calculate score
  let score: number;
  if (overbid) {
    // Overbid: Lose double the bid value
    score = -2 * bidValue;
  } else if (declarerWon) {
    score = gameValue;
  } else {
    // Lost: Negative double the game value
    score = -2 * gameValue;
  }

  return {
    gameType,
    declarer,
    declarerWon: declarerWon && !overbid,
    declarerPoints,
    declarerTricks: declarerTrickCount,
    bidValue,
    gameValue,
    overbid,
    score,
    schneider: achievedSchneider,
    schwarz: achievedSchwarz,
    modifiers: finalModifiers,
  };
}
