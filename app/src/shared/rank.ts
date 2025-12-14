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
 * Rank represents a card rank in Skat.
 */
export enum Rank {
  /** Seven - lowest rank, 0 points */
  Seven = 0,
  /** Eight - 0 points */
  Eight = 1,
  /** Nine - 0 points */
  Nine = 2,
  /** Queen (Dame) - 3 points */
  Queen = 3,
  /** King (König) - 4 points */
  King = 4,
  /** Ten - 10 points */
  Ten = 5,
  /** Ace (Ass) - 11 points */
  Ace = 6,
  /** Jack (Bube) - 2 points, always trump in suit/grand games */
  Jack = 7,
}

/** All ranks in standard order (lowest to highest for non-trump). */
export const ALL_RANKS: Rank[] = [
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Queen,
  Rank.King,
  Rank.Ten,
  Rank.Ace,
  Rank.Jack,
];

/** Ranks without Jack (for suit ordering). */
export const RANKS_WITHOUT_JACK: Rank[] = [
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Queen,
  Rank.King,
  Rank.Ten,
  Rank.Ace,
];

/** Ranks in Null game order (A > K > Q > J > 10 > 9 > 8 > 7). */
export const NULL_RANKS: Rank[] = [
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Ten,
  Rank.Jack,
  Rank.Queen,
  Rank.King,
  Rank.Ace,
];

/** Rank names in English. */
export const RANK_NAMES: Record<Rank, string> = {
  [Rank.Seven]: "Seven",
  [Rank.Eight]: "Eight",
  [Rank.Nine]: "Nine",
  [Rank.Queen]: "Queen",
  [Rank.King]: "King",
  [Rank.Ten]: "Ten",
  [Rank.Ace]: "Ace",
  [Rank.Jack]: "Jack",
};

/** Rank names in German. */
export const RANK_GERMAN_NAMES: Record<Rank, string> = {
  [Rank.Seven]: "Sieben",
  [Rank.Eight]: "Acht",
  [Rank.Nine]: "Neun",
  [Rank.Queen]: "Dame",
  [Rank.King]: "König",
  [Rank.Ten]: "Zehn",
  [Rank.Ace]: "Ass",
  [Rank.Jack]: "Bube",
};

/** ISS protocol codes for ranks. */
export const RANK_CODES: Record<Rank, string> = {
  [Rank.Seven]: "7",
  [Rank.Eight]: "8",
  [Rank.Nine]: "9",
  [Rank.Queen]: "Q",
  [Rank.King]: "K",
  [Rank.Ten]: "T",
  [Rank.Ace]: "A",
  [Rank.Jack]: "J",
};

/** Point values for ranks. */
export const RANK_POINTS: Record<Rank, number> = {
  [Rank.Seven]: 0,
  [Rank.Eight]: 0,
  [Rank.Nine]: 0,
  [Rank.Queen]: 3,
  [Rank.King]: 4,
  [Rank.Ten]: 10,
  [Rank.Ace]: 11,
  [Rank.Jack]: 2,
};

/**
 * Returns the English name of a rank.
 */
export function getRankName(rank: Rank): string {
  return RANK_NAMES[rank];
}

/**
 * Returns the German name of a rank.
 */
export function getRankGermanName(rank: Rank): string {
  return RANK_GERMAN_NAMES[rank];
}

/**
 * Returns the ISS protocol code for a rank.
 */
export function getRankCode(rank: Rank): string {
  return RANK_CODES[rank];
}

/**
 * Returns the point value of a rank.
 */
export function getRankPoints(rank: Rank): number {
  return RANK_POINTS[rank];
}

/**
 * Parses a rank from its ISS protocol code.
 */
export function rankFromCode(code: string): Rank | null {
  switch (code) {
    case "7":
      return Rank.Seven;
    case "8":
      return Rank.Eight;
    case "9":
      return Rank.Nine;
    case "Q":
      return Rank.Queen;
    case "K":
      return Rank.King;
    case "T":
      return Rank.Ten;
    case "A":
      return Rank.Ace;
    case "J":
      return Rank.Jack;
    default:
      return null;
  }
}
