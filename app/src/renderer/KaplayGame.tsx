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

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import kaplay, { type KAPLAYCtx } from "kaplay";
import { createGameScene } from "./game/scenes/gameScene";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./game/utils/constants";

/**
 * Handle for controlling the KaplayGame from parent components.
 */
export interface KaplayGameHandle {
  /** Restarts the game scene */
  restart: () => void;
}

export const KaplayGame = forwardRef<KaplayGameHandle>(function KaplayGame(
  _props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<KAPLAYCtx | null>(null);

  // Expose restart function to parent
  useImperativeHandle(ref, () => ({
    restart: () => {
      if (kRef.current) {
        kRef.current.go("game");
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize KAPlay with game settings
    // Use devicePixelRatio for crisp rendering on high-DPI/Retina displays
    const k = kaplay({
      global: false,
      canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      background: [0, 0, 0],
      pixelDensity: window.devicePixelRatio || 1,
    });

    kRef.current = k;

    // Create and start the game scene
    createGameScene(k);
    k.go("game");

    return () => {
      // Graceful cleanup and shutdown
      k.quit();
      kRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        backgroundColor: "#1a1a1a",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
      />
    </div>
  );
});
