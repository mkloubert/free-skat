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
 * All valid bid values in ascending order.
 */
export const BID_ORDER: number[] = [
  18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59,
  60, 63, 66, 70, 72, 77, 80, 81, 84, 88, 90, 96, 99, 100, 108, 110, 117, 120,
  121, 126, 130, 132, 135, 140, 143, 144, 150, 153, 154, 156, 160, 162, 165,
  168, 170, 176, 180, 187, 192, 198, 204, 216, 240, 264,
];

/** The minimum valid bid value. */
export const MIN_BID = 18;

/** The maximum valid bid value. */
export const MAX_BID = 264;

/**
 * Returns true if the bid value is valid.
 */
export function isValidBid(value: number): boolean {
  return BID_ORDER.includes(value);
}

/**
 * Returns the next valid bid value greater than the given value.
 * Returns -1 if there is no higher bid.
 */
export function nextBid(value: number): number {
  for (const v of BID_ORDER) {
    if (v > value) {
      return v;
    }
  }
  return -1;
}

/**
 * Returns the previous valid bid value less than the given value.
 * Returns -1 if there is no lower bid.
 */
export function previousBid(value: number): number {
  let prev = -1;
  for (const v of BID_ORDER) {
    if (v >= value) {
      return prev;
    }
    prev = v;
  }
  return prev;
}

/**
 * Returns the index of the bid value in BID_ORDER.
 * Returns -1 if the value is not a valid bid.
 */
export function bidIndex(value: number): number {
  return BID_ORDER.indexOf(value);
}

/**
 * BiddingPhase represents the current phase of bidding.
 */
export enum BiddingPhase {
  /** Middlehand bids to Forehand */
  MiddleToFore = 0,
  /** Winner of first phase bids to Rearhand */
  WinnerToRear = 1,
  /** Bidding is complete */
  Done = 2,
}

/** Bidding phase names. */
export const BIDDING_PHASE_NAMES: Record<BiddingPhase, string> = {
  [BiddingPhase.MiddleToFore]: "MiddlehandToForehand",
  [BiddingPhase.WinnerToRear]: "WinnerToRearhand",
  [BiddingPhase.Done]: "Done",
};

/**
 * Returns the name of a bidding phase.
 */
export function getBiddingPhaseName(phase: BiddingPhase): string {
  return BIDDING_PHASE_NAMES[phase];
}

import { Player, getLeftNeighbor } from "./player";

/**
 * BiddingAction represents an action a player can take during bidding.
 */
export enum BiddingAction {
  /** Make a new bid */
  Bid = 0,
  /** Accept/hold the current bid (respond "yes" to a bid) */
  Hold = 1,
  /** Pass on bidding */
  Pass = 2,
}

/**
 * BiddingResult represents the outcome of the bidding phase.
 */
export enum BiddingResult {
  /** Bidding is still in progress */
  InProgress = 0,
  /** A player won the bidding */
  HasDeclarer = 1,
  /** All players passed - play Ramsch or rebid */
  AllPassed = 2,
}

/**
 * BiddingState represents the complete state of the bidding phase.
 */
export interface BiddingState {
  /** Current phase of bidding */
  phase: BiddingPhase;
  /** Current bid value (0 if no bids yet) */
  currentBid: number;
  /** Player who made the current bid (null if no bids) */
  currentBidder: Player | null;
  /** Player who must respond next */
  activePlayer: Player;
  /** Whether the active player is the one bidding (vs responding) */
  isActiveBidding: boolean;
  /** Players who have passed */
  passedPlayers: Set<Player>;
  /** The winner of the first bidding phase (Middlehand vs Forehand) */
  firstPhaseWinner: Player | null;
  /** Result of bidding */
  result: BiddingResult;
  /** The declarer (winner of bidding) */
  declarer: Player | null;
  /** Final bid value */
  finalBid: number;
}

/**
 * Creates a new bidding state for the start of bidding.
 */
export function createBiddingState(): BiddingState {
  return {
    phase: BiddingPhase.MiddleToFore,
    currentBid: 0,
    currentBidder: null,
    activePlayer: Player.Middlehand, // Middlehand bids first
    isActiveBidding: true, // Middlehand is the one making bids
    passedPlayers: new Set(),
    firstPhaseWinner: null,
    result: BiddingResult.InProgress,
    declarer: null,
    finalBid: 0,
  };
}

