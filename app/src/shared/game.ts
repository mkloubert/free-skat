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
 * Game controller module - manages the complete game flow.
 */

import {
  Card,
  Hand,
  createDeck,
  shuffleDeck,
  removeCardFromHand,
  handContains,
  sortForGame,
} from "./card";
import { Player, ALL_PLAYERS, getLeftNeighbor } from "./player";
import { GameType } from "./gametype";
import { GameState } from "./gamestate";
import {
  Trick,
  createTrick,
  addCardToTrick,
  isTrickComplete,
  completeTrick,
  getTrickPoints,
  getNextPlayer,
  getLeadCard,
} from "./trick";
import { Skat, dealCards, pickupSkat, discardToSkat, DealResult } from "./skat";
import {
  BiddingState,
  createBiddingState,
  processBid,
  processHold,
  processPass,
  BiddingResult,
  BiddingAction,
} from "./bidding";
import { GameAnnouncement } from "./announcement";
import {
  SkatRule,
  getRule,
  GameModifiers,
  createDefaultModifiers,
  GameResult,
  calculateGameResult,
  RamschResult,
  calculateRamschResult,
} from "./rules";

/** Number of tricks in a Skat game */
export const TRICKS_PER_GAME = 10;

/** Total points in a Skat deck */
export const TOTAL_POINTS = 120;

/**
 * PlayerHands holds the hands for all three players.
 */
export interface PlayerHands {
  [Player.Forehand]: Hand;
  [Player.Middlehand]: Hand;
  [Player.Rearhand]: Hand;
}

/**
 * TrickPhaseState tracks the state during trick playing.
 */
export interface TrickPhaseState {
  /** Current trick number (1-10) */
  trickNumber: number;
  /** The current trick being played */
  currentTrick: Trick;
  /** All completed tricks */
  completedTricks: Trick[];
  /** Tricks won by declarer */
  declarerTricks: Trick[];
  /** Tricks won by opponents */
  opponentTricks: Trick[];
  /** Current points for declarer */
  declarerPoints: number;
  /** Current points for opponents */
  opponentPoints: number;
  /** Player whose turn it is */
  activePlayer: Player;
}

/**
 * SkatGame represents a complete Skat game instance.
 */
export interface SkatGame {
  /** Current game state */
  state: GameState;
  /** The dealer for this game */
  dealer: Player;
  /** Player hands */
  hands: PlayerHands;
  /** The skat */
  skat: Skat;
  /** Bidding state */
  bidding: BiddingState;
  /** The declarer (winner of bidding) */
  declarer: Player | null;
  /** The announced game */
  announcement: GameAnnouncement | null;
  /** The game type being played */
  gameType: GameType | null;
  /** Game modifiers */
  modifiers: GameModifiers;
  /** The rule implementation for current game type */
  rule: SkatRule | null;
  /** Trick playing state */
  trickPhase: TrickPhaseState | null;
  /** Final game result */
  result: GameResult | null;
  /** Ramsch result (if Ramsch was played) */
  ramschResult: RamschResult | null;
}

/**
 * Creates a new Skat game.
 */
export function createGame(dealer: Player): SkatGame {
  return {
    state: GameState.GameStart,
    dealer,
    hands: {
      [Player.Forehand]: { cards: [] },
      [Player.Middlehand]: { cards: [] },
      [Player.Rearhand]: { cards: [] },
    },
    skat: {
      cards: null,
      pickedUp: false,
      pickedUpBy: null,
      originalCards: null,
    },
    bidding: createBiddingState(),
    declarer: null,
    announcement: null,
    gameType: null,
    modifiers: createDefaultModifiers(),
    rule: null,
    trickPhase: null,
    result: null,
    ramschResult: null,
  };
}

/**
 * Deals cards for a new game.
 */
export function dealGame(game: SkatGame): SkatGame {
  if (game.state !== GameState.GameStart) {
    throw new Error("Can only deal at game start");
  }

  const deck = shuffleDeck(createDeck());
  const deal: DealResult = dealCards(deck);

  return {
    ...game,
    state: GameState.Dealing,
    hands: {
      [Player.Forehand]: deal.forehand,
      [Player.Middlehand]: deal.middlehand,
      [Player.Rearhand]: deal.rearhand,
    },
    skat: deal.skat,
  };
}

/**
 * Starts the bidding phase.
 */
export function startBidding(game: SkatGame): SkatGame {
  if (game.state !== GameState.Dealing) {
    throw new Error("Can only start bidding after dealing");
  }

  return {
    ...game,
    state: GameState.Bidding,
    bidding: createBiddingState(),
  };
}

