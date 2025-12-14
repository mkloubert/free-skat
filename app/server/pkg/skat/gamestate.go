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

// GameState represents the current state of a Skat game.
type GameState int

const (
	// StateGameStart - Game is initializing
	StateGameStart GameState = iota
	// StateDealing - Cards are being dealt
	StateDealing
	// StateBidding - Players are bidding
	StateBidding
	// StatePickingUpSkat - Declarer deciding whether to pick up skat
	StatePickingUpSkat
	// StateDiscarding - Declarer discarding cards to skat
	StateDiscarding
	// StateDeclaring - Declarer announcing game type
	StateDeclaring
	// StateContraRe - Optional Contra/Re announcements
	StateContraRe
	// StateTrickPlaying - Main trick-taking phase
	StateTrickPlaying
	// StatePreliminaryGameEnd - Game tricks complete, awaiting scoring
	StatePreliminaryGameEnd
	// StateCalculatingGameValue - Computing final score
	StateCalculatingGameValue
	// StateGameOver - Game has ended
	StateGameOver
)

// String returns the English name of the game state.
func (s GameState) String() string {
	switch s {
	case StateGameStart:
		return "GameStart"
	case StateDealing:
		return "Dealing"
	case StateBidding:
		return "Bidding"
	case StatePickingUpSkat:
		return "PickingUpSkat"
	case StateDiscarding:
		return "Discarding"
	case StateDeclaring:
		return "Declaring"
	case StateContraRe:
		return "ContraRe"
	case StateTrickPlaying:
		return "TrickPlaying"
	case StatePreliminaryGameEnd:
		return "PreliminaryGameEnd"
	case StateCalculatingGameValue:
		return "CalculatingGameValue"
	case StateGameOver:
		return "GameOver"
	default:
		return fmt.Sprintf("GameState(%d)", s)
	}
}

// GermanName returns the German name of the game state.
func (s GameState) GermanName() string {
	switch s {
	case StateGameStart:
		return "Spielstart"
	case StateDealing:
		return "Geben"
	case StateBidding:
		return "Reizen"
	case StatePickingUpSkat:
		return "Skat aufnehmen"
	case StateDiscarding:
		return "Drücken"
	case StateDeclaring:
		return "Ansagen"
	case StateContraRe:
		return "Kontra/Re"
	case StateTrickPlaying:
		return "Stichspiel"
	case StatePreliminaryGameEnd:
		return "Spielende"
	case StateCalculatingGameValue:
		return "Wertberechnung"
	case StateGameOver:
		return "Spiel beendet"
	default:
		return fmt.Sprintf("Spielzustand(%d)", s)
	}
}

// IsActive returns true if the game is in an active playing state.
func (s GameState) IsActive() bool {
	switch s {
	case StateDealing, StateBidding, StatePickingUpSkat, StateDiscarding,
		StateDeclaring, StateContraRe, StateTrickPlaying:
		return true
	default:
		return false
	}
}

// IsFinished returns true if the game has ended.
func (s GameState) IsFinished() bool {
	return s == StateGameOver
}

// Contract represents the game contract (game type with modifiers).
type Contract struct {
	GameType  GameType
	Hand      bool // No skat pickup
	Schneider bool // Announced 90+ points
	Schwarz   bool // Announced all tricks
	Ouvert    bool // Cards visible
}

// NewContract creates a new contract with the given game type.
func NewContract(gameType GameType) *Contract {
	return &Contract{
		GameType: gameType,
	}
}

// BaseValue returns the base value of the contract.
func (c *Contract) BaseValue() int {
	if c.GameType.IsNull() {
		return c.nullValue()
	}
	return c.GameType.BaseValue()
}

// nullValue returns the value for Null games based on modifiers.
func (c *Contract) nullValue() int {
	if c.Hand && c.Ouvert {
		return 59 // Null Hand Ouvert
	}
	if c.Ouvert {
		return 46 // Null Ouvert
	}
	if c.Hand {
		return 35 // Null Hand
	}
	return 23 // Null
}

// Multiplier calculates the multiplier based on modifiers (excluding matadors).
func (c *Contract) Multiplier() int {
	if c.GameType.IsNull() {
		return 1 // Null games don't use multipliers
	}

	mult := 1 // Base multiplier

	if c.Hand {
		mult++
	}
	if c.Schneider {
		mult++
	}
	if c.Schwarz {
		mult++
	}
	if c.Ouvert {
		mult++
	}

	return mult
}

// Code returns the ISS protocol code for the contract.
func (c *Contract) Code() string {
	code := c.GameType.Code()

	if c.Hand {
		code += "H"
	}
	if c.Ouvert {
		code += "O"
	}
	if c.Schneider {
		code += "S"
	}
	if c.Schwarz {
		code += "Z"
	}

	return code
}
