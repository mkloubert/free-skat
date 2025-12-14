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
 * Game canvas dimensions
 */
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

/**
 * Card dimensions (standard playing card ratio is approximately 2.5:3.5)
 */
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;
export const CARD_CORNER_RADIUS = 6;

/**
 * Card visual settings
 */
export const CARD_COLORS = {
  background: "#FFFFFF",
  border: "#333333",
  back: "#1a5490",
  backPattern: "#0d3a6b",
  red: "#D32F2F",
  black: "#212121",
  selected: "#4CAF50",
  hover: "#FFC107",
};

/**
 * Suit symbols (Unicode)
 */
export const SUIT_SYMBOLS = {
  clubs: "♣",
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
};

/**
 * German card symbols for court cards
 */
export const RANK_DISPLAY = {
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  jack: "B", // Bube
  queen: "D", // Dame
  king: "K", // König
  ace: "A", // Ass
};

/**
 * Hand layout settings
 */
export const HAND_SETTINGS = {
  /** Card overlap in pixels */
  cardOverlap: 25,
  /** Y position of player's hand from bottom */
  playerHandY: CANVAS_HEIGHT - 80,
  /** How much a selected card pops up */
  selectedPopUp: 20,
  /** How much a hovered card pops up */
  hoverPopUp: 10,
};

/**
 * Table layout positions
 */
export const TABLE_POSITIONS = {
  /** Center of the table for trick display */
  center: {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2 - 20,
  },
  /** Player positions (where their hands/cards are shown) */
  players: {
    /** Bottom - current player (Forehand/Vorhand) */
    forehand: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 80,
    },
    /** Left side - next player clockwise (Middlehand/Mittelhand) */
    middlehand: {
      x: 100,
      y: CANVAS_HEIGHT / 2,
    },
    /** Right side - third player clockwise (Rearhand/Hinterhand) */
    rearhand: {
      x: CANVAS_WIDTH - 100,
      y: CANVAS_HEIGHT / 2,
    },
  },
  /** Skat position */
  skat: {
    x: CANVAS_WIDTH / 2,
    y: 60,
  },
};

/**
 * Trick card positions (where cards are placed when played)
 */
export const TRICK_POSITIONS = {
  forehand: {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2 + 30,
  },
  middlehand: {
    x: CANVAS_WIDTH / 2 - 50,
    y: CANVAS_HEIGHT / 2 - 20,
  },
  rearhand: {
    x: CANVAS_WIDTH / 2 + 50,
    y: CANVAS_HEIGHT / 2 - 20,
  },
};

/**
 * Animation durations in seconds
 */
export const ANIMATION = {
  cardMove: 0.3,
  cardFlip: 0.2,
  cardHover: 0.1,
  trickCollect: 0.5,
  deal: 0.15,
  cardDeal: 0.15,
  dealDelay: 0.05,
};

/**
 * Z-index layers
 */
export const LAYERS = {
  background: 0,
  table: 10,
  dropZone: 15,
  deck: 18,
  opponentCards: 20,
  skat: 30,
  playedCards: 40,
  playerCards: 50,
  selectedCard: 60,
  draggedCard: 100,
  ui: 200,
};
