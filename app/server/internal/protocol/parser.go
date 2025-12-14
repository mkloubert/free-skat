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

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/mkloubert/freeskat-server/pkg/skat"
)

// Message represents a parsed ISS protocol message.
type Message struct {
	Command string
	Args    []string
	Raw     string
}

// ParseMessage parses a raw ISS protocol message.
func ParseMessage(raw string) *Message {
	raw = strings.TrimSpace(raw)
	parts := strings.Fields(raw)

	if len(parts) == 0 {
		return &Message{Raw: raw}
	}

	return &Message{
		Command: parts[0],
		Args:    parts[1:],
		Raw:     raw,
	}
}

// MoveInfo represents parsed move information from a table message.
type MoveInfo struct {
	MoveType    MoveType
	MovePlayer  skat.MovePlayer
	BidValue    int
	Card        *skat.Card
	GameType    skat.GameType
	Hand        bool
	Ouvert      bool
	Schneider   bool
	Schwarz     bool
	SkatCards   []skat.Card
	PlayerCards map[skat.Player][]skat.Card
}

// ParseMove parses a move token from the ISS protocol.
func ParseMove(token string) (*MoveInfo, error) {
	info := &MoveInfo{}

	// Check for simple tokens
	switch token {
	case TokenHoldBid:
		info.MoveType = MoveHoldBid
		return info, nil
	case TokenPass:
		info.MoveType = MovePass
		return info, nil
	case TokenSkatRequest:
		info.MoveType = MoveSkatRequest
		return info, nil
	case TokenResign:
		info.MoveType = MoveResign
		return info, nil
	}

	// Check for prefixed tokens
	if strings.HasPrefix(token, TokenShowCards) {
		info.MoveType = MoveShowCards
		return info, nil
	}
	if strings.HasPrefix(token, TokenTimeOut) {
		info.MoveType = MoveTimeOut
		return info, nil
	}
	if strings.HasPrefix(token, TokenLeaveTable) {
		info.MoveType = MoveLeaveTable
		return info, nil
	}

	// Check for bid value
	if bidValue, err := strconv.Atoi(token); err == nil {
		if skat.IsValidBid(bidValue) {
			info.MoveType = MoveBid
			info.BidValue = bidValue
			return info, nil
		}
	}

	// Check for card play (2-character code)
	if len(token) == 2 {
		if card, err := skat.CardFromCode(token); err == nil {
			info.MoveType = MoveCardPlay
			info.Card = &card
			return info, nil
		}
	}

	// Check for game announcement
	if len(token) >= 1 {
		if err := parseGameAnnouncement(token, info); err == nil {
			info.MoveType = MoveGameAnnouncement
			return info, nil
		}
	}

	return nil, fmt.Errorf("unknown move token: %s", token)
}

// parseGameAnnouncement parses a game announcement token.
func parseGameAnnouncement(token string, info *MoveInfo) error {
	parts := strings.Split(token, ".")

	// First part is game type with optional modifiers
	gameCode := parts[0]
	if len(gameCode) == 0 {
		return fmt.Errorf("empty game announcement")
	}

	// Parse game type (first character)
	gameType, err := skat.GameTypeFromCode(string(gameCode[0]))
	if err != nil {
		return err
	}
	info.GameType = gameType

	// Parse modifiers (remaining characters)
	for i := 1; i < len(gameCode); i++ {
		switch gameCode[i] {
		case 'H':
			info.Hand = true
		case 'O':
			info.Ouvert = true
		case 'S':
			info.Schneider = true
		case 'Z':
			info.Schwarz = true
		}
	}

	// Parse discarded skat cards (if present)
	if len(parts) >= 3 {
		info.SkatCards = make([]skat.Card, 0, 2)
		for i := 1; i <= 2 && i < len(parts); i++ {
			if card, err := skat.CardFromCode(parts[i]); err == nil {
				info.SkatCards = append(info.SkatCards, card)
			}
		}
	}

	return nil
}

// ParseDealCards parses the card distribution format from ISS protocol.
// Format: forehand|middlehand|rearhand|skat
func ParseDealCards(dealStr string) (map[skat.Player]*skat.Hand, *skat.Hand, error) {
	parts := strings.Split(dealStr, "|")
	if len(parts) != 4 {
		return nil, nil, fmt.Errorf("invalid deal format: expected 4 parts, got %d", len(parts))
	}

	hands := make(map[skat.Player]*skat.Hand)

	for i, player := range skat.AllPlayers {
		hand, err := skat.HandFromCode(parts[i])
		if err != nil {
			return nil, nil, fmt.Errorf("failed to parse %s hand: %w", player, err)
		}
		hands[player] = hand
	}

	skatHand, err := skat.HandFromCode(parts[3])
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse skat: %w", err)
	}

	return hands, skatHand, nil
}

// EncodeDealCards encodes card hands into ISS protocol format.
func EncodeDealCards(hands map[skat.Player]*skat.Hand, skatCards *skat.Hand, hideCards bool) string {
	parts := make([]string, 4)

	for i, player := range skat.AllPlayers {
		if hand, ok := hands[player]; ok {
			if hideCards {
				parts[i] = encodeHiddenHand(hand.Size())
			} else {
				parts[i] = hand.Code()
			}
		}
	}

	if skatCards != nil {
		if hideCards {
			parts[3] = "??.??"
		} else {
			parts[3] = skatCards.Code()
		}
	}

	return strings.Join(parts, "|")
}

// encodeHiddenHand creates a hidden hand representation.
func encodeHiddenHand(count int) string {
	hidden := make([]string, count)
	for i := range hidden {
		hidden[i] = "??"
	}
	return strings.Join(hidden, ".")
}
