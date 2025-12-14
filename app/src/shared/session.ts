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
 * Session management module - tracks scores across multiple games.
 */

import { Player, ALL_PLAYERS } from "./player";
import { GameType } from "./gametype";
import { GameResult, RamschResult } from "./rules";
import { SkatGame, createGame, getNextDealer } from "./game";

/**
 * PlayerScore tracks cumulative score for a player.
 */
export interface PlayerScore {
  /** Player position */
  player: Player;
  /** Total score across all games */
  totalScore: number;
  /** Number of games played */
  gamesPlayed: number;
  /** Number of games won (as declarer) */
  gamesWon: number;
  /** Number of games lost (as declarer) */
  gamesLost: number;
  /** Number of games as opponent */
  gamesAsOpponent: number;
}

/**
 * GameRecord stores the result of a completed game.
 */
export interface GameRecord {
  /** Unique game ID */
  gameId: number;
  /** Timestamp when game ended */
  timestamp: Date;
  /** The game type played */
  gameType: GameType;
  /** The declarer (null for Ramsch) */
  declarer: Player | null;
  /** Whether declarer won */
  declarerWon: boolean;
  /** The bid value */
  bidValue: number;
  /** The calculated game value */
  gameValue: number;
  /** Final score for this game */
  score: number;
  /** Points scored by declarer */
  declarerPoints: number;
  /** Tricks won by declarer */
  declarerTricks: number;
  /** Whether Schneider was achieved */
  schneider: boolean;
  /** Whether Schwarz was achieved */
  schwarz: boolean;
  /** Whether declarer overbid */
  overbid: boolean;
  /** Score changes per player */
  playerScores: Map<Player, number>;
}

/**
 * SkatSession manages a series of Skat games.
 */
export interface SkatSession {
  /** Session ID */
  sessionId: string;
  /** When session started */
  startTime: Date;
  /** Player names */
  playerNames: Map<Player, string>;
  /** Current scores for each player */
  scores: Map<Player, PlayerScore>;
  /** History of all games played */
  gameHistory: GameRecord[];
  /** Current game number */
  currentGameNumber: number;
  /** Current dealer */
  currentDealer: Player;
  /** The current game in progress (if any) */
  currentGame: SkatGame | null;
}

/**
 * Creates a new session with default player names.
 */
export function createSession(playerNames?: Map<Player, string>): SkatSession {
  const names =
    playerNames ??
    new Map([
      [Player.Forehand, "Player 1"],
      [Player.Middlehand, "Player 2"],
      [Player.Rearhand, "Player 3"],
    ]);

  const scores = new Map<Player, PlayerScore>();
  for (const player of ALL_PLAYERS) {
    scores.set(player, createPlayerScore(player));
  }

  return {
    sessionId: generateSessionId(),
    startTime: new Date(),
    playerNames: names,
    scores,
    gameHistory: [],
    currentGameNumber: 0,
    currentDealer: Player.Rearhand, // First dealer, so Forehand leads first game
    currentGame: null,
  };
}

/**
 * Creates initial player score.
 */
function createPlayerScore(player: Player): PlayerScore {
  return {
    player,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesAsOpponent: 0,
  };
}

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Starts a new game in the session.
 */
export function startNewGame(session: SkatSession): SkatSession {
  const dealer = session.currentGame
    ? getNextDealer(session.currentDealer)
    : session.currentDealer;

  const game = createGame(dealer);

  return {
    ...session,
    currentGameNumber: session.currentGameNumber + 1,
    currentDealer: dealer,
    currentGame: game,
  };
}

/**
 * Records a completed game result.
 */
