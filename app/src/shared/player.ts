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
 * Player represents a player position at the table.
 */
export enum Player {
  /** Forehand (Vorhand) - first to receive cards, first to play */
  Forehand = 0,
  /** Middlehand (Mittelhand) - second position */
  Middlehand = 1,
  /** Rearhand (Hinterhand) - third position, dealer */
  Rearhand = 2,
}

/** All player positions in order. */
export const ALL_PLAYERS: Player[] = [
  Player.Forehand,
  Player.Middlehand,
  Player.Rearhand,
];

/** Player names in English. */
export const PLAYER_NAMES: Record<Player, string> = {
  [Player.Forehand]: "Forehand",
  [Player.Middlehand]: "Middlehand",
  [Player.Rearhand]: "Rearhand",
};

/** Player names in German. */
export const PLAYER_GERMAN_NAMES: Record<Player, string> = {
  [Player.Forehand]: "Vorhand",
  [Player.Middlehand]: "Mittelhand",
  [Player.Rearhand]: "Hinterhand",
};

/**
 * Returns the English name of a player position.
 */
export function getPlayerName(player: Player): string {
  return PLAYER_NAMES[player];
}

/**
 * Returns the German name of a player position.
 */
export function getPlayerGermanName(player: Player): string {
  return PLAYER_GERMAN_NAMES[player];
}

/**
 * Returns the player to the left (next in turn order).
 */
export function getLeftNeighbor(player: Player): Player {
  return ((player + 1) % 3) as Player;
}

/**
 * Returns the player to the right (previous in turn order).
 */
export function getRightNeighbor(player: Player): Player {
  return ((player + 2) % 3) as Player;
}

/**
 * Returns the player for the given index (0-2).
 */
export function playerFromIndex(index: number): Player | null {
  if (index < 0 || index > 2) {
    return null;
  }
  return index as Player;
}

/**
 * MovePlayer represents the source of a move in ISS protocol.
 */
export enum MovePlayer {
  /** Server/world move (dealing, etc.) */
  World = 0,
  /** Move from Forehand */
  Forehand = 1,
  /** Move from Middlehand */
  Middlehand = 2,
  /** Move from Rearhand */
  Rearhand = 3,
}

/** ISS protocol codes for move players. */
export const MOVE_PLAYER_CODES: Record<MovePlayer, string> = {
  [MovePlayer.World]: "w",
  [MovePlayer.Forehand]: "0",
  [MovePlayer.Middlehand]: "1",
  [MovePlayer.Rearhand]: "2",
};

/**
 * Converts MovePlayer to Player (if applicable).
 */
export function movePlayerToPlayer(movePlayer: MovePlayer): Player | null {
  switch (movePlayer) {
    case MovePlayer.Forehand:
      return Player.Forehand;
    case MovePlayer.Middlehand:
      return Player.Middlehand;
    case MovePlayer.Rearhand:
      return Player.Rearhand;
    default:
      return null;
  }
}

/**
 * Converts a Player to MovePlayer.
 */
export function playerToMovePlayer(player: Player): MovePlayer {
  switch (player) {
    case Player.Forehand:
      return MovePlayer.Forehand;
    case Player.Middlehand:
      return MovePlayer.Middlehand;
    case Player.Rearhand:
      return MovePlayer.Rearhand;
  }
}
