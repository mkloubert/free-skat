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
 * Main game scene for FreeSkat.
 * This module orchestrates the game UI, dealing, and player interactions.
 */

import type { KAPLAYCtx } from "kaplay";
import {
  Player,
  GameState,
  GameType,
  sortForGame,
  BiddingResult,
  Card,
} from "../../../shared";
import { useGameStore } from "../../state/gameStore";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HAND_SETTINGS,
  TABLE_POSITIONS,
  LAYERS,
  ANIMATION,
} from "../utils/constants";

// Import from local modules
import {
  type CardGameObj,
  type UITextObj,
  type SceneState,
  createInitialSceneState,
} from "./types";
import { loadCardSprites, createCardObject } from "./cardObjects";
import { flipCard, animateShuffle, animateCardMove } from "./cardAnimations";
import {
  calculateHandPositions,
  updateCardHoverState,
  updateLegalMoveHighlighting,
} from "./handManagement";
import { playCardToTrick } from "./trickManagement";
import { processGameFlow } from "./gameFlow";
import {
  processAIBidding,
  performAIBiddingAction,
  handleBiddingComplete,
  AI_BIDDING_DELAY,
} from "./biddingFlow";
// skatFlow functions are triggered via biddingFlow when bidding completes

/**
 * Creates the game scene.
 */
