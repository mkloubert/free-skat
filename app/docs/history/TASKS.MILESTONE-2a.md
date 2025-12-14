# Tasks - Milestone 2: Complete Offline Game

**Goal:** Full single-player game against local AI

**Success Criteria:**
- Full game against 2 AI opponents
- Correct scoring for all game types
- Game state persists correctly

---

## Phase 1: Game Logic Foundation ✅

### Bidding System
- [x] Implement bid value enumeration (18, 20, 22, 23, 24, ... 264)
- [x] Create bidding state machine (Middlehand → Forehand → Rearhand)
- [x] Implement bid, hold (y), and pass (p) actions
- [x] Determine declarer based on bidding outcome
- [x] Handle "all pass" scenario (Ramsch or rebid)

### Game Types
- [x] Implement `GameType` enum (Clubs, Spades, Hearts, Diamonds, Grand, Null)
- [x] Define base values for each game type
- [x] Create game type selection logic
- [x] Implement game type-specific trump determination

### Skat Handling
- [x] Implement skat pickup request
- [x] Create skat card reveal mechanism
- [x] Implement card discard to skat (2 cards)
- [x] Handle Hand game (no skat pickup)

### Game Announcement
- [x] Create game announcement data structure
- [x] Implement announcement modifiers (Hand, Schneider, Schwarz, Ouvert)
- [x] Validate announcement against bid value
- [x] Handle Ouvert card display

**Implementation Notes:**
- `src/shared/bidding.ts`: Complete bidding state machine with BiddingState, processBid, processHold, processPass
- `src/shared/skat.ts`: Skat handling with pickupSkat, discardToSkat, dealCards
- `src/shared/announcement.ts`: Game announcement with validation and ISS protocol encoding
- `src/shared/gametype.ts`: GameType enum with base values and trump determination

---

## Phase 2: Rule Implementation ✅

### Base Rule System
- [x] Create abstract `SkatRule` interface
- [x] Implement rule factory for game type selection
- [x] Define common rule methods (isCardAllowed, calculateTrickWinner, etc.)

### Suit Rule (Trump Suit Games)
- [x] Implement trump hierarchy (CJ > SJ > HJ > DJ > suit cards)
- [x] Define card following rules
- [x] Implement trick winner determination
- [x] Validate legal card plays

### Grand Rule
- [x] Implement Jacks-only trump system
- [x] Define non-trump suit hierarchy
- [x] Implement trick winner determination
- [x] Validate legal card plays

### Null Rule
- [x] Implement no-trump card order (A > K > Q > J > T > 9 > 8 > 7)
- [x] Define suit-following rules
- [x] Implement trick winner determination
- [x] Implement Null win condition (declarer takes no tricks)

### Card Validity
- [x] Check if player has cards of led suit
- [x] Determine must-follow-suit logic per game type
- [x] Validate trump play requirements
- [x] Generate list of legal moves

**Implementation Notes:**
- `src/shared/rules.ts`: Complete rule system with SkatRule interface
- `SuitRule`: Suit games with matador counting including trump suit continuation
- `GrandRule`: Grand games with Jack-only matador counting
- `NullRule`: Null games with fixed values (23/35/46/59)
- `RamschRule`: Ramsch with Durchmarsch and Jungfrau detection
- `getRule()`: Factory function with caching for rule instances
- `calculateGameResult()`: Complete game result calculation

---

## Phase 3: Complete Trick Playing ✅

### Trick Management
- [x] Initialize trick with forehand player
- [x] Track cards played in current trick
- [x] Determine trick winner based on game rules
- [x] Rotate forehand to trick winner
- [x] Manage 10-trick game cycle

### Point Tracking
- [x] Count card points in each trick (A=11, T=10, K=4, Q=3, J=2)
- [x] Track points per team (declarer vs. opponents)
- [x] Display running point totals
- [x] Calculate final point distribution

**Implementation Notes:**
- `src/shared/game.ts`: Complete game controller with full game flow
- `SkatGame` interface: Complete game state representation
- `createGame()`, `dealGame()`, `startBidding()`: Game initialization
- `handleBiddingAction()`: Bidding flow integration
- `pickUpSkat()`, `playHand()`, `discardCards()`: Skat handling
- `announceGame()`, `startRamsch()`: Game type setup
- `playCard()`: Card play with validation and trick management
- `completeTrickAndAdvance()`: Trick completion with winner/point tracking
- `finalizeGame()`: Final result calculation
- `getLegalMoves()`: Legal move generation for current player
- `TrickPhaseState`: Tracks all 10 tricks with running point totals

---

## Phase 4: Scoring System ✅

### Matador Counting
- [x] Implement "with" matador calculation (consecutive Jacks from CJ)
- [x] Implement "without" matador calculation
- [x] Handle trump suit continuation in count
- [x] Calculate total matador multiplier

### Game Value Calculation
- [x] Implement formula: gameValue = baseValue × multiplier
- [x] Calculate multiplier (matadors + 1 + modifiers)
- [x] Apply Hand, Schneider, Schwarz, Ouvert bonuses
- [x] Handle announced vs. achieved modifiers

### Win/Loss Determination
- [x] Check declarer points (61+ for normal win)
- [x] Determine Schneider (90+ points)
- [x] Determine Schwarz (all 10 tricks)
- [x] Calculate loss penalty (negative double value)
- [x] Handle overbid scenarios

