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
 * Game controller that integrates game logic, AI, and UI.
 */

import {
  Player,
  GameState,
  GameType,
  Card,
  SkatGame,
  createGame,
  dealGame,
  startBidding,
  handleBiddingAction,
  pickUpSkat,
  playHand,
  discardCards,
  announceGame,
  startRamsch,
  playCard,
  finalizeGame,
  getLegalMoves,
  getNextDealer,
  BiddingAction,
  BiddingResult,
  AIPlayer,
  AI,
  evaluateHand,
  GameAnnouncement,
  Contract,
} from "../../shared";

/** Delay between AI actions in milliseconds */
const AI_DELAY = 800;

/** Event types emitted by the game controller */
export type GameEventType =
  | "gameStart"
  | "deal"
  | "biddingStart"
  | "bid"
  | "hold"
  | "pass"
  | "skatPickup"
  | "skatDecline"
  | "discard"
  | "announce"
  | "trickStart"
  | "cardPlayed"
  | "trickComplete"
  | "gameEnd"
  | "stateChange";

/** Event handler type */
export type GameEventHandler = (event: GameEvent) => void;

/** Game event data */
export interface GameEvent {
  type: GameEventType;
  game: SkatGame;
  player?: Player;
  card?: Card;
  bidValue?: number;
}

/**
 * GameController manages the game flow, AI players, and event emission.
 */
export class GameController {
  private game: SkatGame;
  private humanPlayer: Player;
  private aiPlayers: Map<Player, AIPlayer>;
  private eventHandlers: GameEventHandler[] = [];
  private isProcessing = false;
  private aiDelay: number;

  constructor(
    humanPlayer: Player = Player.Forehand,
    aiDifficulty: "random" | "basic" = "basic",
    aiDelay = AI_DELAY
  ) {
    this.humanPlayer = humanPlayer;
    this.aiDelay = aiDelay;

    // Initialize AI players for non-human positions
    this.aiPlayers = new Map();
    for (const player of [
      Player.Forehand,
      Player.Middlehand,
      Player.Rearhand,
    ]) {
      if (player !== humanPlayer) {
        this.aiPlayers.set(
          player,
          aiDifficulty === "random" ? AI.random : AI.basic
        );
      }
    }

    // Start with Rearhand as dealer (so Forehand leads first)
    this.game = createGame(Player.Rearhand);
  }

  /** Get the current game state */
  getGame(): SkatGame {
    return this.game;
  }

  /** Get the human player position */
  getHumanPlayer(): Player {
    return this.humanPlayer;
  }

