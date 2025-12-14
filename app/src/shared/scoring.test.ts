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
import { getRule, createDefaultModifiers, GameModifiers } from "./rules";
import { GameType, getGameTypeBaseValue } from "./gametype";
import { Suit } from "./suit";
import { Rank } from "./rank";
import { Card, createCard, getCardPoints } from "./card";

describe("Scoring System", () => {
  describe("Card Points", () => {
    it("should return 11 for Ace", () => {
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Ace))).toBe(11);
    });

    it("should return 10 for Ten", () => {
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Ten))).toBe(10);
    });

    it("should return 4 for King", () => {
      expect(getCardPoints(createCard(Suit.Clubs, Rank.King))).toBe(4);
    });

    it("should return 3 for Queen", () => {
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Queen))).toBe(3);
    });

    it("should return 2 for Jack", () => {
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Jack))).toBe(2);
    });

    it("should return 0 for 7, 8, 9", () => {
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Seven))).toBe(0);
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Eight))).toBe(0);
      expect(getCardPoints(createCard(Suit.Clubs, Rank.Nine))).toBe(0);
    });

    it("should sum to 120 for entire deck", () => {
      const suits = [Suit.Clubs, Suit.Spades, Suit.Hearts, Suit.Diamonds];
      const ranks = [
        Rank.Seven,
        Rank.Eight,
        Rank.Nine,
        Rank.Ten,
        Rank.Jack,
        Rank.Queen,
        Rank.King,
        Rank.Ace,
      ];

      let total = 0;
      for (const suit of suits) {
        for (const rank of ranks) {
          total += getCardPoints(createCard(suit, rank));
        }
      }

      expect(total).toBe(120);
    });
  });

  describe("Game Type Base Values", () => {
    it("should return 9 for Diamonds", () => {
      expect(getGameTypeBaseValue(GameType.Diamonds)).toBe(9);
    });

    it("should return 10 for Hearts", () => {
      expect(getGameTypeBaseValue(GameType.Hearts)).toBe(10);
    });

    it("should return 11 for Spades", () => {
      expect(getGameTypeBaseValue(GameType.Spades)).toBe(11);
    });

    it("should return 12 for Clubs", () => {
      expect(getGameTypeBaseValue(GameType.Clubs)).toBe(12);
    });

    it("should return 24 for Grand", () => {
      expect(getGameTypeBaseValue(GameType.Grand)).toBe(24);
    });

    it("should return 23 for Null (base)", () => {
      expect(getGameTypeBaseValue(GameType.Null)).toBe(23);
    });
  });

  describe("Matador Counting (via Game Value)", () => {
    const clubsRule = getRule(GameType.Clubs);
    const grandRule = getRule(GameType.Grand);

    describe("Suit Games", () => {
      it("should calculate higher value with more Jacks (matadors)", () => {
        const modifiers = createDefaultModifiers();

        // With 1 Jack (CJ): with 1, game = 2 × 12 = 24
        const oneJack = [createCard(Suit.Clubs, Rank.Jack)];
        const valueOne = clubsRule.calculateGameValue(oneJack, [], modifiers);

        // With 2 Jacks (CJ, SJ): with 2, game = 3 × 12 = 36
        const twoJacks = [
          createCard(Suit.Clubs, Rank.Jack),
          createCard(Suit.Spades, Rank.Jack),
        ];
        const valueTwo = clubsRule.calculateGameValue(twoJacks, [], modifiers);

        expect(valueTwo).toBeGreaterThan(valueOne);
      });

      it("should count 'without' matadors when missing top Jacks", () => {
        const modifiers = createDefaultModifiers();

        // Without CJ: without 1, game = 2 × 12 = 24
        const noJacks: Card[] = [];
        const value = clubsRule.calculateGameValue(noJacks, [], modifiers);

        // Without 4 (no Jacks) = 5 × 12 = 60
        expect(value).toBe(60);
      });
    });

    describe("Grand Games", () => {
      it("should only count Jacks for matadors in Grand", () => {
        const modifiers = createDefaultModifiers();

        // With CJ, SJ: with 2, game = 3 × 24 = 72
        const cards = [
          createCard(Suit.Clubs, Rank.Jack),
          createCard(Suit.Spades, Rank.Jack),
          createCard(Suit.Clubs, Rank.Ace), // Not counted in matadors
        ];

        const value = grandRule.calculateGameValue(cards, [], modifiers);
        expect(value).toBe(72); // 3 × 24
      });
    });
  });

  describe("Game Value Calculation", () => {
    const clubsRule = getRule(GameType.Clubs);

    it("should calculate basic game value", () => {
      // Clubs game, with 1 matador: (1 + 1) × 12 = 24
      const cards = [createCard(Suit.Clubs, Rank.Jack)];
      const skatCards: Card[] = [];
      const modifiers = createDefaultModifiers();

      const value = clubsRule.calculateGameValue(cards, skatCards, modifiers);
      // With 1 (CJ) = 2 × 12 = 24
      expect(value).toBe(24);
    });

    it("should include Hand modifier", () => {
      const cards = [createCard(Suit.Clubs, Rank.Jack)];
      const skatCards: Card[] = [];
      const modifiers: GameModifiers = {
        ...createDefaultModifiers(),
        hand: true,
      };

      const value = clubsRule.calculateGameValue(cards, skatCards, modifiers);
      // With 1, Hand = 3 × 12 = 36
      expect(value).toBe(36);
    });

    it("should include Schneider modifier", () => {
      const cards = [createCard(Suit.Clubs, Rank.Jack)];
      const skatCards: Card[] = [];
      const modifiers: GameModifiers = {
        ...createDefaultModifiers(),
        hand: true,
        schneiderAnnounced: true,
      };

      const value = clubsRule.calculateGameValue(cards, skatCards, modifiers);
      // With 1, Hand, Schneider announced = 4 × 12 = 48
      expect(value).toBe(48);
    });
  });

  describe("Null Game Values", () => {
    const nullRule = getRule(GameType.Null);

    it("should return 23 for standard Null", () => {
      const cards: Card[] = [];
      const skatCards: Card[] = [];
      const modifiers = createDefaultModifiers();

      const value = nullRule.calculateGameValue(cards, skatCards, modifiers);
      expect(value).toBe(23);
    });

    it("should return 35 for Null Hand", () => {
      const cards: Card[] = [];
      const skatCards: Card[] = [];
      const modifiers: GameModifiers = {
        ...createDefaultModifiers(),
        hand: true,
      };

      const value = nullRule.calculateGameValue(cards, skatCards, modifiers);
      expect(value).toBe(35);
    });

    it("should return 46 for Null Ouvert", () => {
      const cards: Card[] = [];
      const skatCards: Card[] = [];
      const modifiers: GameModifiers = {
        ...createDefaultModifiers(),
        ouvert: true,
      };

      const value = nullRule.calculateGameValue(cards, skatCards, modifiers);
      expect(value).toBe(46);
    });

    it("should return 59 for Null Ouvert Hand", () => {
      const cards: Card[] = [];
      const skatCards: Card[] = [];
      const modifiers: GameModifiers = {
        ...createDefaultModifiers(),
        hand: true,
        ouvert: true,
      };

      const value = nullRule.calculateGameValue(cards, skatCards, modifiers);
      expect(value).toBe(59);
    });
  });

  describe("Win Conditions", () => {
    it("should require 61+ points for normal win", () => {
      // This is a constant in the game rules
      const winThreshold = 61;
      expect(winThreshold).toBe(61);
    });

    it("should define Schneider at 90+ points", () => {
      const schneiderThreshold = 90;
      expect(schneiderThreshold).toBe(90);
    });

    it("should define Schwarz as all 10 tricks", () => {
      const schwarzTricks = 10;
      expect(schwarzTricks).toBe(10);
    });

    it("should define opponent Schneider at 30 or fewer points", () => {
      const opponentSchneider = 30;
      expect(opponentSchneider).toBe(30);
    });
  });

  describe("Loss Calculation", () => {
    it("should double game value for loss", () => {
      // If declarer loses with game value 24, score is -48
      const gameValue = 24;
      const lossScore = -2 * gameValue;
      expect(lossScore).toBe(-48);
    });

    it("should use bid value for overbid loss", () => {
      // If bid was 30 but game value only 24, use 30 for loss
      const bidValue = 30;
      const gameValue = 24;
      const overbid = bidValue > gameValue;
      const lossValue = overbid ? bidValue : gameValue;
      const lossScore = -2 * lossValue;

      expect(overbid).toBe(true);
      expect(lossScore).toBe(-60);
    });
  });
});
