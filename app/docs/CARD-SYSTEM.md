# Card System Types and Interfaces

This document describes the card system types and interfaces used in FreeSkat.

## Overview

The card system is implemented in both TypeScript (client) and Go (server) with matching types to ensure consistency.

## Core Types

### Suit

Represents the four suits in a Skat deck.

**TypeScript** (`src/shared/suit.ts`):

```typescript
export enum Suit {
  Clubs = 0, // Kreuz (highest in suit games)
  Spades = 1, // Pik
  Hearts = 2, // Herz
  Diamonds = 3, // Karo (lowest)
}
```

**Go** (`server/pkg/skat/suit.go`):

```go
type Suit int

const (
    Clubs    Suit = iota // Kreuz
    Spades               // Pik
    Hearts               // Herz
    Diamonds             // Karo
)
```

### Rank

Represents the eight ranks in a Skat deck with their point values.

**TypeScript** (`src/shared/rank.ts`):

```typescript
export enum Rank {
  Seven = 0, // 0 points
  Eight = 1, // 0 points
  Nine = 2, // 0 points
  Queen = 3, // 3 points
  King = 4, // 4 points
  Ten = 5, // 10 points
  Ace = 6, // 11 points
  Jack = 7, // 2 points (always trump)
}
```

**Point Values**:
| Rank | Points |
|-------|--------|
| Seven | 0 |
| Eight | 0 |
| Nine | 0 |
| Jack | 2 |
| Queen | 3 |
| King | 4 |
| Ten | 10 |
| Ace | 11 |

**Total**: 120 points in a full deck (30 per suit)

### Card

Represents a single card with suit and rank.

**TypeScript** (`src/shared/card.ts`):

```typescript
export interface Card {
  suit: Suit;
  rank: Rank;
}

// Helper functions
export function getCardPoints(card: Card): number;
export function getCardNotation(card: Card): string;
export function createDeck(): Card[];
export function shuffleDeck(deck: Card[]): Card[];
```

**Go** (`server/pkg/skat/card.go`):

```go
type Card struct {
    Suit Suit
    Rank Rank
}

func (c Card) Points() int
func (c Card) Notation() string
func NewDeck() []Card
func ShuffleDeck(deck []Card) []Card
```

### Card Notation (ISS Protocol)

Cards are represented using two-character notation:

- First character: Suit (C=Clubs, S=Spades, H=Hearts, D=Diamonds)
- Second character: Rank (7,8,9,Q,K,T,A,J)

Examples:

- `CJ` = Jack of Clubs
- `HA` = Ace of Hearts
- `D7` = Seven of Diamonds
- `ST` = Ten of Spades

## Game Types

### GameType

Defines the type of game being played.

**TypeScript** (`src/shared/gametype.ts`):

```typescript
export enum GameType {
  Clubs = 0, // Base value 12
  Spades = 1, // Base value 11
  Hearts = 2, // Base value 10
  Diamonds = 3, // Base value 9
  Grand = 4, // Base value 24 (only Jacks are trump)
  Null = 5, // No trump, declarer must lose all tricks
  Ramsch = 6, // Everyone plays for themselves
}
```

### Trump Hierarchy

**Suit Games** (e.g., Clubs):

1. Jack of Clubs (highest)
2. Jack of Spades
3. Jack of Hearts
4. Jack of Diamonds
5. Trump Ace
6. Trump Ten
7. Trump King
8. Trump Queen
9. Trump Nine
10. Trump Eight
11. Trump Seven (lowest trump)

**Grand**:
Only Jacks are trump (in the order above).

**Null**:
No trump. Rank order: A > K > Q > J > T > 9 > 8 > 7

## Hand and Trick Types

### Hand

A collection of cards held by a player.

**TypeScript** (`src/shared/hand.ts`):

```typescript
export interface Hand {
  cards: Card[];
}

export function createHand(): Hand;
export function createHandFromCards(cards: Card[]): Hand;
export function addCardToHand(hand: Hand, card: Card): void;
export function removeCardFromHand(hand: Hand, card: Card): void;
export function sortHand(hand: Hand, gameType: GameType): void;
```

### Trick

Represents a single trick (3 cards played).

**TypeScript** (`src/shared/trick.ts`):

```typescript
export interface Trick {
  forehand: Player;
  cards: Map<Player, Card>;
}

export function createTrick(forehand: Player): Trick;
export function addCardToTrick(trick: Trick, card: Card, player: Player): void;
export function determineTrickWinner(trick: Trick, gameType: GameType): Player;
export function getTrickPoints(trick: Trick): number;
```

## Card Comparison

### Comparing Cards in Suit Games

```typescript
export function compareSuitGameCards(
  a: Card,
  b: Card,
  trumpSuit: Suit,
  leadSuit: Suit
): number;
```

Rules:

1. Jacks always beat non-Jacks
2. Higher Jack beats lower Jack (Clubs > Spades > Hearts > Diamonds)
3. Trump suit beats non-trump (if not Jack)
4. Lead suit beats off-suit
5. Within same category, higher rank wins

### Legal Move Validation

```typescript
export function isLegalMove(
  hand: Hand,
  card: Card,
  leadCard: Card | null,
  gameType: GameType
): boolean;
```

Rules:

1. If leading, any card is legal
2. Must follow suit if possible
3. Must play trump if trump was led (and you have trump)
4. If unable to follow, any card is legal

## File Locations

| Type     | TypeScript               | Go                            |
| -------- | ------------------------ | ----------------------------- |
| Suit     | `src/shared/suit.ts`     | `server/pkg/skat/suit.go`     |
| Rank     | `src/shared/rank.ts`     | `server/pkg/skat/rank.go`     |
| Card     | `src/shared/card.ts`     | `server/pkg/skat/card.go`     |
| Trick    | `src/shared/trick.ts`    | `server/pkg/skat/trick.go`    |
| Hand     | `src/shared/hand.ts`     | `server/pkg/skat/hand.go`     |
| GameType | `src/shared/gametype.ts` | `server/pkg/skat/gametype.go` |
| Player   | `src/shared/player.ts`   | `server/pkg/skat/player.go`   |

---

_Last Updated: 2025-12-14_
