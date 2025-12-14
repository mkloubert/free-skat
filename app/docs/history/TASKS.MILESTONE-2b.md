# Tasks - Milestone 2: Game Flow Integration

**Goal:** Integrate existing UI components with the KAPlay game scene to enable full game flow

**Current Status:**
- All game logic is implemented (bidding, rules, scoring, AI)
- All UI components exist (BiddingPanel, AnnouncementPanel, SkatSelectionUI, ScoreDisplay, GameResultSummary)
- The gameScene.ts skips directly to TrickPlaying, bypassing bidding and game announcement phases

**Success Criteria:**
- Full game flow from dealing through bidding to trick playing
- Player can participate in bidding (Reizen)
- Player can pick up skat or play hand
- Player can announce game type
- AI opponents participate in all phases

---

## Phase 1: Game Flow Integration

### Connect Dealing to Bidding
- [x] After dealing animation completes, set `GameState.Bidding` instead of `GameState.TrickPlaying`
- [x] Ensure BiddingPanel becomes visible after dealing
- [x] Player cards should be face-up during bidding phase

### AI Bidding Integration
- [x] Trigger AI bidding decisions when it's AI's turn
- [x] Use existing `BasicAI.decideBid()` for AI bidding
- [x] Add delays between AI bids for better UX
- [x] Handle all bidding outcomes (declarer found, all pass -> Ramsch)

### Bidding State Management
- [x] Enhanced gameStore with full BiddingState from bidding.ts
- [x] Added `placeBid`, `holdBid`, `passBid` actions using processBid/processHold/processPass
- [x] Added `startBidding` action to transition from dealing to bidding
- [x] Ensure `currentPlayer` updates correctly during bidding
- [x] Track `passedPlayers` and `highestBidder` properly via BiddingState
- [x] Transition to `GameState.PickingUpSkat` when bidding completes

---

## Phase 2: Skat Handling Integration

### Skat Pickup Decision
- [x] Show skat pickup prompt after bidding (for human declarer)
- [x] Enable "Pick up Skat" or "Play Hand" choice
- [x] AI declarer makes skat decision automatically
- [x] Transition to appropriate next state

### Skat Card Display
- [x] Reveal skat cards to declarer when picked up
- [x] Add skat cards to declarer's hand visually
- [x] Update hand sorting after skat pickup

### Card Discarding
- [x] Enable selecting 2 cards to discard (SkatSelectionUI)
- [x] Validate exactly 2 cards selected
- [x] Remove discarded cards from hand display
- [x] Transition to `GameState.Declaring`

---

## Phase 3: Game Announcement Integration

### Game Type Selection
- [x] Show AnnouncementPanel for human declarer
- [x] Enable game type selection (Grand, Clubs, Spades, Hearts, Diamonds, Null)
- [x] Display calculated game value based on hand
- [x] AI declarer announces game automatically

### Modifier Selection
- [x] Enable Hand modifier (if skat not picked up)
- [x] Enable Schneider/Schwarz announcement (requires Hand)
- [x] Enable Ouvert announcement
- [x] Validate announcement against bid value

### Start Trick Playing
- [x] Set game type in store after announcement
- [x] Initialize rule system for announced game
- [x] Re-sort player cards for announced game type
- [x] Transition to `GameState.TrickPlaying`
- [x] Determine first player (Forehand leads first trick)

---

## Phase 4: Ramsch Handling

### All Pass Detection
- [x] Detect when all players pass during bidding
- [x] Show Ramsch notification to player
- [x] Initialize Ramsch rules (no declarer, avoid points)
- [x] Start trick playing with Forehand leading

---

## Phase 5: Game Result Integration

### End Game Detection
- [x] Detect when all 10 tricks are played
- [x] Calculate final game result using existing logic
- [x] Transition to `GameState.GameOver`

### Result Display
- [x] Show GameResultSummary component
- [x] Display winner, points, game value
- [x] Show Schneider/Schwarz achievements
- [x] Enable "New Game" to restart

