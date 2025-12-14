# Go Server Package Structure

This document describes the Go server architecture and package organization for FreeSkat.

## Overview

The FreeSkat server is written in Go and designed to be fully compatible with the legacy jSkat client using the ISS (Internet Skat Server) protocol.

## Directory Structure

```
server/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go        # Server configuration
│   ├── game/                 # Game session management (planned)
│   ├── lobby/                # Lobby & table management (planned)
│   ├── protocol/
│   │   ├── handler.go       # Protocol message handlers
│   │   ├── messages.go      # Message type definitions
│   │   ├── movetype.go      # Move type constants
│   │   ├── parser.go        # Protocol message parser
│   │   └── playerdata.go    # Player data structures
│   ├── server/
│   │   └── server.go        # TCP server implementation
│   └── session/
│       └── session.go       # Client session management
├── pkg/
│   └── skat/
│       ├── bidding.go       # Bidding logic and values
│       ├── card.go          # Card type and operations
│       ├── card_test.go     # Card unit tests
│       ├── gamestate.go     # Game state machine
│       ├── gametype.go      # Game type definitions
│       ├── player.go        # Player positions
│       ├── rank.go          # Card ranks
│       ├── suit.go          # Card suits
│       ├── trick.go         # Trick logic
│       └── trick_test.go    # Trick unit tests
└── go.mod                    # Go module definition
```

## Package Descriptions

### cmd/server

Application entry point. Initializes configuration, starts the TCP server, and handles graceful shutdown.

```go
package main

func main() {
    cfg := config.Load()
    srv := server.New(cfg)
    srv.Start()
}
```

### internal/config

Server configuration management.

```go
package config

type Config struct {
    Host     string // Server bind address
    Port     int    // Server port (default: 7000)
    LogLevel string // Logging level
}

func Load() *Config
func LoadFromFile(path string) (*Config, error)
```

### internal/server

TCP server implementation handling client connections.

```go
package server

type Server struct {
    config   *config.Config
    listener net.Listener
    sessions map[string]*session.Session
}

func New(cfg *config.Config) *Server
func (s *Server) Start() error
func (s *Server) Stop() error
func (s *Server) handleConnection(conn net.Conn)
```

### internal/session

Client session management. Each connected client gets a session.

```go
package session

type Session struct {
    ID        string
    Conn      net.Conn
    Player    *protocol.PlayerData
    State     SessionState
    CreatedAt time.Time
}

func New(conn net.Conn) *Session
func (s *Session) Send(msg string) error
func (s *Session) Close() error
```

### internal/protocol

ISS protocol implementation for jSkat compatibility.

#### Message Types

```go
package protocol

// Incoming messages from client
const (
    MsgLogin    = "login"
    MsgCreate   = "create"  // Create table
    MsgJoin     = "join"    // Join table
    MsgReady    = "ready"   // Ready to play
    MsgBid      = "bid"     // Place bid
    MsgPass     = "pass"    // Pass on bid
    MsgPickup   = "pickup"  // Pick up skat
    MsgDiscard  = "discard" // Discard to skat
    MsgDeclare  = "declare" // Declare game
    MsgPlay     = "play"    // Play card
)

// Outgoing messages to client
const (
    MsgWelcome  = "welcome"
    MsgTable    = "table"
    MsgDealt    = "dealt"
    MsgBidding  = "bidding"
    MsgTrick    = "trick"
    MsgResult   = "result"
)
```

#### Handler

```go
package protocol

type Handler struct {
    session *session.Session
}

func NewHandler(s *session.Session) *Handler
func (h *Handler) HandleMessage(msg string) error
```

#### Parser

```go
package protocol

func ParseMessage(msg string) (MessageType, []string, error)
func ParseCard(notation string) (skat.Card, error)
func FormatCard(card skat.Card) string
```

### internal/game (planned)

Game session management for active games.

```go
package game

type Game struct {
    ID       string
    Players  [3]*session.Session
    State    skat.GameState
    GameType skat.GameType
    Deck     []skat.Card
    Hands    [3][]skat.Card
    Skat     [2]skat.Card
    Tricks   []skat.Trick
}

func New(players [3]*session.Session) *Game
func (g *Game) Start() error
func (g *Game) PlayCard(player int, card skat.Card) error
```

### internal/lobby (planned)

Lobby and table management.