/**
 * Processes a bidding action.
 */
export function handleBiddingAction(
  game: SkatGame,
  player: Player,
  action: BiddingAction,
  bidValue?: number
): SkatGame {
  if (game.state !== GameState.Bidding) {
    throw new Error("Not in bidding phase");
  }

  let newBidding: BiddingState;

  switch (action) {
    case BiddingAction.Bid:
      if (bidValue === undefined) {
        throw new Error("Bid value required for bid action");
      }
      newBidding = processBid(game.bidding, player, bidValue);
      break;
    case BiddingAction.Hold:
      newBidding = processHold(game.bidding, player);
      break;
    case BiddingAction.Pass:
      newBidding = processPass(game.bidding, player);
      break;
    default:
      throw new Error(`Unknown bidding action: ${action}`);
  }

  let newState: GameState = game.state;
  let newDeclarer: Player | null = game.declarer;

  // Check if bidding is complete
  if (newBidding.result === BiddingResult.HasDeclarer) {
    newState = GameState.PickingUpSkat;
    newDeclarer = newBidding.declarer;
  } else if (newBidding.result === BiddingResult.AllPassed) {
    // Ramsch will be played
    newState = GameState.TrickPlaying;
    newDeclarer = null;
  }

  return {
    ...game,
    state: newState,
    bidding: newBidding,
    declarer: newDeclarer,
  };
}

/**
 * Declarer picks up the skat.
 */
export function pickUpSkat(game: SkatGame): SkatGame {
  if (game.state !== GameState.PickingUpSkat) {
    throw new Error("Not in skat pickup phase");
  }

  if (game.declarer === null) {
    throw new Error("No declarer set");
  }

  const declarerHand = game.hands[game.declarer];
  const result = pickupSkat(game.skat, declarerHand, game.declarer);

  const newHands = { ...game.hands };
  newHands[game.declarer] = result.hand;

  return {
    ...game,
    state: GameState.Discarding,
    hands: newHands,
    skat: result.skat,
  };
}

/**
 * Declarer plays hand (doesn't pick up skat).
 */
export function playHand(game: SkatGame): SkatGame {
  if (game.state !== GameState.PickingUpSkat) {
    throw new Error("Not in skat pickup phase");
  }

  return {
    ...game,
    state: GameState.Declaring,
    modifiers: { ...game.modifiers, hand: true },
  };
}

/**
 * Declarer discards two cards to the skat.
 */
export function discardCards(
  game: SkatGame,
  card1: Card,
  card2: Card
): SkatGame {
  if (game.state !== GameState.Discarding) {
    throw new Error("Not in discarding phase");
  }

  if (game.declarer === null) {
    throw new Error("No declarer set");
  }

  const declarerHand = game.hands[game.declarer];
  const result = discardToSkat(game.skat, declarerHand, card1, card2);

  const newHands = { ...game.hands };
  newHands[game.declarer] = result.hand;

  return {
    ...game,
    state: GameState.Declaring,
    hands: newHands,
    skat: result.skat,
  };
}

/**
 * Declarer announces the game.
 */
export function announceGame(
  game: SkatGame,
  announcement: GameAnnouncement
): SkatGame {
  if (game.state !== GameState.Declaring) {
    throw new Error("Not in declaring phase");
  }

  const gameType = announcement.contract.gameType;
  const rule = getRule(gameType);

  // Sort hands for the game type
  const newHands: PlayerHands = {
    [Player.Forehand]: {
      cards: sortForGame(game.hands[Player.Forehand].cards, gameType),
    },
    [Player.Middlehand]: {
      cards: sortForGame(game.hands[Player.Middlehand].cards, gameType),
    },
    [Player.Rearhand]: {
      cards: sortForGame(game.hands[Player.Rearhand].cards, gameType),
    },
  };

  // Initialize trick phase
  const forehand = getLeftNeighbor(game.dealer);
  const trickPhase = createTrickPhaseState(forehand);

  return {
    ...game,
    state: GameState.TrickPlaying,
    hands: newHands,
    announcement,
    gameType,
    modifiers: {
      ...game.modifiers,
      hand: announcement.contract.hand,
      schneiderAnnounced: announcement.contract.schneider,
      schwarzAnnounced: announcement.contract.schwarz,
      ouvert: announcement.contract.ouvert,
    },
    rule,
    trickPhase,
  };
}

/**
 * Creates initial trick phase state.
 */