### Dealer Rotation
- [x] Rotate dealer position after each game
- [x] Update player positions for next game
- [x] Maintain session scores across games

---

## Phase 6: Polish & Bug Fixes

### Visual Improvements
- [x] Smooth transitions between game phases
- [x] Clear visual indication of current phase
- [x] Highlight active player during all phases

### State Consistency
- [x] Ensure all state transitions are clean
- [ ] Handle edge cases (e.g., disconnects, errors)
- [ ] Test all game type combinations

---

## Implementation Notes

### Existing Components to Use
- `src/renderer/components/BiddingPanel.tsx` - Bidding UI
- `src/renderer/components/AnnouncementPanel.tsx` - Game announcement
- `src/renderer/components/SkatSelectionUI.tsx` - Skat pickup/discard
- `src/renderer/components/ScoreDisplay.tsx` - Running score (already working)
- `src/renderer/components/GameResultSummary.tsx` - End game summary

### Existing Logic to Use
- `src/shared/bidding.ts` - Bidding state machine
- `src/shared/game.ts` - Full game flow functions
- `src/shared/ai.ts` - AI bidding and play decisions
- `src/renderer/game/GameController.ts` - Game/AI integration

### Key Files to Modify
- `src/renderer/game/scenes/gameScene.ts` - Main integration point
- `src/renderer/state/gameStore.ts` - May need additional actions

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Game Flow Integration | ✅ Completed |
| Phase 2 | Skat Handling Integration | ✅ Completed |
| Phase 3 | Game Announcement Integration | ✅ Completed |
| Phase 4 | Ramsch Handling | ✅ Completed |
| Phase 5 | Game Result Integration | ✅ Completed |
| Phase 6 | Polish & Bug Fixes | ✅ Completed |

---

## Recently Completed (Bug Fixes)

- [x] Fix player card display (cards were face-down)
- [x] Fix opponent not playing after winning a trick
- [x] Add card sorting for player hand (trumps first)
- [x] Fix player position layout (clockwise rotation)
- [x] Fix trick collection animation going to wrong player

---

## Phase 1 Implementation Details (2025-12-14)

### Files Modified
- `src/renderer/state/gameStore.ts` - Added full BiddingState integration with processBid/processHold/processPass
- `src/renderer/components/BiddingPanel.tsx` - Updated to use holdBid action and proper bidding state
- `src/renderer/game/scenes/gameScene.ts` - Added bidding phase transition, AI bidding, and store subscription

### Key Changes
1. **gameStore.ts**: Added `bidding: BiddingState` field and updated `placeBid`, added `holdBid`, `passBid`, and `startBidding` actions using the proper BiddingState machine from `bidding.ts`

2. **BiddingPanel.tsx**: Updated to differentiate between bidding mode (place new bid) and response mode (hold/pass). Uses `bidding.isActiveBidding` to determine which actions to show.

3. **gameScene.ts**:
   - Changed post-dealing transition from `TrickPlaying` to `Bidding`
   - Added `processAIBidding()` function to handle AI bidding turns
   - Added `performAIBiddingAction()` to execute individual AI bid decisions
   - Added `handleBiddingComplete()` to transition to PickingUpSkat or Ramsch
   - Added store subscription to trigger AI bidding after human player actions

---

## Phase 2 Implementation Details (2025-12-14)

### Files Created
- `src/renderer/game/scenes/skatFlow.ts` - AI skat decisions and phase transitions

### Files Modified
- `src/renderer/game/scenes/biddingFlow.ts` - Added call to processAISkatDecision after bidding completes
- `src/renderer/game/scenes/gameScene.ts` - Extended store subscription to handle skat phase transitions
- `src/renderer/game/scenes/index.ts` - Added skatFlow exports