  /** Subscribe to game events */
  on(handler: GameEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /** Emit a game event */
  private emit(event: GameEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  /** Update game state and emit event */
  private updateGame(
    newGame: SkatGame,
    eventType: GameEventType,
    extra?: Partial<GameEvent>
  ): void {
    this.game = newGame;
    this.emit({ type: eventType, game: newGame, ...extra });
    this.emit({ type: "stateChange", game: newGame });
  }

  /** Start a new game */
  async startNewGame(): Promise<void> {
    // Create game with next dealer
    const dealer =
      this.game.state === GameState.GameOver
        ? getNextDealer(this.game.dealer)
        : this.game.dealer;

    this.game = createGame(dealer);
    this.emit({ type: "gameStart", game: this.game });

    // Deal cards
    this.game = dealGame(this.game);
    this.emit({ type: "deal", game: this.game });

    // Start bidding
    this.game = startBidding(this.game);
    this.emit({ type: "biddingStart", game: this.game });
    this.emit({ type: "stateChange", game: this.game });

    // Process AI bidding
    await this.processAIActions();
  }

  /** Process AI actions until it's the human's turn or game ends */
  private async processAIActions(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.shouldAIAct()) {
        await this.delay(this.aiDelay);
        await this.performAIAction();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /** Check if AI should act */
  private shouldAIAct(): boolean {
    const state = this.game.state;

    if (state === GameState.Bidding) {
      return (
        this.game.bidding.activePlayer !== this.humanPlayer &&
        this.game.bidding.result === BiddingResult.InProgress
      );
    }

    if (state === GameState.PickingUpSkat) {
      return this.game.declarer !== this.humanPlayer;
    }

    if (state === GameState.Discarding) {
      return this.game.declarer !== this.humanPlayer;
    }

    if (state === GameState.Declaring) {
      return this.game.declarer !== this.humanPlayer;
    }

    if (state === GameState.TrickPlaying) {
      return this.game.trickPhase?.activePlayer !== this.humanPlayer;
    }

    if (state === GameState.PreliminaryGameEnd) {
      return true; // Always finalize game
    }

    return false;
  }

  /** Perform a single AI action */
  private async performAIAction(): Promise<void> {
    const state = this.game.state;

    if (state === GameState.Bidding) {
      await this.performAIBidding();
    } else if (state === GameState.PickingUpSkat) {
      await this.performAISkatDecision();
    } else if (state === GameState.Discarding) {
      await this.performAIDiscard();
    } else if (state === GameState.Declaring) {
      await this.performAIAnnouncement();
    } else if (state === GameState.TrickPlaying) {
      await this.performAICardPlay();
    } else if (state === GameState.PreliminaryGameEnd) {
      this.finalizeCurrentGame();
    }

    // Handle Ramsch start after all pass
    if (
      this.game.state === GameState.TrickPlaying &&
      this.game.bidding.result === BiddingResult.AllPassed &&
      this.game.trickPhase === null
    ) {
      this.game = startRamsch(this.game);
      this.emit({ type: "stateChange", game: this.game });
    }
  }

  /** AI bidding action */
  private async performAIBidding(): Promise<void> {
    const player = this.game.bidding.activePlayer;
    const ai = this.aiPlayers.get(player);
    if (!ai) return;

    const hand = this.game.hands[player];
    const decision = ai.decideBid(hand, this.game.bidding, player);

    if (decision.action === BiddingAction.Bid && decision.bidValue) {
      this.game = handleBiddingAction(
        this.game,
        player,
        BiddingAction.Bid,
        decision.bidValue
      );
      this.emit({
        type: "bid",
        game: this.game,
        player,
        bidValue: decision.bidValue,
      });
    } else if (decision.action === BiddingAction.Hold) {
      this.game = handleBiddingAction(this.game, player, BiddingAction.Hold);
      this.emit({ type: "hold", game: this.game, player });
    } else {
      this.game = handleBiddingAction(this.game, player, BiddingAction.Pass);
      this.emit({ type: "pass", game: this.game, player });
    }

    this.emit({ type: "stateChange", game: this.game });
  }

  /** AI skat pickup decision */
  private async performAISkatDecision(): Promise<void> {
    const declarer = this.game.declarer;
    if (declarer === null) return;

    const ai = this.aiPlayers.get(declarer);
    if (!ai) return;

    const hand = this.game.hands[declarer];
    const shouldPickup = ai.decidePickupSkat(hand);

    if (shouldPickup) {
      this.game = pickUpSkat(this.game);
      this.emit({ type: "skatPickup", game: this.game, player: declarer });
    } else {
      this.game = playHand(this.game);
      this.emit({ type: "skatDecline", game: this.game, player: declarer });
    }

    this.emit({ type: "stateChange", game: this.game });
  }

  /** AI discard decision */
  private async performAIDiscard(): Promise<void> {
    const declarer = this.game.declarer;
    if (declarer === null) return;

    const ai = this.aiPlayers.get(declarer);
    if (!ai) return;

    const hand = this.game.hands[declarer];
    // For AI, assume they'll play their best game type
    const evaluation = evaluateHand(hand);
    const gameType = evaluation.bestGameType || GameType.Grand;

    const [card1, card2] = ai.selectDiscards(hand, gameType);
    this.game = discardCards(this.game, card1, card2);
    this.emit({ type: "discard", game: this.game, player: declarer });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** AI announcement decision */
  private async performAIAnnouncement(): Promise<void> {
    const declarer = this.game.declarer;
    if (declarer === null) return;

    const ai = this.aiPlayers.get(declarer);
    if (!ai) return;

    const hand = this.game.hands[declarer];
    const bidValue = this.game.bidding.finalBid;
    const isHand = this.game.modifiers.hand;

    const announcement = ai.decideAnnouncement(hand, bidValue, isHand);
    this.game = announceGame(this.game, announcement);
    this.emit({ type: "announce", game: this.game, player: declarer });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** AI card play */
  private async performAICardPlay(): Promise<void> {
    if (!this.game.trickPhase || !this.game.rule || !this.game.gameType) return;

    const player = this.game.trickPhase.activePlayer;
    const ai = this.aiPlayers.get(player);
    if (!ai) return;

    const hand = this.game.hands[player];
    const trick = this.game.trickPhase.currentTrick;

    const card = ai.selectCard(hand, trick, this.game.gameType, this.game.rule);
    this.game = playCard(this.game, player, card);
    this.emit({ type: "cardPlayed", game: this.game, player, card });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** Finalize the game */
  private finalizeCurrentGame(): void {
    this.game = finalizeGame(this.game);
    this.emit({ type: "gameEnd", game: this.game });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** Delay helper */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // === Human player actions ===

  /** Human places a bid */
  async humanBid(value: number): Promise<void> {
    if (this.game.state !== GameState.Bidding) return;
    if (this.game.bidding.activePlayer !== this.humanPlayer) return;

    this.game = handleBiddingAction(
      this.game,
      this.humanPlayer,
      BiddingAction.Bid,
      value
    );
    this.emit({
      type: "bid",
      game: this.game,
      player: this.humanPlayer,
      bidValue: value,
    });
    this.emit({ type: "stateChange", game: this.game });

    await this.processAIActions();
  }

  /** Human holds */
  async humanHold(): Promise<void> {
    if (this.game.state !== GameState.Bidding) return;
    if (this.game.bidding.activePlayer !== this.humanPlayer) return;

    this.game = handleBiddingAction(
      this.game,
      this.humanPlayer,
      BiddingAction.Hold
    );
    this.emit({ type: "hold", game: this.game, player: this.humanPlayer });
    this.emit({ type: "stateChange", game: this.game });

    await this.processAIActions();
  }

  /** Human passes */
  async humanPass(): Promise<void> {
    if (this.game.state !== GameState.Bidding) return;
    if (this.game.bidding.activePlayer !== this.humanPlayer) return;

    this.game = handleBiddingAction(
      this.game,
      this.humanPlayer,
      BiddingAction.Pass
    );
    this.emit({ type: "pass", game: this.game, player: this.humanPlayer });
    this.emit({ type: "stateChange", game: this.game });

    await this.processAIActions();
  }

  /** Human picks up skat */
  async humanPickupSkat(): Promise<void> {
    if (this.game.state !== GameState.PickingUpSkat) return;
    if (this.game.declarer !== this.humanPlayer) return;

    this.game = pickUpSkat(this.game);
    this.emit({
      type: "skatPickup",
      game: this.game,
      player: this.humanPlayer,
    });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** Human plays hand (declines skat) */
  async humanPlayHand(): Promise<void> {
    if (this.game.state !== GameState.PickingUpSkat) return;
    if (this.game.declarer !== this.humanPlayer) return;

    this.game = playHand(this.game);
    this.emit({
      type: "skatDecline",
      game: this.game,
      player: this.humanPlayer,
    });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** Human discards cards */
  async humanDiscard(card1: Card, card2: Card): Promise<void> {
    if (this.game.state !== GameState.Discarding) return;
    if (this.game.declarer !== this.humanPlayer) return;

    this.game = discardCards(this.game, card1, card2);
    this.emit({ type: "discard", game: this.game, player: this.humanPlayer });
    this.emit({ type: "stateChange", game: this.game });
  }

  /** Human announces game */
  async humanAnnounce(gameType: GameType, contract: Contract): Promise<void> {
    if (this.game.state !== GameState.Declaring) return;
    if (this.game.declarer !== this.humanPlayer) return;

    const announcement: GameAnnouncement = {
      contract: { ...contract, gameType },
      discardedCards: this.game.skat.cards,
      ouvertCards: contract.ouvert
        ? this.game.hands[this.humanPlayer].cards
        : null,
    };

    this.game = announceGame(this.game, announcement);
    this.emit({ type: "announce", game: this.game, player: this.humanPlayer });
    this.emit({ type: "stateChange", game: this.game });

    await this.processAIActions();
  }

  /** Human plays a card */
  async humanPlayCard(card: Card): Promise<void> {
    if (this.game.state !== GameState.TrickPlaying) return;
    if (this.game.trickPhase?.activePlayer !== this.humanPlayer) return;

    // Validate card is legal
    const legalMoves = getLegalMoves(this.game);
    const isLegal = legalMoves.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    if (!isLegal) return;

    this.game = playCard(this.game, this.humanPlayer, card);
    this.emit({
      type: "cardPlayed",
      game: this.game,
      player: this.humanPlayer,
      card,
    });
    this.emit({ type: "stateChange", game: this.game });

    await this.processAIActions();
  }

  /** Get legal moves for human player */
  getHumanLegalMoves(): Card[] {
    if (this.game.trickPhase?.activePlayer !== this.humanPlayer) {
      return [];
    }
    return getLegalMoves(this.game);
  }

  /** Check if it's the human player's turn */
  isHumanTurn(): boolean {
    const state = this.game.state;

    if (state === GameState.Bidding) {
      return this.game.bidding.activePlayer === this.humanPlayer;
    }

    if (
      state === GameState.PickingUpSkat ||
      state === GameState.Discarding ||
      state === GameState.Declaring
    ) {
      return this.game.declarer === this.humanPlayer;
    }

    if (state === GameState.TrickPlaying) {
      return this.game.trickPhase?.activePlayer === this.humanPlayer;
    }

    return false;
  }

  /** Reset to start a completely new game */
  reset(): void {
    this.game = createGame(Player.Rearhand);
    this.emit({ type: "stateChange", game: this.game });
  }
}

/** Create a new game controller */
export function createGameController(
  humanPlayer: Player = Player.Forehand,
  aiDifficulty: "random" | "basic" = "basic"
): GameController {
  return new GameController(humanPlayer, aiDifficulty);
}
