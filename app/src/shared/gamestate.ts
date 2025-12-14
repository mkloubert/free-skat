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

import {
  GameType,
  getGameTypeBaseValue,
  getGameTypeCode,
  isNull,
} from "./gametype";

/**
 * GameState represents the current state of a Skat game.
 */
export enum GameState {
  /** Game is initializing */
  GameStart = 0,
  /** Cards are being dealt */
  Dealing = 1,
  /** Players are bidding */
  Bidding = 2,
  /** Declarer deciding whether to pick up skat */
  PickingUpSkat = 3,
  /** Declarer discarding cards to skat */
  Discarding = 4,
  /** Declarer announcing game type */
  Declaring = 5,
  /** Optional Contra/Re announcements */
  ContraRe = 6,
  /** Main trick-taking phase */
  TrickPlaying = 7,
  /** Game tricks complete, awaiting scoring */
  PreliminaryGameEnd = 8,
  /** Computing final score */
  CalculatingGameValue = 9,
  /** Game has ended */
  GameOver = 10,
}

/** Game state names in English. */
export const GAME_STATE_NAMES: Record<GameState, string> = {
  [GameState.GameStart]: "GameStart",
  [GameState.Dealing]: "Dealing",
  [GameState.Bidding]: "Bidding",
  [GameState.PickingUpSkat]: "PickingUpSkat",
  [GameState.Discarding]: "Discarding",
  [GameState.Declaring]: "Declaring",
  [GameState.ContraRe]: "ContraRe",
  [GameState.TrickPlaying]: "TrickPlaying",
  [GameState.PreliminaryGameEnd]: "PreliminaryGameEnd",
  [GameState.CalculatingGameValue]: "CalculatingGameValue",
  [GameState.GameOver]: "GameOver",
};

/** Game state names in German. */
export const GAME_STATE_GERMAN_NAMES: Record<GameState, string> = {
  [GameState.GameStart]: "Spielstart",
  [GameState.Dealing]: "Geben",
  [GameState.Bidding]: "Reizen",
  [GameState.PickingUpSkat]: "Skat aufnehmen",
  [GameState.Discarding]: "Drücken",
  [GameState.Declaring]: "Ansagen",
  [GameState.ContraRe]: "Kontra/Re",
  [GameState.TrickPlaying]: "Stichspiel",
  [GameState.PreliminaryGameEnd]: "Spielende",
  [GameState.CalculatingGameValue]: "Wertberechnung",
  [GameState.GameOver]: "Spiel beendet",
};

/**
 * Returns the English name of a game state.
 */
export function getGameStateName(state: GameState): string {
  return GAME_STATE_NAMES[state];
}

/**
 * Returns the German name of a game state.
 */
export function getGameStateGermanName(state: GameState): string {
  return GAME_STATE_GERMAN_NAMES[state];
}

/**
 * Returns true if the game is in an active playing state.
 */
export function isActiveState(state: GameState): boolean {
  switch (state) {
    case GameState.Dealing:
    case GameState.Bidding:
    case GameState.PickingUpSkat:
    case GameState.Discarding:
    case GameState.Declaring:
    case GameState.ContraRe:
    case GameState.TrickPlaying:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if the game has ended.
 */
export function isFinishedState(state: GameState): boolean {
  return state === GameState.GameOver;
}

/**
 * Contract represents the game contract (game type with modifiers).
 */
export interface Contract {
  gameType: GameType;
  /** No skat pickup */
  hand: boolean;
  /** Announced 90+ points */
  schneider: boolean;
  /** Announced all tricks */
  schwarz: boolean;
  /** Cards visible */
  ouvert: boolean;
}

/**
 * Creates a new contract with the given game type.
 */
export function createContract(gameType: GameType): Contract {
  return {
    gameType,
    hand: false,
    schneider: false,
    schwarz: false,
    ouvert: false,
  };
}

/**
 * Returns the base value of a contract.
 */
export function getContractBaseValue(contract: Contract): number {
  if (isNull(contract.gameType)) {
    return getNullValue(contract);
  }
  return getGameTypeBaseValue(contract.gameType);
}

/**
 * Returns the value for Null games based on modifiers.
 */
function getNullValue(contract: Contract): number {
  if (contract.hand && contract.ouvert) {
    return 59; // Null Hand Ouvert
  }
  if (contract.ouvert) {
    return 46; // Null Ouvert
  }
  if (contract.hand) {
    return 35; // Null Hand
  }
  return 23; // Null
}

/**
 * Calculates the multiplier based on modifiers (excluding matadors).
 */
export function getContractMultiplier(contract: Contract): number {
  if (isNull(contract.gameType)) {
    return 1; // Null games don't use multipliers
  }

  let mult = 1; // Base multiplier

  if (contract.hand) {
    mult++;
  }
  if (contract.schneider) {
    mult++;
  }
  if (contract.schwarz) {
    mult++;
  }
  if (contract.ouvert) {
    mult++;
  }

  return mult;
}

/**
 * Returns the ISS protocol code for a contract.
 */
export function getContractCode(contract: Contract): string {
  let code = getGameTypeCode(contract.gameType);

  if (contract.hand) {
    code += "H";
  }
  if (contract.ouvert) {
    code += "O";
  }
  if (contract.schneider) {
    code += "S";
  }
  if (contract.schwarz) {
    code += "Z";
  }

  return code;
}
