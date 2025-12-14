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
 * Suit represents a card suit in Skat.
 */
export enum Suit {
  /** Clubs (Kreuz) - highest suit, base value 12 */
  Clubs = 0,
  /** Spades (Pik) - base value 11 */
  Spades = 1,
  /** Hearts (Herz) - base value 10 */
  Hearts = 2,
  /** Diamonds (Karo) - lowest suit, base value 9 */
  Diamonds = 3,
}

/** All suits in trump order (highest to lowest). */
export const ALL_SUITS: Suit[] = [
  Suit.Clubs,
  Suit.Spades,
  Suit.Hearts,
  Suit.Diamonds,
];

/** Suit names in English. */
export const SUIT_NAMES: Record<Suit, string> = {
  [Suit.Clubs]: "Clubs",
  [Suit.Spades]: "Spades",
  [Suit.Hearts]: "Hearts",
  [Suit.Diamonds]: "Diamonds",
};

/** Suit names in German. */
export const SUIT_GERMAN_NAMES: Record<Suit, string> = {
  [Suit.Clubs]: "Kreuz",
  [Suit.Spades]: "Pik",
  [Suit.Hearts]: "Herz",
  [Suit.Diamonds]: "Karo",
};

/** ISS protocol codes for suits. */
export const SUIT_CODES: Record<Suit, string> = {
  [Suit.Clubs]: "C",
  [Suit.Spades]: "S",
  [Suit.Hearts]: "H",
  [Suit.Diamonds]: "D",
};

/** Base values for suit games. */
export const SUIT_BASE_VALUES: Record<Suit, number> = {
  [Suit.Clubs]: 12,
  [Suit.Spades]: 11,
  [Suit.Hearts]: 10,
  [Suit.Diamonds]: 9,
};

/**
 * Returns the English name of a suit.
 */
export function getSuitName(suit: Suit): string {
  return SUIT_NAMES[suit];
}

/**
 * Returns the German name of a suit.
 */
export function getSuitGermanName(suit: Suit): string {
  return SUIT_GERMAN_NAMES[suit];
}

/**
 * Returns the ISS protocol code for a suit.
 */
export function getSuitCode(suit: Suit): string {
  return SUIT_CODES[suit];
}

/**
 * Returns the base value for a suit game.
 */
export function getSuitBaseValue(suit: Suit): number {
  return SUIT_BASE_VALUES[suit];
}

/**
 * Parses a suit from its ISS protocol code.
 */
export function suitFromCode(code: string): Suit | null {
  switch (code) {
    case "C":
      return Suit.Clubs;
    case "S":
      return Suit.Spades;
    case "H":
      return Suit.Hearts;
    case "D":
      return Suit.Diamonds;
    default:
      return null;
  }
}