export function createGameScene(k: KAPLAYCtx): void {
  k.scene("game", () => {
    // Initialize game store
    const store = useGameStore.getState();
    store.initGame();
    store.dealCards();

    // Create scene state
    const sceneState: SceneState = createInitialSceneState();

    // Get all cards for sprite loading
    const allCards = [
      ...store.players[Player.Forehand].hand.cards,
      ...store.players[Player.Middlehand].hand.cards,
      ...store.players[Player.Rearhand].hand.cards,
      ...store.skat,
    ];

    // Load card sprites
    loadCardSprites(k, allCards);

    // Draw table background
    k.add([
      k.rect(CANVAS_WIDTH, CANVAS_HEIGHT),
      k.pos(0, 0),
      k.color(34, 139, 34), // Forest green
      k.z(LAYERS.table),
    ]);

    // Add table border
    k.add([
      k.rect(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20),
      k.pos(10, 10),
      k.color(0, 100, 0), // Darker green
      k.outline(4, k.rgb(139, 69, 19)),
      k.z(LAYERS.table),
    ]);

    // Create drop zone for card playing
    const dropZoneSize = 150;
    sceneState.dropZone = k.add([
      k.rect(dropZoneSize, dropZoneSize),
      k.pos(TABLE_POSITIONS.center.x, TABLE_POSITIONS.center.y),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.opacity(0),
      k.z(LAYERS.dropZone),
    ]);

    // Helper function to check if point is in drop zone
    function isInDropZone(x: number, y: number): boolean {
      const zoneX = TABLE_POSITIONS.center.x;
      const zoneY = TABLE_POSITIONS.center.y;
      const halfSize = dropZoneSize / 2;
      return (
        x >= zoneX - halfSize &&
        x <= zoneX + halfSize &&
        y >= zoneY - halfSize &&
        y <= zoneY + halfSize
      );
    }

    // Global mouse move handler for dragging
    k.onMouseMove((pos) => {
      if (sceneState.dragState.isDragging && sceneState.dragState.draggedCard) {
        const card = sceneState.dragState.draggedCard;
        if (card && card.pos) {
          card.pos.x = pos.x - sceneState.dragState.offset.x;
          card.pos.y = pos.y - sceneState.dragState.offset.y;
        }

        // Show/hide drop zone highlight
        if (sceneState.dropZone) {
          if (isInDropZone(pos.x, pos.y) && card && card.isLegalMove) {
            sceneState.dropZone.opacity = 0.3;
          } else {
            sceneState.dropZone.opacity = 0;
          }
        }
      }
    });

    // Global mouse release handler for dropping
    k.onMouseRelease(() => {
      if (sceneState.dragState.isDragging && sceneState.dragState.draggedCard) {
        const card = sceneState.dragState.draggedCard;
        if (!card) {
          sceneState.dragState.isDragging = false;
          sceneState.dragState.draggedCard = null;
          return;
        }
        const mousePos = k.mousePos();

        // Hide drop zone
        if (sceneState.dropZone) {
          sceneState.dropZone.opacity = 0;
        }

        // Check if dropped in valid zone and is legal move
        if (isInDropZone(mousePos.x, mousePos.y) && card.isLegalMove) {
          const currentState = useGameStore.getState();
          if (
            currentState.currentPlayer === Player.Forehand &&
            currentState.gameState === GameState.TrickPlaying
          ) {
            // Play the card
            sceneState.dragState.isDragging = false;
            sceneState.dragState.draggedCard = null;
            sceneState.selectedCard = null;
            card.selected = false;

            playCardToTrick(k, sceneState, card, Player.Forehand, () => {
              processGameFlow(k, sceneState, updateUI);
            });
            return;
          }
        }

        // Return card to original position
        const startPos = sceneState.dragState.startPos;
        animateCardMove(
          k,
          card,
          startPos.x,
          startPos.y,
          ANIMATION.cardMove,
          () => {
            card.z =
              LAYERS.playerCards + sceneState.playerCardObjects.indexOf(card);
          }
        );

        sceneState.dragState.isDragging = false;
        sceneState.dragState.draggedCard = null;
      }
    });

    // Create UI elements
    createUIElements(k, sceneState);

    // Update UI function
    function updateUI(): void {
      const currentState = useGameStore.getState();

      if (sceneState.currentPlayerText) {
        const playerNames = {
          [Player.Forehand]: "Your Turn",
          [Player.Middlehand]: "Opponent 1's Turn",
          [Player.Rearhand]: "Opponent 2's Turn",
        };
        sceneState.currentPlayerText.text =
          playerNames[currentState.currentPlayer];
        sceneState.currentPlayerText.color =
          currentState.currentPlayer === Player.Forehand
            ? k.rgb(76, 175, 80)
            : k.rgb(255, 193, 7);
      }

      // Update game info text based on game state
      if (sceneState.gameInfoText) {
        if (currentState.gameState === GameState.Bidding) {
          const bidText =
            currentState.currentBid > 0
              ? `Current Bid: ${currentState.currentBid}`
              : "Bidding Phase";
          sceneState.gameInfoText.text = bidText;
        } else if (currentState.gameState === GameState.PickingUpSkat) {
          sceneState.gameInfoText.text = "Pick up Skat or Play Hand?";
        } else if (currentState.gameState === GameState.Declaring) {
          sceneState.gameInfoText.text = "Declare Game Type";
        } else if (currentState.gameState === GameState.TrickPlaying) {
          const gameTypeName = GameType[currentState.gameType] || "Grand";
          sceneState.gameInfoText.text = `${gameTypeName} Game`;
        }
      }

      if (sceneState.trickCountText) {
        if (currentState.gameState === GameState.TrickPlaying) {
          sceneState.trickCountText.text = `Trick: ${currentState.trickNumber + 1}/10`;
        } else {
          sceneState.trickCountText.text = "";
        }
      }

      if (sceneState.pointsText) {
        const points = currentState.players[Player.Forehand].tricksPoints;
        sceneState.pointsText.text = `Points: ${points}`;
      }

      // Update player label highlighting for active player
      for (const player of [
        Player.Forehand,
        Player.Middlehand,
        Player.Rearhand,
      ]) {
        const label = sceneState.playerLabels[player];
        if (label) {
          if (player === currentState.currentPlayer) {
            // Active player - bright gold color
            label.color = k.rgb(255, 215, 0);
          } else if (player === currentState.declarer) {
            // Declarer (not active) - green tint
            label.color = k.rgb(144, 238, 144);
          } else {
            // Inactive player - normal white
            label.color = k.rgb(200, 200, 200);
          }
        }
      }

      // Update play button visibility (only during trick playing)
      if (sceneState.playButton) {
        sceneState.playButton.hidden =
          currentState.gameState !== GameState.TrickPlaying ||
          currentState.currentPlayer !== Player.Forehand ||
          sceneState.selectedCard === null;
      }
    }

    // Create Play button
    createPlayButton(k, sceneState, updateUI);

    // Start dealing animation
    startDealingAnimation(k, sceneState, store, updateUI);
  });
}

/**
 * Creates UI elements (labels, text displays).
 */