/**
 * Returns true if the given player can still participate in bidding.
 */
export function canPlayerBid(state: BiddingState, player: Player): boolean {
  return (
    !state.passedPlayers.has(player) &&
    state.result === BiddingResult.InProgress
  );
}

/**
 * Returns true if the given bid value is valid as a next bid.
 */
export function isValidNextBid(state: BiddingState, value: number): boolean {
  if (!isValidBid(value)) {
    return false;
  }
  return value > state.currentBid;
}

/**
 * Returns the minimum valid bid value for the current state.
 */
export function getMinimumBid(state: BiddingState): number {
  if (state.currentBid === 0) {
    return MIN_BID;
  }
  return nextBid(state.currentBid);
}

/**
 * Processes a bid action in the bidding state.
 * Returns a new state (immutable update).
 */
export function processBid(
  state: BiddingState,
  player: Player,
  value: number
): BiddingState {
  if (state.result !== BiddingResult.InProgress) {
    throw new Error("Bidding is already complete");
  }

  if (player !== state.activePlayer) {
    throw new Error(`It is not ${player}'s turn to act`);
  }

  if (!state.isActiveBidding) {
    throw new Error("Active player should hold or pass, not bid");
  }

  if (!isValidNextBid(state, value)) {
    throw new Error(`Invalid bid value: ${value}`);
  }

  const newState: BiddingState = {
    ...state,
    passedPlayers: new Set(state.passedPlayers),
    currentBid: value,
    currentBidder: player,
    isActiveBidding: false, // Now the responder must act
  };

  // Switch to the responder
  if (state.phase === BiddingPhase.MiddleToFore) {
    newState.activePlayer = Player.Forehand;
  } else {
    newState.activePlayer = Player.Rearhand;
  }

  return newState;
}

/**
 * Processes a hold action (accepting the current bid).
 * Returns a new state (immutable update).
 */
export function processHold(state: BiddingState, player: Player): BiddingState {
  if (state.result !== BiddingResult.InProgress) {
    throw new Error("Bidding is already complete");
  }

  if (player !== state.activePlayer) {
    throw new Error(`It is not ${player}'s turn to act`);
  }

  if (state.isActiveBidding) {
    throw new Error("Active player should bid, not hold");
  }

  if (state.currentBid === 0) {
    throw new Error("Cannot hold when no bid has been made");
  }

  const newState: BiddingState = {
    ...state,
    passedPlayers: new Set(state.passedPlayers),
    isActiveBidding: true, // Now the bidder must raise or pass
  };

  // Switch back to the bidder
  if (state.currentBidder !== null) {
    newState.activePlayer = state.currentBidder;
  }

  return newState;
}

/**
 * Processes a pass action.
 * Returns a new state (immutable update).
 */
export function processPass(state: BiddingState, player: Player): BiddingState {
  if (state.result !== BiddingResult.InProgress) {
    throw new Error("Bidding is already complete");
  }

  if (player !== state.activePlayer) {
    throw new Error(`It is not ${player}'s turn to act`);
  }

  const newState: BiddingState = {
    ...state,
    passedPlayers: new Set(state.passedPlayers),
  };
  newState.passedPlayers.add(player);

  // Handle pass based on current phase
  if (state.phase === BiddingPhase.MiddleToFore) {
    return handlePassInFirstPhase(newState, player);
  } else {
    return handlePassInSecondPhase(newState, player);
  }
}

/**
 * Handles a pass in the first bidding phase (Middlehand vs Forehand).
 */
function handlePassInFirstPhase(
  state: BiddingState,
  player: Player
): BiddingState {
  if (player === Player.Middlehand) {
    // Middlehand passed - Forehand wins first phase
    // Rearhand now bids against Forehand
    // Keep the current bid (Forehand held on it, or it's 0 if no bids were made)
    state.phase = BiddingPhase.WinnerToRear;
    state.firstPhaseWinner = Player.Forehand;
    state.activePlayer = Player.Rearhand;
    state.isActiveBidding = true;
    // Do NOT reset currentBid - if Forehand held on a bid, Rearhand must beat it
  } else if (player === Player.Forehand) {
    // Forehand passed - Middlehand won first phase
    state.phase = BiddingPhase.WinnerToRear;
    state.firstPhaseWinner = Player.Middlehand;
    state.activePlayer = Player.Rearhand;
    state.isActiveBidding = true;
    // Keep current bid if Middlehand had bid
    if (state.currentBidder === Player.Middlehand) {
      // Rearhand must beat Middlehand's bid
      state.activePlayer = Player.Rearhand;
      state.isActiveBidding = true;
    }
  }

  return checkBiddingComplete(state);
}