function createTrickPhaseState(forehand: Player): TrickPhaseState {
  return {
    trickNumber: 1,
    currentTrick: createTrick(forehand),
    completedTricks: [],
    declarerTricks: [],
    opponentTricks: [],
    declarerPoints: 0,
    opponentPoints: 0,
    activePlayer: forehand,
  };
}

/**
 * Starts Ramsch game (when all players pass).
 */
export function startRamsch(game: SkatGame): SkatGame {
  if (game.bidding.result !== BiddingResult.AllPassed) {
    throw new Error("Ramsch only when all players pass");
  }

  const gameType = GameType.Ramsch;
  const rule = getRule(gameType);

  // Sort hands for Ramsch (like Grand)
  const newHands: PlayerHands = {
    [Player.Forehand]: {
      cards: sortForGame(game.hands[Player.Forehand].cards, gameType),
    },
    [Player.Middlehand]: {
      cards: sortForGame(game.hands[Player.Middlehand].cards, gameType),
    },
    [Player.Rearhand]: {
      cards: sortForGame(game.hands[Player.Rearhand].cards, gameType),
    },
  };

  const forehand = getLeftNeighbor(game.dealer);
  const trickPhase = createTrickPhaseState(forehand);

  return {
    ...game,
    state: GameState.TrickPlaying,
    hands: newHands,
    gameType,
    rule,
    trickPhase,
    declarer: null, // No declarer in Ramsch
  };
}

/**
 * Plays a card in the current trick.
 */
export function playCard(game: SkatGame, player: Player, card: Card): SkatGame {
  if (game.state !== GameState.TrickPlaying) {
    throw new Error("Not in trick playing phase");
  }

  if (
    game.trickPhase === null ||
    game.rule === null ||
    game.gameType === null
  ) {
    throw new Error("Trick phase not initialized");
  }

  if (player !== game.trickPhase.activePlayer) {
    throw new Error(`Not ${player}'s turn`);
  }

  const hand = game.hands[player];

  // Validate card is in hand
  if (!handContains(hand, card)) {
    throw new Error("Card not in hand");
  }

  // Validate card is legal to play
  const leadCard = getLeadCard(game.trickPhase.currentTrick);
  if (!game.rule.canPlayCard(card, leadCard, hand)) {
    throw new Error("Illegal card play");
  }

  // Remove card from hand
  const newHand: Hand = { cards: [...hand.cards] };
  removeCardFromHand(newHand, card);

  const newHands = { ...game.hands };
  newHands[player] = newHand;

  // Add card to trick
  const newTrick = {
    ...game.trickPhase.currentTrick,
    cards: [...game.trickPhase.currentTrick.cards],
  };
  addCardToTrick(newTrick, card, player);

  // Check if trick is complete
  let newTrickPhase: TrickPhaseState;

  if (isTrickComplete(newTrick)) {
    newTrickPhase = completeTrickAndAdvance(
      game.trickPhase,
      newTrick,
      game.gameType,
      game.declarer
    );
  } else {
    // Move to next player
    const nextPlayer = getNextPlayer(newTrick);
    newTrickPhase = {
      ...game.trickPhase,
      currentTrick: newTrick,
      activePlayer: nextPlayer!,
    };
  }

  // Check if game is over
  let newState: GameState = game.state;
  if (newTrickPhase.trickNumber > TRICKS_PER_GAME) {
    newState = GameState.PreliminaryGameEnd;
  }

  return {
    ...game,
    state: newState,
    hands: newHands,
    trickPhase: newTrickPhase,
  };
}

/**
 * Completes a trick and sets up the next one.
 */
function completeTrickAndAdvance(
  trickPhase: TrickPhaseState,
  trick: Trick,
  gameType: GameType,
  declarer: Player | null
): TrickPhaseState {
  // Determine winner
  completeTrick(trick, gameType);
  const winner = trick.winner!;

  // Calculate points
  const trickPoints = getTrickPoints(trick);

  // Update points based on who won
  let declarerPoints = trickPhase.declarerPoints;
  let opponentPoints = trickPhase.opponentPoints;
  const declarerTricks = [...trickPhase.declarerTricks];
  const opponentTricks = [...trickPhase.opponentTricks];

  if (declarer !== null) {
    if (winner === declarer) {
      declarerPoints += trickPoints;
      declarerTricks.push(trick);
    } else {
      opponentPoints += trickPoints;
      opponentTricks.push(trick);
    }
  }

  const completedTricks = [...trickPhase.completedTricks, trick];
  const nextTrickNumber = trickPhase.trickNumber + 1;

  return {
    trickNumber: nextTrickNumber,
    currentTrick: createTrick(winner), // Winner leads next trick
    completedTricks,
    declarerTricks,
    opponentTricks,
    declarerPoints,
    opponentPoints,
    activePlayer: winner,
  };
}

