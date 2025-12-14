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
	"testing"
)

// ============================================================================
// Card Point Value Tests
// ============================================================================

func TestCardPoints(t *testing.T) {
	tests := []struct {
		rank     Rank
		expected int
	}{
		{Ace, 11},
		{Ten, 10},
		{King, 4},
		{Queen, 3},
		{Jack, 2},
		{Nine, 0},
		{Eight, 0},
		{Seven, 0},
	}

	for _, tt := range tests {
		card := NewCard(Clubs, tt.rank)
		if got := card.Points(); got != tt.expected {
			t.Errorf("Card{%s}.Points() = %d, want %d", tt.rank, got, tt.expected)
		}
	}
}

func TestTotalDeckPoints(t *testing.T) {
	deck := NewDeck()
	total := 0
	for _, card := range deck.Cards {
		total += card.Points()
	}

	// Total points in a Skat deck should be 120
	if total != 120 {
		t.Errorf("Total deck points = %d, want 120", total)
	}
}

// ============================================================================
// Deck Tests
// ============================================================================

func TestNewDeck(t *testing.T) {
	deck := NewDeck()

	// Deck should have exactly 32 cards
	if len(deck.Cards) != 32 {
		t.Errorf("NewDeck() created %d cards, want 32", len(deck.Cards))
	}

	// Check all suits are present
	suitCount := make(map[Suit]int)
	for _, card := range deck.Cards {
		suitCount[card.Suit]++
	}

	for _, suit := range AllSuits {
		if suitCount[suit] != 8 {
			t.Errorf("Suit %s has %d cards, want 8", suit, suitCount[suit])
		}
	}

	// Check all ranks are present
	rankCount := make(map[Rank]int)
	for _, card := range deck.Cards {
		rankCount[card.Rank]++
	}

	for _, rank := range AllRanks {
		if rankCount[rank] != 4 {
			t.Errorf("Rank %s has %d cards, want 4", rank, rankCount[rank])
		}
	}
}

func TestDeckShuffle(t *testing.T) {
	deck := NewDeck()
	originalOrder := make([]Card, len(deck.Cards))
	copy(originalOrder, deck.Cards)

	deck.Shuffle()

	// After shuffle, deck should still have 32 cards
	if len(deck.Cards) != 32 {
		t.Errorf("After shuffle, deck has %d cards, want 32", len(deck.Cards))
	}

	// Verify all original cards are still present
	cardSet := make(map[string]bool)
	for _, card := range deck.Cards {
		cardSet[card.Code()] = true
	}

	for _, card := range originalOrder {
		if !cardSet[card.Code()] {
			t.Errorf("Card %s missing after shuffle", card.Code())
		}
	}

	// Check that order has changed (with very high probability)
	sameOrder := true
	for i := range deck.Cards {
		if deck.Cards[i] != originalOrder[i] {
			sameOrder = false
			break
		}
	}

	if sameOrder {
		t.Log("Warning: Deck order unchanged after shuffle (extremely unlikely but possible)")
	}
}

func TestDeckDeal(t *testing.T) {
	deck := NewDeck()
	deck.Shuffle()

	// Deal 10 cards to each player + 2 for skat
	hand1 := deck.Deal(10)
	hand2 := deck.Deal(10)
	hand3 := deck.Deal(10)
	skat := deck.Deal(2)

	if len(hand1) != 10 {
		t.Errorf("Hand 1 has %d cards, want 10", len(hand1))
	}
	if len(hand2) != 10 {
		t.Errorf("Hand 2 has %d cards, want 10", len(hand2))
	}
	if len(hand3) != 10 {
		t.Errorf("Hand 3 has %d cards, want 10", len(hand3))
	}
	if len(skat) != 2 {
		t.Errorf("Skat has %d cards, want 2", len(skat))
	}

	// Deck should be empty now
	if deck.Remaining() != 0 {
		t.Errorf("Deck has %d cards remaining, want 0", deck.Remaining())
	}

	// Verify no duplicate cards across all hands
	allCards := make(map[string]bool)
	for _, card := range hand1 {
		code := card.Code()
		if allCards[code] {
			t.Errorf("Duplicate card found: %s", code)
		}
		allCards[code] = true
	}
	for _, card := range hand2 {
		code := card.Code()
		if allCards[code] {
			t.Errorf("Duplicate card found: %s", code)
		}
		allCards[code] = true
	}
	for _, card := range hand3 {
		code := card.Code()
		if allCards[code] {
			t.Errorf("Duplicate card found: %s", code)
		}
		allCards[code] = true
	}
	for _, card := range skat {
		code := card.Code()
		if allCards[code] {
			t.Errorf("Duplicate card found: %s", code)
		}
		allCards[code] = true
	}

	// Should have exactly 32 unique cards
	if len(allCards) != 32 {
		t.Errorf("Total unique cards = %d, want 32", len(allCards))
	}
}

// ============================================================================
// Card Code Tests
// ============================================================================

func TestCardCode(t *testing.T) {
	tests := []struct {
		suit     Suit
		rank     Rank
		expected string
	}{
		{Clubs, Ace, "CA"},
		{Clubs, Jack, "CJ"},
		{Spades, Ten, "ST"},
		{Hearts, Queen, "HQ"},
		{Diamonds, Seven, "D7"},
	}

	for _, tt := range tests {
		card := NewCard(tt.suit, tt.rank)
		if got := card.Code(); got != tt.expected {
			t.Errorf("Card{%s, %s}.Code() = %s, want %s", tt.suit, tt.rank, got, tt.expected)
		}
	}
}

