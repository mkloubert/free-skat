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

import { useEffect, useRef } from "react";
import kaplay, { type KAPLAYCtx } from "kaplay";
import { createGameScene } from "./game/scenes/gameScene";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./game/utils/constants";

export function KaplayGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<KAPLAYCtx | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize KAPlay with game settings
    const k = kaplay({
      global: false,
      canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      letterbox: true,
      background: [0, 0, 0],
      crisp: true, // Sharp pixel rendering
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
      <canvas ref={canvasRef} />
    </div>
  );
}
