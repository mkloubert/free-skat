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
  BID_ORDER,
  MIN_BID,
  isValidBid,
  nextBid,
  previousBid,
  createBiddingState,
  processBid,
  processHold,
  processPass,
  canPlayerBid,
  isValidNextBid,
  getMinimumBid,
  BiddingPhase,
  BiddingResult,
} from "./bidding";
import { Player } from "./player";

describe("Bidding System", () => {
  describe("BID_ORDER", () => {
    it("should start with 18", () => {
      expect(BID_ORDER[0]).toBe(18);
    });

    it("should contain all valid bid values in ascending order", () => {
      for (let i = 1; i < BID_ORDER.length; i++) {
        expect(BID_ORDER[i]).toBeGreaterThan(BID_ORDER[i - 1]);
      }
    });

    it("should include common bid values", () => {
      const commonBids = [18, 20, 22, 23, 24, 27, 30, 33, 36, 40, 44, 48];
      for (const bid of commonBids) {
        expect(BID_ORDER).toContain(bid);
      }
    });
  });

  describe("isValidBid", () => {
    it("should return true for valid bids", () => {
      expect(isValidBid(18)).toBe(true);
      expect(isValidBid(20)).toBe(true);
      expect(isValidBid(22)).toBe(true);
      expect(isValidBid(24)).toBe(true);
    });

    it("should return false for invalid bids", () => {
      expect(isValidBid(17)).toBe(false);
      expect(isValidBid(19)).toBe(false);
      expect(isValidBid(21)).toBe(false);
      expect(isValidBid(0)).toBe(false);
    });

    it("should return false for negative values", () => {
      expect(isValidBid(-1)).toBe(false);
      expect(isValidBid(-18)).toBe(false);
    });
  });

  describe("nextBid", () => {
    it("should return MIN_BID for 0", () => {
      expect(nextBid(0)).toBe(MIN_BID);
    });

    it("should return the next valid bid", () => {
      expect(nextBid(18)).toBe(20);
      expect(nextBid(20)).toBe(22);
      expect(nextBid(22)).toBe(23);
    });

    it("should return -1 when no higher bid exists", () => {
      const lastBid = BID_ORDER[BID_ORDER.length - 1];
      expect(nextBid(lastBid)).toBe(-1);
    });
  });

  describe("previousBid", () => {
    it("should return -1 for MIN_BID (no lower bid)", () => {
      expect(previousBid(MIN_BID)).toBe(-1);
    });

    it("should return the previous valid bid", () => {
      expect(previousBid(20)).toBe(18);
      expect(previousBid(22)).toBe(20);
      expect(previousBid(23)).toBe(22);
    });
  });

  describe("createBiddingState", () => {
    it("should create initial state", () => {
      const state = createBiddingState();

      expect(state.phase).toBe(BiddingPhase.MiddleToFore);
      expect(state.currentBid).toBe(0);
      expect(state.currentBidder).toBeNull();
      expect(state.activePlayer).toBe(Player.Middlehand);
      expect(state.isActiveBidding).toBe(true);
      expect(state.passedPlayers.size).toBe(0);
      expect(state.result).toBe(BiddingResult.InProgress);
      expect(state.declarer).toBeNull();
      expect(state.finalBid).toBe(0);
    });
  });

  describe("processBid", () => {
    it("should process a valid bid from Middlehand", () => {
      const state = createBiddingState();
      const newState = processBid(state, Player.Middlehand, 18);

      expect(newState.currentBid).toBe(18);
      expect(newState.currentBidder).toBe(Player.Middlehand);
      expect(newState.activePlayer).toBe(Player.Forehand);
    });

    it("should throw for bid from wrong player", () => {
      const state = createBiddingState();
      expect(() => processBid(state, Player.Forehand, 18)).toThrow();
    });

    it("should throw for bid below current bid", () => {
      let state = createBiddingState();
      state = processBid(state, Player.Middlehand, 20);
      state = processHold(state, Player.Forehand);

      expect(() => processBid(state, Player.Middlehand, 18)).toThrow();
    });
  });

  describe("processHold", () => {
    it("should allow Forehand to hold after Middlehand bids", () => {
      let state = createBiddingState();
      state = processBid(state, Player.Middlehand, 18);
      state = processHold(state, Player.Forehand);

      // After hold, the bid is confirmed at 18
      expect(state.currentBid).toBe(18);
      // Middlehand must raise or pass
      expect(state.isActiveBidding).toBe(true);
    });
  });

  describe("processPass", () => {
    it("should allow Middlehand to pass", () => {
      const state = createBiddingState();
      const newState = processPass(state, Player.Middlehand);

      expect(newState.passedPlayers.has(Player.Middlehand)).toBe(true);
    });

    it("should make Forehand declarer when Middlehand and Rearhand pass", () => {
      let state = createBiddingState();
      // Middlehand passes first (no bid)
      state = processPass(state, Player.Middlehand);
      // After Middlehand passes, Rearhand becomes active
      // Rearhand passes without bidding
      state = processPass(state, Player.Rearhand);

      // In standard Skat, Forehand gets the game at 18 when others pass
      expect(state.result).toBe(BiddingResult.HasDeclarer);
      expect(state.declarer).toBe(Player.Forehand);
      expect(state.finalBid).toBe(18);
    });

    it("should determine declarer when two pass", () => {
      let state = createBiddingState();
      state = processBid(state, Player.Middlehand, 18);
      state = processPass(state, Player.Forehand);
      state = processPass(state, Player.Rearhand);

      expect(state.result).toBe(BiddingResult.HasDeclarer);
      expect(state.declarer).toBe(Player.Middlehand);
      expect(state.finalBid).toBe(18);
    });
  });

  describe("canPlayerBid", () => {
    it("should return true for active player", () => {
      const state = createBiddingState();
      expect(canPlayerBid(state, Player.Middlehand)).toBe(true);
    });

    it("should return true for non-passed players", () => {
      const state = createBiddingState();
      // canPlayerBid checks if player hasn't passed, not if it's their turn
      expect(canPlayerBid(state, Player.Forehand)).toBe(true);
      expect(canPlayerBid(state, Player.Rearhand)).toBe(true);
    });
  });

  describe("isValidNextBid", () => {
    it("should accept minimum bid when no bids made", () => {
      const state = createBiddingState();
      expect(isValidNextBid(state, 18)).toBe(true);
    });

    it("should reject bid below minimum", () => {
      const state = createBiddingState();
      expect(isValidNextBid(state, 17)).toBe(false);
    });

    it("should reject bid equal to current", () => {
      let state = createBiddingState();
      state = processBid(state, Player.Middlehand, 18);
      state = processHold(state, Player.Forehand);

      expect(isValidNextBid(state, 18)).toBe(false);
    });
  });

  describe("getMinimumBid", () => {
    it("should return 18 at start", () => {
      const state = createBiddingState();
      expect(getMinimumBid(state)).toBe(18);
    });

    it("should return next bid after a bid", () => {
      let state = createBiddingState();
      state = processBid(state, Player.Middlehand, 18);
      state = processHold(state, Player.Forehand);

      expect(getMinimumBid(state)).toBe(20);
    });
  });

  describe("Full Bidding Scenarios", () => {
    it("should handle Forehand wins at 18", () => {
      let state = createBiddingState();

      // Middlehand bids 18
      state = processBid(state, Player.Middlehand, 18);
      // Forehand holds
      state = processHold(state, Player.Forehand);
      // Middlehand passes
      state = processPass(state, Player.Middlehand);
      // Rearhand passes
      state = processPass(state, Player.Rearhand);

      expect(state.result).toBe(BiddingResult.HasDeclarer);
      expect(state.declarer).toBe(Player.Forehand);
      expect(state.finalBid).toBe(18);
    });

    it("should handle Middlehand wins after Forehand holds", () => {
      let state = createBiddingState();

      // Middlehand bids 18
      state = processBid(state, Player.Middlehand, 18);
      // Forehand holds
      state = processHold(state, Player.Forehand);
      // Middlehand bids 20
      state = processBid(state, Player.Middlehand, 20);
      // Forehand passes
      state = processPass(state, Player.Forehand);
      // Rearhand passes
      state = processPass(state, Player.Rearhand);

      expect(state.result).toBe(BiddingResult.HasDeclarer);
      expect(state.declarer).toBe(Player.Middlehand);
      expect(state.finalBid).toBe(20);
    });
  });
});
