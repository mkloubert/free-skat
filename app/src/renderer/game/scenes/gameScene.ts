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

import type {
  KAPLAYCtx,
  GameObj,
  PosComp,
  ScaleComp,
  RotateComp,
  AnchorComp,
  AreaComp,
  OpacityComp,
  ZComp,
  TextComp,
  ColorComp,
} from "kaplay";
import {
  Card,
  Player,
  GameState,
  canPlayCard,
  getLeftNeighbor,
  createTrick,
  addCardToTrick,
  determineTrickWinner,
} from "../../../shared";
import { useGameStore, type GameStoreState } from "../../state/gameStore";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CARD_WIDTH,
  HAND_SETTINGS,
  TABLE_POSITIONS,
  TRICK_POSITIONS,
  LAYERS,
  ANIMATION,
} from "../utils/constants";
import { getCardFaceImage, getCardBackImage } from "../utils/cardRenderer";

/**
 * Card game object with additional properties.
 */
export interface CardGameObj extends GameObj<
  PosComp | ScaleComp | RotateComp | AnchorComp | AreaComp | OpacityComp | ZComp
> {
  cardData: Card;
  faceUp: boolean;
  selected: boolean;
  baseY: number;
  isLegalMove: boolean;
  owner: Player | "skat";
}

/**
 * UI Text object type.
 */
type UITextObj = GameObj<PosComp | AnchorComp | ZComp | TextComp | ColorComp>;

/**
 * Drag state for tracking card dragging.
 */
interface DragState {
  isDragging: boolean;
  draggedCard: CardGameObj | null;
  startPos: { x: number; y: number };
  offset: { x: number; y: number };
}

/**
 * Scene state for managing game objects.
 */
interface SceneState {
  playerCardObjects: CardGameObj[];
  opponentCardObjects: [CardGameObj[], CardGameObj[]];
  skatCardObjects: CardGameObj[];
  trickCardObjects: (CardGameObj | null)[];
  selectedCard: CardGameObj | null;
  currentPlayerText: UITextObj | null;
  trickCountText: UITextObj | null;
  pointsText: UITextObj | null;
  gameInfoText: UITextObj | null;
  playButton: GameObj | null;
  dropZone: GameObj | null;
  dragState: DragState;
}

/**
 * Loads card sprites into KAPlay.
 */
async function loadCardSprites(k: KAPLAYCtx, cards: Card[]): Promise<void> {
  // Load card back
  const backImage = getCardBackImage();
  k.loadSprite("card_back", backImage);

  // Load all card faces
  for (const card of cards) {
    const spriteName = `card_${card.suit}_${card.rank}`;
    const faceImage = getCardFaceImage(card);
    k.loadSprite(spriteName, faceImage);
  }
}

/**
 * Creates a card game object.
 */
function createCardObject(
  k: KAPLAYCtx,
  card: Card,
  x: number,
  y: number,
  faceUp: boolean,
  zIndex: number,
  owner: Player | "skat"
): CardGameObj {
  const spriteName = faceUp ? `card_${card.suit}_${card.rank}` : "card_back";

  const obj = k.add([
    k.sprite(spriteName),
    k.pos(x, y),
    k.anchor("center"),
    k.area(),
    k.scale(1),
    k.rotate(0),
    k.opacity(1),
    k.z(zIndex),
    {
      cardData: card,
      faceUp,
      selected: false,
      baseY: y,
      isLegalMove: true,
      owner,
    },
  ]) as CardGameObj;

  return obj;
}

/**
 * Calculates hand card positions with fan layout.
 */
function calculateHandPositions(
  cardCount: number,
  centerX: number,
  y: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const totalWidth = (cardCount - 1) * HAND_SETTINGS.cardOverlap + CARD_WIDTH;
  const startX = centerX - totalWidth / 2 + CARD_WIDTH / 2;

  for (let i = 0; i < cardCount; i++) {
    positions.push({
      x: startX + i * HAND_SETTINGS.cardOverlap,
      y,
    });
  }

  return positions;
}

/**
 * Updates card positions for hover/selection effects.
 */
