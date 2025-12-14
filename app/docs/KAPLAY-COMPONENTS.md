# KAPlay Component Structure

This document describes the KAPlay game engine integration and component structure in FreeSkat.

## Overview

FreeSkat uses [KAPlay](https://kaplayjs.com/) as its 2D game engine for rendering cards, animations, and game interactions. KAPlay is integrated with React through a dedicated component.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   KaplayGame.tsx                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              <canvas> element                    │  │  │
│  │  │  ┌─────────────────────────────────────────┐    │  │  │
│  │  │  │           KAPlay Context (k)             │    │  │  │
│  │  │  │  ┌─────────────────────────────────┐    │    │  │  │
│  │  │  │  │         Game Scene              │    │    │  │  │
│  │  │  │  │  • Card Objects                 │    │    │  │  │
│  │  │  │  │  • UI Elements                  │    │    │  │  │
│  │  │  │  │  • Animations                   │    │    │  │  │
│  │  │  │  └─────────────────────────────────┘    │    │  │  │
│  │  │  └─────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ↕                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Zustand Game Store                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/renderer/
├── KaplayGame.tsx              # React wrapper for KAPlay
└── game/
    ├── scenes/
    │   └── gameScene.ts        # Main game scene
    └── utils/
        ├── constants.ts        # Game constants
        └── cardRenderer.ts     # Card rendering utilities
```

## KaplayGame.tsx

The React component that hosts the KAPlay canvas:

```typescript
export function KaplayGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<KAPLAYCtx | null>(null);

  useEffect(() => {
    const k = kaplay({
      global: false,
      canvas: canvasRef.current,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      letterbox: true,
      background: [0, 0, 0],
      crisp: true,
    });

    kRef.current = k;
    createGameScene(k);
    k.go("game");

    return () => k.quit();
  }, []);

  return <canvas ref={canvasRef} />;
}
```

### Key Configuration

| Option         | Value    | Description                         |
| -------------- | -------- | ----------------------------------- |
| `global`       | `false`  | Prevents global namespace pollution |
| `letterbox`    | `true`   | Maintains aspect ratio              |
| `crisp`        | `true`   | Sharp pixel rendering for cards     |
| `width/height` | 1280x720 | HD canvas size                      |

## Game Scene

Located at `src/renderer/game/scenes/gameScene.ts`.

### Scene Structure

```typescript
export function createGameScene(k: KAPLAYCtx): void {
  k.scene("game", () => {
    // 1. Background setup
    // 2. Card creation and positioning
    // 3. UI elements (buttons, labels)
    // 4. Event handlers
    // 5. Game loop
  });
}
```

### Card Game Object

Cards are represented as KAPlay game objects with custom properties:

```typescript
interface CardGameObj extends GameObj {
  card: Card; // Card data (suit, rank)
  faceUp: boolean; // Is card face up?
  selected: boolean; // Is card selected?
  originalPos: Vec2; // Original position (for animations)
  flip: () => void; // Flip animation
  setSelected: (selected: boolean) => void;
}
```

### Card Creation

```typescript
function createCardObject(
  k: KAPLAYCtx,
  card: Card,
  x: number,
  y: number,
  faceUp: boolean = false
): CardGameObj {
  const cardObj = k.add([
    k.rect(CARD_WIDTH, CARD_HEIGHT, { radius: 4 }),
    k.pos(x, y),
    k.anchor("center"),
    k.area(),
    k.scale(1),
    k.z(0),
    "card",
    {
      card,
      faceUp,
      selected: false,
      originalPos: k.vec2(x, y),
    },
  ]);

  return cardObj as CardGameObj;
}
```

## Card Rendering

Located at `src/renderer/game/utils/cardRenderer.ts`.

### Programmatic Card Drawing

Cards are rendered programmatically using KAPlay's drawing API:

```typescript
export function drawCard(
  k: KAPLAYCtx,
  card: Card,
  x: number,
  y: number,
  faceUp: boolean
): void {
  if (faceUp) {
    // Draw card face with suit symbol and rank
    drawCardFace(k, card, x, y);
  } else {
    // Draw card back pattern
    drawCardBack(k, x, y);
  }
}
```

### Suit Symbols

Each suit has a corresponding Unicode symbol:

- Clubs: ♣
- Spades: ♠
- Hearts: ♥
- Diamonds: ♦

### Suit Colors

- Clubs/Spades: Black (#000000)
- Hearts/Diamonds: Red (#CC0000)

## Animations

### Card Flip Animation

```typescript
cardObj.flip = () => {
  k.tween(
    cardObj.scale.x,
    0,
    0.15,
    (val) => (cardObj.scale.x = val),
    k.easings.easeInQuad
  ).then(() => {
    cardObj.faceUp = !cardObj.faceUp;
    k.tween(
      0,
      1,
      0.15,
      (val) => (cardObj.scale.x = val),
      k.easings.easeOutQuad
    );
  });
};
```

### Card Movement Animation

```typescript
function animateCardTo(
  k: KAPLAYCtx,
  card: CardGameObj,
  targetX: number,
  targetY: number,
  duration: number = 0.3
): Promise<void> {
  return new Promise((resolve) => {
    k.tween(
      card.pos,
      k.vec2(targetX, targetY),
      duration,
      (val) => (card.pos = val),
      k.easings.easeOutCubic
    ).then(resolve);
  });
}
```

### Shuffle Animation

Three-round riffle shuffle with interleaving:

```typescript
function animateShuffle(
  k: KAPLAYCtx,
  deckCards: CardGameObj[],
  centerX: number,
  centerY: number,
  onComplete?: () => void
): void {
  // Split deck, move halves apart, interleave back
  // Repeat 3 times
}
```

### Dealing Animation

Cards dealt following traditional Skat order (3-3-3-2-4-4-4-3-3-3):

```typescript
async function dealCards(cards: CardGameObj[]): Promise<void> {
  const dealingOrder = [
    { player: Player.Forehand, count: 3 },
    { player: Player.Middlehand, count: 3 },
    { player: Player.Rearhand, count: 3 },
    { target: "skat", count: 2 },
    { player: Player.Forehand, count: 4 },
    // ... etc
  ];

  for (const deal of dealingOrder) {
    // Animate card movement with delay
  }
}
```

## Event Handling

### Click Events

```typescript
cardObj.onClick(() => {
  if (!isPlayerTurn()) return;
  if (!isLegalMove(card)) return;

  cardObj.setSelected(!cardObj.selected);
});
```

### Double-Click Detection

KAPlay doesn't have built-in double-click, so we implement it manually:

```typescript
let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 300;