export function recordGameResult(
  session: SkatSession,
  result: GameResult
): SkatSession {
  const gameRecord = createGameRecord(session.currentGameNumber, result);

  // Update player scores
  const newScores = new Map(session.scores);

  if (result.declarer !== null) {
    // Normal game - update declarer and opponents
    const declarerScore = newScores.get(result.declarer)!;
    declarerScore.gamesPlayed++;

    if (result.declarerWon) {
      declarerScore.gamesWon++;
      declarerScore.totalScore += result.score;
    } else {
      declarerScore.gamesLost++;
      declarerScore.totalScore += result.score; // Negative for loss
    }

    // Opponents
    for (const player of ALL_PLAYERS) {
      if (player !== result.declarer) {
        const opponentScore = newScores.get(player)!;
        opponentScore.gamesPlayed++;
        opponentScore.gamesAsOpponent++;
        // Opponents don't directly gain/lose points in standard scoring
        // (Some variants give opponents points on declarer loss)
      }
    }

    // Record individual player scores for this game
    gameRecord.playerScores.set(result.declarer, result.score);
    for (const player of ALL_PLAYERS) {
      if (player !== result.declarer) {
        gameRecord.playerScores.set(player, 0);
      }
    }
  }

  return {
    ...session,
    scores: newScores,
    gameHistory: [...session.gameHistory, gameRecord],
    currentGame: null,
  };
}

/**
 * Records a Ramsch result.
 */
export function recordRamschResult(
  session: SkatSession,
  ramschResult: RamschResult
): SkatSession {
  const gameRecord: GameRecord = {
    gameId: session.currentGameNumber,
    timestamp: new Date(),
    gameType: GameType.Ramsch,
    declarer: null,
    declarerWon: false,
    bidValue: 0,
    gameValue: 0,
    score: ramschResult.loserScore,
    declarerPoints: 0,
    declarerTricks: 0,
    schneider: false,
    schwarz: false,
    overbid: false,
    playerScores: new Map(),
  };

  // Update player scores
  const newScores = new Map(session.scores);

  for (const player of ALL_PLAYERS) {
    const playerScore = newScores.get(player)!;
    playerScore.gamesPlayed++;

    if (ramschResult.durchmarsch && ramschResult.durchmarschPlayer === player) {
      // Durchmarsch winner gets +120
      playerScore.totalScore += 120;
      gameRecord.playerScores.set(player, 120);
    } else if (player === ramschResult.loser) {
      // Loser gets negative points
      playerScore.totalScore += ramschResult.loserScore;
      playerScore.gamesLost++;
      gameRecord.playerScores.set(player, ramschResult.loserScore);
    } else {
      // Others get 0
      gameRecord.playerScores.set(player, 0);
    }
  }

  return {
    ...session,
    scores: newScores,
    gameHistory: [...session.gameHistory, gameRecord],
    currentGame: null,
  };
}

/**
 * Creates a game record from a result.
 */
function createGameRecord(gameNumber: number, result: GameResult): GameRecord {
  return {
    gameId: gameNumber,
    timestamp: new Date(),
    gameType: result.gameType,
    declarer: result.declarer,
    declarerWon: result.declarerWon,
    bidValue: result.bidValue,
    gameValue: result.gameValue,
    score: result.score,
    declarerPoints: result.declarerPoints,
    declarerTricks: result.declarerTricks,
    schneider: result.schneider,
    schwarz: result.schwarz,
    overbid: result.overbid,
    playerScores: new Map(),
  };
}

/**
 * Gets the current standings sorted by score.
 */
export function getStandings(session: SkatSession): PlayerScore[] {
  const standings = Array.from(session.scores.values());
  standings.sort((a, b) => b.totalScore - a.totalScore);
  return standings;
}

/**
 * Gets statistics for a specific player.
 */