function createUIElements(k: KAPLAYCtx, sceneState: SceneState): void {
  const labelStyle = { size: 14, font: "Arial" };

  // Player labels - stored for highlighting active player
  sceneState.playerLabels[Player.Forehand] = k.add([
    k.text("You (Forehand)", labelStyle),
    k.pos(TABLE_POSITIONS.players.forehand.x, CANVAS_HEIGHT - 20),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(LAYERS.ui),
  ]) as UITextObj;

  sceneState.playerLabels[Player.Middlehand] = k.add([
    k.text("Opponent 1", labelStyle),
    k.pos(
      TABLE_POSITIONS.players.middlehand.x,
      TABLE_POSITIONS.players.middlehand.y + 80
    ),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(LAYERS.ui),
  ]) as UITextObj;

  sceneState.playerLabels[Player.Rearhand] = k.add([
    k.text("Opponent 2", labelStyle),
    k.pos(
      TABLE_POSITIONS.players.rearhand.x,
      TABLE_POSITIONS.players.rearhand.y + 80
    ),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(LAYERS.ui),
  ]) as UITextObj;

  // Game info text
  sceneState.gameInfoText = k.add([
    k.text("Dealing cards...", { size: 16, font: "Arial" }),
    k.pos(CANVAS_WIDTH / 2, 15),
    k.anchor("center"),
    k.color(255, 255, 200),
    k.z(LAYERS.ui),
  ]) as UITextObj;

  // Current player indicator
  sceneState.currentPlayerText = k.add([
    k.text("", { size: 14, font: "Arial" }),
    k.pos(CANVAS_WIDTH / 2, 40),
    k.anchor("center"),
    k.color(76, 175, 80),
    k.z(LAYERS.ui),
  ]) as UITextObj;

  // Trick count
  sceneState.trickCountText = k.add([
    k.text("", { size: 12, font: "Arial" }),
    k.pos(80, 15),
    k.anchor("center"),
    k.color(200, 200, 200),
    k.z(LAYERS.ui),
  ]) as UITextObj;

  // Points display
  sceneState.pointsText = k.add([
    k.text("Points: 0", { size: 12, font: "Arial" }),
    k.pos(80, 35),
    k.anchor("center"),
    k.color(200, 200, 200),
    k.z(LAYERS.ui),
  ]) as UITextObj;
}

/**
 * Creates the Play button.
 */
function createPlayButton(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  sceneState.playButton = k.add([
    k.rect(80, 30),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 140),
    k.anchor("center"),
    k.color(76, 175, 80),
    k.area(),
    k.z(LAYERS.ui),
  ]);

  k.add([
    k.text("Play", { size: 14, font: "Arial" }),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 140),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(LAYERS.ui + 1),
  ]);

  sceneState.playButton.hidden = true;

  sceneState.playButton.onClick(() => {
    const currentState = useGameStore.getState();
    if (
      sceneState.selectedCard &&
      currentState.currentPlayer === Player.Forehand &&
      currentState.gameState === GameState.TrickPlaying &&
      sceneState.selectedCard.isLegalMove
    ) {
      const cardToPlay = sceneState.selectedCard;
      sceneState.selectedCard = null;
      cardToPlay.selected = false;

      playCardToTrick(k, sceneState, cardToPlay, Player.Forehand, () => {
        processGameFlow(k, sceneState, updateUI);
      });
    }
  });
}

/**
 * Sets up card click interactions.
 */