```go
package lobby

type Lobby struct {
    Tables map[string]*Table
}

type Table struct {
    ID      string
    Name    string
    Players []*session.Session
    Game    *game.Game
}

func NewLobby() *Lobby
func (l *Lobby) CreateTable(name string) *Table
func (l *Lobby) JoinTable(tableID string, s *session.Session) error
```

### pkg/skat

Shared Skat game types and logic. This package is public and can be imported by other projects.

#### Suit

```go
package skat

type Suit int

const (
    Clubs    Suit = iota // Kreuz - 12 base value
    Spades               // Pik - 11 base value
    Hearts               // Herz - 10 base value
    Diamonds             // Karo - 9 base value
)

func (s Suit) String() string
func (s Suit) BaseValue() int
```

#### Rank

```go
package skat

type Rank int

const (
    Seven Rank = iota
    Eight
    Nine
    Queen
    King
    Ten
    Ace
    Jack
)

func (r Rank) Points() int
func (r Rank) String() string
```

#### Card

```go
package skat

type Card struct {
    Suit Suit
    Rank Rank
}

func (c Card) Points() int
func (c Card) Notation() string
func (c Card) IsTrump(gameType GameType) bool

func NewDeck() []Card
func ShuffleDeck(deck []Card) []Card
func ParseCard(notation string) (Card, error)
```

#### GameType

```go
package skat

type GameType int

const (
    GameClubs    GameType = iota // Trump: Clubs
    GameSpades                   // Trump: Spades
    GameHearts                   // Trump: Hearts
    GameDiamonds                 // Trump: Diamonds
    GameGrand                    // Only Jacks trump
    GameNull                     // No trump, must lose all
    GameRamsch                   // All vs all
)

func (gt GameType) BaseValue() int
func (gt GameType) TrumpSuit() (Suit, bool)
```

#### GameState

```go
package skat

type GameState int

const (
    StateGameStart GameState = iota
    StateDealing
    StateBidding
    StatePickingUpSkat
    StateDiscarding
    StateDeclaring
    StateTrickPlaying
    StateGameEnd
)
```

#### Player

```go
package skat

type Player int

const (
    Forehand   Player = iota // First to act
    Middlehand               // Second to act
    Rearhand                 // Third to act (dealer)
)

func (p Player) Next() Player
func (p Player) Previous() Player
func GetLeftNeighbor(p Player) Player
func GetRightNeighbor(p Player) Player
```

#### Trick

```go
package skat

type Trick struct {
    Forehand Player
    Cards    map[Player]Card
}

func NewTrick(forehand Player) *Trick
func (t *Trick) AddCard(card Card, player Player)
func (t *Trick) IsComplete() bool
func (t *Trick) Winner(gameType GameType) Player
func (t *Trick) Points() int

func DetermineTrickWinner(trick *Trick, gameType GameType) Player
```

#### Bidding

```go
package skat

var BidValues = []int{
    18, 20, 22, 23, 24, 27, 30, 33, 35, 36,
    40, 44, 45, 46, 48, 50, 54, 55, 59, 60,
    // ... up to 264
}

func NextBid(currentBid int) int
func IsValidBid(bid int) bool
func CalculateGameValue(gameType GameType, matadors int, modifiers Modifiers) int
```

## Testing

Run all tests:

```bash
cd server
go test ./...
```

Run specific package tests:

```bash
go test ./pkg/skat/...
```

Run with coverage:

```bash
go test -cover ./...
```

## Building

Build the server:

```bash
cd server
go build -o freeskat-server ./cmd/server
```

Run the server:

```bash
./freeskat-server
```

Or directly:

```bash
go run ./cmd/server
```

## ISS Protocol Compatibility

The server implements the ISS (Internet Skat Server) protocol for backward compatibility with jSkat clients.

### Message Format

Messages are newline-terminated text strings:

```
command arg1 arg2 arg3\n
```

### Card Notation

Two-character notation:

- First char: Suit (C, S, H, D)
- Second char: Rank (7, 8, 9, Q, K, T, A, J)

Example: `CJ` = Jack of Clubs

### Example Session

```
> login username password
< welcome username
> create MyTable
< table MyTable created
> ready
< dealt CJ SJ HJ DJ CA CT CK CQ C9 C8
< bidding start
> bid 18
< bidding accepted 18
...
```

---

_Last Updated: 2025-12-14_
