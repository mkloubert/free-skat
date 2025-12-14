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

import { create } from "zustand";
import {
  Card,
  Hand,
  Player,
  GameType,
  GameState,
  Contract,
  createDeck,
  shuffleDeck,
  sortForGame,
  createHand,
  createHandFromCards,
  addCardToHand,
  removeCardFromHand,
  BiddingState,
  BiddingResult,
  createBiddingState,
  processBid,
  processHold,
  processPass,
  getLeftNeighbor,
} from "../../shared";

/**
 * Trick state representing the current trick being played.
 */
export interface TrickState {
  /** The player who leads the trick */
  forehand: Player;
  /** Cards played in the trick (indexed by player position) */
  cards: (Card | null)[];
  /** Winner of the trick (set when complete) */
  winner: Player | null;
}

/**
 * Player data for each position.
 */
export interface PlayerData {
  /** Player's hand */
  hand: Hand;
  /** Points collected from tricks */
  tricksPoints: number;
  /** Number of tricks won */
  tricksWon: number;
  /** Whether this player is the declarer */
  isDeclarer: boolean;
  /** Player name */
  name: string;
}

/**
 * Complete game state.
 */
export interface GameStoreState {
  // === Game State ===
  /** Current game state */
  gameState: GameState;
  /** Current game type */
  gameType: GameType;
  /** Current contract (if declared) */
  contract: Contract | null;
  /** The skat cards */
  skat: Card[];
  /** Original skat (before pickup) */
  originalSkat: Card[];
  /** Whether the declarer picked up the skat */
  skatPickedUp: boolean;

  // === Players ===
  /** Player data for each position */
  players: Record<Player, PlayerData>;
  /** Current player (whose turn it is) */
  currentPlayer: Player;
  /** The declarer (if determined) */
  declarer: Player | null;
  /** The dealer for this round */
  dealer: Player;

  // === Trick State ===
  /** Current trick */
  currentTrick: TrickState;
  /** Number of tricks played */
  trickNumber: number;

  // === Bidding State ===
  /** Full bidding state machine */
  bidding: BiddingState;
  /** Current bid value (convenience accessor) */
  currentBid: number;
  /** Highest bidder (convenience accessor) */
  highestBidder: Player | null;
  /** Players who have passed (convenience accessor) */
  passedPlayers: Player[];

  // === Session State (persists across games) ===
  /** Cumulative session scores for each player */
  sessionScores: Record<Player, number>;

  // === Actions ===
  /** Initialize a new game */
  initGame: () => void;
  /** Deal cards to all players */
  dealCards: () => void;
  /** Set the current game state */
  setGameState: (state: GameState) => void;
  /** Set the current player */
  setCurrentPlayer: (player: Player) => void;
  /** Play a card from a player's hand */
  playCard: (player: Player, card: Card) => void;
  /** Complete the current trick */
  completeTrick: (winner: Player) => void;
  /** Start a new trick */
  startNewTrick: (forehand: Player) => void;
  /** Pick up the skat */
  pickUpSkat: () => void;
  /** Discard cards to skat */
  discardToSkat: (cards: Card[]) => void;
  /** Declare the game */
  declareGame: (gameType: GameType, contract: Contract) => void;
  /** Place a bid */
  placeBid: (player: Player, bid: number) => void;
  /** Hold on current bid */
  holdBid: (player: Player) => void;
  /** Pass on bidding */
  passBid: (player: Player) => void;
  /** Start the bidding phase */
  startBidding: () => void;
  /** Get a player's hand */
  getPlayerHand: (player: Player) => Hand;
  /** Reset the game */
  resetGame: () => void;
}

/**
 * Creates initial player data.
 */
function createInitialPlayerData(name: string): PlayerData {
  return {
    hand: createHand(),
    tricksPoints: 0,
    tricksWon: 0,
    isDeclarer: false,
    name,
  };
}

/**
 * Creates initial trick state.
 */
function createInitialTrickState(forehand: Player): TrickState {
  return {
    forehand,
    cards: [null, null, null],
    winner: null,
  };
}

/**
 * The game store using Zustand.
 */