function updateCardHoverState(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  isHovered: boolean,
  isSelected: boolean
): void {
  if (!cardObj || !cardObj.pos) return;

  let targetY = cardObj.baseY;

  if (isSelected) {
    targetY -= HAND_SETTINGS.selectedPopUp;
  } else if (isHovered) {
    targetY -= HAND_SETTINGS.hoverPopUp;
  }

  const startY = cardObj.pos.y;

  // Animate to target position
  k.tween(
    0,
    1,
    ANIMATION.cardHover,
    (t) => {
      if (cardObj && cardObj.pos) {
        cardObj.pos.y = startY + (targetY - startY) * t;
      }
    },
    k.easings.easeOutQuad
  );
}

/**
 * Updates legal move highlighting for all cards in hand.
 */
function updateLegalMoveHighlighting(
  k: KAPLAYCtx,
  sceneState: SceneState,
  gameState: GameStoreState
): void {
  const leadCard = gameState.currentTrick.cards.find((c) => c !== null) ?? null;
  const playerHand = gameState.players[Player.Forehand].hand;

  for (const cardObj of sceneState.playerCardObjects) {
    const isLegal = canPlayCard(
      cardObj.cardData,
      leadCard,
      playerHand,
      gameState.gameType
    );
    cardObj.isLegalMove = isLegal;

    // Visual feedback for legal/illegal moves
    if (isLegal) {
      cardObj.opacity = 1;
    } else {
      cardObj.opacity = 0.5;
    }
  }
}

/**
 * Flips a card with animation.
 */
export function flipCard(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  onComplete?: () => void
): void {
  if (!cardObj || !cardObj.scale || !cardObj.cardData) {
    if (onComplete) onComplete();
    return;
  }

  const duration = ANIMATION.cardFlip;

  const currentScaleX =
    typeof cardObj.scale.x === "number" ? cardObj.scale.x : 1;
  const currentScaleY =
    typeof cardObj.scale.y === "number" ? cardObj.scale.y : 1;

  k.tween(
    currentScaleX,
    0,
    duration / 2,
    (val) => {
      if (cardObj && cardObj.scale) {
        cardObj.scale = k.vec2(val, currentScaleY);
      }
    },
    k.easings.easeInQuad
  ).onEnd(() => {
    if (!cardObj || !cardObj.cardData) {
      if (onComplete) onComplete();
      return;
    }
    const cardData = cardObj.cardData;
    cardObj.faceUp = !cardObj.faceUp;
    const newSpriteName = cardObj.faceUp
      ? `card_${cardData.suit}_${cardData.rank}`
      : "card_back";
    cardObj.use(k.sprite(newSpriteName));

    k.tween(
      0,
      currentScaleX,
      duration / 2,
      (val) => {
        if (cardObj && cardObj.scale) {
          cardObj.scale = k.vec2(val, currentScaleY);
        }
      },
      k.easings.easeOutQuad
    ).onEnd(() => {
      if (onComplete) {
        onComplete();
      }
    });
  });
}

/**
 * Flips a card to a specific state (face-up or face-down).
 */
export function flipCardTo(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  faceUp: boolean,
  onComplete?: () => void
): void {
  if (!cardObj) {
    if (onComplete) onComplete();
    return;
  }
  if (cardObj.faceUp === faceUp) {
    if (onComplete) {
      onComplete();
    }
    return;
  }
  flipCard(k, cardObj, onComplete);
}

/**
 * Performs a shuffle animation on deck cards.
 */
