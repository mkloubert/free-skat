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
	"sort"
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

// ============================================================================
// Card Comparison Functions for Trick Evaluation
// ============================================================================

// IsTrump returns true if the card is a trump card in the given game type.
func (c Card) IsTrump(gameType GameType) bool {
	// In Null games, there is no trump
	if gameType.IsNull() {
		return false
	}

	// Jacks are always trump in Suit and Grand games
	if c.IsJack() {
		return true
	}

	// In Grand games, only Jacks are trump
	if gameType.IsGrand() {
		return false
	}

	// In suit games, the trump suit cards are also trump
	trumpSuit, hasTrump := gameType.TrumpSuit()
	return hasTrump && c.Suit == trumpSuit
}

// TrumpOrder returns the trump order value for a card.
// Higher value = stronger trump.
// Jacks: CJ=103, SJ=102, HJ=101, DJ=100
// Trump suit: A=7, T=6, K=5, Q=4, 9=3, 8=2, 7=1
func (c Card) TrumpOrder(gameType GameType) int {
	if !c.IsTrump(gameType) {
		return 0
	}

	// Jacks are highest trumps: CJ > SJ > HJ > DJ
	if c.IsJack() {
		return 100 + (3 - int(c.Suit)) // Clubs=103, Spades=102, Hearts=101, Diamonds=100
	}

	// Non-Jack trump cards (only in suit games)
	// Order: A > T > K > Q > 9 > 8 > 7
	rankOrder := map[Rank]int{
		Ace:   7,
		Ten:   6,
		King:  5,
		Queen: 4,
		Nine:  3,
		Eight: 2,
		Seven: 1,
		Jack:  0, // Jacks handled above
	}

	return rankOrder[c.Rank]
}

// SuitOrder returns the suit order value for a card in non-trump context.
// For Suit/Grand games: A > T > K > Q > 9 > 8 > 7
// For Null games: A > K > Q > J > T > 9 > 8 > 7
func (c Card) SuitOrder(gameType GameType) int {
	if gameType.IsNull() {
		// Null order: A > K > Q > J > T > 9 > 8 > 7
		nullOrder := map[Rank]int{
			Ace:   8,
			King:  7,
			Queen: 6,
			Jack:  5,
			Ten:   4,
			Nine:  3,
			Eight: 2,
			Seven: 1,
		}
		return nullOrder[c.Rank]
	}

	// Suit/Grand order (excluding Jacks which are trump): A > T > K > Q > 9 > 8 > 7
	suitOrder := map[Rank]int{
		Ace:   7,
		Ten:   6,
		King:  5,
		Queen: 4,
		Nine:  3,
		Eight: 2,
		Seven: 1,
		Jack:  0, // Jacks are trump, shouldn't be compared here
	}

	return suitOrder[c.Rank]
}

// CompareCards compares two cards to determine which wins a trick.
// Returns positive if c beats other, negative if other beats c, 0 if equal.
func (c Card) CompareCards(other Card, leadSuit Suit, gameType GameType) int {
	trump1 := c.IsTrump(gameType)
	trump2 := other.IsTrump(gameType)

	// If both are trump, compare trump order
	if trump1 && trump2 {
		return c.TrumpOrder(gameType) - other.TrumpOrder(gameType)
	}

	// Trump beats non-trump
	if trump1 && !trump2 {
		return 1
	}
	if !trump1 && trump2 {
		return -1
	}

	// Neither is trump - must follow suit
	followsSuit1 := c.Suit == leadSuit
	followsSuit2 := other.Suit == leadSuit

	// Card that follows suit beats one that doesn't
	if followsSuit1 && !followsSuit2 {
		return 1
	}
	if !followsSuit1 && followsSuit2 {
		return -1
	}

	// Both follow suit (or both don't) - compare by suit order
	if followsSuit1 && followsSuit2 {
		return c.SuitOrder(gameType) - other.SuitOrder(gameType)
	}

	// Neither follows suit - first card played wins (return 0, caller decides)
	return 0
}

// CanPlay determines if a card can legally be played given the lead card and hand.
func (c Card) CanPlay(leadCard *Card, hand *Hand, gameType GameType) bool {
	// If no lead card, any card can be played
	if leadCard == nil {
		return true
	}

	// Check if player must follow suit
	leadIsTrump := leadCard.IsTrump(gameType)
	cardIsTrump := c.IsTrump(gameType)

	if leadIsTrump {
		// Trump was led - must play trump if possible
		hasTrump := false
		for _, hc := range hand.Cards {
			if hc.IsTrump(gameType) {
				hasTrump = true
				break
			}
		}
		if hasTrump {
			return cardIsTrump
		}
		// No trump - can play anything
		return true
	}

	// Non-trump was led
	leadSuit := leadCard.Suit

	// Check if player has the led suit (excluding trumps in suit/grand games)
	hasSuit := false
	for _, hc := range hand.Cards {
		if hc.IsTrump(gameType) {
			continue // Trump cards don't count as following suit
		}
		if hc.Suit == leadSuit {
			hasSuit = true
			break
		}
	}

	if hasSuit {
		// Must follow suit
		if cardIsTrump {
			return false // Can't play trump when you have the led suit
		}
		return c.Suit == leadSuit
	}

	// Don't have the led suit - can play anything
	return true
}