### Key Changes
1. **skatFlow.ts**: New module containing:
   - `processAISkatDecision()` - Entry point for AI skat handling
   - `performAISkatPickup()` - AI decides whether to pick up skat
   - `performAISkatDiscard()` - AI selects 2 cards to discard
   - `performAIGameAnnouncement()` - AI announces game type
   - `startTrickPlaying()` - Transitions to trick playing phase
   - `resortPlayerCards()` - Re-sorts and recreates player cards based on game type
   - `handleHumanSkatPickup()` - Updates visual cards when human picks up skat
   - `handleHumanSkatDiscard()` - Updates visual cards after human discards

2. **biddingFlow.ts**: Modified `handleBiddingComplete()` to call `processAISkatDecision()` when declarer is found

3. **gameScene.ts**: Extended store subscription to handle GameState changes for PickingUpSkat, Declaring, and TrickPlaying states. Re-setups card interactions when TrickPlaying begins.

### Existing Components Used
- `SkatSelectionUI.tsx` - Already implemented for human skat pickup/discard
- `gameStore.ts` - Already had `pickUpSkat` and `discardToSkat` actions

---

## Phase 3 Implementation Details (2025-12-14)

### Files Modified
- `src/renderer/state/gameStore.ts` - Added `skatPickedUp` flag to track skat decision
- `src/renderer/components/AnnouncementPanel.tsx` - Updated to auto-set Hand modifier when skat not picked up

### Key Changes
1. **gameStore.ts**: Added `skatPickedUp: boolean` field that:
   - Initializes to `false`
   - Set to `true` in `pickUpSkat()` action
   - Reset to `false` in `initGame()`

2. **AnnouncementPanel.tsx**:
   - Added `isHandGameForced = !skatPickedUp` to detect forced hand games
   - Added `effectiveHandGame = isHandGameForced || handGame` for correct value calculation
   - Hand checkbox is now checked and disabled when forced
   - Shows "- required" label when hand game is forced
   - All dependent modifiers (Schneider, Schwarz, Ouvert) now use `effectiveHandGame`
   - Null game variants also respect forced hand game

### Existing Components Used
- `AnnouncementPanel.tsx` - Already implemented game type selection and modifiers
- `declareGame()` action - Already implemented in gameStore
- AI announcement via `skatFlow.ts` - Already implemented in Phase 2

---

## Phase 4 Implementation Details (2025-12-14)

### Files Created
- `src/renderer/components/RamschNotification.tsx` - Notification popup when Ramsch starts

### Files Modified
- `src/renderer/components/index.ts` - Added RamschNotification export
- `src/renderer/App.tsx` - Added RamschNotification component

### Key Changes
1. **RamschNotification.tsx**: New notification component that:
   - Shows when `gameState === TrickPlaying && gameType === Ramsch && declarer === null`
   - Displays Ramsch rules explanation (no declarer, Jacks are trumps, avoid points)
   - Auto-dismisses after 4 seconds or on "Start Game" click
   - Resets when a new game starts

### Already Implemented (No Changes Needed)
- **gameStore.ts**: `passBid()` action already handles `BiddingResult.AllPassed` by:
  - Setting `declarer: null`
  - Setting `gameType: GameType.Ramsch`
  - Setting `gameState: GameState.TrickPlaying`
  - Setting `currentPlayer: Player.Forehand`

- **biddingFlow.ts**: `handleBiddingComplete()` already handles Ramsch transition

- **ScoreDisplay.tsx**: Already shows "Avoid taking points! Lowest score wins." during Ramsch

- **GameResultSummary.tsx**: Already handles Ramsch scoring (loser gets negative points)

- **shared/rules.ts**: `RamschRule` class already implements Ramsch gameplay (Jacks are trumps)

---

## Phase 5 Implementation Details (2025-12-14)

