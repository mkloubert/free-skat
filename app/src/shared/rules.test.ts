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
import { getRule, createDefaultModifiers } from "./rules";
import { GameType } from "./gametype";
import { Suit } from "./suit";
import { Rank } from "./rank";
import { createCard, createHandFromCards } from "./card";

describe("Rule System", () => {
  describe("getRule", () => {
    it("should return a rule for each game type", () => {
      const gameTypes = [
        GameType.Clubs,
        GameType.Spades,
        GameType.Hearts,
        GameType.Diamonds,
        GameType.Grand,
        GameType.Null,
        GameType.Ramsch,
      ];

      for (const gameType of gameTypes) {
        const rule = getRule(gameType);
        expect(rule).toBeDefined();
        expect(rule.gameType).toBe(gameType);
      }
    });

    it("should cache rule instances", () => {
      const rule1 = getRule(GameType.Grand);
      const rule2 = getRule(GameType.Grand);
      expect(rule1).toBe(rule2);
    });
  });

  describe("SuitRule (Clubs)", () => {
    const rule = getRule(GameType.Clubs);

    describe("isTrump", () => {
      it("should identify Jacks as trump", () => {
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Spades, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Hearts, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Diamonds, Rank.Jack))).toBe(true);
      });

      it("should identify trump suit cards as trump", () => {
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Ace))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Ten))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Seven))).toBe(true);
      });

      it("should not identify non-trump suits as trump", () => {
        expect(rule.isTrump(createCard(Suit.Spades, Rank.Ace))).toBe(false);
        expect(rule.isTrump(createCard(Suit.Hearts, Rank.King))).toBe(false);
        expect(rule.isTrump(createCard(Suit.Diamonds, Rank.Ten))).toBe(false);
      });
    });

    describe("getTrumpOrder", () => {
      it("should rank Jacks highest in correct order", () => {
        const cj = rule.getTrumpOrder(createCard(Suit.Clubs, Rank.Jack));
        const sj = rule.getTrumpOrder(createCard(Suit.Spades, Rank.Jack));
        const hj = rule.getTrumpOrder(createCard(Suit.Hearts, Rank.Jack));
        const dj = rule.getTrumpOrder(createCard(Suit.Diamonds, Rank.Jack));

        expect(cj).toBeGreaterThan(sj);
        expect(sj).toBeGreaterThan(hj);
        expect(hj).toBeGreaterThan(dj);
      });

      it("should rank trump suit cards below Jacks", () => {
        const dj = rule.getTrumpOrder(createCard(Suit.Diamonds, Rank.Jack));
        const ca = rule.getTrumpOrder(createCard(Suit.Clubs, Rank.Ace));

        expect(dj).toBeGreaterThan(ca);
      });
    });

    describe("compareCards", () => {
      it("should rank trump over non-trump", () => {
        const trump = createCard(Suit.Clubs, Rank.Seven);
        const nonTrump = createCard(Suit.Spades, Rank.Ace);

        expect(rule.compareCards(trump, nonTrump, Suit.Spades)).toBeGreaterThan(
          0
        );
      });

      it("should rank higher trump over lower trump", () => {
        const cj = createCard(Suit.Clubs, Rank.Jack);
        const sj = createCard(Suit.Spades, Rank.Jack);

        expect(rule.compareCards(cj, sj, Suit.Clubs)).toBeGreaterThan(0);
      });

      it("should rank led suit over off-suit (non-trump)", () => {
        const led = createCard(Suit.Spades, Rank.Seven);
        const offSuit = createCard(Suit.Hearts, Rank.Ace);

        expect(rule.compareCards(led, offSuit, Suit.Spades)).toBeGreaterThan(0);
      });
    });

    describe("getLegalMoves", () => {
      it("should return all cards when hand is empty", () => {
        const hand = createHandFromCards([]);
        const moves = rule.getLegalMoves(hand, null);
        expect(moves).toHaveLength(0);
      });

      it("should return all cards when leading", () => {
        const cards = [
          createCard(Suit.Clubs, Rank.Ace),
          createCard(Suit.Spades, Rank.King),
          createCard(Suit.Hearts, Rank.Ten),
        ];
        const hand = createHandFromCards(cards);
        const moves = rule.getLegalMoves(hand, null);

        expect(moves).toHaveLength(3);
      });

      it("should require following suit when possible", () => {
        const cards = [
          createCard(Suit.Clubs, Rank.Ace),
          createCard(Suit.Spades, Rank.King),
          createCard(Suit.Spades, Rank.Ten),
        ];
        const hand = createHandFromCards(cards);
        const leadCard = createCard(Suit.Spades, Rank.Seven);

        const moves = rule.getLegalMoves(hand, leadCard);

        // Should only return Spades cards (not Clubs Jack since it's trump)
        expect(moves).toHaveLength(2);
        expect(moves.every((c) => c.suit === Suit.Spades)).toBe(true);
      });

      it("should require following trump when trump led", () => {
        const cards = [
          createCard(Suit.Clubs, Rank.Ace),
          createCard(Suit.Clubs, Rank.Jack),
          createCard(Suit.Spades, Rank.King),
        ];
        const hand = createHandFromCards(cards);
        const leadCard = createCard(Suit.Hearts, Rank.Jack); // Jack = trump

        const moves = rule.getLegalMoves(hand, leadCard);

        // Should return all trump cards (CJ and Club Ace)
        expect(moves).toHaveLength(2);
        expect(moves.every((c) => rule.isTrump(c))).toBe(true);
      });
    });
  });

  describe("GrandRule", () => {
    const rule = getRule(GameType.Grand);

    describe("isTrump", () => {
      it("should only identify Jacks as trump", () => {
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Spades, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Hearts, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Diamonds, Rank.Jack))).toBe(true);
      });

      it("should not identify any suit as trump", () => {
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Ace))).toBe(false);
        expect(rule.isTrump(createCard(Suit.Spades, Rank.Ace))).toBe(false);
        expect(rule.isTrump(createCard(Suit.Hearts, Rank.Ace))).toBe(false);
        expect(rule.isTrump(createCard(Suit.Diamonds, Rank.Ace))).toBe(false);
      });
    });

    describe("getTrumpOrder", () => {
      it("should rank Jacks in correct order", () => {
        const cj = rule.getTrumpOrder(createCard(Suit.Clubs, Rank.Jack));
        const sj = rule.getTrumpOrder(createCard(Suit.Spades, Rank.Jack));
        const hj = rule.getTrumpOrder(createCard(Suit.Hearts, Rank.Jack));
        const dj = rule.getTrumpOrder(createCard(Suit.Diamonds, Rank.Jack));

        expect(cj).toBeGreaterThan(sj);
        expect(sj).toBeGreaterThan(hj);
        expect(hj).toBeGreaterThan(dj);
      });
    });
  });

  describe("NullRule", () => {
    const rule = getRule(GameType.Null);

    describe("isTrump", () => {
      it("should never identify any card as trump", () => {
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Jack))).toBe(false);
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Ace))).toBe(false);
      });
    });

    describe("card order", () => {
      it("should use natural order (A > K > Q > J > T > 9 > 8 > 7)", () => {
        const ace = createCard(Suit.Clubs, Rank.Ace);
        const king = createCard(Suit.Clubs, Rank.King);
        const queen = createCard(Suit.Clubs, Rank.Queen);
        const jack = createCard(Suit.Clubs, Rank.Jack);
        const ten = createCard(Suit.Clubs, Rank.Ten);

        expect(rule.compareCards(ace, king, Suit.Clubs)).toBeGreaterThan(0);
        expect(rule.compareCards(king, queen, Suit.Clubs)).toBeGreaterThan(0);
        expect(rule.compareCards(queen, jack, Suit.Clubs)).toBeGreaterThan(0);
        expect(rule.compareCards(jack, ten, Suit.Clubs)).toBeGreaterThan(0);
      });
    });

    describe("getLegalMoves", () => {
      it("should require following suit strictly", () => {
        const cards = [
          createCard(Suit.Clubs, Rank.Ace),
          createCard(Suit.Clubs, Rank.Jack), // Not trump in Null
          createCard(Suit.Spades, Rank.King),
        ];
        const hand = createHandFromCards(cards);
        const leadCard = createCard(Suit.Clubs, Rank.Seven);

        const moves = rule.getLegalMoves(hand, leadCard);

        // Should return only Clubs cards
        expect(moves).toHaveLength(2);
        expect(moves.every((c) => c.suit === Suit.Clubs)).toBe(true);
      });
    });
  });

  describe("RamschRule", () => {
    const rule = getRule(GameType.Ramsch);

    describe("isTrump", () => {
      it("should only identify Jacks as trump (like Grand)", () => {
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Jack))).toBe(true);
        expect(rule.isTrump(createCard(Suit.Clubs, Rank.Ace))).toBe(false);
      });
    });
  });

  describe("Game Modifiers", () => {
    it("should create default modifiers", () => {
      const mods = createDefaultModifiers();

      expect(mods.hand).toBe(false);
      expect(mods.schneiderAnnounced).toBe(false);
      expect(mods.schwarzAnnounced).toBe(false);
      expect(mods.ouvert).toBe(false);
    });
  });
});
