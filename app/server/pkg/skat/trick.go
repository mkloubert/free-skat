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

import (
	"errors"
	"strings"
)

// TrickCard represents a card played in a trick along with who played it.
type TrickCard struct {
	Card   Card
	Player Player
}

// Trick represents a single trick in a Skat game.
type Trick struct {
	// Forehand is the player who led the trick (played first card)
	Forehand Player
	// Cards are the cards played in order
	Cards []TrickCard
	// Winner is the winner of the trick (determined after all 3 cards played)
	Winner *Player
}

// NewTrick creates a new empty trick.
func NewTrick(forehand Player) *Trick {
	return &Trick{
		Forehand: forehand,
		Cards:    make([]TrickCard, 0, 3),
		Winner:   nil,
	}
}

// IsComplete returns true if the trick is complete (3 cards played).
func (t *Trick) IsComplete() bool {
	return len(t.Cards) == 3
}

// AddCard adds a card to the trick.
func (t *Trick) AddCard(card Card, player Player) error {
	if t.IsComplete() {
		return errors.New("trick is already complete")
	}
	t.Cards = append(t.Cards, TrickCard{Card: card, Player: player})
	return nil
}

// LeadCard returns the lead card of the trick (first card played).
func (t *Trick) LeadCard() *Card {
	if len(t.Cards) == 0 {
		return nil
	}
	return &t.Cards[0].Card
}

// LeadSuit returns the lead suit of the trick.
func (t *Trick) LeadSuit() *Suit {
	leadCard := t.LeadCard()
	if leadCard == nil {
		return nil
	}
	suit := leadCard.Suit
	return &suit
}

// DetermineWinner determines the winner of a complete trick.
func (t *Trick) DetermineWinner(gameType GameType) (Player, error) {
	if !t.IsComplete() {
		return 0, errors.New("cannot determine winner of incomplete trick")
	}

	leadCard := t.Cards[0].Card
	leadSuit := leadCard.Suit

	winningIndex := 0
	winningCard := t.Cards[0].Card

	for i := 1; i < len(t.Cards); i++ {
		currentCard := t.Cards[i].Card
		comparison := currentCard.CompareCards(winningCard, leadSuit, gameType)

		if comparison > 0 {
			winningIndex = i
			winningCard = currentCard
		}
	}

	return t.Cards[winningIndex].Player, nil
}

// Points calculates the total points in a trick.
func (t *Trick) Points() int {
	total := 0
	for _, tc := range t.Cards {
		total += tc.Card.Points()
	}
	return total
}

// NextPlayer returns the next player to play in this trick.
func (t *Trick) NextPlayer() *Player {
	if t.IsComplete() {
		return nil
	}

	if len(t.Cards) == 0 {
		return &t.Forehand
	}

	lastPlayer := t.Cards[len(t.Cards)-1].Player
	next := lastPlayer.LeftNeighbor()
	return &next
}

// Code returns a string representation of the trick for ISS protocol.
func (t *Trick) Code() string {
	codes := make([]string, len(t.Cards))
	for i, tc := range t.Cards {
		codes[i] = tc.Card.Code()
	}
	return strings.Join(codes, ".")
}

// Complete completes a trick by determining the winner.
func (t *Trick) Complete(gameType GameType) error {
	if !t.IsComplete() {
		return errors.New("cannot complete an incomplete trick")
	}
	winner, err := t.DetermineWinner(gameType)
	if err != nil {
		return err
	}
	t.Winner = &winner
	return nil
}

// GetCards returns all cards from a trick as a slice.
func (t *Trick) GetCards() []Card {
	cards := make([]Card, len(t.Cards))
	for i, tc := range t.Cards {
		cards[i] = tc.Card
	}
	return cards
}

// GetCardByPlayer returns the card played by a specific player in this trick, if any.
func (t *Trick) GetCardByPlayer(player Player) *Card {
	for _, tc := range t.Cards {
		if tc.Player == player {
			return &tc.Card
		}
	}
	return nil
}