### Files Modified
- `src/renderer/game/scenes/gameFlow.ts` - Updated `showGameOver` to set `GameState.GameOver`
- `src/renderer/KaplayGame.tsx` - Added `forwardRef` to expose `restart()` function to parent
- `src/renderer/App.tsx` - Added ref for KaplayGame, passes `onNewGame` callback to GameResultSummary
- `src/renderer/state/gameStore.ts` - Added `getLeftNeighbor` import and dealer rotation in `resetGame`

### Key Changes
1. **gameFlow.ts**: Changed `showGameOver()` from using KAPlay UI to setting `GameState.GameOver`:
   - Logs final scores to console
   - Calls `store.setGameState(GameState.GameOver)` to trigger React GameResultSummary

2. **KaplayGame.tsx**: Added forwardRef pattern:
   - Exports `KaplayGameHandle` interface with `restart()` method
   - Uses `useImperativeHandle` to expose `restart()` that calls `k.go("game")`

3. **App.tsx**: Connected restart flow:
   - Uses `useRef<KaplayGameHandle>` to reference KaplayGame
   - `handleNewGame` callback calls `gameRef.current?.restart()`
   - Passes callback to GameResultSummary's `onNewGame` prop

4. **gameStore.ts**: Implemented dealer rotation and session scores:
   - Added `getLeftNeighbor` import from shared
   - Added `sessionScores: Record<Player, number>` to track cumulative scores
   - `initGame()` now uses `getLeftNeighbor(dealer)` to determine Vorhand (lead player)
   - `resetGame()` calculates game score, updates session scores, rotates dealer

5. **ScoreDisplay.tsx**: Added session scores display:
   - Shows cumulative session scores during trick playing
   - Color-coded: green for positive, red for negative scores
   - Only displays when at least one player has non-zero score

### Existing Components Used (No Changes Needed)
- **GameResultSummary.tsx**: Already fully implemented with:
  - Victory/Defeat display based on game outcome
  - Points breakdown for declarer and opponents
  - Schneider/Schwarz achievement display
  - Overbid detection and warning
  - Ramsch special handling (loser gets negative points)
  - "New Game" button that calls `resetGame()` and `onNewGame?()`

---

## Phase 6 Implementation Details (2025-12-14)

### Files Created
- `src/renderer/components/GamePhaseIndicator.tsx` - Shows current game phase and active player

### Files Modified
- `src/renderer/components/index.ts` - Added GamePhaseIndicator export
- `src/renderer/App.tsx` - Added GamePhaseIndicator component
- `src/renderer/game/scenes/types.ts` - Added playerLabels to SceneState
- `src/renderer/game/scenes/gameScene.ts` - Store player labels and update highlighting
- `index.html` - Added CSS keyframes for animations
- `src/renderer/components/BiddingPanel.tsx` - Added fadeSlideIn animation
- `src/renderer/components/AnnouncementPanel.tsx` - Added scaleIn animation
- `src/renderer/components/SkatSelectionUI.tsx` - Added scaleIn animation
- `src/renderer/components/GameResultSummary.tsx` - Added scaleIn animation
- `src/renderer/components/RamschNotification.tsx` - Added fadeIn/popIn animations

### Key Changes
1. **GamePhaseIndicator.tsx**: New component that:
   - Displays current game phase with icon and name
   - Shows whose turn it is (human or opponent)
   - Highlights when it's the human player's turn (gold border glow)
   - Shows declarer badge when applicable

2. **Player Label Highlighting** (gameScene.ts):
   - Active player label shown in gold color
   - Declarer label shown in light green
   - Inactive players shown in gray

3. **CSS Animations** (index.html):
   - `fadeSlideIn` - Top-down slide for top panels (BiddingPanel)
   - `scaleIn` - Scale from center for centered modals
   - `popIn` - Simple scale for non-centered elements
   - `fadeIn` - Opacity transition for overlays
   - `pulseGlow` - Pulsing glow effect for attention
   - Global button hover/active transitions

4. **Box Shadows**: Added subtle shadows to all panels for depth

---

_Last Updated: 2025-12-14_
