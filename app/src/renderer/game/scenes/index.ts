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
 * Game scenes module exports.
 */

// Types
export * from "./types";

// Card functions
export * from "./cardObjects";
export * from "./cardAnimations";

// Hand management
export {
  calculateHandPositions,
  updateCardHoverState,
  updateLegalMoveHighlighting,
} from "./handManagement";

// Trick management
export {
  playCardToTrick,
  repositionPlayerHand,
  simulateOpponentPlay,
  collectTrick,
} from "./trickManagement";

// Game flow
export * from "./gameFlow";
export * from "./biddingFlow";
export * from "./skatFlow";

// Main scene
export { createGameScene } from "./gameScene";
