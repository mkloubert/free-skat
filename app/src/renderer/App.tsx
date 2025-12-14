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

import { useCallback, useRef } from "react";
import { KaplayGame, type KaplayGameHandle } from "./KaplayGame";
import {
  BiddingPanel,
  AnnouncementPanel,
  SkatSelectionUI,
  ScoreDisplay,
  GameResultSummary,
  RamschNotification,
  GamePhaseIndicator,
} from "./components";
import { Player } from "../shared";

/**
 * Main application component integrating game canvas and UI overlays.
 */
export default function App() {
  const gameRef = useRef<KaplayGameHandle>(null);

  // Human player is always Forehand position
  const humanPlayer = Player.Forehand;

  // Handle new game callback - restarts the KAPlay scene
  const handleNewGame = useCallback(() => {
    // Restart the KAPlay game scene (this re-initializes the store and deals cards)
    gameRef.current?.restart();
  }, []);

  return (
    <div style={styles.container}>
      {/* KAPlay game canvas */}
      <KaplayGame ref={gameRef} />

      {/* UI overlays */}
      <GamePhaseIndicator humanPlayer={humanPlayer} />
      <BiddingPanel humanPlayer={humanPlayer} />
      <AnnouncementPanel humanPlayer={humanPlayer} />
      <SkatSelectionUI humanPlayer={humanPlayer} />
      <RamschNotification />
      <ScoreDisplay humanPlayer={humanPlayer} />
      <GameResultSummary humanPlayer={humanPlayer} onNewGame={handleNewGame} />
    </div>
  );
}

/**
 * App container styles.
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
};