export function getPlayerStats(
  session: SkatSession,
  player: Player
): PlayerStats {
  const score = session.scores.get(player)!;
  const games = session.gameHistory.filter(
    (g) => g.declarer === player || g.gameType === GameType.Ramsch
  );

  const declarerGames = games.filter((g) => g.declarer === player);
  const wonGames = declarerGames.filter((g) => g.declarerWon);
  const lostGames = declarerGames.filter((g) => !g.declarerWon);

  const gameTypeBreakdown = new Map<GameType, number>();
  for (const game of declarerGames) {
    const count = gameTypeBreakdown.get(game.gameType) || 0;
    gameTypeBreakdown.set(game.gameType, count + 1);
  }

  return {
    player,
    totalScore: score.totalScore,
    gamesPlayed: score.gamesPlayed,
    gamesAsDeclarer: declarerGames.length,
    gamesWon: wonGames.length,
    gamesLost: lostGames.length,
    winRate:
      declarerGames.length > 0 ? wonGames.length / declarerGames.length : 0,
    averageGameValue:
      declarerGames.length > 0
        ? declarerGames.reduce((sum, g) => sum + g.gameValue, 0) /
          declarerGames.length
        : 0,
    gameTypeBreakdown,
    schneiderCount: declarerGames.filter((g) => g.schneider).length,
    schwarzCount: declarerGames.filter((g) => g.schwarz).length,
    overbidCount: declarerGames.filter((g) => g.overbid).length,
  };
}

/**
 * Player statistics.
 */
export interface PlayerStats {
  player: Player;
  totalScore: number;
  gamesPlayed: number;
  gamesAsDeclarer: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  averageGameValue: number;
  gameTypeBreakdown: Map<GameType, number>;
  schneiderCount: number;
  schwarzCount: number;
  overbidCount: number;
}

/**
 * Gets recent game history.
 */
export function getRecentGames(session: SkatSession, count = 10): GameRecord[] {
  return session.gameHistory.slice(-count);
}

/**
 * Gets the score summary as a formatted string.
 */
export function getScoreSummary(session: SkatSession): string {
  const standings = getStandings(session);
  const lines: string[] = [
    `=== Session Score (${session.gameHistory.length} games) ===`,
    "",
  ];

  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    const name = session.playerNames.get(s.player) || `Player ${s.player}`;
    lines.push(
      `${i + 1}. ${name}: ${s.totalScore} (${s.gamesWon}W/${s.gamesLost}L)`
    );
  }

  return lines.join("\n");
}

/**
 * Exports session data to JSON.
 */
export function exportSession(session: SkatSession): string {
  const exportData = {
    sessionId: session.sessionId,
    startTime: session.startTime.toISOString(),
    playerNames: Object.fromEntries(session.playerNames),
    scores: Array.from(session.scores.values()),
    gameHistory: session.gameHistory.map((g) => ({
      ...g,
      timestamp: g.timestamp.toISOString(),
      playerScores: Object.fromEntries(g.playerScores),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Calculates Seeger scoring (alternative scoring method).
 * In Seeger scoring, winners and losers among players are calculated differently.
 */
export function calculateSeegerScore(
  session: SkatSession
): Map<Player, number> {
  const scores = new Map<Player, number>();

  for (const player of ALL_PLAYERS) {
    scores.set(player, 0);
  }

  for (const game of session.gameHistory) {
    if (game.declarer !== null) {
      // Declarer game
      if (game.declarerWon) {
        // Declarer wins: +2 × game value, opponents each -1 × game value
        const declValue = 2 * game.gameValue;
        const oppValue = -game.gameValue;

        scores.set(game.declarer, scores.get(game.declarer)! + declValue);
        for (const player of ALL_PLAYERS) {
          if (player !== game.declarer) {
            scores.set(player, scores.get(player)! + oppValue);
          }
        }
      } else {
        // Declarer loses: -2 × game value, opponents each +1 × game value
        const declValue = -2 * game.gameValue;
        const oppValue = game.gameValue;

        scores.set(game.declarer, scores.get(game.declarer)! + declValue);
        for (const player of ALL_PLAYERS) {
          if (player !== game.declarer) {
            scores.set(player, scores.get(player)! + oppValue);
          }
        }
      }
    }
    // Ramsch handled separately in game record
  }

  return scores;
}
