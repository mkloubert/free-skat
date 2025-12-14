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

import { Card, cardFromCode, Hand, createHand, addCardToHand } from "./card";
import { GameType, gameTypeFromCode } from "./gametype";
import { Player, ALL_PLAYERS } from "./player";
import { isValidBid } from "./bidding";

/** ISS protocol version supported by this client. */
export const PROTOCOL_VERSION = 14;

/** Server message types. */
export const MSG_WELCOME = "Welcome";
export const MSG_VERSION = "Version";
export const MSG_PASSWORD = "password:";
export const MSG_CLIENTS = "clients";
export const MSG_TABLES = "tables";
export const MSG_TABLE = "table";
export const MSG_ERROR = "error";
export const MSG_TEXT = "text";
export const MSG_YELL = "yell";

/** Client command types. */
export const CMD_LOGIN = "login";
export const CMD_CREATE = "create";
export const CMD_JOIN = "join";
export const CMD_OBSERVE = "observe";
export const CMD_INVITE = "invite";
export const CMD_LEAVE = "leave";

/**
 * MoveType represents the type of move in the ISS protocol.
 */
export enum MoveType {
  /** Card distribution */
  Deal = 0,
  /** Numeric bid value */
  Bid = 1,
  /** Accept current bid ("y") */
  HoldBid = 2,
  /** Pass on bidding ("p") */
  Pass = 3,
  /** Request to see skat ("s") */
  SkatRequest = 4,
  /** Skat cards revealed */
  PickUpSkat = 5,
  /** Declare game type */
  GameAnnouncement = 6,
  /** Play a card */
  CardPlay = 7,
  /** Show cards (resign) */
  ShowCards = 8,
  /** Resign game ("RE") */
  Resign = 9,
  /** Player timeout */
  TimeOut = 10,
  /** Player left table */
  LeaveTable = 11,
}

/** ISS protocol tokens for moves. */
export const TOKEN_HOLD_BID = "y";
export const TOKEN_PASS = "p";
export const TOKEN_SKAT_REQUEST = "s";
export const TOKEN_SHOW_CARDS = "SC";
export const TOKEN_RESIGN = "RE";
export const TOKEN_TIME_OUT = "TI";
export const TOKEN_LEAVE_TABLE = "LE";

/**
 * Parsed ISS protocol message.
 */
export interface Message {
  command: string;
  args: string[];
  raw: string;
}

/**
 * Parses a raw ISS protocol message.
 */
export function parseMessage(raw: string): Message {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0) {
    return { command: "", args: [], raw: trimmed };
  }

  return {
    command: parts[0],
    args: parts.slice(1),
    raw: trimmed,
  };
}

/**
 * Parsed move information from a table message.
 */
export interface MoveInfo {
  moveType: MoveType;
  bidValue?: number;
  card?: Card;
  gameType?: GameType;
  hand?: boolean;
  ouvert?: boolean;
  schneider?: boolean;
  schwarz?: boolean;
  skatCards?: Card[];
}

/**
 * Parses a move token from the ISS protocol.
 */
export function parseMove(token: string): MoveInfo | null {
  // Check for simple tokens
  switch (token) {
    case TOKEN_HOLD_BID:
      return { moveType: MoveType.HoldBid };
    case TOKEN_PASS:
      return { moveType: MoveType.Pass };
    case TOKEN_SKAT_REQUEST:
      return { moveType: MoveType.SkatRequest };
    case TOKEN_RESIGN:
      return { moveType: MoveType.Resign };
  }

  // Check for prefixed tokens
  if (token.startsWith(TOKEN_SHOW_CARDS)) {
    return { moveType: MoveType.ShowCards };
  }
  if (token.startsWith(TOKEN_TIME_OUT)) {
    return { moveType: MoveType.TimeOut };
  }
  if (token.startsWith(TOKEN_LEAVE_TABLE)) {
    return { moveType: MoveType.LeaveTable };
  }

  // Check for bid value
  const bidValue = parseInt(token, 10);
  if (!isNaN(bidValue) && isValidBid(bidValue)) {
    return { moveType: MoveType.Bid, bidValue };
  }

  // Check for card play (2-character code)
  if (token.length === 2) {
    const card = cardFromCode(token);
    if (card !== null) {
      return { moveType: MoveType.CardPlay, card };
    }
  }

  // Check for game announcement
  if (token.length >= 1) {
    const announcement = parseGameAnnouncement(token);
    if (announcement !== null) {
      return announcement;
    }
  }

  return null;
}

/**
 * Parses a game announcement token.
 */