export const useGameStore = create<GameStoreState>((set, get) => ({
  // === Initial State ===
  gameState: GameState.GameStart,
  gameType: GameType.Grand,
  contract: null,
  skat: [],
  originalSkat: [],
  skatPickedUp: false,

  players: {
    [Player.Forehand]: createInitialPlayerData("You"),
    [Player.Middlehand]: createInitialPlayerData("Opponent 1"),
    [Player.Rearhand]: createInitialPlayerData("Opponent 2"),
  },
  currentPlayer: Player.Forehand,
  declarer: null,
  dealer: Player.Rearhand,

  currentTrick: createInitialTrickState(Player.Forehand),
  trickNumber: 0,

  bidding: createBiddingState(),
  currentBid: 0,
  highestBidder: null,
  passedPlayers: [],

  sessionScores: {
    [Player.Forehand]: 0,
    [Player.Middlehand]: 0,
    [Player.Rearhand]: 0,
  },

  // === Actions ===
  initGame: () => {
    // Vorhand (lead player) is always to the left of the dealer
    const dealer = get().dealer;
    const vorhand = getLeftNeighbor(dealer);

    set({
      gameState: GameState.GameStart,
      gameType: GameType.Grand,
      contract: null,
      skat: [],
      originalSkat: [],
      skatPickedUp: false,
      players: {
        [Player.Forehand]: createInitialPlayerData("You"),
        [Player.Middlehand]: createInitialPlayerData("Opponent 1"),
        [Player.Rearhand]: createInitialPlayerData("Opponent 2"),
      },
      currentPlayer: vorhand,
      declarer: null,
      currentTrick: createInitialTrickState(vorhand),
      trickNumber: 0,
      bidding: createBiddingState(),
      currentBid: 0,
      highestBidder: null,
      passedPlayers: [],
    });
  },

  dealCards: () => {
    const deck = shuffleDeck(createDeck());

    // Deal 10 cards to each player, 2 to skat
    const forehandCards = deck.slice(0, 10);
    const middlehandCards = deck.slice(10, 20);
    const rearhandCards = deck.slice(20, 30);
    const skatCards = deck.slice(30, 32);

    set((state) => ({
      gameState: GameState.Dealing,
      skat: skatCards,
      originalSkat: [...skatCards],
      players: {
        [Player.Forehand]: {
          ...state.players[Player.Forehand],
          hand: createHandFromCards(forehandCards),
        },
        [Player.Middlehand]: {
          ...state.players[Player.Middlehand],
          hand: createHandFromCards(middlehandCards),
        },
        [Player.Rearhand]: {
          ...state.players[Player.Rearhand],
          hand: createHandFromCards(rearhandCards),
        },
      },
    }));
  },

  setGameState: (gameState: GameState) => {
    set({ gameState });
  },

  setCurrentPlayer: (currentPlayer: Player) => {
    set({ currentPlayer });
  },

  playCard: (player: Player, card: Card) => {
    const state = get();
    const playerData = state.players[player];

    // Remove card from hand
    const newHand = createHandFromCards([...playerData.hand.cards]);
    removeCardFromHand(newHand, card);

    // Add card to current trick
    const newTrickCards = [...state.currentTrick.cards];
    newTrickCards[player] = card;

    set({
      players: {
        ...state.players,
        [player]: {
          ...playerData,
          hand: newHand,
        },
      },
      currentTrick: {
        ...state.currentTrick,
        cards: newTrickCards,
      },
    });
  },

  completeTrick: (winner: Player) => {
    const state = get();

    // Calculate points in the trick
    const trickPoints = state.currentTrick.cards.reduce((sum, card) => {
      if (card) {
        // Get card points (imported from shared)
        const points =
          card.rank === 6
            ? 11
            : card.rank === 5
              ? 10
              : card.rank === 4
                ? 4
                : card.rank === 3
                  ? 3
                  : card.rank === 7
                    ? 2
                    : 0;
        return sum + points;
      }
      return sum;
    }, 0);

    // Update winner's stats
    const winnerData = state.players[winner];

    set({
      currentTrick: {
        ...state.currentTrick,
        winner,
      },
      players: {
        ...state.players,
        [winner]: {
          ...winnerData,
          tricksPoints: winnerData.tricksPoints + trickPoints,
          tricksWon: winnerData.tricksWon + 1,
        },
      },
      trickNumber: state.trickNumber + 1,
    });
  },

  startNewTrick: (forehand: Player) => {
    set({
      currentTrick: createInitialTrickState(forehand),
      currentPlayer: forehand,
    });
  },

  pickUpSkat: () => {
    const state = get();
    if (!state.declarer) return;

    const declarerData = state.players[state.declarer];
    const newHand = createHandFromCards([...declarerData.hand.cards]);

    // Add skat cards to declarer's hand
    for (const card of state.skat) {
      addCardToHand(newHand, card);
    }

    set({
      gameState: GameState.Discarding,
      skatPickedUp: true,
      players: {
        ...state.players,
        [state.declarer]: {
          ...declarerData,
          hand: newHand,
        },
      },
      skat: [],
    });
  },

  discardToSkat: (cards: Card[]) => {
    const state = get();
    if (!state.declarer || cards.length !== 2) return;

    const declarerData = state.players[state.declarer];
    const newHand = createHandFromCards([...declarerData.hand.cards]);

    // Remove discarded cards from hand
    for (const card of cards) {
      removeCardFromHand(newHand, card);
    }

    set({
      skat: cards,
      players: {
        ...state.players,
        [state.declarer]: {
          ...declarerData,
          hand: newHand,
        },
      },
      gameState: GameState.Declaring,
    });
  },

  declareGame: (gameType: GameType, contract: Contract) => {
    const state = get();
    if (!state.declarer) return;

    // Sort all hands according to game type
    const sortedPlayers = { ...state.players };
    for (const player of [
      Player.Forehand,
      Player.Middlehand,
      Player.Rearhand,
    ]) {
      const playerData = sortedPlayers[player];
      sortedPlayers[player] = {
        ...playerData,
        hand: createHandFromCards(sortForGame(playerData.hand.cards, gameType)),
        isDeclarer: player === state.declarer,
      };
    }

    set({
      gameType,
      contract,
      players: sortedPlayers,
      gameState: GameState.TrickPlaying,
      currentPlayer: Player.Forehand,
      currentTrick: createInitialTrickState(Player.Forehand),
    });
  },

  placeBid: (player: Player, bid: number) => {
    const state = get();
    try {
      const newBidding = processBid(state.bidding, player, bid);
      set({
        bidding: newBidding,
        currentBid: newBidding.currentBid,
        highestBidder: newBidding.currentBidder,
        currentPlayer: newBidding.activePlayer,
        passedPlayers: Array.from(newBidding.passedPlayers),
      });
    } catch {
      // Invalid bid - ignore
      console.warn(`Invalid bid: ${bid} by ${player}`);
    }
  },

  holdBid: (player: Player) => {
    const state = get();
    try {
      const newBidding = processHold(state.bidding, player);
      set({
        bidding: newBidding,
        currentBid: newBidding.currentBid,
        currentPlayer: newBidding.activePlayer,
      });
    } catch {
      // Invalid hold - ignore
      console.warn(`Invalid hold by ${player}`);
    }
  },

  passBid: (player: Player) => {
    const state = get();
    try {
      const newBidding = processPass(state.bidding, player);
      const newPassedPlayers = Array.from(newBidding.passedPlayers);

      // Check if bidding is complete
      if (newBidding.result === BiddingResult.HasDeclarer) {
        set({
          bidding: newBidding,
          passedPlayers: newPassedPlayers,
          declarer: newBidding.declarer,
          currentBid: newBidding.finalBid,
          gameState: GameState.PickingUpSkat,
          currentPlayer: newBidding.declarer!,
        });
      } else if (newBidding.result === BiddingResult.AllPassed) {
        // All passed - Ramsch
        set({
          bidding: newBidding,
          passedPlayers: newPassedPlayers,
          declarer: null,
          gameType: GameType.Ramsch,
          gameState: GameState.TrickPlaying,
          currentPlayer: Player.Forehand,
        });
      } else {
        // Bidding continues
        set({
          bidding: newBidding,
          passedPlayers: newPassedPlayers,
          currentPlayer: newBidding.activePlayer,
          currentBid: newBidding.currentBid,
          highestBidder: newBidding.currentBidder,
        });
      }
    } catch {
      // Invalid pass - ignore
      console.warn(`Invalid pass by ${player}`);
    }
  },

  /** Start bidding phase */
  startBidding: () => {
    const newBidding = createBiddingState();
    set({
      gameState: GameState.Bidding,
      bidding: newBidding,
      currentBid: 0,
      highestBidder: null,
      passedPlayers: [],
      currentPlayer: newBidding.activePlayer,
    });
  },

  getPlayerHand: (player: Player) => {
    return get().players[player].hand;
  },

  resetGame: () => {
    const state = get();

    // Calculate and update session scores from completed game
    const newSessionScores = { ...state.sessionScores };

    if (state.gameType === GameType.Ramsch) {
      // Ramsch: player with most points loses (gets negative score)
      const maxPoints = Math.max(
        ...Object.values(state.players).map((p) => p.tricksPoints)
      );
      for (const player of [
        Player.Forehand,
        Player.Middlehand,
        Player.Rearhand,
      ]) {
        if (state.players[player].tricksPoints === maxPoints) {
          newSessionScores[player] -= maxPoints;
        }
      }
    } else if (state.declarer !== null) {
      // Normal game: calculate declarer's score
      const declarerPoints = state.players[state.declarer].tricksPoints;
      const declarerTricks = state.players[state.declarer].tricksWon;
      const isNullGame = state.gameType === GameType.Null;

      // Determine if declarer won
      let declarerWon: boolean;
      if (isNullGame) {
        declarerWon = declarerTricks === 0;
      } else {
        declarerWon = declarerPoints >= 61;
      }

      // Calculate game value (simplified - base × 2 for matador + game)
      const baseValues: Record<GameType, number> = {
        [GameType.Diamonds]: 9,
        [GameType.Hearts]: 10,
        [GameType.Spades]: 11,
        [GameType.Clubs]: 12,
        [GameType.Grand]: 24,
        [GameType.Null]: 23,
        [GameType.Ramsch]: 0,
      };
      let gameValue = baseValues[state.gameType] * 2;
      if (state.contract?.hand) gameValue += baseValues[state.gameType];

      // Check overbid
      const overbid = state.currentBid > 0 && gameValue < state.currentBid;

      // Calculate final score
      let score: number;
      if (!declarerWon || overbid) {
        const lossValue = overbid ? state.currentBid : gameValue;
        score = -2 * lossValue;
      } else {
        score = gameValue;
      }

      newSessionScores[state.declarer] += score;
    }

    set({ sessionScores: newSessionScores });

    // Rotate dealer to the left neighbor for next game
    const nextDealer = getLeftNeighbor(state.dealer);
    set({ dealer: nextDealer });

    // Initialize new game state
    get().initGame();
  },
}));