function animateShuffle(
  k: KAPLAYCtx,
  deckCards: CardGameObj[],
  centerX: number,
  centerY: number,
  onComplete?: () => void
): void {
  const shuffleRounds = 3;
  let currentRound = 0;

  function doShuffleRound(): void {
    if (currentRound >= shuffleRounds) {
      // Return all cards to center pile
      let completed = 0;
      for (let i = 0; i < deckCards.length; i++) {
        const card = deckCards[i];
        if (!card || !card.pos) {
          completed++;
          if (completed === deckCards.length && onComplete) {
            onComplete();
          }
          continue;
        }
        const startX = card.pos.x;
        const startY = card.pos.y;
        const targetY = centerY + i * 0.5;
        const delay = i * 0.01;
        k.wait(delay, () => {
          k.tween(
            0,
            1,
            0.15,
            (t) => {
              if (card && card.pos) {
                card.pos.x = startX + (centerX - startX) * t;
                card.pos.y = startY + (targetY - startY) * t;
              }
            },
            k.easings.easeOutQuad
          ).onEnd(() => {
            completed++;
            if (completed === deckCards.length && onComplete) {
              onComplete();
            }
          });
        });
      }
      return;
    }

    // Split deck into two halves and riffle
    const half = Math.floor(deckCards.length / 2);
    let completed = 0;

    for (let i = 0; i < deckCards.length; i++) {
      const card = deckCards[i];
      if (!card || !card.pos) {
        completed++;
        if (completed === deckCards.length) {
          currentRound++;
          k.wait(0.05, doShuffleRound);
        }
        continue;
      }
      const isLeftHalf = i < half;
      const targetX = centerX + (isLeftHalf ? -40 : 40);
      const targetY = centerY + (Math.random() - 0.5) * 20;
      const startX = card.pos.x;
      const startY = card.pos.y;

      k.tween(
        0,
        1,
        0.1,
        (t) => {
          if (card && card.pos) {
            card.pos.x = startX + (targetX - startX) * t;
            card.pos.y = startY + (targetY - startY) * t;
          }
        },
        k.easings.easeOutQuad
      ).onEnd(() => {
        // Return to center with slight random offset
        if (!card || !card.pos) {
          completed++;
          if (completed === deckCards.length) {
            currentRound++;
            k.wait(0.05, doShuffleRound);
          }
          return;
        }
        const returnStartX = card.pos.x;
        const returnStartY = card.pos.y;
        const returnTargetY = centerY + (Math.random() - 0.5) * 5;
        k.tween(
          0,
          1,
          0.1,
          (t) => {
            if (card && card.pos) {
              card.pos.x = returnStartX + (centerX - returnStartX) * t;
              card.pos.y = returnStartY + (returnTargetY - returnStartY) * t;
            }
          },
          k.easings.easeInQuad
        ).onEnd(() => {
          completed++;
          if (completed === deckCards.length) {
            currentRound++;
            k.wait(0.05, doShuffleRound);
          }
        });
      });
    }
  }

  doShuffleRound();
}

/**
 * Animates a card moving from one position to another.
 */
function animateCardMove(
  k: KAPLAYCtx,
  cardObj: CardGameObj,
  targetX: number,
  targetY: number,
  duration: number,
  onComplete?: () => void
): void {
  if (!cardObj || !cardObj.pos) {
    if (onComplete) onComplete();
    return;
  }

  const startX = cardObj.pos.x;
  const startY = cardObj.pos.y;

  k.tween(
    0,
    1,
    duration,
    (t) => {
      if (cardObj && cardObj.pos) {
        cardObj.pos.x = startX + (targetX - startX) * t;
        cardObj.pos.y = startY + (targetY - startY) * t;
      }
    },
    k.easings.easeOutQuad
  ).onEnd(() => {
    if (onComplete) {
      onComplete();
    }
  });
}

/**
 * Plays a card from the player's hand to the trick area.
 */
function playCardToTrick(
  k: KAPLAYCtx,
  sceneState: SceneState,
  cardObj: CardGameObj,
  player: Player,
  onComplete?: () => void
): void {
  const store = useGameStore.getState();

  // Get target position based on player
  const positions = {
    [Player.Forehand]: TRICK_POSITIONS.forehand,
    [Player.Middlehand]: TRICK_POSITIONS.middlehand,
    [Player.Rearhand]: TRICK_POSITIONS.rearhand,
  };
  const targetPos = positions[player];

  // Update z-index for played card
  cardObj.z = LAYERS.playedCards + player;

  // Animate card to trick position
  animateCardMove(
    k,
    cardObj,
    targetPos.x,
    targetPos.y,
    ANIMATION.cardMove,
    () => {
      // Store the card in trick objects
      sceneState.trickCardObjects[player] = cardObj;

      // Update game store
      store.playCard(player, cardObj.cardData);

      // Remove from player's hand objects if it's the human player
      if (player === Player.Forehand) {
        const index = sceneState.playerCardObjects.indexOf(cardObj);
        if (index !== -1) {
          sceneState.playerCardObjects.splice(index, 1);
        }
        // Reposition remaining cards
        repositionPlayerHand(k, sceneState);
      }

      if (onComplete) {
        onComplete();
      }
    }
  );
}

/**
 * Repositions player's hand cards after a card is played.
 */
