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
	"fmt"
	"math/rand"
	"strings"
)

// Card represents a single playing card.
type Card struct {
	Suit Suit
	Rank Rank
}

// NewCard creates a new card with the given suit and rank.
func NewCard(suit Suit, rank Rank) Card {
	return Card{Suit: suit, Rank: rank}
}

// String returns a human-readable representation of the card.
func (c Card) String() string {
	return fmt.Sprintf("%s of %s", c.Rank, c.Suit)
}

// GermanString returns the German name of the card.
func (c Card) GermanString() string {
	return fmt.Sprintf("%s %s", c.Suit.GermanName(), c.Rank.GermanName())
}

// Code returns the ISS protocol code for the card (e.g., "CA" for Ace of Clubs).
func (c Card) Code() string {
	return c.Suit.Code() + c.Rank.Code()
}

// Points returns the point value of the card.
func (c Card) Points() int {
	return c.Rank.Points()
}

// IsJack returns true if the card is a Jack.
func (c Card) IsJack() bool {
	return c.Rank == Jack
}

// CardFromCode parses a card from its ISS protocol code (e.g., "CA" for Ace of Clubs).
func CardFromCode(code string) (Card, error) {
	if len(code) != 2 {
		return Card{}, fmt.Errorf("invalid card code length: %s", code)
	}

	suit, err := SuitFromCode(string(code[0]))
	if err != nil {
		return Card{}, err
	}

	rank, err := RankFromCode(string(code[1]))
	if err != nil {
		return Card{}, err
	}

	return NewCard(suit, rank), nil
}

// Deck represents a collection of cards.
type Deck struct {
	Cards []Card
}

// NewDeck creates a new standard 32-card Skat deck.
func NewDeck() *Deck {
	deck := &Deck{
		Cards: make([]Card, 0, 32),
	}

	for _, suit := range AllSuits {
		for _, rank := range AllRanks {
			deck.Cards = append(deck.Cards, NewCard(suit, rank))
		}
	}

	return deck
}

// Shuffle randomly shuffles the deck.
func (d *Deck) Shuffle() {
	rand.Shuffle(len(d.Cards), func(i, j int) {
		d.Cards[i], d.Cards[j] = d.Cards[j], d.Cards[i]
	})
}

// Deal removes and returns the specified number of cards from the top of the deck.
func (d *Deck) Deal(count int) []Card {
	if count > len(d.Cards) {
		count = len(d.Cards)
	}

	dealt := make([]Card, count)
	copy(dealt, d.Cards[:count])
	d.Cards = d.Cards[count:]

	return dealt
}

// Remaining returns the number of cards remaining in the deck.
func (d *Deck) Remaining() int {
	return len(d.Cards)
}

// Hand represents a player's hand of cards.
type Hand struct {
	Cards []Card
}

// NewHand creates a new empty hand.
func NewHand() *Hand {
	return &Hand{
		Cards: make([]Card, 0),
	}
}

// NewHandFromCards creates a hand with the given cards.
func NewHandFromCards(cards []Card) *Hand {
	return &Hand{
		Cards: cards,
	}
}

// Add adds a card to the hand.
func (h *Hand) Add(card Card) {
	h.Cards = append(h.Cards, card)
}

// Remove removes a card from the hand. Returns true if the card was found and removed.
func (h *Hand) Remove(card Card) bool {
	for i, c := range h.Cards {
		if c.Suit == card.Suit && c.Rank == card.Rank {
			h.Cards = append(h.Cards[:i], h.Cards[i+1:]...)
			return true
		}
	}
	return false
}

// Contains returns true if the hand contains the given card.
func (h *Hand) Contains(card Card) bool {
	for _, c := range h.Cards {
		if c.Suit == card.Suit && c.Rank == card.Rank {
			return true
		}
	}
	return false
}

// HasSuit returns true if the hand contains any card of the given suit.
func (h *Hand) HasSuit(suit Suit) bool {
	for _, c := range h.Cards {
		if c.Suit == suit && c.Rank != Jack {
			return true
		}
	}
	return false
}

// HasJack returns true if the hand contains any Jack.
func (h *Hand) HasJack() bool {
	for _, c := range h.Cards {
		if c.Rank == Jack {
			return true
		}
	}
	return false
}

// Size returns the number of cards in the hand.
func (h *Hand) Size() int {
	return len(h.Cards)
}

// Points returns the total point value of all cards in the hand.
func (h *Hand) Points() int {
	total := 0
	for _, c := range h.Cards {
		total += c.Points()
	}
	return total
}

// Code returns the ISS protocol representation of the hand (cards separated by dots).
func (h *Hand) Code() string {
	codes := make([]string, len(h.Cards))
	for i, c := range h.Cards {
		codes[i] = c.Code()
	}
	return strings.Join(codes, ".")
}

// HandFromCode parses a hand from its ISS protocol representation.
func HandFromCode(code string) (*Hand, error) {
	if code == "" {
		return NewHand(), nil
	}

	parts := strings.Split(code, ".")
	hand := NewHand()

	for _, part := range parts {
		if part == "??" {
			// Hidden card placeholder
			continue
		}
		card, err := CardFromCode(part)
		if err != nil {
			return nil, err
		}
		hand.Add(card)
	}

	return hand, nil
}
