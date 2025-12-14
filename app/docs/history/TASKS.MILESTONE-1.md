# Tasks - Milestone 1: Card System & Local Game ✅

**Goal:** Implement core card game mechanics (offline)

**Success Criteria:**

- [x] Can display all 32 cards visually
- [x] Cards can be dealt to 3 players
- [x] Single trick can be played
- [x] Trick winner is determined correctly

---

## Phase 1: Shared Core Types ✅

Foundation types needed by both client and server.

### 1.1 Card System Types

- [x] Define `Suit` enum (Clubs, Spades, Hearts, Diamonds)
- [x] Define `Rank` enum (Seven, Eight, Nine, Ten, Jack, Queen, King, Ace)
- [x] Define `Card` type with suit, rank, and point value calculation
- [x] Define card notation constants (ISS protocol: CA, HJ, D7, etc.)
- [x] Implement card comparison functions for different game types

### 1.2 Player & Position Types

- [x] Define `PlayerPosition` enum (Forehand, Middlehand, Rearhand)
- [x] Define player rotation/neighbor logic
- [x] Define dealer position tracking

### 1.3 Game State Types

- [x] Define `GameState` enum (see state machine in analysis)
- [x] Define `GameType` enum (Clubs, Spades, Hearts, Diamonds, Grand, Null, Ramsch)
- [x] Define `Trick` type with cards and winner
- [x] Define `Hand` type (card collection for a player)

---

## Phase 2: Server Foundation (Go) ✅

Basic Go server structure and core types.

### 2.1 Project Structure

- [x] Initialize Go module (`go.mod`)
- [x] Create directory structure:
  - [x] `cmd/server/` - Entry point
  - [x] `internal/protocol/` - ISS message handling
  - [x] `internal/game/` - Game logic
  - [x] `internal/lobby/` - Lobby & table management
  - [x] `internal/session/` - Connection handling
  - [x] `pkg/skat/` - Shared game types
- [x] Create `main.go` with basic server skeleton

### 2.2 Core Game Types (Go)

- [x] Implement `Suit` type with constants
- [x] Implement `Rank` type with constants and point values
- [x] Implement `Card` struct with methods
- [x] Implement `CardDeck` with shuffle algorithm (Fisher-Yates)
- [x] Implement `Hand` type for card collections
- [x] Implement `Trick` struct

### 2.3 Card Logic (Go)

- [x] Implement card dealing (10 cards each + 2 skat)
- [x] Implement card sorting (by suit, by rank)
- [x] Implement trump hierarchy for Suit games
- [x] Implement trump hierarchy for Grand games
- [x] Implement card order for Null games
- [x] Implement trick winner determination

### 2.4 Unit Tests (Go)

- [x] Test card point values
- [x] Test deck shuffling (all 32 cards present)
- [x] Test card dealing distribution
- [x] Test trick winner for Suit games
- [x] Test trick winner for Grand games
- [x] Test trick winner for Null games

---

## Phase 3: Client Card Components ✅

Visual card representation using KAPlay.

### 3.1 Card Assets

- [x] Create/source card face images (32 cards) - programmatic rendering
- [x] Create card back image - programmatic rendering
- [x] Define card dimensions and scaling
- [x] Implement card sprite loading

### 3.2 Card Component (KAPlay)

- [x] Create `CardSprite` class/component
- [x] Implement card face/back toggle
- [x] Implement card hover effect
- [x] Implement card selection highlight
- [x] Implement card flip animation

### 3.3 Hand Display

- [x] Implement fan layout algorithm for hand
- [x] Implement card overlap calculation
- [x] Implement hand positioning (bottom of screen)
- [x] Implement card reordering in hand
- [x] Implement selected card pop-up effect

### 3.4 Table Layout

- [x] Design 3-player table layout
- [x] Position player seats (Forehand top, Middlehand right, Rearhand left)
- [x] Display opponent card backs
- [x] Implement center area for trick display
- [x] Implement skat display area

---

## Phase 4: Client Game Types (TypeScript) ✅

Mirror server types in TypeScript for client-side logic. State management with Zustand.

### 4.1 Core Types