function setupCardInteractions(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  for (const cardObj of sceneState.playerCardObjects) {
    // Hover effects
    cardObj.onHover(() => {
      if (!sceneState.dragState.isDragging) {
        updateCardHoverState(k, cardObj, true, cardObj.selected);
      }
    });

    cardObj.onHoverEnd(() => {
      if (!sceneState.dragState.isDragging) {
        updateCardHoverState(k, cardObj, false, cardObj.selected);
      }
    });

    // Click to select
    cardObj.onClick(() => {
      const currentState = useGameStore.getState();

      // Only allow selection during trick playing and when it's player's turn
      if (
        currentState.gameState !== GameState.TrickPlaying ||
        currentState.currentPlayer !== Player.Forehand
      ) {
        return;
      }

      // Deselect previously selected card
      if (sceneState.selectedCard && sceneState.selectedCard !== cardObj) {
        sceneState.selectedCard.selected = false;
        updateCardHoverState(k, sceneState.selectedCard, false, false);
      }

      // Toggle selection
      cardObj.selected = !cardObj.selected;
      sceneState.selectedCard = cardObj.selected ? cardObj : null;

      updateCardHoverState(k, cardObj, false, cardObj.selected);
      updateUI();
    });

    // Drag to play
    cardObj.onMouseDown(() => {
      const currentState = useGameStore.getState();

      if (
        currentState.gameState !== GameState.TrickPlaying ||
        currentState.currentPlayer !== Player.Forehand
      ) {
        return;
      }

      if (cardObj.pos) {
        sceneState.dragState.isDragging = true;
        sceneState.dragState.draggedCard = cardObj;
        sceneState.dragState.startPos = { x: cardObj.pos.x, y: cardObj.pos.y };

        const mousePos = k.mousePos();
        sceneState.dragState.offset = {
          x: mousePos.x - cardObj.pos.x,
          y: mousePos.y - cardObj.pos.y,
        };

        // Bring to front
        cardObj.z = LAYERS.draggedCard;
      }
    });
  }
}

/**
 * Starts the card dealing animation.
 */
function startDealingAnimation(
  k: KAPLAYCtx,
  sceneState: SceneState,
  store: ReturnType<typeof useGameStore.getState>,
  updateUI: () => void
): void {
  // Create deck at center
  const deckCards: CardGameObj[] = [];
  for (let i = 0; i < 32; i++) {
    const card = createCardObject(
      k,
      store.players[Player.Forehand].hand.cards[i % 10] ||
        store.skat[i % 2] ||
        store.players[Player.Forehand].hand.cards[0],
      TABLE_POSITIONS.center.x,
      TABLE_POSITIONS.center.y - i * 0.5,
      false,
      LAYERS.deck + i,
      "skat"
    );
    deckCards.push(card);
  }

  // Define deal order based on traditional Skat dealing
  type DealData = {
    owner: Player | "skat";
    cards: Card[];
  };

  const dealOrder: DealData[] = [
    // Round 1: 3 cards each
    {
      owner: Player.Forehand,
      cards: store.players[Player.Forehand].hand.cards.slice(0, 3),
    },
    {
      owner: Player.Middlehand,
      cards: store.players[Player.Middlehand].hand.cards.slice(0, 3),
    },
    {
      owner: Player.Rearhand,
      cards: store.players[Player.Rearhand].hand.cards.slice(0, 3),
    },
    // Skat: 2 cards
    { owner: "skat", cards: store.skat },
    // Round 2: 4 cards each
    {
      owner: Player.Forehand,
      cards: store.players[Player.Forehand].hand.cards.slice(3, 7),
    },
    {
      owner: Player.Middlehand,
      cards: store.players[Player.Middlehand].hand.cards.slice(3, 7),
    },
    {
      owner: Player.Rearhand,
      cards: store.players[Player.Rearhand].hand.cards.slice(3, 7),
    },
    // Round 3: 3 cards each
    {
      owner: Player.Forehand,
      cards: store.players[Player.Forehand].hand.cards.slice(7, 10),
    },
    {
      owner: Player.Middlehand,
      cards: store.players[Player.Middlehand].hand.cards.slice(7, 10),
    },
    {
      owner: Player.Rearhand,
      cards: store.players[Player.Rearhand].hand.cards.slice(7, 10),
    },
  ];

  // Flatten for card-by-card dealing
  const dealOrderCards: { owner: Player | "skat"; card: Card }[] = [];
  for (const deal of dealOrder) {
    for (const card of deal.cards) {
      dealOrderCards.push({ owner: deal.owner, card });
    }
  }

  // Shuffle animation
  animateShuffle(
    k,
    deckCards,
    TABLE_POSITIONS.center.x,
    TABLE_POSITIONS.center.y,
    () => {
      // Start dealing
      let cardIndex = 0;

      function dealNextCard(): void {
        if (cardIndex >= dealOrderCards.length) {
          // Clean up deck cards
          for (const card of deckCards) {
            if (card && card.destroy) {
              card.destroy();
            }
          }

          // Dealing complete - create final hand cards
          createFinalHandCards(k, sceneState, store, updateUI);
          return;
        }

        const dealData = dealOrderCards[cardIndex];
        const cardObj = deckCards[cardIndex];

        if (!cardObj || !dealData) {
          cardIndex++;
          dealNextCard();
          return;
        }

        const owner = dealData.owner;
        let targetX: number;
        let targetY: number;
        let targetAngle = 0;

        if (owner === Player.Forehand) {
          const playerCards = sceneState.playerCardObjects.length;
          const positions = calculateHandPositions(
            playerCards + 1,
            TABLE_POSITIONS.players.forehand.x,
            HAND_SETTINGS.playerHandY
          );
          const pos = positions[playerCards];
          targetX = pos.x;
          targetY = pos.y;
        } else if (owner === Player.Middlehand) {
          const opponentCards = sceneState.opponentCardObjects[0].length;
          const positions = calculateHandPositions(
            opponentCards + 1,
            TABLE_POSITIONS.players.middlehand.x,
            TABLE_POSITIONS.players.middlehand.y
          );
          const pos = positions[opponentCards];
          targetX = pos.x;
          targetY = pos.y;
          targetAngle = 90;
        } else if (owner === Player.Rearhand) {
          const opponentCards = sceneState.opponentCardObjects[1].length;
          const positions = calculateHandPositions(
            opponentCards + 1,
            TABLE_POSITIONS.players.rearhand.x,
            TABLE_POSITIONS.players.rearhand.y
          );
          const pos = positions[opponentCards];
          targetX = pos.x;
          targetY = pos.y;
          targetAngle = -90;
        } else {
          // Skat
          const skatIndex = sceneState.skatCardObjects.length;
          targetX = TABLE_POSITIONS.skat.x + skatIndex * 30;
          targetY = TABLE_POSITIONS.skat.y;
        }

        // Update card data
        cardObj.cardData = dealData.card;
        cardObj.owner = owner;
        cardObj.angle = targetAngle;

        // Animate to position
        animateCardMove(
          k,
          cardObj,
          targetX,
          targetY,
          ANIMATION.cardDeal,
          () => {
            // Add to appropriate array
            if (owner === Player.Forehand) {
              sceneState.playerCardObjects.push(cardObj);
            } else if (owner === Player.Middlehand) {
              sceneState.opponentCardObjects[0].push(cardObj);
            } else if (owner === Player.Rearhand) {
              sceneState.opponentCardObjects[1].push(cardObj);
            } else {
              sceneState.skatCardObjects.push(cardObj);
            }

            cardIndex++;
            k.wait(ANIMATION.dealDelay, dealNextCard);
          }
        );
      }

      dealNextCard();
    }
  );
}