func TestCardFromCode(t *testing.T) {
	tests := []struct {
		code     string
		wantSuit Suit
		wantRank Rank
		wantErr  bool
	}{
		{"CA", Clubs, Ace, false},
		{"CJ", Clubs, Jack, false},
		{"ST", Spades, Ten, false},
		{"HQ", Hearts, Queen, false},
		{"D7", Diamonds, Seven, false},
		{"XX", 0, 0, true},  // Invalid code
		{"C", 0, 0, true},   // Too short
		{"CAA", 0, 0, true}, // Too long
	}

	for _, tt := range tests {
		card, err := CardFromCode(tt.code)
		if tt.wantErr {
			if err == nil {
				t.Errorf("CardFromCode(%s) expected error, got nil", tt.code)
			}
			continue
		}
		if err != nil {
			t.Errorf("CardFromCode(%s) unexpected error: %v", tt.code, err)
			continue
		}
		if card.Suit != tt.wantSuit || card.Rank != tt.wantRank {
			t.Errorf("CardFromCode(%s) = {%s, %s}, want {%s, %s}",
				tt.code, card.Suit, card.Rank, tt.wantSuit, tt.wantRank)
		}
	}
}

// ============================================================================
// Hand Tests
// ============================================================================

func TestHandOperations(t *testing.T) {
	hand := NewHand()

	if hand.Size() != 0 {
		t.Errorf("NewHand().Size() = %d, want 0", hand.Size())
	}

	// Add cards
	card1 := NewCard(Clubs, Ace)
	card2 := NewCard(Hearts, Jack)
	hand.Add(card1)
	hand.Add(card2)

	if hand.Size() != 2 {
		t.Errorf("Hand.Size() = %d, want 2", hand.Size())
	}

	if !hand.Contains(card1) {
		t.Error("Hand should contain CA")
	}

	if !hand.HasJack() {
		t.Error("Hand should have Jack")
	}

	// Remove card
	if !hand.Remove(card1) {
		t.Error("Remove(CA) should return true")
	}

	if hand.Contains(card1) {
		t.Error("Hand should not contain CA after removal")
	}

	if hand.Size() != 1 {
		t.Errorf("Hand.Size() = %d, want 1", hand.Size())
	}
}

func TestHandPoints(t *testing.T) {
	hand := NewHand()
	hand.Add(NewCard(Clubs, Ace))   // 11 points
	hand.Add(NewCard(Hearts, Ten))  // 10 points
	hand.Add(NewCard(Spades, King)) // 4 points

	expected := 25
	if got := hand.Points(); got != expected {
		t.Errorf("Hand.Points() = %d, want %d", got, expected)
	}
}

// ============================================================================
// Card Sorting Tests
// ============================================================================

func TestSortBySuit(t *testing.T) {
	cards := []Card{
		NewCard(Diamonds, Ace),
		NewCard(Clubs, Seven),
		NewCard(Hearts, King),
		NewCard(Spades, Ten),
	}

	SortBySuit(cards)

	// Should be sorted: Clubs, Spades, Hearts, Diamonds
	expectedSuits := []Suit{Clubs, Spades, Hearts, Diamonds}
	for i, card := range cards {
		if card.Suit != expectedSuits[i] {
			t.Errorf("After SortBySuit, position %d has suit %s, want %s",
				i, card.Suit, expectedSuits[i])
		}
	}
}

func TestSortForGameGrand(t *testing.T) {
	cards := []Card{
		NewCard(Diamonds, Jack),
		NewCard(Clubs, Ace),
		NewCard(Hearts, Jack),
		NewCard(Clubs, Jack),
		NewCard(Spades, Jack),
	}

	SortForGame(cards, GameGrand)

	// Jacks should be first: CJ, SJ, HJ, DJ
	expectedJackOrder := []Suit{Clubs, Spades, Hearts, Diamonds}
	for i := 0; i < 4; i++ {
		if !cards[i].IsJack() {
			t.Errorf("Position %d should be a Jack, got %s", i, cards[i])
		}
		if cards[i].Suit != expectedJackOrder[i] {
			t.Errorf("Jack at position %d has suit %s, want %s",
				i, cards[i].Suit, expectedJackOrder[i])
		}
	}

	// Last card should be CA
	if cards[4].Suit != Clubs || cards[4].Rank != Ace {
		t.Errorf("Last card should be CA, got %s", cards[4])
	}
}

func TestSortForGameSuit(t *testing.T) {
	cards := []Card{
		NewCard(Spades, Ace),
		NewCard(Hearts, Ace), // Trump
		NewCard(Clubs, Jack), // Highest trump
		NewCard(Hearts, Ten), // Trump
		NewCard(Diamonds, King),
	}

	SortForGame(cards, GameHearts)

	// First should be CJ (Jack)
	if !cards[0].IsJack() || cards[0].Suit != Clubs {
		t.Errorf("First card should be CJ, got %s", cards[0])
	}

	// Then Hearts (trump suit) should come
	// Cards[1] and [2] should be Hearts (HA, HT)
	heartsFound := 0
	for i := 1; i <= 2; i++ {
		if cards[i].Suit == Hearts && !cards[i].IsJack() {
			heartsFound++
		}
	}
	if heartsFound != 2 {
		t.Errorf("Expected 2 Hearts after Jack, found %d", heartsFound)
	}
}
