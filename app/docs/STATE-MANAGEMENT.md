# State Management

This document describes the state management approach used in FreeSkat's client application.

## Overview

FreeSkat uses [Zustand](https://github.com/pmndrs/zustand) for state management. Zustand is a small, fast, and scalable state management solution for React applications.

### Why Zustand?

- **Minimal boilerplate**: No providers, reducers, or action creators required
- **TypeScript support**: Excellent type inference out of the box
- **Performance**: Only re-renders components that use changed state
- **Simplicity**: Easy to understand and maintain
- **Flexibility**: Works with both React and vanilla JavaScript (important for KAPlay integration)

## Game Store

The main game store is located at `src/renderer/state/gameStore.ts`.

### Store Structure

```typescript
export interface GameStoreState {
  // === Game State ===
  gameState: GameState;
  gameType: GameType;
  contract: Contract | null;
  skat: Card[];
  originalSkat: Card[];

  // === Players ===
  players: Record<Player, PlayerData>;
  currentPlayer: Player;
  declarer: Player | null;
  dealer: Player;

  // === Trick State ===
  currentTrick: TrickState;
  trickNumber: number;

  // === Bidding State ===
  currentBid: number;
  highestBidder: Player | null;
  passedPlayers: Player[];

  // === Actions ===
  initGame: () => void;
  dealCards: () => void;
  setGameState: (state: GameState) => void;
  // ... more actions
}
```

### Player Data

Each player has associated data tracked in the store:

```typescript
export interface PlayerData {
  hand: Hand; // Cards in hand
  tricksPoints: number; // Points from won tricks
  tricksWon: number; // Number of tricks won
  isDeclarer: boolean; // Whether this player declared
  name: string; // Display name
}
```

### Trick State

Current trick information:

```typescript
export interface TrickState {
  forehand: Player; // Who leads the trick
  cards: (Card | null)[]; // Cards played (indexed by Player)
  winner: Player | null; // Winner when complete
}
```

## State Flow

### Game Initialization

```
GameStart → Dealing → Bidding → PickingUpSkat → Discarding → Declaring → TrickPlaying → GameEnd
```

### Actions

#### `initGame()`

Resets all state to initial values for a new game.

#### `dealCards()`

Creates and shuffles a new deck, distributes cards:

- 10 cards to each player
- 2 cards to the skat

#### `playCard(player, card)`

1. Removes card from player's hand
2. Adds card to current trick
3. Updates state

#### `completeTrick(winner)`

1. Calculates trick points
2. Updates winner's statistics
3. Increments trick number

#### `startNewTrick(forehand)`

Resets trick state with new forehand player.

#### `declareGame(gameType, contract)`

1. Sets game type and contract
2. Sorts all hands according to game type
3. Marks declarer
4. Transitions to TrickPlaying state

## Usage in React Components

```typescript
import { useGameStore } from '../state/gameStore';

function GameComponent() {
  // Subscribe to specific state
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);

  // Get actions
  const playCard = useGameStore((state) => state.playCard);

  // Use in component
  const handleCardClick = (card: Card) => {
    playCard(Player.Forehand, card);
  };

  return <div>...</div>;
}
```

## Usage in KAPlay (Non-React)

The store can be accessed directly without React hooks:

```typescript
import { useGameStore } from "../state/gameStore";

// Get current state snapshot
const state = useGameStore.getState();
console.log(state.gameState);

// Call actions
useGameStore.getState().dealCards();

// Subscribe to changes
const unsubscribe = useGameStore.subscribe((state) => {
  console.log("State changed:", state.gameState);
});
```

## State Selectors

For performance, use selectors to subscribe to specific parts of state:

```typescript
// Good - only re-renders when currentPlayer changes
const currentPlayer = useGameStore((state) => state.currentPlayer);

// Bad - re-renders on any state change
const store = useGameStore();
```

## Testing

The store can be reset for testing:

```typescript
beforeEach(() => {
  useGameStore.getState().resetGame();
});

test("deals cards correctly", () => {
  const store = useGameStore.getState();
  store.dealCards();

  const forehandHand = store.players[Player.Forehand].hand;
  expect(forehandHand.cards.length).toBe(10);
});
```

## File Structure

```
src/renderer/state/
├── index.ts          # Re-exports all stores
└── gameStore.ts      # Main game state store
```

## Future Considerations

- **Persistence**: Add middleware for saving/loading game state
- **Multiplayer sync**: Integrate with WebSocket for server synchronization
- **Undo/Redo**: Add history middleware for move history
- **DevTools**: Enable Zustand devtools in development

---

_Last Updated: 2025-12-14_