function repositionPlayerHand(k: KAPLAYCtx, sceneState: SceneState): void {
  const positions = calculateHandPositions(
    sceneState.playerCardObjects.length,
    TABLE_POSITIONS.players.forehand.x,
    HAND_SETTINGS.playerHandY
  );

  for (let i = 0; i < sceneState.playerCardObjects.length; i++) {
    const cardObj = sceneState.playerCardObjects[i];
    const pos = positions[i];
    cardObj.baseY = pos.y;
    cardObj.z = LAYERS.playerCards + i;

    animateCardMove(k, cardObj, pos.x, pos.y, ANIMATION.cardMove);
  }
}

/**
 * Simulates opponent playing a card.
 */
function simulateOpponentPlay(
  k: KAPLAYCtx,
  sceneState: SceneState,
  player: Player,
  onComplete?: () => void
): void {
  const store = useGameStore.getState();
  const opponentIndex = player === Player.Middlehand ? 0 : 1;
  const opponentCards = sceneState.opponentCardObjects[opponentIndex];

  if (opponentCards.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  // Get lead card for legal move check
  const leadCard = store.currentTrick.cards.find((c) => c !== null) ?? null;
  const playerHand = store.players[player].hand;

  // Find a legal card to play (simple AI: first legal card)
  let cardToPlay: CardGameObj | null = null;
  for (const cardObj of opponentCards) {
    if (canPlayCard(cardObj.cardData, leadCard, playerHand, store.gameType)) {
      cardToPlay = cardObj;
      break;
    }
  }

  if (!cardToPlay) {
    cardToPlay = opponentCards[0]; // Fallback
  }

  const selectedCard = cardToPlay;

  // Flip card face up first
  flipCard(k, selectedCard, () => {
    // Then animate to trick position
    playCardToTrick(k, sceneState, selectedCard, player, () => {
      // Remove from opponent's cards
      const index = opponentCards.indexOf(selectedCard);
      if (index !== -1) {
        opponentCards.splice(index, 1);
      }

      if (onComplete) {
        onComplete();
      }
    });
  });
}

/**
 * Collects the trick cards and moves them to the winner.
 */
function collectTrick(
  k: KAPLAYCtx,
  sceneState: SceneState,
  winner: Player,
  onComplete?: () => void
): void {
  const store = useGameStore.getState();

  // Determine collection position based on winner
  const collectPositions = {
    [Player.Forehand]: { x: CANVAS_WIDTH - 80, y: CANVAS_HEIGHT - 40 },
    [Player.Middlehand]: { x: CANVAS_WIDTH - 40, y: CANVAS_HEIGHT / 2 + 80 },
    [Player.Rearhand]: { x: 40, y: CANVAS_HEIGHT / 2 + 80 },
  };
  const collectPos = collectPositions[winner];

  let completed = 0;
  const trickCards = sceneState.trickCardObjects.filter(
    (c): c is CardGameObj => c !== null
  );

  if (trickCards.length === 0) {
    store.completeTrick(winner);
    store.startNewTrick(winner);
    if (onComplete) onComplete();
    return;
  }

  for (const cardObj of trickCards) {
    animateCardMove(
      k,
      cardObj,
      collectPos.x,
      collectPos.y,
      ANIMATION.trickCollect,
      () => {
        // Fade out and destroy
        k.tween(1, 0, 0.2, (val) => (cardObj.opacity = val)).onEnd(() => {
          cardObj.destroy();
        });

        completed++;
        if (completed === trickCards.length) {
          // Clear trick objects
          sceneState.trickCardObjects = [null, null, null];

          // Update store
          store.completeTrick(winner);
          store.startNewTrick(winner);

          if (onComplete) {
            onComplete();
          }
        }
      }
    );
  }
}

/**
 * Processes the game flow after a card is played.
 */
function processGameFlow(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const store = useGameStore.getState();

  // Check if trick is complete (all 3 cards played)
  const trickCards = store.currentTrick.cards;
  const playedCount = trickCards.filter((c) => c !== null).length;

  if (playedCount === 3) {
    // Determine winner using actual game rules
    const trick = createTrick(store.currentTrick.forehand);
    const playerOrder = [Player.Forehand, Player.Middlehand, Player.Rearhand];
    for (const player of playerOrder) {
      const card = trickCards[player];
      if (card) {
        addCardToTrick(trick, card, player);
      }
    }
    const winner = determineTrickWinner(trick, store.gameType);

    k.wait(0.5, () => {
      collectTrick(k, sceneState, winner, () => {
        updateUI();

        // Check if game is over
        if (store.trickNumber >= 10) {
          showGameOver(k);
        } else {
          // Continue with next trick
          const currentState = useGameStore.getState();
          updateLegalMoveHighlighting(k, sceneState, currentState);
        }
      });
    });
  } else {
    // Next player's turn
    const nextPlayer = getLeftNeighbor(store.currentPlayer);
    store.setCurrentPlayer(nextPlayer);
    updateUI();

    if (nextPlayer !== Player.Forehand) {
      // AI plays
      k.wait(0.5, () => {
        simulateOpponentPlay(k, sceneState, nextPlayer, () => {
          processGameFlow(k, sceneState, updateUI);
        });
      });
    } else {
      // Player's turn - update legal moves
      const currentState = useGameStore.getState();
      updateLegalMoveHighlighting(k, sceneState, currentState);
    }
  }
}

/**
 * Shows game over screen.
 */
function showGameOver(k: KAPLAYCtx): void {
  const store = useGameStore.getState();
  const playerPoints = store.players[Player.Forehand].tricksPoints;

  k.add([
    k.rect(300, 150),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2),
    k.anchor("center"),
    k.color(0, 0, 0),
    k.opacity(0.8),
    k.z(LAYERS.ui + 10),
  ]);

  k.add([
    k.text("Game Over!", { size: 24 }),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(LAYERS.ui + 11),
  ]);

  k.add([
    k.text(`Your Points: ${playerPoints}`, { size: 18 }),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10),
    k.anchor("center"),
    k.color(255, 255, 200),
    k.z(LAYERS.ui + 11),
  ]);

  // New game button
  const newGameBtn = k.add([
    k.rect(120, 40),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50),
    k.anchor("center"),
    k.color(76, 175, 80),
    k.area(),
    k.z(LAYERS.ui + 11),
  ]);

  k.add([
    k.text("New Game", { size: 14 }),
    k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.z(LAYERS.ui + 12),
  ]);

  newGameBtn.onClick(() => {
    k.go("game");
  });
}

