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

// Package skat provides core Skat game types and logic.
package skat

import "fmt"

// Suit represents a card suit in Skat.
type Suit int

const (
	// Clubs (Kreuz) - highest suit, base value 12
	Clubs Suit = iota
	// Spades (Pik) - base value 11
	Spades
	// Hearts (Herz) - base value 10
	Hearts
	// Diamonds (Karo) - lowest suit, base value 9
	Diamonds
)

// AllSuits contains all suits in trump order (highest to lowest).
var AllSuits = []Suit{Clubs, Spades, Hearts, Diamonds}

// String returns the English name of the suit.
func (s Suit) String() string {
	switch s {
	case Clubs:
		return "Clubs"
	case Spades:
		return "Spades"
	case Hearts:
		return "Hearts"
	case Diamonds:
		return "Diamonds"
	default:
		return fmt.Sprintf("Suit(%d)", s)
	}
}

// GermanName returns the German name of the suit.
func (s Suit) GermanName() string {
	switch s {
	case Clubs:
		return "Kreuz"
	case Spades:
		return "Pik"
	case Hearts:
		return "Herz"
	case Diamonds:
		return "Karo"
	default:
		return fmt.Sprintf("Farbe(%d)", s)
	}
}

// Code returns the ISS protocol code for the suit.
func (s Suit) Code() string {
	switch s {
	case Clubs:
		return "C"
	case Spades:
		return "S"
	case Hearts:
		return "H"
	case Diamonds:
		return "D"
	default:
		return "?"
	}
}

// BaseValue returns the base multiplier value for suit games.
func (s Suit) BaseValue() int {
	switch s {
	case Clubs:
		return 12
	case Spades:
		return 11
	case Hearts:
		return 10
	case Diamonds:
		return 9
	default:
		return 0
	}
}

// SuitFromCode parses a suit from its ISS protocol code.
func SuitFromCode(code string) (Suit, error) {
	switch code {
	case "C":
		return Clubs, nil
	case "S":
		return Spades, nil
	case "H":
		return Hearts, nil
	case "D":
		return Diamonds, nil
	default:
		return 0, fmt.Errorf("invalid suit code: %s", code)
	}
}