- [x] Define `Suit` enum matching server
- [x] Define `Rank` enum matching server
- [x] Define `Card` interface/class
- [x] Define `PlayerPosition` enum
- [x] Define `GameState` enum
- [x] Define `GameType` enum

### 4.2 Card Logic (TypeScript)

- [x] Implement card point calculation
- [x] Implement card sorting functions
- [x] Implement hand management
- [x] Implement trick evaluation (for UI feedback)

### 4.3 State Management

- [x] Set up state management (React Context or Zustand)
- [x] Implement game state store
- [x] Implement player hand state
- [x] Implement current trick state
- [x] Implement UI state (selected card, etc.)

---

## Phase 5: Card Play Interaction ✅

Implement the core trick-playing mechanic.

### 5.1 Card Selection

- [x] Implement click/tap on card to select
- [x] Implement legal move highlighting
- [x] Implement card play on double-click/button
- [x] Implement drag-and-drop card play (optional)

### 5.2 Trick Animation

- [x] Implement card move animation (hand to center)
- [x] Implement opponent card play animation
- [x] Implement trick collection animation
- [x] Implement trick-to-pile animation

### 5.3 Game Flow UI

- [x] Display current player indicator
- [x] Display trick count
- [x] Display points collected
- [x] Display whose turn it is

---

## Phase 6: Basic Dealing Demo ✅

Create a working demo showing card dealing.

### 6.1 Demo Scene

- [x] Create "New Game" button
- [x] Implement card shuffling visualization
- [x] Implement dealing animation (cards to players)
- [x] Show skat cards (face down)

### 6.2 Single Trick Demo

- [x] Allow player to select and play a card
- [x] Simulate opponent card plays (random legal moves)
- [x] Determine and display trick winner
- [x] Collect trick to winner's pile

### 6.3 Integration Test

- [x] Verify all 32 cards are dealt correctly
- [x] Verify trick winner calculation matches rules
- [x] Verify card animations work smoothly
- [x] Verify state updates correctly after each action

---

## Phase 7: Documentation ✅

### 7.1 Technical Documentation

- [x] Document card system types and interfaces
- [x] Document state management approach
- [x] Document KAPlay component structure
- [x] Document Go package structure

### 7.2 Developer Setup

- [x] Update README with build instructions
- [x] Document development workflow
- [x] Add code comments where necessary

---

## Completion Checklist ✅

Before marking Milestone 1 as complete, verify:

- [x] All 32 cards render correctly
- [x] Card dealing distributes cards correctly (10+10+10+2)
- [x] Player can select and play cards
- [x] Trick winner is determined by correct rules
- [x] Animations are smooth and responsive
- [x] Code is documented and tested
- [x] All source files have Apache 2.0 license headers

---

**Implementation Files:**

| Type      | TypeScript                | Go                             |
| --------- | ------------------------- | ------------------------------ |
| Suit      | `src/shared/suit.ts`      | `server/pkg/skat/suit.go`      |
| Rank      | `src/shared/rank.ts`      | `server/pkg/skat/rank.go`      |
| Card      | `src/shared/card.ts`      | `server/pkg/skat/card.go`      |
| Trick     | `src/shared/trick.ts`     | `server/pkg/skat/trick.go`     |
| Player    | `src/shared/player.ts`    | `server/pkg/skat/player.go`    |
| GameType  | `src/shared/gametype.ts`  | `server/pkg/skat/gametype.go`  |
| GameState | `src/shared/gamestate.ts` | `server/pkg/skat/gamestate.go` |
| Bidding   | `src/shared/bidding.ts`   | `server/pkg/skat/bidding.go`   |

**Client Game Files:**

| Component          | File                                      |
| ------------------ | ----------------------------------------- |
| Constants          | `src/renderer/game/utils/constants.ts`    |
| Card Renderer      | `src/renderer/game/utils/cardRenderer.ts` |
| Game Scene         | `src/renderer/game/scenes/gameScene.ts`   |
| KAPlay Integration | `src/renderer/KaplayGame.tsx`             |
| Game State Store   | `src/renderer/state/gameStore.ts`         |

---

_Last Updated: 2025-12-14_
