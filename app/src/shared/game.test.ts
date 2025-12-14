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

import { describe, it, expect } from "vitest";
import {
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
  TRICKS_PER_GAME,
  TOTAL_POINTS,
} from "./game";
import { Player } from "./player";
import { createContract, GameState } from "./gamestate";
import { GameType } from "./gametype";
import { BiddingAction, BiddingResult } from "./bidding";
import { GameAnnouncement } from "./announcement";

describe("Game Flow Integration", () => {
  describe("createGame", () => {
    it("should create game with correct initial state", () => {
      const game = createGame(Player.Rearhand);

      expect(game.state).toBe(GameState.GameStart);
      expect(game.dealer).toBe(Player.Rearhand);
      expect(game.declarer).toBeNull();
      expect(game.gameType).toBeNull();
      expect(game.trickPhase).toBeNull();
      expect(game.result).toBeNull();
    });
  });

  describe("dealGame", () => {
    it("should deal 10 cards to each player and 2 to skat", () => {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);

      expect(game.state).toBe(GameState.Dealing);
      expect(game.hands[Player.Forehand].cards).toHaveLength(10);
      expect(game.hands[Player.Middlehand].cards).toHaveLength(10);
      expect(game.hands[Player.Rearhand].cards).toHaveLength(10);
      expect(game.skat.cards).toHaveLength(2);
    });

    it("should throw if not in GameStart state", () => {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);

      expect(() => dealGame(game)).toThrow();
    });
  });

  describe("startBidding", () => {
    it("should transition to bidding state", () => {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);

      expect(game.state).toBe(GameState.Bidding);
      expect(game.bidding.activePlayer).toBe(Player.Middlehand);
    });
  });

  describe("handleBiddingAction", () => {
    it("should process bid action", () => {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);
      game = handleBiddingAction(
        game,
        Player.Middlehand,
        BiddingAction.Bid,
        18
      );

      expect(game.bidding.currentBid).toBe(18);
      expect(game.bidding.currentBidder).toBe(Player.Middlehand);
    });

    it("should determine declarer after bidding", () => {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);

      // Middlehand bids 18
      game = handleBiddingAction(
        game,
        Player.Middlehand,
        BiddingAction.Bid,
        18
      );
      // Forehand passes
      game = handleBiddingAction(game, Player.Forehand, BiddingAction.Pass);
      // Rearhand passes
      game = handleBiddingAction(game, Player.Rearhand, BiddingAction.Pass);

      expect(game.state).toBe(GameState.PickingUpSkat);
      expect(game.declarer).toBe(Player.Middlehand);
    });

    it("should make Forehand declarer when others pass without bidding", () => {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);

      // Middlehand passes (no bid)
      game = handleBiddingAction(game, Player.Middlehand, BiddingAction.Pass);
      // Rearhand passes (no bid) - Forehand becomes declarer at 18
      game = handleBiddingAction(game, Player.Rearhand, BiddingAction.Pass);

      // In standard Skat, Forehand has the right to take at 18 when others pass
      expect(game.state).toBe(GameState.PickingUpSkat);
      expect(game.declarer).toBe(Player.Forehand);
      expect(game.bidding.result).toBe(BiddingResult.HasDeclarer);
      expect(game.bidding.finalBid).toBe(18);
    });
  });

  describe("Skat Handling", () => {
    function setupForSkatPhase() {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);
      game = handleBiddingAction(
        game,
        Player.Middlehand,
        BiddingAction.Bid,
        18
      );
      game = handleBiddingAction(game, Player.Forehand, BiddingAction.Pass);
      game = handleBiddingAction(game, Player.Rearhand, BiddingAction.Pass);
      return game;
    }

    it("should allow declarer to pick up skat", () => {
      let game = setupForSkatPhase();
      expect(game.state).toBe(GameState.PickingUpSkat);

      game = pickUpSkat(game);

      expect(game.state).toBe(GameState.Discarding);
      expect(game.hands[Player.Middlehand].cards).toHaveLength(12);
    });

    it("should allow declarer to play hand", () => {
      let game = setupForSkatPhase();
      game = playHand(game);

      expect(game.state).toBe(GameState.Declaring);
      expect(game.modifiers.hand).toBe(true);
    });

    it("should allow declarer to discard cards", () => {
      let game = setupForSkatPhase();
      game = pickUpSkat(game);

      const hand = game.hands[Player.Middlehand];
      const card1 = hand.cards[0];
      const card2 = hand.cards[1];

      game = discardCards(game, card1, card2);

      expect(game.state).toBe(GameState.Declaring);
      expect(game.hands[Player.Middlehand].cards).toHaveLength(10);
    });
  });

  describe("announceGame", () => {
    function setupForAnnouncement() {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);
      game = handleBiddingAction(
        game,
        Player.Middlehand,
        BiddingAction.Bid,
        18
      );
      game = handleBiddingAction(game, Player.Forehand, BiddingAction.Pass);
      game = handleBiddingAction(game, Player.Rearhand, BiddingAction.Pass);
      game = playHand(game);
      return game;
    }

    it("should set up game for trick playing", () => {
      let game = setupForAnnouncement();

      const announcement: GameAnnouncement = {
        contract: createContract(GameType.Grand),
        discardedCards: null,
        ouvertCards: null,
      };

      game = announceGame(game, announcement);

      expect(game.state).toBe(GameState.TrickPlaying);
      expect(game.gameType).toBe(GameType.Grand);
      expect(game.rule).not.toBeNull();
      expect(game.trickPhase).not.toBeNull();
      expect(game.trickPhase?.trickNumber).toBe(1);
    });
  });

  describe("Ramsch setup", () => {
    it("should be possible to setup Ramsch when bidding result is AllPassed", () => {
      // Note: In standard Skat rules, true "all pass" (Ramsch) only happens
      // when Forehand also declines after being offered the game at 18.
      // The current implementation makes Forehand declarer by default.
      // This test verifies the startRamsch function works correctly when called.

      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);

      // Simulate a scenario where all pass would happen
      // by manually setting the bidding result (for testing purposes)
      game = {
        ...game,
        state: GameState.TrickPlaying,
        bidding: {
          ...game.bidding,
          result: BiddingResult.AllPassed,
        },
      };

      game = startRamsch(game);

      expect(game.state).toBe(GameState.TrickPlaying);
      expect(game.gameType).toBe(GameType.Ramsch);
      expect(game.declarer).toBeNull();
      expect(game.rule).not.toBeNull();
      expect(game.trickPhase).not.toBeNull();
    });
  });

  describe("playCard", () => {
    function setupForTrickPlay() {
      let game = createGame(Player.Rearhand);
      game = dealGame(game);
      game = startBidding(game);
      game = handleBiddingAction(
        game,
        Player.Middlehand,
        BiddingAction.Bid,
        18
      );
      game = handleBiddingAction(game, Player.Forehand, BiddingAction.Pass);
      game = handleBiddingAction(game, Player.Rearhand, BiddingAction.Pass);
      game = playHand(game);

      const announcement: GameAnnouncement = {
        contract: createContract(GameType.Grand),
        discardedCards: null,
        ouvertCards: null,
      };
      game = announceGame(game, announcement);
      return game;
    }

    it("should allow valid card play", () => {
      let game = setupForTrickPlay();

      const forehand = Player.Forehand;
      expect(game.trickPhase?.activePlayer).toBe(forehand);

      const legalMoves = getLegalMoves(game);
      expect(legalMoves.length).toBeGreaterThan(0);

      const cardToPlay = legalMoves[0];
      game = playCard(game, forehand, cardToPlay);

      expect(game.hands[forehand].cards).toHaveLength(9);
      expect(game.trickPhase?.currentTrick.cards).toHaveLength(1);
    });

    it("should complete trick after 3 cards", () => {
      let game = setupForTrickPlay();

      // Play all 3 cards
      for (let i = 0; i < 3; i++) {
        const player = game.trickPhase!.activePlayer;
        const legalMoves = getLegalMoves(game);
        game = playCard(game, player, legalMoves[0]);
      }

      expect(game.trickPhase?.trickNumber).toBe(2);
      expect(game.trickPhase?.completedTricks).toHaveLength(1);
    });
  });

  describe("getLegalMoves", () => {
    it("should return empty array when not trick playing", () => {
      const game = createGame(Player.Rearhand);
      const moves = getLegalMoves(game);
      expect(moves).toHaveLength(0);
    });
  });

  describe("getNextDealer", () => {
    it("should rotate dealer correctly", () => {
      expect(getNextDealer(Player.Forehand)).toBe(Player.Middlehand);
      expect(getNextDealer(Player.Middlehand)).toBe(Player.Rearhand);
      expect(getNextDealer(Player.Rearhand)).toBe(Player.Forehand);
    });
  });

  describe("Constants", () => {
    it("should have 10 tricks per game", () => {
      expect(TRICKS_PER_GAME).toBe(10);
    });

    it("should have 120 total points", () => {
      expect(TOTAL_POINTS).toBe(120);
    });
  });

  describe("Full Game Flow", () => {
    it("should complete a full game", () => {
      let game = createGame(Player.Rearhand);

      // Deal
      game = dealGame(game);
      expect(game.state).toBe(GameState.Dealing);

      // Bidding
      game = startBidding(game);
      game = handleBiddingAction(
        game,
        Player.Middlehand,
        BiddingAction.Bid,
        18
      );
      game = handleBiddingAction(game, Player.Forehand, BiddingAction.Pass);
      game = handleBiddingAction(game, Player.Rearhand, BiddingAction.Pass);

      // Skat
      expect(game.state).toBe(GameState.PickingUpSkat);
      game = playHand(game);

      // Announce
      const announcement: GameAnnouncement = {
        contract: createContract(GameType.Grand),
        discardedCards: null,
        ouvertCards: null,
      };
      game = announceGame(game, announcement);
      expect(game.state).toBe(GameState.TrickPlaying);

      // Play all 10 tricks
      for (let trick = 0; trick < 10; trick++) {
        for (let card = 0; card < 3; card++) {
          const player = game.trickPhase!.activePlayer;
          const legalMoves = getLegalMoves(game);

          if (legalMoves.length > 0) {
            game = playCard(game, player, legalMoves[0]);
          }
        }
      }

      expect(game.state).toBe(GameState.PreliminaryGameEnd);

      // Finalize
      game = finalizeGame(game);
      expect(game.state).toBe(GameState.GameOver);
      expect(game.result).not.toBeNull();
    });
  });
});
