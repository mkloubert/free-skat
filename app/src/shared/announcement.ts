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
 * Game announcement module for declaring game type and modifiers.
 */

import { Card, getCardCode, cardFromCode, Hand, getHandCode } from "./card";
import {
  GameType,
  getGameTypeCode,
  getGameTypeBaseValue,
  gameTypeFromCode,
  isNull,
  isSuitGame,
  isGrand,
} from "./gametype";
import {
  Contract,
  createContract,
  getContractCode,
  getContractBaseValue,
} from "./gamestate";

/**
 * GameAnnouncement represents a complete game declaration.
 */
export interface GameAnnouncement {
  /** The contract (game type + modifiers) */
  contract: Contract;
  /** Cards discarded to skat (if not Hand game) */
  discardedCards: [Card, Card] | null;
  /** Ouvert cards to display (if Ouvert game) */
  ouvertCards: Card[] | null;
}

/**
 * Creates a new game announcement with the given game type.
 */
export function createAnnouncement(gameType: GameType): GameAnnouncement {
  return {
    contract: createContract(gameType),
    discardedCards: null,
    ouvertCards: null,
  };
}

/**
 * Creates a hand game announcement.
 */
export function createHandAnnouncement(gameType: GameType): GameAnnouncement {
  const announcement = createAnnouncement(gameType);
  announcement.contract.hand = true;
  return announcement;
}

/**
 * Sets the discarded cards for an announcement.
 */
export function setDiscardedCards(
  announcement: GameAnnouncement,
  card1: Card,
  card2: Card
): GameAnnouncement {
  return {
    ...announcement,
    discardedCards: [card1, card2],
  };
}

/**
 * Sets the ouvert cards for an announcement.
 */
export function setOuvertCards(
  announcement: GameAnnouncement,
  cards: Card[]
): GameAnnouncement {
  return {
    ...announcement,
    contract: { ...announcement.contract, ouvert: true },
    ouvertCards: cards,
  };
}

/**
 * Validates a game announcement against the bid value.
 * Returns null if valid, or an error message if invalid.
 */
export function validateAnnouncement(
  announcement: GameAnnouncement,
  bidValue: number,
  matadors: number
): string | null {
  const gameValue = calculateAnnouncedGameValue(announcement, matadors);

  if (gameValue < bidValue) {
    return `Game value ${gameValue} is less than bid ${bidValue} (overbid)`;
  }

  // Check Ouvert requirements
  if (announcement.contract.ouvert) {
    if (
      !announcement.contract.hand &&
      !isNull(announcement.contract.gameType)
    ) {
      return "Ouvert requires Hand game (except Null Ouvert)";
    }

    // Schwarz announced implies Ouvert for Suit/Grand games
    if (
      announcement.contract.schwarz &&
      !isNull(announcement.contract.gameType)
    ) {
      if (!announcement.contract.ouvert) {
        return "Schwarz announced requires Ouvert";
      }
    }
  }

  // Check Schwarz requirements
  if (announcement.contract.schwarz && !announcement.contract.schneider) {
    return "Schwarz requires Schneider to be announced";
  }

  // Check Schneider requirements for non-Hand
  if (announcement.contract.schneider && !announcement.contract.hand) {
    return "Schneider can only be announced in Hand games";
  }

  return null;
}

/**
 * Calculates the game value for an announcement (without knowing actual matadors yet).
 * This is used for validation against the bid.
 */
export function calculateAnnouncedGameValue(
  announcement: GameAnnouncement,
  matadors: number
): number {
  const contract = announcement.contract;

  // Null games have fixed values
  if (isNull(contract.gameType)) {
    return getContractBaseValue(contract);
  }

  // For Suit/Grand games: base value × multiplier
  const baseValue = getGameTypeBaseValue(contract.gameType);

  // Multiplier = matadors + 1 + modifiers
  let multiplier = Math.abs(matadors) + 1; // "with" or "without" X

  if (contract.hand) multiplier++;
  if (contract.schneider) multiplier++;
  if (contract.schwarz) multiplier++;
  if (contract.ouvert) multiplier++;

  return baseValue * multiplier;
}

/**
 * Calculates the minimum matadors needed to make the bid.
 */
export function calculateMinimumMatadors(
  announcement: GameAnnouncement,
  bidValue: number
): number {
  if (isNull(announcement.contract.gameType)) {
    return 0; // Null games don't use matadors
  }

  const baseValue = getGameTypeBaseValue(announcement.contract.gameType);
  const contract = announcement.contract;

  // Count modifier bonuses
  let modifierBonus = 1; // Base multiplier
  if (contract.hand) modifierBonus++;
  if (contract.schneider) modifierBonus++;
  if (contract.schwarz) modifierBonus++;
  if (contract.ouvert) modifierBonus++;

  // Solve: baseValue * (matadors + modifierBonus) >= bidValue
  // matadors >= (bidValue / baseValue) - modifierBonus
  const minMatadors = Math.ceil(bidValue / baseValue) - modifierBonus;

  return Math.max(1, minMatadors); // At least "with 1" or "without 1"
}

/**
 * Generates the ISS protocol code for a game announcement.
 * Format: <GameType>[Modifiers].<Discard1>.<Discard2>[.<OuvertCards>]
 */