// ============================================================================
// Card Sorting Functions
// ============================================================================

// SortBySuit sorts cards by suit first (Clubs > Spades > Hearts > Diamonds),
// then by rank within each suit. Jacks are sorted with their suit in standard sorting.
func SortBySuit(cards []Card) {
	sort.Slice(cards, func(i, j int) bool {
		// First compare by suit
		if cards[i].Suit != cards[j].Suit {
			return cards[i].Suit < cards[j].Suit
		}
		// Then by rank (higher rank = higher value)
		return cards[i].Rank > cards[j].Rank
	})
}

// SortByRank sorts cards by rank first (Ace > 10 > King > Queen > Jack > 9 > 8 > 7),
// then by suit within each rank.
func SortByRank(cards []Card) {
	sort.Slice(cards, func(i, j int) bool {
		// First compare by rank
		if cards[i].Rank != cards[j].Rank {
			return cards[i].Rank > cards[j].Rank
		}
		// Then by suit
		return cards[i].Suit < cards[j].Suit
	})
}

// SortForGame sorts cards for display during a game.
// In Suit/Grand games: Jacks first (CJ, SJ, HJ, DJ), then trump suit, then other suits.
// In Null games: Standard suit sorting (no special trump handling).
func SortForGame(cards []Card, gameType GameType) {
	if gameType.IsNull() {
		// Null games: standard suit order, A > K > Q > J > T > 9 > 8 > 7
		sort.Slice(cards, func(i, j int) bool {
			if cards[i].Suit != cards[j].Suit {
				return cards[i].Suit < cards[j].Suit
			}
			// Null order: use NullRanks index
			return nullRankOrder(cards[i].Rank) > nullRankOrder(cards[j].Rank)
		})
		return
	}

	// Suit/Grand games: Jacks first, then trump suit, then others
	trumpSuit, hasTrump := gameType.TrumpSuit()

	sort.Slice(cards, func(i, j int) bool {
		iIsJack := cards[i].IsJack()
		jIsJack := cards[j].IsJack()

		// Jacks come first
		if iIsJack && !jIsJack {
			return true
		}
		if !iIsJack && jIsJack {
			return false
		}

		// Both are Jacks: sort by suit (C > S > H > D)
		if iIsJack && jIsJack {
			return cards[i].Suit < cards[j].Suit
		}

		// Neither is Jack
		iIsTrump := hasTrump && cards[i].Suit == trumpSuit
		jIsTrump := hasTrump && cards[j].Suit == trumpSuit

		// Trump suit comes after Jacks but before other suits
		if iIsTrump && !jIsTrump {
			return true
		}
		if !iIsTrump && jIsTrump {
			return false
		}

		// Same trump status: sort by suit, then by rank
		if cards[i].Suit != cards[j].Suit {
			return cards[i].Suit < cards[j].Suit
		}

		// Same suit: sort by rank (A > T > K > Q > 9 > 8 > 7)
		return suitRankOrder(cards[i].Rank) > suitRankOrder(cards[j].Rank)
	})
}

// nullRankOrder returns the sort order for Null games (A > K > Q > J > T > 9 > 8 > 7)
func nullRankOrder(r Rank) int {
	order := map[Rank]int{
		Ace:   8,
		King:  7,
		Queen: 6,
		Jack:  5,
		Ten:   4,
		Nine:  3,
		Eight: 2,
		Seven: 1,
	}
	return order[r]
}

// suitRankOrder returns the sort order for Suit/Grand games (A > T > K > Q > 9 > 8 > 7)
func suitRankOrder(r Rank) int {
	order := map[Rank]int{
		Ace:   7,
		Ten:   6,
		King:  5,
		Queen: 4,
		Nine:  3,
		Eight: 2,
		Seven: 1,
		Jack:  0, // Jacks handled separately
	}
	return order[r]
}

// Sort sorts the hand's cards for display during a game.
func (h *Hand) Sort(gameType GameType) {
	SortForGame(h.Cards, gameType)
}

// SortBySuit sorts the hand's cards by suit.
func (h *Hand) SortBySuit() {
	SortBySuit(h.Cards)
}

// SortByRank sorts the hand's cards by rank.
func (h *Hand) SortByRank() {
	SortByRank(h.Cards)
}
