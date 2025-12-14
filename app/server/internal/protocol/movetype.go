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

package protocol

import "fmt"

// MoveType represents the type of move in the ISS protocol.
type MoveType int

const (
	// MoveDeal - Card distribution
	MoveDeal MoveType = iota
	// MoveBid - Numeric bid value
	MoveBid
	// MoveHoldBid - Accept current bid ("y")
	MoveHoldBid
	// MovePass - Pass on bidding ("p")
	MovePass
	// MoveSkatRequest - Request to see skat ("s")
	MoveSkatRequest
	// MovePickUpSkat - Skat cards revealed
	MovePickUpSkat
	// MoveGameAnnouncement - Declare game type
	MoveGameAnnouncement
	// MoveCardPlay - Play a card
	MoveCardPlay
	// MoveShowCards - Show cards (resign)
	MoveShowCards
	// MoveResign - Resign game ("RE")
	MoveResign
	// MoveTimeOut - Player timeout
	MoveTimeOut
	// MoveLeaveTable - Player left table
	MoveLeaveTable
)

// String returns the string representation of the move type.
func (m MoveType) String() string {
	switch m {
	case MoveDeal:
		return "Deal"
	case MoveBid:
		return "Bid"
	case MoveHoldBid:
		return "HoldBid"
	case MovePass:
		return "Pass"
	case MoveSkatRequest:
		return "SkatRequest"
	case MovePickUpSkat:
		return "PickUpSkat"
	case MoveGameAnnouncement:
		return "GameAnnouncement"
	case MoveCardPlay:
		return "CardPlay"
	case MoveShowCards:
		return "ShowCards"
	case MoveResign:
		return "Resign"
	case MoveTimeOut:
		return "TimeOut"
	case MoveLeaveTable:
		return "LeaveTable"
	default:
		return fmt.Sprintf("MoveType(%d)", m)
	}
}

// ISS protocol tokens for moves.
const (
	TokenHoldBid     = "y"
	TokenPass        = "p"
	TokenSkatRequest = "s"
	TokenShowCards   = "SC"
	TokenResign      = "RE"
	TokenTimeOut     = "TI"
	TokenLeaveTable  = "LE"
)
