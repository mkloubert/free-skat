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

package skat

import "fmt"

// GameType represents the type of Skat game being played.
type GameType int

const (
	// GameClubs - Clubs (Kreuz) is trump, base value 12
	GameClubs GameType = iota
	// GameSpades - Spades (Pik) is trump, base value 11
	GameSpades
	// GameHearts - Hearts (Herz) is trump, base value 10
	GameHearts
	// GameDiamonds - Diamonds (Karo) is trump, base value 9
	GameDiamonds
	// GameGrand - Only Jacks are trump, base value 24
	GameGrand
	// GameNull - No trump, goal is to take no tricks
	GameNull
	// GameRamsch - Special game when all pass, goal is to take fewest points
	GameRamsch
)

// AllGameTypes contains all standard game types.
var AllGameTypes = []GameType{GameClubs, GameSpades, GameHearts, GameDiamonds, GameGrand, GameNull}

// SuitGameTypes contains all suit game types.
var SuitGameTypes = []GameType{GameClubs, GameSpades, GameHearts, GameDiamonds}

// String returns the English name of the game type.
func (g GameType) String() string {
	switch g {
	case GameClubs:
		return "Clubs"
	case GameSpades:
		return "Spades"
	case GameHearts:
		return "Hearts"
	case GameDiamonds:
		return "Diamonds"
	case GameGrand:
		return "Grand"
	case GameNull:
		return "Null"
	case GameRamsch:
		return "Ramsch"
	default:
		return fmt.Sprintf("GameType(%d)", g)
	}
}

// GermanName returns the German name of the game type.
func (g GameType) GermanName() string {
	switch g {
	case GameClubs:
		return "Kreuz"
	case GameSpades:
		return "Pik"
	case GameHearts:
		return "Herz"
	case GameDiamonds:
		return "Karo"
	case GameGrand:
		return "Grand"
	case GameNull:
		return "Null"
	case GameRamsch:
		return "Ramsch"
	default:
		return fmt.Sprintf("Spielart(%d)", g)
	}
}

// Code returns the ISS protocol code for the game type.
func (g GameType) Code() string {
	switch g {
	case GameClubs:
		return "C"
	case GameSpades:
		return "S"
	case GameHearts:
		return "H"
	case GameDiamonds:
		return "D"
	case GameGrand:
		return "G"
	case GameNull:
		return "N"
	case GameRamsch:
		return "R"
	default:
		return "?"
	}
}

// BaseValue returns the base value for scoring.
func (g GameType) BaseValue() int {
	switch g {
	case GameClubs:
		return 12
	case GameSpades:
		return 11
	case GameHearts:
		return 10
	case GameDiamonds:
		return 9
	case GameGrand:
		return 24
	case GameNull:
		return 23
	default:
		return 0
	}
}

// IsSuitGame returns true if this is a suit game (Clubs, Spades, Hearts, Diamonds).
func (g GameType) IsSuitGame() bool {
	switch g {
	case GameClubs, GameSpades, GameHearts, GameDiamonds:
		return true
	default:
		return false
	}
}

// IsGrand returns true if this is a Grand game.
func (g GameType) IsGrand() bool {
	return g == GameGrand
}

// IsNull returns true if this is a Null game.
func (g GameType) IsNull() bool {
	return g == GameNull
}

// IsRamsch returns true if this is a Ramsch game.
func (g GameType) IsRamsch() bool {
	return g == GameRamsch
}

// TrumpSuit returns the trump suit for suit games. Returns false for non-suit games.
func (g GameType) TrumpSuit() (Suit, bool) {
	switch g {
	case GameClubs:
		return Clubs, true
	case GameSpades:
		return Spades, true
	case GameHearts:
		return Hearts, true
	case GameDiamonds:
		return Diamonds, true
	default:
		return 0, false
	}
}

// GameTypeFromCode parses a game type from its ISS protocol code.
func GameTypeFromCode(code string) (GameType, error) {
	switch code {
	case "C":
		return GameClubs, nil
	case "S":
		return GameSpades, nil
	case "H":
		return GameHearts, nil
	case "D":
		return GameDiamonds, nil
	case "G":
		return GameGrand, nil
	case "N":
		return GameNull, nil
	case "R":
		return GameRamsch, nil
	default:
		return 0, fmt.Errorf("invalid game type code: %s", code)
	}
}

// GameTypeFromSuit returns the game type for a suit game.
func GameTypeFromSuit(suit Suit) GameType {
	switch suit {
	case Clubs:
		return GameClubs
	case Spades:
		return GameSpades
	case Hearts:
		return GameHearts
	case Diamonds:
		return GameDiamonds
	default:
		return GameGrand
	}
}
