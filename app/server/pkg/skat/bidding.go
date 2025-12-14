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

// BidOrder contains all valid bid values in ascending order.
var BidOrder = []int{
	18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60,
	63, 66, 70, 72, 77, 80, 81, 84, 88, 90, 96, 99, 100, 108, 110, 117, 120, 121,
	126, 130, 132, 135, 140, 143, 144, 150, 153, 154, 156, 160, 162, 165, 168, 170,
	176, 180, 187, 192, 198, 204, 216, 240, 264,
}

// MinBid is the minimum valid bid value.
const MinBid = 18

// MaxBid is the maximum valid bid value.
const MaxBid = 264

// IsValidBid returns true if the bid value is valid.
func IsValidBid(value int) bool {
	for _, v := range BidOrder {
		if v == value {
			return true
		}
	}
	return false
}

// NextBid returns the next valid bid value greater than the given value.
// Returns -1 if there is no higher bid.
func NextBid(value int) int {
	for _, v := range BidOrder {
		if v > value {
			return v
		}
	}
	return -1
}

// PreviousBid returns the previous valid bid value less than the given value.
// Returns -1 if there is no lower bid.
func PreviousBid(value int) int {
	prev := -1
	for _, v := range BidOrder {
		if v >= value {
			return prev
		}
		prev = v
	}
	return prev
}

// BidIndex returns the index of the bid value in BidOrder.
// Returns -1 if the value is not a valid bid.
func BidIndex(value int) int {
	for i, v := range BidOrder {
		if v == value {
			return i
		}
	}
	return -1
}

// BiddingPhase represents the current phase of bidding.
type BiddingPhase int

const (
	// BidPhaseMiddleToFore - Middlehand bids to Forehand
	BidPhaseMiddleToFore BiddingPhase = iota
	// BidPhaseWinnerToRear - Winner of first phase bids to Rearhand
	BidPhaseWinnerToRear
	// BidPhaseDone - Bidding is complete
	BidPhaseDone
)

// String returns the string representation of the bidding phase.
func (p BiddingPhase) String() string {
	switch p {
	case BidPhaseMiddleToFore:
		return "MiddlehandToForehand"
	case BidPhaseWinnerToRear:
		return "WinnerToRearhand"
	case BidPhaseDone:
		return "Done"
	default:
		return "Unknown"
	}
}