/**
 * Creates the final hand cards after dealing is complete.
 */
function createFinalHandCards(
  k: KAPLAYCtx,
  sceneState: SceneState,
  store: ReturnType<typeof useGameStore.getState>,
  updateUI: () => void
): void {
  // Clear old card objects
  for (const card of sceneState.playerCardObjects) {
    if (card && card.destroy) card.destroy();
  }
  for (const cards of sceneState.opponentCardObjects) {
    for (const card of cards) {
      if (card && card.destroy) card.destroy();
    }
  }
  for (const card of sceneState.skatCardObjects) {
    if (card && card.destroy) card.destroy();
  }

  sceneState.playerCardObjects = [];
  sceneState.opponentCardObjects = [[], []];
  sceneState.skatCardObjects = [];

  // Sort player cards
  const sortedPlayerCards = sortForGame(
    store.players[Player.Forehand].hand.cards,
    store.gameType
  );

  // Create player cards (face up, sorted)
  const playerPositions = calculateHandPositions(
    sortedPlayerCards.length,
    TABLE_POSITIONS.players.forehand.x,
    HAND_SETTINGS.playerHandY
  );

  for (let i = 0; i < sortedPlayerCards.length; i++) {
    const card = sortedPlayerCards[i];
    const pos = playerPositions[i];
    const cardObj = createCardObject(
      k,
      card,
      pos.x,
      pos.y,
      true,
      LAYERS.playerCards + i,
      Player.Forehand
    );
    cardObj.baseY = pos.y;
    sceneState.playerCardObjects.push(cardObj);
  }

  // Create opponent cards (face down)
  const opp1Cards = store.players[Player.Middlehand].hand.cards;
  const opp1Positions = calculateHandPositions(
    opp1Cards.length,
    TABLE_POSITIONS.players.middlehand.x,
    TABLE_POSITIONS.players.middlehand.y
  );
  for (let i = 0; i < opp1Cards.length; i++) {
    const card = opp1Cards[i];
    const pos = opp1Positions[i];
    const cardObj = createCardObject(
      k,
      card,
      pos.x,
      pos.y,
      false,
      LAYERS.opponentCards + i,
      Player.Middlehand
    );
    cardObj.angle = 90;
    sceneState.opponentCardObjects[0].push(cardObj);
  }

  const opp2Cards = store.players[Player.Rearhand].hand.cards;
  const opp2Positions = calculateHandPositions(
    opp2Cards.length,
    TABLE_POSITIONS.players.rearhand.x,
    TABLE_POSITIONS.players.rearhand.y
  );
  for (let i = 0; i < opp2Cards.length; i++) {
    const card = opp2Cards[i];
    const pos = opp2Positions[i];
    const cardObj = createCardObject(
      k,
      card,
      pos.x,
      pos.y,
      false,
      LAYERS.opponentCards + i,
      Player.Rearhand
    );
    cardObj.angle = -90;
    sceneState.opponentCardObjects[1].push(cardObj);
  }

  // Create skat cards (face down)
  for (let i = 0; i < store.skat.length; i++) {
    const card = store.skat[i];
    const cardObj = createCardObject(
      k,
      card,
      TABLE_POSITIONS.skat.x + i * 30,
      TABLE_POSITIONS.skat.y,
      false,
      LAYERS.skat + i,
      "skat"
    );
    sceneState.skatCardObjects.push(cardObj);
  }

  console.log(
    `[GameScene] Created ${sceneState.playerCardObjects.length} sorted face-up player cards`
  );

  // Start bidding phase instead of trick playing
  store.startBidding();

  // Set up card interactions for later use
  setupCardInteractions(k, sceneState, updateUI);

  // Subscribe to store changes to trigger AI bidding and skat handling
  let lastCurrentPlayer = store.currentPlayer;
  let lastBiddingResult = store.bidding.result;
  let lastGameState = store.gameState;
  useGameStore.subscribe((state) => {
    const gameStateChanged = state.gameState !== lastGameState;
    lastGameState = state.gameState;

    // Check if we're in bidding phase and something changed
    if (state.gameState === GameState.Bidding) {
      const playerChanged = state.currentPlayer !== lastCurrentPlayer;
      const resultChanged = state.bidding.result !== lastBiddingResult;

      if (playerChanged || resultChanged) {
        lastCurrentPlayer = state.currentPlayer;
        lastBiddingResult = state.bidding.result;

        // Trigger AI bidding if it's not the human's turn
        if (
          state.currentPlayer !== Player.Forehand &&
          state.bidding.result === BiddingResult.InProgress
        ) {
          k.wait(AI_BIDDING_DELAY / 1000, () => {
            performAIBiddingAction(k, sceneState, updateUI);
          });
        } else if (state.bidding.result !== BiddingResult.InProgress) {
          handleBiddingComplete(k, sceneState, updateUI);
        }
      }
    }

    // Handle skat phase transitions
    if (gameStateChanged) {
      if (state.gameState === GameState.PickingUpSkat) {
        // Skat pickup phase - AI handling is triggered by biddingFlow
        // Human handling will be done via React UI
        updateUI();
      } else if (state.gameState === GameState.Declaring) {
        // Declaring phase - update UI
        updateUI();
      } else if (state.gameState === GameState.TrickPlaying) {
        // Trick playing started - re-setup card interactions
        setupCardInteractions(k, sceneState, updateUI);
        updateLegalMoveHighlighting(k, sceneState, state);
        updateUI();
      }
    }
  });

  // Process initial AI bidding if needed
  processAIBidding(k, sceneState, updateUI);

  // Add skat click handlers
  for (const skatCard of sceneState.skatCardObjects) {
    skatCard.onClick(() => {
      flipCard(k, skatCard);
    });
  }

  updateLegalMoveHighlighting(k, sceneState, store);
  updateUI();
}
