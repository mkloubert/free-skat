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

import { Suit } from "./suit";

/**
 * GameType represents the type of Skat game being played.
 */
export enum GameType {
  /** Clubs (Kreuz) is trump, base value 12 */
  Clubs = 0,
  /** Spades (Pik) is trump, base value 11 */
  Spades = 1,
  /** Hearts (Herz) is trump, base value 10 */
  Hearts = 2,
  /** Diamonds (Karo) is trump, base value 9 */
  Diamonds = 3,
  /** Only Jacks are trump, base value 24 */
  Grand = 4,
  /** No trump, goal is to take no tricks */
  Null = 5,
  /** Special game when all pass, goal is to take fewest points */
  Ramsch = 6,
}

/** All standard game types. */
export const ALL_GAME_TYPES: GameType[] = [
  GameType.Clubs,
  GameType.Spades,
  GameType.Hearts,
  GameType.Diamonds,
  GameType.Grand,
  GameType.Null,
];

/** Suit game types. */
export const SUIT_GAME_TYPES: GameType[] = [
  GameType.Clubs,
  GameType.Spades,
  GameType.Hearts,
  GameType.Diamonds,
];

/** Game type names in English. */
export const GAME_TYPE_NAMES: Record<GameType, string> = {
  [GameType.Clubs]: "Clubs",
  [GameType.Spades]: "Spades",
  [GameType.Hearts]: "Hearts",
  [GameType.Diamonds]: "Diamonds",
  [GameType.Grand]: "Grand",
  [GameType.Null]: "Null",
  [GameType.Ramsch]: "Ramsch",
};

/** Game type names in German. */
export const GAME_TYPE_GERMAN_NAMES: Record<GameType, string> = {
  [GameType.Clubs]: "Kreuz",
  [GameType.Spades]: "Pik",
  [GameType.Hearts]: "Herz",
  [GameType.Diamonds]: "Karo",
  [GameType.Grand]: "Grand",
  [GameType.Null]: "Null",
  [GameType.Ramsch]: "Ramsch",
};

/** ISS protocol codes for game types. */
export const GAME_TYPE_CODES: Record<GameType, string> = {
  [GameType.Clubs]: "C",
  [GameType.Spades]: "S",
  [GameType.Hearts]: "H",
  [GameType.Diamonds]: "D",
  [GameType.Grand]: "G",
  [GameType.Null]: "N",
  [GameType.Ramsch]: "R",
};

/** Base values for game types. */
export const GAME_TYPE_BASE_VALUES: Record<GameType, number> = {
  [GameType.Clubs]: 12,
  [GameType.Spades]: 11,
  [GameType.Hearts]: 10,
  [GameType.Diamonds]: 9,
  [GameType.Grand]: 24,
  [GameType.Null]: 23,
  [GameType.Ramsch]: 0,
};

/**
 * Returns the English name of a game type.
 */
export function getGameTypeName(gameType: GameType): string {
  return GAME_TYPE_NAMES[gameType];
}

/**
 * Returns the German name of a game type.
 */
export function getGameTypeGermanName(gameType: GameType): string {
  return GAME_TYPE_GERMAN_NAMES[gameType];
}

/**
 * Returns the ISS protocol code for a game type.
 */
export function getGameTypeCode(gameType: GameType): string {
  return GAME_TYPE_CODES[gameType];
}

/**
 * Returns the base value for a game type.
 */
export function getGameTypeBaseValue(gameType: GameType): number {
  return GAME_TYPE_BASE_VALUES[gameType];
}

/**
 * Returns true if this is a suit game (Clubs, Spades, Hearts, Diamonds).
 */
export function isSuitGame(gameType: GameType): boolean {
  return SUIT_GAME_TYPES.includes(gameType);
}

/**
 * Returns true if this is a Grand game.
 */
export function isGrand(gameType: GameType): boolean {
  return gameType === GameType.Grand;
}

/**
 * Returns true if this is a Null game.
 */
export function isNull(gameType: GameType): boolean {
  return gameType === GameType.Null;
}

/**
 * Returns true if this is a Ramsch game.
 */
export function isRamsch(gameType: GameType): boolean {
  return gameType === GameType.Ramsch;
}

/**
 * Returns the trump suit for suit games. Returns null for non-suit games.
 */
export function getTrumpSuit(gameType: GameType): Suit | null {
  switch (gameType) {
    case GameType.Clubs:
      return Suit.Clubs;
    case GameType.Spades:
      return Suit.Spades;
    case GameType.Hearts:
      return Suit.Hearts;
    case GameType.Diamonds:
      return Suit.Diamonds;
    default:
      return null;
  }
}

/**
 * Parses a game type from its ISS protocol code.
 */
export function gameTypeFromCode(code: string): GameType | null {
  switch (code) {
    case "C":
      return GameType.Clubs;
    case "S":
      return GameType.Spades;
    case "H":
      return GameType.Hearts;
    case "D":
      return GameType.Diamonds;
    case "G":
      return GameType.Grand;
    case "N":
      return GameType.Null;
    case "R":
      return GameType.Ramsch;
    default:
      return null;
  }
}

/**
 * Returns the game type for a suit game.
 */
export function gameTypeFromSuit(suit: Suit): GameType {
  switch (suit) {
    case Suit.Clubs:
      return GameType.Clubs;
    case Suit.Spades:
      return GameType.Spades;
    case Suit.Hearts:
      return GameType.Hearts;
    case Suit.Diamonds:
      return GameType.Diamonds;
  }
}
