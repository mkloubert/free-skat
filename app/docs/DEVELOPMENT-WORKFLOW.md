# Development Workflow

This document describes the development workflow and best practices for FreeSkat.

## Getting Started

### Prerequisites

1. **Node.js** (v18 or higher)

   ```bash
   node --version
   ```

2. **npm** (v9 or higher)

   ```bash
   npm --version
   ```

3. **Go** (v1.21 or higher, for server development)
   ```bash
   go version
   ```

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd freeskat

# Install client dependencies
npm install

# Install server dependencies
cd server
go mod download
cd ..
```

## Development Commands

### Client

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm start`       | Start Electron app in dev mode   |
| `npm run lint`    | Run ESLint on TypeScript files   |
| `npm run package` | Package app for current platform |
| `npm run make`    | Create distributable             |
| `npm run publish` | Publish the application          |

### Server

| Command                 | Description             |
| ----------------------- | ----------------------- |
| `go run ./cmd/server`   | Run server              |
| `go build ./cmd/server` | Build server binary     |
| `go test ./...`         | Run all tests           |
| `go test -cover ./...`  | Run tests with coverage |
| `go fmt ./...`          | Format code             |
| `go vet ./...`          | Run static analysis     |

## Project Architecture

### Client Architecture

```
src/
├── main/           # Electron main process
│   └── main.ts     # Application entry point
├── preload/        # Preload scripts (IPC bridge)
├── renderer/       # React application
│   ├── App.tsx     # Root React component
│   ├── game/       # KAPlay game components
│   │   ├── scenes/
│   │   │   └── gameScene.ts  # Main game scene
│   │   └── utils/
│   │       ├── constants.ts  # Game constants
│   │       └── cardRenderer.ts
│   └── state/
│       ├── index.ts
│       └── gameStore.ts      # Zustand store
└── shared/         # Shared types
    ├── index.ts
    ├── card.ts
    ├── suit.ts
    ├── rank.ts
    ├── player.ts
    ├── trick.ts
    ├── hand.ts
    ├── gametype.ts
    ├── gamestate.ts
    └── bidding.ts
```

### Server Architecture

```
server/
├── cmd/server/     # Entry point
├── internal/       # Private packages
│   ├── config/     # Configuration
│   ├── protocol/   # ISS protocol
│   ├── server/     # TCP server
│   ├── session/    # Client sessions
│   ├── game/       # Game logic (planned)
│   └── lobby/      # Lobby management (planned)
└── pkg/skat/       # Public game types
```

## Development Workflow

### 1. Feature Development

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make changes...

# Run linting
npm run lint

# Test your changes manually
npm start

# Commit changes
git add .
git commit -m "Add my feature"
```

### 2. Code Style

#### TypeScript

- Use functional components with hooks
- Prefer `const` over `let`
- Use TypeScript strict mode
- Export interfaces for public APIs
- Use meaningful variable names

```typescript
// Good
const calculateTrickPoints = (trick: Trick): number => {
  return trick.cards.reduce((sum, card) => sum + getCardPoints(card), 0);
};

// Bad
const calc = (t: any) => {
  let s = 0;
  t.cards.forEach((c: any) => (s += c.points));
  return s;
};
```

#### Go

- Follow standard Go conventions
- Use `gofmt` for formatting
- Export only what's necessary
- Write descriptive comments for exported functions

```go
// Good
// DetermineTrickWinner returns the player who won the trick
// based on the current game type and cards played.
func DetermineTrickWinner(trick *Trick, gameType GameType) Player {
    // ...
}

// Bad
func Winner(t *Trick, gt GameType) Player {
    // ...
}
```

### 3. Testing

#### TypeScript

Currently manual testing through the Electron app. Future: Jest tests.

```bash
npm start
# Test features manually
```

#### Go

```bash
cd server

# Run all tests
go test ./...

# Run specific package tests
go test ./pkg/skat/...

# Run with verbose output
go test -v ./...

# Run specific test
go test -run TestTrickWinner ./pkg/skat/
```

### 4. Debugging

#### Client (Electron)

1. Open DevTools: `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS)
2. Use React DevTools extension
3. Console logging for KAPlay state

```typescript
// Debug logging in gameScene.ts
console.log("Current state:", useGameStore.getState());
```

#### Server (Go)

```go
import "log"

// Add debug logging
log.Printf("Player %d played card: %s", player, card.Notation())
```

### 5. Building for Production

#### Client

```bash
# Package for current platform
npm run package

# Create distributable for all platforms
npm run make
```

Output will be in the `out/` directory.

#### Server

```bash
cd server

# Build for current platform
go build -o freeskat-server ./cmd/server

# Cross-compile for Linux
GOOS=linux GOARCH=amd64 go build -o freeskat-server-linux ./cmd/server

# Cross-compile for Windows
GOOS=windows GOARCH=amd64 go build -o freeskat-server.exe ./cmd/server
```

## Adding New Features

### Adding a New Card Type

1. Update `src/shared/` types
2. Update `server/pkg/skat/` Go types
3. Update card renderer in `src/renderer/game/utils/cardRenderer.ts`
4. Update game logic in `src/renderer/game/scenes/gameScene.ts`
5. Update store in `src/renderer/state/gameStore.ts`

### Adding a New Game State

1. Add state to `GameState` enum in `src/shared/gamestate.ts`
2. Add corresponding state in `server/pkg/skat/gamestate.go`
3. Update state machine transitions
4. Add UI handling in game scene
5. Update store actions

### Adding a New Protocol Message

1. Define message in `server/internal/protocol/messages.go`
2. Add parser in `server/internal/protocol/parser.go`
3. Add handler in `server/internal/protocol/handler.go`
4. Add client-side handling (when multiplayer is implemented)

## Common Issues

### ESLint Errors

```bash
# Auto-fix issues
npx eslint --fix src/

# Check specific file
npx eslint src/renderer/game/scenes/gameScene.ts
```

### Go Module Issues

```bash
cd server

# Update dependencies
go mod tidy

# Clear module cache
go clean -modcache
```

### Electron Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

## License Headers

All source files must include the Apache 2.0 license header:

```typescript
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
```

---

_Last Updated: 2025-12-14_