/**
 * Handles a pass in the second bidding phase (Winner vs Rearhand).
 */
function handlePassInSecondPhase(
  state: BiddingState,
  player: Player
): BiddingState {
  if (player === Player.Rearhand) {
    // Rearhand passed - first phase winner becomes declarer
    state.phase = BiddingPhase.Done;
    state.result = BiddingResult.HasDeclarer;
    state.declarer = state.firstPhaseWinner;
    state.finalBid = state.currentBid > 0 ? state.currentBid : MIN_BID;
  } else {
    // First phase winner passed - check if Rearhand had bid
    if (state.currentBidder === Player.Rearhand) {
      // Rearhand becomes declarer
      state.phase = BiddingPhase.Done;
      state.result = BiddingResult.HasDeclarer;
      state.declarer = Player.Rearhand;
      state.finalBid = state.currentBid;
    } else {
      // No one wants to play - all passed
      state.phase = BiddingPhase.Done;
      state.result = BiddingResult.AllPassed;
    }
  }

  return state;
}

/**
 * Checks if bidding should be complete and updates state accordingly.
 */
function checkBiddingComplete(state: BiddingState): BiddingState {
  // Count passed players
  const passedCount = state.passedPlayers.size;

  // If all three passed without any bid, it's AllPassed
  if (passedCount === 3) {
    state.phase = BiddingPhase.Done;
    state.result = BiddingResult.AllPassed;
    return state;
  }

  // If two players have passed and there was a bid, the remaining player is declarer
  if (passedCount === 2 && state.currentBid > 0) {
    state.phase = BiddingPhase.Done;
    state.result = BiddingResult.HasDeclarer;

    // Find the player who hasn't passed
    for (const p of [Player.Forehand, Player.Middlehand, Player.Rearhand]) {
      if (!state.passedPlayers.has(p)) {
        state.declarer = p;
        break;
      }
    }
    state.finalBid = state.currentBid;
  }

  return state;
}

/**
 * Special case: Forehand can "take" at 18 if both other players passed without bidding.
 * This is called "18 sagen" (saying 18).
 */
export function forehandTakesAt18(state: BiddingState): BiddingState {
  if (state.phase !== BiddingPhase.WinnerToRear) {
    throw new Error("Can only take at 18 in second phase");
  }

  if (state.firstPhaseWinner !== Player.Forehand) {
    throw new Error("Only Forehand can take at 18");
  }

  if (state.currentBid !== 0) {
    throw new Error("Cannot take at 18 if there were bids");
  }

  // Check that Middlehand passed
  if (!state.passedPlayers.has(Player.Middlehand)) {
    throw new Error("Middlehand must have passed");
  }

  return {
    ...state,
    passedPlayers: new Set(state.passedPlayers),
    phase: BiddingPhase.Done,
    result: BiddingResult.HasDeclarer,
    declarer: Player.Forehand,
    finalBid: MIN_BID,
    currentBid: MIN_BID,
  };
}

/**
 * Returns a human-readable description of the current bidding state.
 */
export function describeBiddingState(state: BiddingState): string {
  if (state.result === BiddingResult.AllPassed) {
    return "All players passed - Ramsch will be played";
  }

  if (state.result === BiddingResult.HasDeclarer) {
    return `${state.declarer} won the bidding at ${state.finalBid}`;
  }

  const actionType = state.isActiveBidding ? "bid" : "respond";
  return `${state.activePlayer} to ${actionType}, current bid: ${state.currentBid || "none"}`;
}

/**
 * Returns the list of valid actions for the active player.
 */
export function getValidActions(state: BiddingState): BiddingAction[] {
  if (state.result !== BiddingResult.InProgress) {
    return [];
  }

  if (state.isActiveBidding) {
    // Player can bid or pass
    return [BiddingAction.Bid, BiddingAction.Pass];
  } else {
    // Player can hold or pass
    if (state.currentBid > 0) {
      return [BiddingAction.Hold, BiddingAction.Pass];
    }
    // No bid yet - shouldn't happen in normal flow
    return [BiddingAction.Pass];
  }
}
