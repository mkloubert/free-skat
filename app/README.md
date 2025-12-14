# FreeSkat

A modern, cross-platform Skat card game application built with Electron, React, TypeScript, and KAPlay.

## Overview

FreeSkat is designed to replace the legacy jSkat application with a modern tech stack while maintaining full backward compatibility with the ISS (Internet Skat Server) protocol.

## Features

- Full Skat card game implementation
- Single-player mode with AI opponents
- Multiplayer support (planned)
- Cross-platform (Windows, macOS, Linux)
- Modern UI with smooth animations
- ISS protocol compatibility for legacy client support

## Tech Stack

### Client

- **Electron** - Cross-platform desktop application
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **KAPlay** - 2D game engine for card rendering and animations
- **Zustand** - State management

### Server

- **Go** - High-performance server implementation
- **ISS Protocol** - Backward compatible with jSkat clients

## Prerequisites

- Node.js 18+
- npm 9+
- Go 1.21+ (for server development)

## Installation

### Client

```bash
# Clone the repository
git clone <repository-url>
cd freeskat

# Install dependencies
npm install
```

### Server

```bash
cd server
go mod download
```

## Development

### Running the Client

```bash
# Start the Electron app in development mode
npm start
```

### Running the Server

```bash
cd server
go run ./cmd/server
```

### Linting

```bash
# Lint TypeScript/React code
npm run lint
```

### Testing

```bash
# Run Go tests
cd server
go test ./...

# Run with coverage
go test -cover ./...
```

## Building

### Client (Electron)

```bash
# Package for current platform
npm run package

# Create distributable
npm run make
```

### Server

```bash
cd server
go build -o freeskat-server ./cmd/server
```

## Project Structure

```
freeskat/
├── src/
│   ├── main/                 # Electron main process
│   ├── preload/              # Electron preload scripts
│   ├── renderer/             # React application
│   │   ├── game/             # KAPlay game components
│   │   │   ├── scenes/       # Game scenes
│   │   │   └── utils/        # Utilities and constants
│   │   └── state/            # Zustand stores
│   └── shared/               # Shared types (client & server)
├── server/
│   ├── cmd/server/           # Server entry point
│   ├── internal/             # Private packages
│   │   ├── config/           # Configuration
│   │   ├── protocol/         # ISS protocol
│   │   ├── server/           # TCP server
│   │   └── session/          # Session management
│   └── pkg/skat/             # Public Skat game logic
└── docs/                     # Documentation
```

## Documentation

- [Card System Types](docs/CARD-SYSTEM.md) - Card, Suit, Rank, Trick types
- [State Management](docs/STATE-MANAGEMENT.md) - Zustand store architecture
- [KAPlay Components](docs/KAPLAY-COMPONENTS.md) - Game engine integration
- [Go Server Structure](docs/GO-SERVER-STRUCTURE.md) - Server packages
- [jSkat Analysis](docs/JSKAT-ANALYSIS.md) - Legacy code analysis

## Game Rules

FreeSkat implements the official German Skat rules:

- 32-card deck (7 through Ace in four suits)
- 3 players, 10 cards each, 2 cards in the skat
- Bidding determines the declarer
- Game types: Suit (Clubs, Spades, Hearts, Diamonds), Grand, Null, Ramsch
- 120 total card points

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read the development documentation and ensure your code passes linting before submitting a pull request.

## Acknowledgments

- Original jSkat project for protocol reference
- KAPlay team for the excellent game engine
- The Skat community for rules clarification

---

_FreeSkat - Modern Skat for Everyone_
