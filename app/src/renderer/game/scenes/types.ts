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
 * Type definitions for the game scene.
 */

import type {
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
import type { Card, Player } from "../../../shared";

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
export type UITextObj = GameObj<
  PosComp | AnchorComp | ZComp | TextComp | ColorComp
>;

/**
 * Drag state for tracking card dragging.
 */
export interface DragState {
  isDragging: boolean;
  draggedCard: CardGameObj | null;
  startPos: { x: number; y: number };
  offset: { x: number; y: number };
}

/**
 * Scene state for managing game objects.
 */
export interface SceneState {
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
  /** Player name labels for highlighting */
  playerLabels: Record<number, UITextObj | null>;
}

/**
 * Creates initial scene state.
 */
export function createInitialSceneState(): SceneState {
  return {
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
    playerLabels: {
      0: null,
      1: null,
      2: null,
    },
  };
}
