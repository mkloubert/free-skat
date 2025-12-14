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

// Player represents a player position at the table.
type Player int

const (
	// Forehand (Vorhand) - first to receive cards, first to play
	Forehand Player = iota
	// Middlehand (Mittelhand) - second position
	Middlehand
	// Rearhand (Hinterhand) - third position, dealer
	Rearhand
)

// AllPlayers contains all player positions in order.
var AllPlayers = []Player{Forehand, Middlehand, Rearhand}

// String returns the English name of the player position.
func (p Player) String() string {
	switch p {
	case Forehand:
		return "Forehand"
	case Middlehand:
		return "Middlehand"
	case Rearhand:
		return "Rearhand"
	default:
		return fmt.Sprintf("Player(%d)", p)
	}
}

// GermanName returns the German name of the player position.
func (p Player) GermanName() string {
	switch p {
	case Forehand:
		return "Vorhand"
	case Middlehand:
		return "Mittelhand"
	case Rearhand:
		return "Hinterhand"
	default:
		return fmt.Sprintf("Spieler(%d)", p)
	}
}

// Index returns the numeric index of the player (0, 1, or 2).
func (p Player) Index() int {
	return int(p)
}

// LeftNeighbor returns the player to the left (next in turn order).
func (p Player) LeftNeighbor() Player {
	return Player((int(p) + 1) % 3)
}

// RightNeighbor returns the player to the right (previous in turn order).
func (p Player) RightNeighbor() Player {
	return Player((int(p) + 2) % 3)
}

// PlayerFromIndex returns the player for the given index (0-2).
func PlayerFromIndex(index int) (Player, error) {
	if index < 0 || index > 2 {
		return 0, fmt.Errorf("invalid player index: %d", index)
	}
	return Player(index), nil
}

// MovePlayer represents the source of a move in ISS protocol.
type MovePlayer int

const (
	// MoveWorld represents a server/world move (dealing, etc.)
	MoveWorld MovePlayer = iota
	// MoveForehand represents a move from Forehand
	MoveForehand
	// MoveMiddlehand represents a move from Middlehand
	MoveMiddlehand
	// MoveRearhand represents a move from Rearhand
	MoveRearhand
)

// String returns the string representation for ISS protocol.
func (m MovePlayer) String() string {
	switch m {
	case MoveWorld:
		return "w"
	case MoveForehand:
		return "0"
	case MoveMiddlehand:
		return "1"
	case MoveRearhand:
		return "2"
	default:
		return "?"
	}
}

// ToPlayer converts MovePlayer to Player (if applicable).
func (m MovePlayer) ToPlayer() (Player, bool) {
	switch m {
	case MoveForehand:
		return Forehand, true
	case MoveMiddlehand:
		return Middlehand, true
	case MoveRearhand:
		return Rearhand, true
	default:
		return 0, false
	}
}

// MovePlayerFromPlayer converts a Player to MovePlayer.
func MovePlayerFromPlayer(p Player) MovePlayer {
	switch p {
	case Forehand:
		return MoveForehand
	case Middlehand:
		return MoveMiddlehand
	case Rearhand:
		return MoveRearhand
	default:
		return MoveWorld
	}
}