/**
 * Sets up card interactions after dealing is complete.
 */
function setupCardInteractions(
  k: KAPLAYCtx,
  sceneState: SceneState,
  updateUI: () => void
): void {
  const processFlow = () => {
    processGameFlow(k, sceneState, updateUI);
  };

  for (const cardObj of sceneState.playerCardObjects) {
    // Hover effects
    cardObj.onHover(() => {
      if (!cardObj.selected && cardObj.isLegalMove) {
        updateCardHoverState(k, cardObj, true, false);
      }
    });

    cardObj.onHoverEnd(() => {
      if (!cardObj.selected && !sceneState.dragState.isDragging) {
        updateCardHoverState(k, cardObj, false, false);
      }
    });

    // Mouse down to start dragging
    cardObj.onMouseDown(() => {
      const currentState = useGameStore.getState();
      if (currentState.currentPlayer !== Player.Forehand) return;
      if (!cardObj.isLegalMove) return;
      if (!cardObj.pos) return;

      const mousePos = k.mousePos();
      sceneState.dragState.isDragging = true;
      sceneState.dragState.draggedCard = cardObj;
      sceneState.dragState.startPos = { x: cardObj.pos.x, y: cardObj.pos.y };
      sceneState.dragState.offset = {
        x: mousePos.x - cardObj.pos.x,
        y: mousePos.y - cardObj.pos.y,
      };
      cardObj.z = LAYERS.draggedCard;
    });

    // Track last click time for double-click detection
    let lastClickTime = 0;
    const DOUBLE_CLICK_THRESHOLD = 300;

    // Click to select (with double-click detection)
    cardObj.onClick(() => {
      if (sceneState.dragState.isDragging) return;

      const currentState = useGameStore.getState();
      if (currentState.currentPlayer !== Player.Forehand) return;

      if (!cardObj.isLegalMove) {
        if (!cardObj.pos) return;
        const originalX = cardObj.pos.x;
        // Shake animation for illegal move
        k.tween(0, 1, 0.05, (t) => {
          if (cardObj && cardObj.pos) {
            cardObj.pos.x = originalX + 10 * t;
          }
        }).onEnd(() => {
          k.tween(0, 1, 0.1, (t) => {
            if (cardObj && cardObj.pos) {
              cardObj.pos.x = originalX + 10 - 20 * t;
            }
          }).onEnd(() => {
            k.tween(0, 1, 0.05, (t) => {
              if (cardObj && cardObj.pos) {
                cardObj.pos.x = originalX - 10 + 10 * t;
              }
            });
          });
        });
        return;
      }

      const now = Date.now();
      if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
        sceneState.selectedCard = null;
        playCardToTrick(k, sceneState, cardObj, Player.Forehand, () => {
          processFlow();
        });
        lastClickTime = 0;
        return;
      }
      lastClickTime = now;

      if (sceneState.selectedCard && sceneState.selectedCard !== cardObj) {
        sceneState.selectedCard.selected = false;
        updateCardHoverState(k, sceneState.selectedCard, false, false);
        sceneState.selectedCard.z =
          LAYERS.playerCards +
          sceneState.playerCardObjects.indexOf(sceneState.selectedCard);
      }

      cardObj.selected = !cardObj.selected;
      updateCardHoverState(k, cardObj, false, cardObj.selected);

      if (cardObj.selected) {
        sceneState.selectedCard = cardObj;
        cardObj.z = LAYERS.selectedCard;
      } else {
        sceneState.selectedCard = null;
        cardObj.z =
          LAYERS.playerCards + sceneState.playerCardObjects.indexOf(cardObj);
      }

      updateUI();
    });
  }
}