cardObj.onClick(() => {
  const now = Date.now();
  if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
    // Double-click action
    playSelectedCard();
  }
  lastClickTime = now;
});
```

### Drag and Drop

```typescript
interface DragState {
  isDragging: boolean;
  draggedCard: CardGameObj | null;
  startPos: { x: number; y: number };
  offset: { x: number; y: number };
}

k.onMouseDown("left", (pos) => {
  // Start drag if over card
});

k.onMouseMove((pos) => {
  // Update card position during drag
});

k.onMouseRelease("left", (pos) => {
  // Check drop zone and play card
});
```

## Table Layout

```
          ┌─────────────────────────────────────┐
          │           Opponent 1                │
          │         (Middlehand)                │
          │        [Card Backs]                 │
          └─────────────────────────────────────┘

┌────────┐                                      ┌────────┐
│  Opp 2 │                                      │        │
│(Rear-  │         ┌─────────────┐              │        │
│ hand)  │         │   TRICK     │              │        │
│[Cards] │         │   AREA      │              │        │
│        │         └─────────────┘              │        │
└────────┘                                      └────────┘

          ┌─────────────────────────────────────┐
          │              Player                 │
          │           (Forehand)                │
          │     [Fan of face-up cards]          │
          └─────────────────────────────────────┘
```

### Position Constants

```typescript
// src/renderer/game/utils/constants.ts
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;
export const HAND_Y = 620; // Player hand position
export const OPPONENT_TOP_Y = 100; // Top opponent
export const OPPONENT_SIDE_X = 80; // Side opponents
export const CENTER_X = 640; // Trick area X
export const CENTER_Y = 340; // Trick area Y
```

## Z-Index Management

Cards use z-index for proper layering:

| Layer           | Z-Index | Elements             |
| --------------- | ------- | -------------------- |
| Background      | 0       | Table, UI background |
| Cards (default) | 10      | Card objects         |
| Selected card   | 20      | Currently selected   |
| Dragged card    | 100     | Card being dragged   |
| UI overlay      | 200     | Buttons, labels      |

## Performance Considerations

1. **Object Pooling**: Reuse card objects instead of destroying/creating
2. **Render Batching**: Group similar draw calls
3. **Selective Updates**: Only redraw changed elements
4. **Animation Limits**: Cap simultaneous animations

---

_Last Updated: 2025-12-14_