export function getAnnouncementCode(announcement: GameAnnouncement): string {
  let code = getContractCode(announcement.contract);

  // Add discarded cards
  if (announcement.discardedCards !== null) {
    code += `.${getCardCode(announcement.discardedCards[0])}`;
    code += `.${getCardCode(announcement.discardedCards[1])}`;
  }

  // Add ouvert cards
  if (
    announcement.ouvertCards !== null &&
    announcement.ouvertCards.length > 0
  ) {
    for (const card of announcement.ouvertCards) {
      code += `.${getCardCode(card)}`;
    }
  }

  return code;
}

/**
 * Parses a game announcement from ISS protocol code.
 */
export function announcementFromCode(code: string): GameAnnouncement | null {
  if (!code || code.length === 0) {
    return null;
  }

  const parts = code.split(".");
  if (parts.length === 0) {
    return null;
  }

  // Parse game type and modifiers from first part
  const typeCode = parts[0];
  if (typeCode.length === 0) {
    return null;
  }

  // First character is game type
  const gameType = gameTypeFromCode(typeCode[0]);
  if (gameType === null) {
    return null;
  }

  const announcement = createAnnouncement(gameType);

  // Parse modifiers
  for (let i = 1; i < typeCode.length; i++) {
    switch (typeCode[i]) {
      case "H":
        announcement.contract.hand = true;
        break;
      case "O":
        announcement.contract.ouvert = true;
        break;
      case "S":
        announcement.contract.schneider = true;
        break;
      case "Z":
        announcement.contract.schwarz = true;
        break;
      default:
        // Unknown modifier
        return null;
    }
  }

  // Parse discarded cards (next 2 parts, if present)
  if (parts.length >= 3 && !announcement.contract.hand) {
    const card1 = cardFromCode(parts[1]);
    const card2 = cardFromCode(parts[2]);
    if (card1 !== null && card2 !== null) {
      announcement.discardedCards = [card1, card2];
    }
  }

  // Parse ouvert cards (remaining parts, if ouvert)
  if (announcement.contract.ouvert && parts.length > 3) {
    const ouvertCards: Card[] = [];
    const startIndex = announcement.discardedCards !== null ? 3 : 1;
    for (let i = startIndex; i < parts.length; i++) {
      const card = cardFromCode(parts[i]);
      if (card !== null) {
        ouvertCards.push(card);
      }
    }
    if (ouvertCards.length > 0) {
      announcement.ouvertCards = ouvertCards;
    }
  }

  return announcement;
}

/**
 * Returns a human-readable description of an announcement.
 */
export function describeAnnouncement(announcement: GameAnnouncement): string {
  const contract = announcement.contract;
  let desc = "";

  // Game type
  switch (contract.gameType) {
    case GameType.Clubs:
      desc = "Clubs";
      break;
    case GameType.Spades:
      desc = "Spades";
      break;
    case GameType.Hearts:
      desc = "Hearts";
      break;
    case GameType.Diamonds:
      desc = "Diamonds";
      break;
    case GameType.Grand:
      desc = "Grand";
      break;
    case GameType.Null:
      desc = "Null";
      break;
    case GameType.Ramsch:
      desc = "Ramsch";
      break;
  }

  // Modifiers
  if (contract.hand) {
    desc += " Hand";
  }
  if (contract.schneider) {
    desc += " Schneider announced";
  }
  if (contract.schwarz) {
    desc += " Schwarz announced";
  }
  if (contract.ouvert) {
    desc += " Ouvert";
  }

  return desc;
}

/**
 * Returns possible game announcements for a given hand.
 * This helps the UI show available options.
 */
export function getPossibleAnnouncements(
  hand: Hand,
  skatPickedUp: boolean
): GameType[] {
  const possibleTypes: GameType[] = [];

  // All standard game types are always possible
  possibleTypes.push(
    GameType.Clubs,
    GameType.Spades,
    GameType.Hearts,
    GameType.Diamonds,
    GameType.Grand,
    GameType.Null
  );

  return possibleTypes;
}

/**
 * Checks if a modifier is valid for a game type.
 */
export function isModifierValid(
  gameType: GameType,
  modifier: "hand" | "schneider" | "schwarz" | "ouvert",
  currentContract: Contract
): boolean {
  // Null games have limited modifiers
  if (isNull(gameType)) {
    if (modifier === "schneider" || modifier === "schwarz") {
      return false; // Null games don't have schneider/schwarz
    }
    // Null can have Hand and Ouvert
    return true;
  }

  // For Suit/Grand games
  switch (modifier) {
    case "hand":
      return true; // Always valid
    case "schneider":
      return currentContract.hand; // Requires hand
    case "schwarz":
      return currentContract.hand && currentContract.schneider; // Requires hand + schneider
    case "ouvert":
      return currentContract.hand; // Requires hand
  }
}

/**
 * NULL_VALUES contains the fixed values for Null game variants.
 */
export const NULL_VALUES = {
  null: 23,
  nullHand: 35,
  nullOuvert: 46,
  nullHandOuvert: 59,
} as const;

/**
 * Gets the value of a Null game based on modifiers.
 */
export function getNullGameValue(hand: boolean, ouvert: boolean): number {
  if (hand && ouvert) return NULL_VALUES.nullHandOuvert;
  if (ouvert) return NULL_VALUES.nullOuvert;
  if (hand) return NULL_VALUES.nullHand;
  return NULL_VALUES.null;
}