/**
 * Creates the main game scene.
 */
export function createGameScene(k: KAPLAYCtx): void {
  k.scene("game", async () => {
    // Initialize game store
    const store = useGameStore.getState();
    store.initGame();
    store.dealCards();

    // Get all cards for sprite loading (in deal order)
    const allCards = [
      ...store.players[Player.Forehand].hand.cards,
      ...store.players[Player.Middlehand].hand.cards,
      ...store.players[Player.Rearhand].hand.cards,
      ...store.skat,
    ];

    // Scene state
    const sceneState: SceneState = {
      playerCardObjects: [],
      opponentCardObjects: [[], []],
      skatCardObjects: [],
      trickCardObjects: [null, null, null],
      selectedCard: null,
      currentPlayerText: null,
      trickCountText: null,
      pointsText: null,
      gameInfoText: null,
      playButton: null,
      dropZone: null,
      dragState: {
        isDragging: false,
        draggedCard: null,
        startPos: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
      },
    };

    // Load all card sprites
    await loadCardSprites(k, allCards);

    // Draw table background
    k.add([
      k.rect(CANVAS_WIDTH, CANVAS_HEIGHT),
      k.pos(0, 0),
      k.color(34, 85, 51),
      k.z(LAYERS.background),
    ]);

    // Draw table border
    k.add([
      k.rect(CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40),
      k.pos(20, 20),
      k.outline(3, k.rgb(25, 65, 40)),
      k.color(39, 95, 58),
      k.z(LAYERS.table),
    ]);

    // Create drop zone for drag-and-drop (invisible until dragging)
    const dropZoneSize = 150;
    sceneState.dropZone = k.add([
      k.rect(dropZoneSize, dropZoneSize),
      k.pos(TABLE_POSITIONS.center.x, TABLE_POSITIONS.center.y),
      k.anchor("center"),
      k.color(76, 175, 80),
      k.opacity(0),
      k.z(LAYERS.table + 1),
      k.area(),
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
          if (currentState.currentPlayer === Player.Forehand) {
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
    const labelStyle = { size: 14, font: "Arial" };

    // Player labels
    k.add([
      k.text("You (Forehand)", labelStyle),
      k.pos(TABLE_POSITIONS.players.forehand.x, CANVAS_HEIGHT - 20),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.z(LAYERS.ui),
    ]);

    k.add([
      k.text("Opponent 1", labelStyle),
      k.pos(
        TABLE_POSITIONS.players.middlehand.x,
        TABLE_POSITIONS.players.middlehand.y + 80
      ),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.z(LAYERS.ui),
    ]);

    k.add([
      k.text("Opponent 2", labelStyle),
      k.pos(
        TABLE_POSITIONS.players.rearhand.x,
        TABLE_POSITIONS.players.rearhand.y + 80
      ),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.z(LAYERS.ui),
    ]);

    // Game info text
    sceneState.gameInfoText = k.add([
      k.text("Grand Game - Select a card and click Play", {
        size: 16,
        font: "Arial",
      }),
      k.pos(CANVAS_WIDTH / 2, 15),
      k.anchor("center"),
      k.color(255, 255, 200),
      k.z(LAYERS.ui),
    ]) as UITextObj;

    // Current player indicator
    sceneState.currentPlayerText = k.add([
      k.text("Your Turn", { size: 14, font: "Arial" }),
      k.pos(CANVAS_WIDTH / 2, 40),
      k.anchor("center"),
      k.color(76, 175, 80),
      k.z(LAYERS.ui),
    ]) as UITextObj;

    // Trick count
    sceneState.trickCountText = k.add([
      k.text("Trick: 1/10", { size: 12, font: "Arial" }),
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

      if (sceneState.trickCountText) {
        sceneState.trickCountText.text = `Trick: ${currentState.trickNumber + 1}/10`;
      }

      if (sceneState.pointsText) {
        const points = currentState.players[Player.Forehand].tricksPoints;
        sceneState.pointsText.text = `Points: ${points}`;
      }

      // Update play button visibility
      if (sceneState.playButton) {
        sceneState.playButton.hidden =
          currentState.currentPlayer !== Player.Forehand ||
          sceneState.selectedCard === null;
      }
    }

    // Create Play button
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
        sceneState.selectedCard.isLegalMove &&
        currentState.currentPlayer === Player.Forehand
      ) {
        const cardToPlay = sceneState.selectedCard;
        sceneState.selectedCard = null;

        playCardToTrick(k, sceneState, cardToPlay, Player.Forehand, () => {
          processGameFlow(k, sceneState, updateUI);
        });
      }
    });

    // Calculate final positions for dealing
    const playerHand = store.players[Player.Forehand].hand.cards;
    // Ensure we have positions for 10 cards (the standard hand size)
    const cardCount = playerHand.length > 0 ? playerHand.length : 10;
    const handPositions = calculateHandPositions(
      cardCount,
      TABLE_POSITIONS.players.forehand.x,
      HAND_SETTINGS.playerHandY
    );

    // Create status text for animations
    const statusText = k.add([
      k.text("Shuffling...", { size: 20, font: "Arial" }),
      k.pos(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80),
      k.anchor("center"),
      k.color(255, 255, 200),
      k.z(LAYERS.ui + 5),
    ]);

    // Create all 32 cards at center as a deck (face down)
    const deckX = CANVAS_WIDTH / 2;
    const deckY = CANVAS_HEIGHT / 2;
    const deckCards: CardGameObj[] = [];

    // Build deck in the order they will be dealt
    const dealOrderCards: { card: Card; owner: Player | "skat" }[] = [];

    // Traditional Skat dealing order: 3-3-3-skat(2)-4-4-4-3-3-3
    const playerCards = [
      store.players[Player.Forehand].hand.cards,
      store.players[Player.Middlehand].hand.cards,
      store.players[Player.Rearhand].hand.cards,
    ];

    // First round: 3 cards each
    for (let p = 0; p < 3; p++) {
      for (let i = 0; i < 3; i++) {
        dealOrderCards.push({
          card: playerCards[p][i],
          owner: p as Player,
        });
      }
    }
    // Skat: 2 cards
    for (let i = 0; i < 2; i++) {
      dealOrderCards.push({ card: store.skat[i], owner: "skat" });
    }
    // Second round: 4 cards each
    for (let p = 0; p < 3; p++) {
      for (let i = 3; i < 7; i++) {
        dealOrderCards.push({
          card: playerCards[p][i],
          owner: p as Player,
        });
      }
    }
    // Third round: 3 cards each
    for (let p = 0; p < 3; p++) {
      for (let i = 7; i < 10; i++) {
        dealOrderCards.push({
          card: playerCards[p][i],
          owner: p as Player,
        });
      }
    }

    // Create card objects at deck position
    for (let i = 0; i < dealOrderCards.length; i++) {
      const { card, owner } = dealOrderCards[i];
      const cardObj = createCardObject(
        k,
        card,
        deckX,
        deckY - i * 0.5,
        false,
        LAYERS.skat + i,
        owner
      );
      deckCards.push(cardObj);
    }

    // Animation sequence: Shuffle -> Deal -> Flip player cards -> Start game
    animateShuffle(k, deckCards, deckX, deckY, () => {
      statusText.text = "Dealing...";

      // Prepare positions for dealing animation
      const playerCardCounts = [0, 0, 0];
      let skatCount = 0;

      // Custom dealing animation
      let cardIndex = 0;

      function dealNextCard(): void {
        if (cardIndex >= deckCards.length || deckCards.length === 0) {
          // Dealing complete - flip player cards and start game
          if (statusText) {
            statusText.text = "";
            statusText.destroy();
          }

          // Flip player's cards face up
          let flipped = 0;
          for (const cardObj of sceneState.playerCardObjects) {
            flipCard(k, cardObj, () => {
              flipped++;
              if (flipped === sceneState.playerCardObjects.length) {
                // All cards flipped - set up interactions and start
                store.setGameState(GameState.TrickPlaying);
                setupCardInteractions(k, sceneState, updateUI);

                // Add skat click handlers
                for (const skatCard of sceneState.skatCardObjects) {
                  skatCard.onClick(() => {
                    flipCard(k, skatCard);
                  });
                }

                updateLegalMoveHighlighting(k, sceneState, store);
                updateUI();
              }
            });
          }
          return;
        }

        const cardObj = deckCards[cardIndex];
        const dealData = dealOrderCards[cardIndex];

        if (!cardObj || !dealData) {
          cardIndex++;
          dealNextCard();
          return;
        }

        const owner = dealData.owner;

        let targetX: number;
        let targetY: number;
        let targetAngle = 0;
        let targetScale = 1;

        if (owner === "skat") {
          targetX = TABLE_POSITIONS.skat.x + (skatCount - 0.5) * 30;
          targetY = TABLE_POSITIONS.skat.y;
          sceneState.skatCardObjects.push(cardObj);
          skatCount++;
        } else if (owner === Player.Forehand) {
          const posIndex = playerCardCounts[0];
          if (posIndex >= handPositions.length) {
            // Safety: skip if out of bounds
            cardIndex++;
            dealNextCard();
            return;
          }
          const pos = handPositions[posIndex];
          if (!pos) {
            cardIndex++;
            dealNextCard();
            return;
          }
          targetX = pos.x;
          targetY = pos.y;
          cardObj.baseY = targetY;
          sceneState.playerCardObjects.push(cardObj);
          playerCardCounts[0]++;
        } else {
          const oppIndex = owner === Player.Middlehand ? 0 : 1;
          targetX =
            owner === Player.Middlehand
              ? TABLE_POSITIONS.players.middlehand.x
              : TABLE_POSITIONS.players.rearhand.x;
          targetY =
            (owner === Player.Middlehand
              ? TABLE_POSITIONS.players.middlehand.y
              : TABLE_POSITIONS.players.rearhand.y) -
            100 +
            playerCardCounts[owner] * 18;
          targetAngle = owner === Player.Middlehand ? 90 : -90;
          targetScale = 0.6;
          sceneState.opponentCardObjects[oppIndex].push(cardObj);
          playerCardCounts[owner]++;
        }

        cardObj.z = LAYERS.playerCards + cardIndex;

        if (!cardObj || !cardObj.pos) {
          cardIndex++;
          dealNextCard();
          return;
        }

        const startX = cardObj.pos.x;
        const startY = cardObj.pos.y;

        k.tween(
          0,
          1,
          ANIMATION.deal,
          (t) => {
            if (cardObj && cardObj.pos) {
              cardObj.pos.x = startX + (targetX - startX) * t;
              cardObj.pos.y = startY + (targetY - startY) * t;
              cardObj.angle = targetAngle * t;
              cardObj.scale = k.vec2(
                1 + (targetScale - 1) * t,
                1 + (targetScale - 1) * t
              );
            }
          },
          k.easings.easeOutQuad
        ).onEnd(() => {
          if (cardObj) {
            cardObj.baseY = targetY;
          }
          cardIndex++;
          dealNextCard();
        });
      }

      dealNextCard();
    });
  });
}
