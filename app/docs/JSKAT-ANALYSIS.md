# jSkat Legacy Application Analysis

This document provides a comprehensive analysis of the legacy jSkat Java application and outlines a migration strategy for the FreeSkat project.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Legacy Architecture Overview](#legacy-architecture-overview)
3. [ISS Protocol Specification](#iss-protocol-specification)
4. [Game Logic & Rules](#game-logic--rules)
5. [Data Models](#data-models)
6. [Feature Inventory](#feature-inventory)
7. [Migration Strategy](#migration-strategy)
8. [Implementation Milestones](#implementation-milestones)
9. [Technical Recommendations](#technical-recommendations)

---

## Executive Summary

### Project Scope

The jSkat application is a mature Skat card game implementation with approximately:

- **336 Java source files** across multiple modules
- **~26,000+ lines of code** in the core module alone
- **3 GUI implementations**: Swing, JavaFX, and entry point via Kotlin
- **Full network support** via ISS (International Skat Server) protocol

### Key Challenges

1. **Protocol Compatibility**: The new Go server MUST implement ISS protocol version 14 exactly
2. **Game Rule Complexity**: Skat has intricate rules for bidding, card play, and scoring
3. **AI Players**: Multiple AI implementations need consideration
4. **State Management**: Complex game state transitions require careful handling

---

## Legacy Architecture Overview

### Module Structure

```
.jskat/
├── jskat-base/           # Core game logic (184 Java files)
│   └── src/main/java/org/jskat/
│       ├── ai/           # AI player implementations
│       ├── control/      # Game control & ISS communication
│       ├── data/         # Data models & DTOs
│       ├── player/       # Player interfaces
│       └── util/         # Utilities, cards, rules
├── jskat-swing-gui/      # Legacy Swing GUI
├── jskat-javafx-gui/     # Modern JavaFX GUI
├── app/                  # Kotlin entry point
└── build-logic/          # Gradle build configuration
```

### Core Packages

| Package                 | Purpose                       | Key Classes                                         |
| ----------------------- | ----------------------------- | --------------------------------------------------- |
| `org.jskat.util`        | Card system, enums, constants | `Card`, `Suit`, `Rank`, `GameType`, `Player`        |
| `org.jskat.util.rule`   | Game rules implementation     | `SkatRule`, `SuitRule`, `GrandRule`, `NullRule`     |
| `org.jskat.data`        | Game data models              | `SkatGameData`, `GameContract`, `Trick`             |
| `org.jskat.data.iss`    | ISS protocol data             | `MoveInformation`, `TableData`, `PlayerStatus`      |
| `org.jskat.control`     | Game control logic            | `SkatGame`, `SkatTable`, `JSkatMaster`              |
| `org.jskat.control.iss` | Network protocol              | `MessageParser`, `MessageGenerator`, `IssConnector` |
| `org.jskat.player`      | Player interfaces             | `JSkatPlayer`, `PlayerKnowledge`                    |
| `org.jskat.ai`          | AI implementations            | `AbstractAIPlayer`, various strategies              |

---

## ISS Protocol Specification

### Protocol Overview

- **Version**: 14
- **Type**: Text-based, space-delimited
- **Transport**: TCP Socket or WebSocket
- **Encoding**: UTF-8/ASCII

### Message Types

| Message               | Direction     | Purpose                             |
| --------------------- | ------------- | ----------------------------------- |
| `login <user> <pass>` | Client→Server | Authentication                      |
| `password:`           | Server→Client | Password confirmation               |
| `Welcome`             | Server→Client | Connection established              |
| `Version`             | Server→Client | Protocol version info               |
| `clients`             | Server→Client | Online player list                  |
| `tables`              | Server→Client | Available tables                    |
| `create / 3`          | Client→Server | Create 3-player table               |
| `join <table>`        | Client→Server | Join table                          |
| `observe <table>`     | Client→Server | Observe table                       |
| `table`               | Both          | Table state updates (main protocol) |
| `invite`              | Both          | Player invitation                   |
| `destroy`             | Server→Client | Table destroyed                     |
| `error`               | Server→Client | Error message                       |
| `text`                | Both          | Chat message                        |
| `yell`                | Both          | Lobby broadcast                     |

### Card Notation

Cards are encoded as 2-character strings: `<Suit><Rank>`

**Suits:**
| Code | Suit | German |
|------|------|--------|
| `C` | Clubs | Kreuz |
| `S` | Spades | Pik |
| `H` | Hearts | Herz |
| `D` | Diamonds | Karo |

**Ranks:**
| Code | Rank | Points |
|------|------|--------|
| `J` | Jack | 2 |
| `A` | Ace | 11 |
| `T` | Ten | 10 |
| `K` | King | 4 |
| `Q` | Queen | 3 |
| `9` | Nine | 0 |
| `8` | Eight | 0 |
| `7` | Seven | 0 |

**Examples:** `CA` = Ace of Clubs, `HJ` = Jack of Hearts, `D7` = Seven of Diamonds

### Card Dealing Format

**During Game (Hidden Cards):**

```
??.??.??|CA.CK.CQ.C9.C8.C7.SA.SK|HA.HK.HQ.H9.H8.H7.DA.DK|??.??
```

Format: `forehand|middlehand|rearhand|skat`

- `??` indicates hidden cards

**Game Summary (All Visible):**

```
CA.CK.CQ.C9.C8.C7.SA.SK.SQ.S9.HA.HK.HQ.H9.H8.H7.DA.DK.DQ.D9.CJ.SJ.HJ.DJ.CT.ST.HT.DT.S8.S7.D8.D7
```

- First 10 cards: Forehand
- Next 10 cards: Middlehand
- Next 10 cards: Rearhand
- Last 2 cards: Skat

### Game Announcement Format

```
<GameType>[Modifiers].<DiscardedCard1>.<DiscardedCard2>[.<OuvertCards>]
```

**Game Types:**
| Code | Game Type | Base Value |
|------|-----------|------------|
| `G` | Grand | 24 |
| `C` | Clubs | 12 |
| `S` | Spades | 11 |
| `H` | Hearts | 10 |
| `D` | Diamonds | 9 |
| `N` | Null | varies |

**Modifiers:**
| Code | Modifier | Meaning |
|------|----------|---------|
| `H` | Hand | No skat pickup |
| `O` | Ouvert | Cards visible |
| `S` | Schneider | Announce 90+ points |
| `Z` | Schwarz | Announce all tricks |

**Examples:**

- `C.CA.CK` - Clubs game, discarded Ace and King of Clubs
- `GH` - Grand Hand (no skat pickup)
- `NO` - Null Ouvert
- `DHO.D7.D8.D9.DT.DJ.DQ.DK.DA.H7.H8` - Diamonds Hand Ouvert with visible cards

### Move Types (MoveType Enum)

| Move Type           | Token Format       | Description         |
| ------------------- | ------------------ | ------------------- |
| `DEAL`              | See dealing format | Card distribution   |
| `BID`               | `18`, `20`, etc.   | Numeric bid value   |
| `HOLD_BID`          | `y`                | Accept current bid  |
| `PASS`              | `p`                | Pass on bidding     |
| `SKAT_REQUEST`      | `s`                | Request to see skat |
| `PICK_UP_SKAT`      | `??.??` or `CA.CK` | Skat cards          |
| `GAME_ANNOUNCEMENT` | See above          | Declare game type   |
| `CARD_PLAY`         | `CA`, `HJ`, etc.   | Play a card         |
| `SHOW_CARDS`        | `SC[.<card>...]`   | Show cards (resign) |
| `RESIGN`            | `RE`               | Resign game         |
| `TIME_OUT`          | `TI.<player>`      | Player timeout      |
| `LEAVE_TABLE`       | `LE.<player>`      | Player left         |

### Table Message Format

Main game communication uses the `table` message:

```
table <tableName> <loginName> <action> [parameters]
```

**Actions:**

- `state` - Full table state update
- `play` - Game move
- `ready` - Player ready
- `leave` - Leave table
- `gametalk` - Enable chat
- `34` - Switch seats 3/4
- `invite` - Invite player

**Player Status (10 parameters per player):**

1. Player name
2. IP address
3. Games played
4. Games won
5. Last game result
6. Total points
7. Switch 3/4 flag (0/1)
8. Reserved
9. Talk enabled (0/1)
10. Ready to play (0/1)

### Game Result Format

```
d:<declarer> win|loss v:<value> m:<matadors> [flags] p:<points> t:<tricks> s:<schneider> z:<schwarz> [penalties]
```

**Fields:**

- `d:<0-2>` - Declarer position (0=Forehand, 1=Middlehand, 2=Rearhand)
- `win|loss` - Game outcome
- `v:<int>` - Game value
- `m:<int>` - Matadors (positive=with, negative=without)
- `overbid` - Overbid flag
- `bidok` - Bid valid flag
- `p:<int>` - Card points (0-120)
- `t:<int>` - Tricks won
- `s:<0|1>` - Schneider achieved
- `z:<0|1>` - Schwarz achieved
- `p0:<int>`, `p1:<int>`, `p2:<int>` - Individual penalties
- `l:<int>` - Left flags
- `to:<int>` - Timeout flags
- `r:<int>` - Resigned flags

### Bidding Sequence

**Standard Bid Values (SkatConstants.bidOrder):**

```
18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60,
63, 66, 70, 72, 77, 80, 81, 84, 88, 90, 96, 99, 100, 108, 110, 117, 120, 121,
126, 130, 132, 135, 140, 143, 144, 150, 153, 154, 156, 160, 162, 165, 168, 170,
176, 180, 187, 192, 198, 204, 216, 240, 264
```

**Bidding Order:**

1. Middlehand bids to Forehand
2. Winner bids to Rearhand
3. Last remaining bidder becomes declarer

---

## Game Logic & Rules

### Player Positions

```
         FOREHAND (0)
            ↓
REARHAND (2) ← → MIDDLEHAND (1)
```

Each player has:

- Left neighbor
- Right neighbor
- Position in trick order

### Game States

```
GAME_START
    ↓
DEALING
    ↓
BIDDING
    ↓
PICKING_UP_SKAT (optional)
    ↓
DISCARDING (if skat picked up)
    ↓
DECLARING
    ↓
[CONTRA/RE] (optional)
    ↓
TRICK_PLAYING (10 tricks)
    ↓
PRELIMINARY_GAME_END
    ↓
CALCULATING_GAME_VALUE
    ↓
GAME_OVER
```

### Card Deck

32 cards total (7-A in each suit):

| Suit      | Cards                  | Points         |
| --------- | ---------------------- | -------------- |
| Clubs     | J, A, T, K, Q, 9, 8, 7 | 30             |
| Spades    | J, A, T, K, Q, 9, 8, 7 | 30             |
| Hearts    | J, A, T, K, Q, 9, 8, 7 | 30             |
| Diamonds  | J, A, T, K, Q, 9, 8, 7 | 30             |
| **Total** | **32 cards**           | **120 points** |

### Trump Hierarchy

**In Suit/Grand Games:**

```
CJ > SJ > HJ > DJ > [Trump Suit: A > T > K > Q > 9 > 8 > 7]
```

Jacks are ALWAYS the highest trumps, regardless of suit.

**In Grand Games:**
Only Jacks are trump (no suit trump).

**In Null Games:**
No trump. Order within suit:

```
A > K > Q > J > T > 9 > 8 > 7
```

### Scoring Calculation

**Game Value Formula:**

```
gameValue = baseValue × multiplier
```

**Multiplier Calculation:**

```
multiplier = matadors + 1 [+ modifiers]
```

Where:

- `matadors` = consecutive Jacks from CJ down (with/without)
- Modifiers: +1 for each of Hand, Schneider, Schwarz, Ouvert

**Base Values:**

| Game Type        | Base Value |
| ---------------- | ---------- |
| Clubs            | 12         |
| Spades           | 11         |
| Hearts           | 10         |
| Diamonds         | 9          |
| Grand            | 24         |
| Null             | 23         |
| Null Hand        | 35         |
| Null Ouvert      | 46         |
| Null Hand Ouvert | 59         |

**Winning Requirements:**

| Condition  | Points Needed    |
| ---------- | ---------------- |
| Normal win | 61+              |
| Schneider  | 90+              |
| Schwarz    | 120 (all tricks) |

**Loss Calculation:**
Lost games are scored as negative double the game value.

### Ramsch Rules (Special Game)

Played when all players pass:

- All Jacks are trump
- Goal: Take as FEW points as possible
- Loser: Player with most points
- **Durchmarsch**: Win all tricks → winner gets +120 instead
- **Jungfrau**: Player with 0 points gets bonus

---

## Data Models

### Core Entities

```
┌─────────────────┐     ┌─────────────────┐
│     Card        │     │    Player       │
├─────────────────┤     ├─────────────────┤
│ suit: Suit      │     │ FOREHAND        │
│ rank: Rank      │     │ MIDDLEHAND      │
│ points: number  │     │ REARHAND        │
└─────────────────┘     └─────────────────┘

┌─────────────────────────────────────────────────┐
│                 SkatGameData                     │
├─────────────────────────────────────────────────┤
│ gameState: GameState                            │
│ players: Map<Player, PlayerData>                │
│ dealer: Player                                   │
│ declarer: Player                                 │
│ contract: GameContract                           │
│ tricks: List<Trick>                              │
│ skat: CardList                                   │
│ bids: Map<Player, List<BidValue>>               │
│ result: SkatGameResult                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 GameContract                     │
├─────────────────────────────────────────────────┤
│ gameType: GameType                               │
│ hand: boolean                                    │
│ schneider: boolean                               │
│ schwarz: boolean                                 │
│ ouvert: boolean                                  │
│ ouvertCards: CardList                            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                    Trick                         │
├─────────────────────────────────────────────────┤
│ firstCard: Card                                  │
│ secondCard: Card                                 │
│ thirdCard: Card                                  │
│ trickWinner: Player                              │
│ forehand: Player                                 │
└─────────────────────────────────────────────────┘
```

### ISS-Specific Models

```
┌─────────────────────────────────────────────────┐
│               MoveInformation                    │
├─────────────────────────────────────────────────┤
│ moveType: MoveType                               │
│ movePlayer: MovePlayer (WORLD, FH, MH, RH)      │
│ bidValue: number (for BID)                       │
│ card: Card (for CARD_PLAY)                       │
│ announcement: GameAnnouncement                   │
│ skatCards: CardList                              │
│ playerCards: Map<Player, CardList>               │
│ playerTimes: Map<Player, number>                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 PlayerStatus                     │
├─────────────────────────────────────────────────┤
│ name: string                                     │
│ ip: string                                       │
│ gamesPlayed: number                              │
│ gamesWon: number                                 │
│ lastGameResult: number                           │
│ totalPoints: number                              │
│ switch34: boolean                                │
│ talkEnabled: boolean                             │
│ readyToPlay: boolean                             │
│ playerLeft: boolean                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  TableData                       │
├─────────────────────────────────────────────────┤
│ tableName: string                                │
│ maxPlayers: number                               │
│ gamesPlayed: number                              │
│ player1, player2, player3: string               │
└─────────────────────────────────────────────────┘
```

---

## Feature Inventory

### Core Features

| Feature                      | Priority | Complexity | Module    |
| ---------------------------- | -------- | ---------- | --------- |
| Card deck & shuffling        | Critical | Low        | util      |
| Bidding system               | Critical | Medium     | control   |
| Trick playing                | Critical | Medium     | control   |
| Scoring calculation          | Critical | High       | util/rule |
| Game rules (Suit/Grand/Null) | Critical | High       | util/rule |
| Player positions & rotation  | Critical | Low        | util      |

### Network Features

| Feature               | Priority | Complexity | Module      |
| --------------------- | -------- | ---------- | ----------- |
| ISS protocol parser   | Critical | High       | control/iss |
| ISS message generator | Critical | High       | control/iss |
| TCP socket connection | Critical | Medium     | control/iss |
| WebSocket connection  | Medium   | Medium     | control/iss |
| Table management      | Critical | Medium     | control/iss |
| Player list & status  | High     | Low        | data/iss    |
| Chat functionality    | Medium   | Low        | control/iss |

### Game Variants

| Variant                   | Priority | Complexity |
| ------------------------- | -------- | ---------- |
| Standard Skat (3 players) | Critical | Base       |
| Ramsch                    | High     | Medium     |
| Schieberamsch             | Medium   | Medium     |
| Bock rounds               | Low      | Low        |
| Tournament mode           | Low      | High       |

### AI Players

| AI Type           | Priority | Complexity |
| ----------------- | -------- | ---------- |
| Random player     | High     | Low        |
| Basic algorithmic | Medium   | Medium     |
| Advanced AI       | Low      | High       |

### UI Features (Client)

| Feature                  | Priority | Complexity |
| ------------------------ | -------- | ---------- |
| Card display & animation | Critical | Medium     |
| Bidding UI               | Critical | Medium     |
| Trick playing UI         | Critical | Medium     |
| Game result display      | High     | Low        |
| Lobby & table list       | High     | Medium     |
| Chat panel               | Medium   | Low        |
| Settings panel           | Medium   | Low        |
| Statistics & history     | Low      | Medium     |

---

## Migration Strategy

### Phase Overview

```
Phase 0: Foundation → Phase 1: Local Game → Phase 2: Server Basics →
Phase 3: Full Protocol → Phase 4: Client Polish → Phase 5: MVP Release
```

### Technology Stack

**Client (FreeSkat Desktop):**

- Electron + React + TypeScript
- KAPlay for card rendering & animations
- IPC for Electron main/renderer communication

**Server (FreeSkat Server):**

- Go (Golang)
- TCP/WebSocket for ISS protocol
- In-memory game state (later: persistent storage)

---

## Implementation Milestones

### Milestone 0: Foundation (Mock Application)

**Goal:** Establish project structure and basic tooling

**Deliverables:**

- [x] Electron + React + TypeScript setup
- [x] KAPlay integration for canvas rendering
- [x] Build & packaging configuration
- [ ] Go server project structure
- [ ] Shared type definitions (protocol messages)
- [ ] Basic CI/CD pipeline

**Success Criteria:**

- Client builds and runs
- Server compiles and starts
- Basic "hello world" communication possible

---

### Milestone 1: Card System & Local Game

**Goal:** Implement core card game mechanics (offline)

**Client Tasks:**

- [ ] Card component with all 32 cards
- [ ] Card deck visualization
- [ ] Hand management (fan display)
- [ ] Card selection & play animation
- [ ] Player position UI (3 seats)

**Shared Logic Tasks:**

- [ ] Card enum (Suit, Rank)
- [ ] CardDeck with shuffle
- [ ] Hand (card collection)
- [ ] Trick representation
- [ ] Basic game state machine

**Success Criteria:**

- Can display all 32 cards
- Cards can be dealt to 3 players
- Single trick can be played
- Trick winner is determined correctly

---

### Milestone 2: Complete Offline Game

**Goal:** Full single-player game against local AI

**Game Logic Tasks:**

- [ ] Bidding system implementation
- [ ] All game types (Clubs, Spades, Hearts, Diamonds, Grand, Null)
- [ ] Skat pickup & discard
- [ ] Game announcement
- [ ] Complete trick playing (10 tricks)
- [ ] Score calculation
- [ ] Matador counting
- [ ] Win/loss determination

**Rule Implementation:**

- [ ] SuitRule (trump suit games)
- [ ] GrandRule (jacks only trump)
- [ ] NullRule (no trump, lose-to-win)
- [ ] Card validity checking

**AI Tasks:**

- [ ] Random AI player
- [ ] Basic bidding logic
- [ ] Legal move selection

**Client UI:**

- [ ] Bidding dialog
- [ ] Game announcement panel
- [ ] Skat selection UI
- [ ] Score display
- [ ] Game result summary

**Success Criteria:**

- Full game against 2 AI opponents
- Correct scoring for all game types
- Game state persists correctly

---

### Milestone 3: Server Foundation

**Goal:** Basic Go server with connection handling

**Server Tasks:**

- [ ] Go project setup
- [ ] TCP listener
- [ ] Connection manager
- [ ] Basic message parsing (login, version)
- [ ] Session management
- [ ] Lobby state (player list)

**Protocol Tasks:**

- [ ] Message type enumeration
- [ ] Login/authentication flow
- [ ] Welcome/Version messages
- [ ] Error handling

**Success Criteria:**

- jSkat client can connect
- Login succeeds
- Player appears in lobby

---

### Milestone 4: Table Management

**Goal:** Create, join, and observe tables

**Server Tasks:**

- [ ] Table creation
- [ ] Table listing (tables message)
- [ ] Join/leave table
- [ ] Table state broadcasting
- [ ] Player ready status
- [ ] Table destruction

**Protocol Tasks:**

- [ ] Full table message parsing
- [ ] Player status encoding (10 parameters)
- [ ] Table state message generation

**Success Criteria:**

- jSkat can create/join tables
- Multiple clients see table updates
- Ready status works

---

### Milestone 5: Full Game Protocol

**Goal:** Complete ISS protocol implementation

**Server Tasks:**

- [ ] Game start coordination
- [ ] Card dealing & distribution
- [ ] Bidding message flow
- [ ] Skat request handling
- [ ] Game announcement processing
- [ ] Move validation
- [ ] Trick management
- [ ] Game end & result calculation

**Protocol Tasks:**

- [ ] Deal message format
- [ ] Bid/hold/pass messages
- [ ] Game announcement parsing
- [ ] Card play messages
- [ ] Result message generation

**Success Criteria:**

- Full game playable via jSkat
- Score calculated correctly
- Game history accurate

---

### Milestone 6: Client-Server Integration

**Goal:** FreeSkat client connects to FreeSkat server

**Client Tasks:**

- [ ] ISS protocol implementation (TypeScript)
- [ ] Connection UI (server address, login)
- [ ] Lobby display
- [ ] Table list & management
- [ ] Real-time game updates

**Success Criteria:**

- FreeSkat client plays against jSkat clients
- All features work cross-client

---

### Milestone 7: Advanced Features

**Goal:** Complete feature parity

**Features:**

- [ ] Ramsch game type
- [ ] Chat functionality
- [ ] Player invitations
- [ ] Observer mode
- [ ] Contra/Re announcements
- [ ] Game replay
- [ ] Statistics tracking

**Success Criteria:**

- All jSkat features supported
- Stable multiplayer experience

---

### Milestone 8: MVP Polish

**Goal:** Production-ready release

**Tasks:**

- [ ] UI/UX refinement
- [ ] Error handling & recovery
- [ ] Performance optimization
- [ ] Internationalization (i18n)
- [ ] Documentation
- [ ] Packaging & distribution
- [ ] Testing & bug fixes

**Success Criteria:**

- Stable, polished application
- Cross-platform builds
- User documentation complete

---

## Technical Recommendations

### Protocol Implementation Priority

1. **Start with MessageParser.java** - This file (662 lines) contains all protocol parsing logic
2. **Study MessageGenerator.java** - For generating server responses
3. **Test with real jSkat client** - Validate compatibility early

### Code Organization

**Server (Go):**

```
server/
├── cmd/
│   └── server/main.go
├── internal/
│   ├── protocol/      # ISS message handling
│   ├── game/          # Game logic
│   ├── lobby/         # Lobby & table management
│   └── session/       # Connection handling
├── pkg/
│   └── skat/          # Shared game types
└── go.mod
```

**Client (TypeScript):**

```
src/
├── main.ts            # Electron main process
├── preload.ts         # IPC bridge
├── renderer/
│   ├── components/    # React components
│   ├── game/          # KAPlay game scenes
│   ├── protocol/      # ISS client
│   ├── state/         # Game state management
│   └── utils/         # Helpers
└── shared/            # Shared types
```

### Testing Strategy

1. **Unit tests** for game logic (rules, scoring)
2. **Integration tests** for protocol compatibility
3. **E2E tests** with jSkat client
4. **Load testing** for server stability

### Key Files for Reference

| Purpose             | File Path                                                                     |
| ------------------- | ----------------------------------------------------------------------------- |
| Protocol parsing    | `.jskat/jskat-base/src/main/java/org/jskat/control/iss/MessageParser.java`    |
| Protocol generation | `.jskat/jskat-base/src/main/java/org/jskat/control/iss/MessageGenerator.java` |
| Game state          | `.jskat/jskat-base/src/main/java/org/jskat/data/SkatGameData.java`            |
| Game rules          | `.jskat/jskat-base/src/main/java/org/jskat/util/rule/`                        |
| Constants           | `.jskat/jskat-base/src/main/java/org/jskat/util/SkatConstants.java`           |
| Move types          | `.jskat/jskat-base/src/main/java/org/jskat/data/iss/MoveType.java`            |

---

## Appendix A: Bid Value Reference

Complete list of valid bid values in Skat:

```
18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60,
63, 66, 70, 72, 77, 80, 81, 84, 88, 90, 96, 99, 100, 108, 110, 117, 120, 121,
126, 130, 132, 135, 140, 143, 144, 150, 153, 154, 156, 160, 162, 165, 168, 170,
176, 180, 187, 192, 198, 204, 216, 240, 264
```

## Appendix B: Card Point Values

| Rank  | Points | Notes                      |
| ----- | ------ | -------------------------- |
| Ace   | 11     | Highest scoring            |
| Ten   | 10     | Second highest             |
| King  | 4      |                            |
| Queen | 3      |                            |
| Jack  | 2      | Always trump in Suit/Grand |
| Nine  | 0      |                            |
| Eight | 0      |                            |
| Seven | 0      | Lowest                     |

**Total deck points: 120**

## Appendix C: Game Type Multipliers

| Game             | Base | Hand | Schneider | Schwarz | Ouvert |
| ---------------- | ---- | ---- | --------- | ------- | ------ |
| Diamonds         | 9    | +1   | +1        | +1      | +1     |
| Hearts           | 10   | +1   | +1        | +1      | +1     |
| Spades           | 11   | +1   | +1        | +1      | +1     |
| Clubs            | 12   | +1   | +1        | +1      | +1     |
| Grand            | 24   | +1   | +1        | +1      | +1     |
| Null             | 23   | -    | -         | -       | -      |
| Null Hand        | 35   | -    | -         | -       | -      |
| Null Ouvert      | 46   | -    | -         | -       | -      |
| Null Hand Ouvert | 59   | -    | -         | -       | -      |

---

_Document Version: 1.0_
_Last Updated: 2025-12-14_
_Author: FreeSkat Development Team_
