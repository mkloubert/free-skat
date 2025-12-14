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

// Rank represents a card rank in Skat.
type Rank int

const (
	// Seven - lowest rank, 0 points
	Seven Rank = iota
	// Eight - 0 points
	Eight
	// Nine - 0 points
	Nine
	// Queen (Dame) - 3 points
	Queen
	// King (König) - 4 points
	King
	// Ten - 10 points
	Ten
	// Ace (Ass) - 11 points
	Ace
	// Jack (Bube) - 2 points, always trump in suit/grand games
	Jack
)

// AllRanks contains all ranks in standard order (lowest to highest for non-trump).
var AllRanks = []Rank{Seven, Eight, Nine, Queen, King, Ten, Ace, Jack}

// AllRanksWithoutJack contains ranks without Jack (for suit ordering).
var AllRanksWithoutJack = []Rank{Seven, Eight, Nine, Queen, King, Ten, Ace}

// NullRanks contains ranks in Null game order (A > K > Q > J > 10 > 9 > 8 > 7).
var NullRanks = []Rank{Seven, Eight, Nine, Ten, Jack, Queen, King, Ace}

// String returns the English name of the rank.
func (r Rank) String() string {
	switch r {
	case Seven:
		return "Seven"
	case Eight:
		return "Eight"
	case Nine:
		return "Nine"
	case Queen:
		return "Queen"
	case King:
		return "King"
	case Ten:
		return "Ten"
	case Ace:
		return "Ace"
	case Jack:
		return "Jack"
	default:
		return fmt.Sprintf("Rank(%d)", r)
	}
}

// GermanName returns the German name of the rank.
func (r Rank) GermanName() string {
	switch r {
	case Seven:
		return "Sieben"
	case Eight:
		return "Acht"
	case Nine:
		return "Neun"
	case Queen:
		return "Dame"
	case King:
		return "König"
	case Ten:
		return "Zehn"
	case Ace:
		return "Ass"
	case Jack:
		return "Bube"
	default:
		return fmt.Sprintf("Rang(%d)", r)
	}
}

// Code returns the ISS protocol code for the rank.
func (r Rank) Code() string {
	switch r {
	case Seven:
		return "7"
	case Eight:
		return "8"
	case Nine:
		return "9"
	case Queen:
		return "Q"
	case King:
		return "K"
	case Ten:
		return "T"
	case Ace:
		return "A"
	case Jack:
		return "J"
	default:
		return "?"
	}
}

// Points returns the point value of the rank.
func (r Rank) Points() int {
	switch r {
	case Ace:
		return 11
	case Ten:
		return 10
	case King:
		return 4
	case Queen:
		return 3
	case Jack:
		return 2
	case Nine, Eight, Seven:
		return 0
	default:
		return 0
	}
}

// RankFromCode parses a rank from its ISS protocol code.
func RankFromCode(code string) (Rank, error) {
	switch code {
	case "7":
		return Seven, nil
	case "8":
		return Eight, nil
	case "9":
		return Nine, nil
	case "Q":
		return Queen, nil
	case "K":
		return King, nil
	case "T":
		return Ten, nil
	case "A":
		return Ace, nil
	case "J":
		return Jack, nil
	default:
		return 0, fmt.Errorf("invalid rank code: %s", code)
	}
}