### Score Recording
- [x] Create game result data structure
- [x] Store individual game scores
- [x] Maintain session score totals
- [x] Support score history display

**Implementation Notes:**
- `src/shared/rules.ts`: Matador counting in SuitRule and GrandRule
- `calculateGameValue()`: Complete game value calculation with all modifiers
- `calculateGameResult()`: Win/loss determination including overbid
- `isSchneider()`, `isSchwarz()`: Helper functions for scoring
- `src/shared/session.ts`: Complete session management
- `SkatSession`: Tracks multiple games with score history
- `PlayerScore`: Cumulative player statistics
- `GameRecord`: Individual game records with timestamps
- `getStandings()`, `getPlayerStats()`: Score analysis
- `calculateSeegerScore()`: Alternative scoring method

---

## Phase 5: AI Implementation ✅

### Random AI Player
- [x] Create AI player interface
- [x] Implement random legal move selection
- [x] Integrate with game control flow
- [x] Handle AI player timing/delays

### Basic Bidding AI
- [x] Evaluate hand strength
- [x] Calculate maximum bid based on hand
- [x] Implement bid/pass decision logic
- [x] Select game type based on hand

### Legal Move Selection
- [x] Query valid moves from rule system
- [x] Filter moves based on AI strategy
- [x] Implement card play selection
- [x] Handle skat discard selection

**Implementation Notes:**
- `src/shared/ai.ts`: Complete AI system
- `AIPlayer` interface: Contract for AI implementations
- `RandomAI`: Makes random legal moves (for testing)
- `BasicAI`: Uses heuristics for bidding and play
- `evaluateHand()`: Analyzes hand strength, matadors, best game type
- `HandEvaluation`: Detailed hand analysis result
- `calculateMatadors()`: Matador counting for bid calculation
- Lead card selection: Trump drawing, Ace leading
- Follow card selection: Minimum winning, point minimization
- `createAI(difficulty)`: Factory function
- `AI.random`, `AI.basic`: Default instances

---

## Phase 6: Client UI Components ✅

### Bidding Dialog
- [x] Create bidding panel component
- [x] Display current bid value
- [x] Show bid/hold/pass buttons
- [x] Indicate active bidder
- [x] Display bidding history

### Game Announcement Panel
- [x] Create game type selector
- [x] Add modifier checkboxes (Hand, Schneider, Schwarz, Ouvert)
- [x] Validate and display game value
- [x] Confirm announcement button

### Skat Selection UI
- [x] Display skat cards to declarer
- [x] Enable card selection for discard
- [x] Validate exactly 2 cards discarded
- [x] Confirm skat discard action

### Score Display
- [x] Show current trick points
- [x] Display declarer vs. opponents points
- [x] Update in real-time during play
- [x] Progress bars for point targets

### Game Result Summary
- [x] Create result dialog component
- [x] Display game type and modifiers
- [x] Show final points and game value
- [x] Indicate win/loss with explanation
- [x] Option to start new game

**Implementation Notes:**
- `src/renderer/components/BiddingPanel.tsx`: Bidding interface with quick bid, hold, pass
- `src/renderer/components/AnnouncementPanel.tsx`: Game type selection with modifier checkboxes
- `src/renderer/components/SkatSelectionUI.tsx`: Skat pickup/discard with card display
- `src/renderer/components/ScoreDisplay.tsx`: Running points during trick play
- `src/renderer/components/GameResultSummary.tsx`: End game dialog with detailed results
- `src/renderer/components/index.ts`: Exports all components
- `src/renderer/App.tsx`: Updated to include all UI overlays

---

## Phase 7: Integration & Testing ✅

### Game Flow Integration
- [x] Connect all game phases in sequence
- [x] Handle state transitions correctly
- [x] Manage game restart logic
- [x] Implement dealer rotation

### Unit Tests
- [x] Test bidding system (28 tests)
- [x] Test all rule implementations (22 tests)
- [x] Test scoring calculations (29 tests)
- [x] Test matador counting via game value

### Integration Tests
- [x] Test complete game flow (19 tests)
- [x] Test AI integration (via GameController)
- [x] Test state transitions
- [x] Test dealer rotation

### Bug Fixes & Polish
- [x] Fix test alignment with implementation
- [x] Create GameController for UI integration
- [x] Set up vitest test framework
- [x] All 98 tests passing

**Implementation Notes:**
- `src/renderer/game/GameController.ts`: Integrates game logic, AI, and event handling
- `src/shared/bidding.test.ts`: Unit tests for bidding system
- `src/shared/rules.test.ts`: Unit tests for all game rules
- `src/shared/scoring.test.ts`: Unit tests for scoring calculations
- `src/shared/game.test.ts`: Integration tests for complete game flow
- `vitest.config.ts`: Vitest configuration
- Added `npm run test` and `npm run test:watch` scripts

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Game Logic Foundation | ✅ Complete |
| Phase 2 | Rule Implementation | ✅ Complete |
| Phase 3 | Complete Trick Playing | ✅ Complete |
| Phase 4 | Scoring System | ✅ Complete |
| Phase 5 | AI Implementation | ✅ Complete |
| Phase 6 | Client UI Components | ✅ Complete |
| Phase 7 | Integration & Testing | ✅ Complete |

---

_Last Updated: 2025-12-14_