/**
 * Calculates the final game result.
 */
export function finalizeGame(game: SkatGame): SkatGame {
  if (game.state !== GameState.PreliminaryGameEnd) {
    throw new Error("Game not ready for finalization");
  }

  if (game.trickPhase === null || game.gameType === null) {
    throw new Error("Game state incomplete");
  }

  let newGame = { ...game, state: GameState.CalculatingGameValue };

  // Handle Ramsch separately
  if (game.gameType === GameType.Ramsch) {
    const playerTricks = new Map<Player, Trick[]>();

    // Group tricks by winner
    for (const player of ALL_PLAYERS) {
      playerTricks.set(player, []);
    }
    for (const trick of game.trickPhase.completedTricks) {
      if (trick.winner !== null) {
        playerTricks.get(trick.winner)!.push(trick);
      }
    }

    const ramschResult = calculateRamschResult(playerTricks);

    newGame = {
      ...newGame,
      state: GameState.GameOver,
      ramschResult,
    };
  } else {
    // Normal game
    if (game.declarer === null || game.announcement === null) {
      throw new Error("Missing declarer or announcement");
    }

    // Collect declarer's cards (original hand + skat)
    const declarerOriginalHand = game.announcement.discardedCards
      ? [
          ...game.hands[game.declarer].cards,
          ...game.announcement.discardedCards,
        ]
      : game.hands[game.declarer].cards;

    const skatCards = game.skat.cards || [];

    const result = calculateGameResult(
      game.gameType,
      game.declarer,
      declarerOriginalHand,
      skatCards,
      game.trickPhase.declarerTricks,
      game.bidding.finalBid,
      game.modifiers
    );

    newGame = {
      ...newGame,
      state: GameState.GameOver,
      result,
    };
  }

  return newGame;
}

/**
 * Gets the legal moves for the current player.
 */
export function getLegalMoves(game: SkatGame): Card[] {
  if (game.state !== GameState.TrickPlaying) {
    return [];
  }

  if (game.trickPhase === null || game.rule === null) {
    return [];
  }

  const hand = game.hands[game.trickPhase.activePlayer];
  const leadCard = getLeadCard(game.trickPhase.currentTrick);

  return game.rule.getLegalMoves(hand, leadCard);
}

/**
 * Gets points for each player in Ramsch.
 */
export function getRamschPoints(game: SkatGame): Map<Player, number> {
  const points = new Map<Player, number>();

  if (game.trickPhase === null) {
    for (const player of ALL_PLAYERS) {
      points.set(player, 0);
    }
    return points;
  }

  // Initialize
  for (const player of ALL_PLAYERS) {
    points.set(player, 0);
  }

  // Count points from tricks
  for (const trick of game.trickPhase.completedTricks) {
    if (trick.winner !== null) {
      const trickPoints = getTrickPoints(trick);
      points.set(trick.winner, points.get(trick.winner)! + trickPoints);
    }
  }

  return points;
}

/**
 * Returns a summary of the current game state.
 */
export function getGameSummary(game: SkatGame): string {
  const lines: string[] = [];

  lines.push(`State: ${GameState[game.state]}`);
  lines.push(`Dealer: ${Player[game.dealer]}`);

  if (game.declarer !== null) {
    lines.push(`Declarer: ${Player[game.declarer]}`);
  }

  if (game.gameType !== null) {
    lines.push(`Game Type: ${GameType[game.gameType]}`);
  }

  if (game.trickPhase !== null) {
    lines.push(`Trick: ${game.trickPhase.trickNumber}/${TRICKS_PER_GAME}`);
    lines.push(`Declarer Points: ${game.trickPhase.declarerPoints}`);
    lines.push(`Opponent Points: ${game.trickPhase.opponentPoints}`);
    lines.push(`Active Player: ${Player[game.trickPhase.activePlayer]}`);
  }

  if (game.result !== null) {
    lines.push(`Result: ${game.result.declarerWon ? "Won" : "Lost"}`);
    lines.push(`Score: ${game.result.score}`);
  }

  return lines.join("\n");
}

/**
 * Advances the dealer for the next game.
 */
export function getNextDealer(currentDealer: Player): Player {
  return getLeftNeighbor(currentDealer);
}