function parseGameAnnouncement(token: string): MoveInfo | null {
  const parts = token.split(".");

  // First part is game type with optional modifiers
  const gameCode = parts[0];
  if (gameCode.length === 0) {
    return null;
  }

  // Parse game type (first character)
  const gameType = gameTypeFromCode(gameCode[0]);
  if (gameType === null) {
    return null;
  }

  const info: MoveInfo = {
    moveType: MoveType.GameAnnouncement,
    gameType,
    hand: false,
    ouvert: false,
    schneider: false,
    schwarz: false,
  };

  // Parse modifiers (remaining characters)
  for (let i = 1; i < gameCode.length; i++) {
    switch (gameCode[i]) {
      case "H":
        info.hand = true;
        break;
      case "O":
        info.ouvert = true;
        break;
      case "S":
        info.schneider = true;
        break;
      case "Z":
        info.schwarz = true;
        break;
    }
  }

  // Parse discarded skat cards (if present)
  if (parts.length >= 3) {
    info.skatCards = [];
    for (let i = 1; i <= 2 && i < parts.length; i++) {
      const card = cardFromCode(parts[i]);
      if (card !== null) {
        info.skatCards.push(card);
      }
    }
  }

  return info;
}

/**
 * Player status at a table (10 parameters in ISS protocol).
 */
export interface PlayerStatus {
  name: string;
  ip: string;
  gamesPlayed: number;
  gamesWon: number;
  lastGameResult: number;
  totalPoints: number;
  switch34: boolean;
  reserved: number;
  talkEnabled: boolean;
  readyToPlay: boolean;
  playerLeft: boolean;
}

/**
 * Creates a new player status with default values.
 */
export function createPlayerStatus(name: string): PlayerStatus {
  return {
    name,
    ip: "0.0.0.0",
    gamesPlayed: 0,
    gamesWon: 0,
    lastGameResult: 0,
    totalPoints: 0,
    switch34: false,
    reserved: 0,
    talkEnabled: true,
    readyToPlay: false,
    playerLeft: false,
  };
}

/**
 * Encodes a player status to ISS protocol format (10 space-separated fields).
 */
export function encodePlayerStatus(status: PlayerStatus): string {
  return [
    status.name,
    status.ip,
    status.gamesPlayed.toString(),
    status.gamesWon.toString(),
    status.lastGameResult.toString(),
    status.totalPoints.toString(),
    status.switch34 ? "1" : "0",
    status.reserved.toString(),
    status.talkEnabled ? "1" : "0",
    status.readyToPlay ? "1" : "0",
  ].join(" ");
}

/**
 * Parses a player status from ISS protocol fields.
 */
export function parsePlayerStatus(fields: string[]): PlayerStatus | null {
  if (fields.length < 10) {
    return null;
  }

  return {
    name: fields[0],
    ip: fields[1],
    gamesPlayed: parseInt(fields[2], 10) || 0,
    gamesWon: parseInt(fields[3], 10) || 0,
    lastGameResult: parseInt(fields[4], 10) || 0,
    totalPoints: parseInt(fields[5], 10) || 0,
    switch34: fields[6] === "1",
    reserved: parseInt(fields[7], 10) || 0,
    talkEnabled: fields[8] === "1",
    readyToPlay: fields[9] === "1",
    playerLeft: false,
  };
}

/**
 * Table data in the ISS protocol.
 */
export interface TableData {
  tableName: string;
  maxPlayers: number;
  gamesPlayed: number;
  player1: string;
  player2: string;
  player3: string;
}

/**
 * Creates a new table data structure.
 */
export function createTableData(name: string, maxPlayers: number): TableData {
  return {
    tableName: name,
    maxPlayers,
    gamesPlayed: 0,
    player1: "",
    player2: "",
    player3: "",
  };
}

/**
 * Returns the number of players at a table.
 */
export function getTablePlayerCount(table: TableData): number {
  let count = 0;
  if (table.player1) count++;
  if (table.player2) count++;
  if (table.player3) count++;
  return count;
}

/**
 * Returns true if the table is full.
 */
export function isTableFull(table: TableData): boolean {
  return getTablePlayerCount(table) >= table.maxPlayers;
}

/**
 * Parses the card distribution format from ISS protocol.
 * Format: forehand|middlehand|rearhand|skat
 */
export function parseDealCards(
  dealStr: string
): { hands: Map<Player, Hand>; skat: Hand } | null {
  const parts = dealStr.split("|");
  if (parts.length !== 4) {
    return null;
  }

  const hands = new Map<Player, Hand>();

  for (let i = 0; i < ALL_PLAYERS.length; i++) {
    const hand = parseHandCode(parts[i]);
    if (hand === null) {
      return null;
    }
    hands.set(ALL_PLAYERS[i], hand);
  }

  const skat = parseHandCode(parts[3]);
  if (skat === null) {
    return null;
  }

  return { hands, skat };
}

/**
 * Parses a hand from its ISS protocol code.
 */
function parseHandCode(code: string): Hand | null {
  if (!code) {
    return createHand();
  }

  const parts = code.split(".");
  const hand = createHand();

  for (const part of parts) {
    if (part === "??") {
      // Hidden card placeholder - skip
      continue;
    }
    const card = cardFromCode(part);
    if (card === null) {
      return null;
    }
    addCardToHand(hand, card);
  }

  return hand;
}
