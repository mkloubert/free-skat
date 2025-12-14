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
  18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60, 63, 66, 70, 72, 77,
  80, 81, 84, 88, 90, 96, 99, 100, 108, 110, 117, 120, 121, 126, 130, 132, 135, 140, 143, 144, 150,
  153, 154, 156, 160, 162, 165, 168, 170, 176, 180, 187, 192, 198, 204, 216, 240, 264,
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
  [BiddingPhase.MiddleToFore]: 'MiddlehandToForehand',
  [BiddingPhase.WinnerToRear]: 'WinnerToRearhand',
  [BiddingPhase.Done]: 'Done',
};

/**
 * Returns the name of a bidding phase.
 */
export function getBiddingPhaseName(phase: BiddingPhase): string {
  return BIDDING_PHASE_NAMES[phase];
}
