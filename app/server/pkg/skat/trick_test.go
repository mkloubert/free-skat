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
// Trick Winner Tests - Suit Games
// ============================================================================

func TestTrickWinnerSuitGame_HighestCardWins(t *testing.T) {
	// Hearts game: HA beats HK beats HQ
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Hearts, King), Forehand)
	trick.AddCard(NewCard(Hearts, Ace), Middlehand)
	trick.AddCard(NewCard(Hearts, Queen), Rearhand)

	winner, err := trick.DetermineWinner(GameHearts)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (HA)", winner)
	}
}

func TestTrickWinnerSuitGame_TrumpBeatsNonTrump(t *testing.T) {
	// Hearts game: H7 (trump) beats SA (non-trump)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Spades, Ace), Forehand)
	trick.AddCard(NewCard(Hearts, Seven), Middlehand) // Trump
	trick.AddCard(NewCard(Spades, Ten), Rearhand)

	winner, err := trick.DetermineWinner(GameHearts)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (H7 trump)", winner)
	}
}

func TestTrickWinnerSuitGame_JackIsHighestTrump(t *testing.T) {
	// Hearts game: CJ (highest Jack) beats HA (trump Ace)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Hearts, Ace), Forehand)   // Trump Ace
	trick.AddCard(NewCard(Clubs, Jack), Middlehand) // Highest Jack
	trick.AddCard(NewCard(Hearts, Ten), Rearhand)   // Trump Ten

	winner, err := trick.DetermineWinner(GameHearts)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (CJ)", winner)
	}
}

func TestTrickWinnerSuitGame_JackOrder(t *testing.T) {
	// Any suit game: CJ > SJ > HJ > DJ
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Diamonds, Jack), Forehand)
	trick.AddCard(NewCard(Hearts, Jack), Middlehand)
	trick.AddCard(NewCard(Clubs, Jack), Rearhand)

	winner, err := trick.DetermineWinner(GameClubs)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Rearhand {
		t.Errorf("Winner = %s, want Rearhand (CJ)", winner)
	}
}

func TestTrickWinnerSuitGame_MustFollowSuit(t *testing.T) {
	// Spades game: Spades led, SA wins even if CA played (can't follow suit)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Spades, King), Forehand) // Lead Spades
	trick.AddCard(NewCard(Clubs, Ace), Middlehand) // Can't follow, plays CA
	trick.AddCard(NewCard(Spades, Ace), Rearhand)  // Follows with SA

	// Note: This is Spades game, so SK is trump but SA is also trump (higher)
	winner, err := trick.DetermineWinner(GameSpades)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Rearhand {
		t.Errorf("Winner = %s, want Rearhand (SA)", winner)
	}
}

func TestTrickWinnerSuitGame_NonTrumpLed(t *testing.T) {
	// Hearts game: Clubs led, CA wins (no trump played)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, King), Forehand)
	trick.AddCard(NewCard(Clubs, Ace), Middlehand)
	trick.AddCard(NewCard(Clubs, Ten), Rearhand)

	winner, err := trick.DetermineWinner(GameHearts)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (CA)", winner)
	}
}

// ============================================================================
// Trick Winner Tests - Grand Games
// ============================================================================

func TestTrickWinnerGrand_OnlyJacksAreTrump(t *testing.T) {
	// Grand: DJ beats SA (Jack is trump, Ace is not)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Spades, Ace), Forehand)
	trick.AddCard(NewCard(Diamonds, Jack), Middlehand) // Trump
	trick.AddCard(NewCard(Spades, Ten), Rearhand)

	winner, err := trick.DetermineWinner(GameGrand)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (DJ)", winner)
	}
}

func TestTrickWinnerGrand_JackOrder(t *testing.T) {
	// Grand: CJ > SJ > HJ > DJ
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Spades, Jack), Forehand)
	trick.AddCard(NewCard(Clubs, Jack), Middlehand)
	trick.AddCard(NewCard(Hearts, Jack), Rearhand)

	winner, err := trick.DetermineWinner(GameGrand)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (CJ)", winner)
	}
}

func TestTrickWinnerGrand_NoTrumpPlayed(t *testing.T) {
	// Grand: Clubs led, CA wins (no Jacks played)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, King), Forehand)
	trick.AddCard(NewCard(Clubs, Ace), Middlehand)
	trick.AddCard(NewCard(Clubs, Ten), Rearhand)

	winner, err := trick.DetermineWinner(GameGrand)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (CA)", winner)
	}
}

func TestTrickWinnerGrand_SuitAceNotTrump(t *testing.T) {
	// Grand: Hearts Ace is not trump (unlike in Hearts game)
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Hearts, Ace), Forehand) // Not trump in Grand
	trick.AddCard(NewCard(Hearts, King), Middlehand)
	trick.AddCard(NewCard(Hearts, Ten), Rearhand)

	winner, err := trick.DetermineWinner(GameGrand)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	// HA wins because it's highest in led suit
	if winner != Forehand {
		t.Errorf("Winner = %s, want Forehand (HA)", winner)
	}
}

// ============================================================================
// Trick Winner Tests - Null Games
// ============================================================================

func TestTrickWinnerNull_NoTrump(t *testing.T) {
	// Null: No trump, highest of led suit wins
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, King), Forehand)
	trick.AddCard(NewCard(Clubs, Ace), Middlehand)
	trick.AddCard(NewCard(Clubs, Queen), Rearhand)

	winner, err := trick.DetermineWinner(GameNull)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (CA)", winner)
	}
}

func TestTrickWinnerNull_JackIsNotTrump(t *testing.T) {
	// Null: CJ is just a Club card, not trump
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, King), Forehand)
	trick.AddCard(NewCard(Clubs, Jack), Middlehand) // Not trump in Null
	trick.AddCard(NewCard(Clubs, Ace), Rearhand)

	winner, err := trick.DetermineWinner(GameNull)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	// CA wins (Null order: A > K > Q > J > T > 9 > 8 > 7)
	if winner != Rearhand {
		t.Errorf("Winner = %s, want Rearhand (CA)", winner)
	}
}

func TestTrickWinnerNull_NullOrder(t *testing.T) {
	// Null order: A > K > Q > J > T > 9 > 8 > 7
	// Test that Ten is lower than Jack in Null
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Hearts, Ten), Forehand)
	trick.AddCard(NewCard(Hearts, Jack), Middlehand) // Higher than Ten in Null
	trick.AddCard(NewCard(Hearts, Nine), Rearhand)

	winner, err := trick.DetermineWinner(GameNull)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	if winner != Middlehand {
		t.Errorf("Winner = %s, want Middlehand (HJ)", winner)
	}
}

func TestTrickWinnerNull_DifferentSuitDoesntWin(t *testing.T) {
	// Null: Playing different suit doesn't win
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, Seven), Forehand)  // Lead Clubs
	trick.AddCard(NewCard(Hearts, Ace), Middlehand) // Different suit
	trick.AddCard(NewCard(Spades, Ace), Rearhand)   // Different suit

	winner, err := trick.DetermineWinner(GameNull)
	if err != nil {
		t.Fatalf("DetermineWinner() error: %v", err)
	}

	// C7 wins because others didn't follow suit
	if winner != Forehand {
		t.Errorf("Winner = %s, want Forehand (C7)", winner)
	}
}

// ============================================================================
// Trick Points Tests
// ============================================================================

func TestTrickPoints(t *testing.T) {
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, Ace), Forehand)    // 11
	trick.AddCard(NewCard(Hearts, Ten), Middlehand) // 10
	trick.AddCard(NewCard(Spades, King), Rearhand)  // 4

	expected := 25
	if got := trick.Points(); got != expected {
		t.Errorf("Trick.Points() = %d, want %d", got, expected)
	}
}

func TestTrickPointsAllJacks(t *testing.T) {
	trick := NewTrick(Forehand)
	trick.AddCard(NewCard(Clubs, Jack), Forehand)    // 2
	trick.AddCard(NewCard(Spades, Jack), Middlehand) // 2
	trick.AddCard(NewCard(Hearts, Jack), Rearhand)   // 2

	expected := 6
	if got := trick.Points(); got != expected {
		t.Errorf("Trick.Points() = %d, want %d", got, expected)
	}
}

// ============================================================================
// Trump Detection Tests
// ============================================================================

func TestIsTrumpSuitGame(t *testing.T) {
	// Hearts game
	tests := []struct {
		card     Card
		gameType GameType
		isTrump  bool
	}{
		{NewCard(Hearts, Ace), GameHearts, true},   // Trump suit
		{NewCard(Hearts, Seven), GameHearts, true}, // Trump suit (lowest)
		{NewCard(Clubs, Jack), GameHearts, true},   // Jack is always trump
		{NewCard(Hearts, Jack), GameHearts, true},  // Jack is trump
		{NewCard(Clubs, Ace), GameHearts, false},   // Not trump
		{NewCard(Spades, King), GameHearts, false}, // Not trump
	}

	for _, tt := range tests {
		got := tt.card.IsTrump(tt.gameType)
		if got != tt.isTrump {
			t.Errorf("%s.IsTrump(%s) = %v, want %v",
				tt.card, tt.gameType, got, tt.isTrump)
		}
	}
}

func TestIsTrumpGrand(t *testing.T) {
	tests := []struct {
		card    Card
		isTrump bool
	}{
		{NewCard(Clubs, Jack), true},    // Jack is trump
		{NewCard(Spades, Jack), true},   // Jack is trump
		{NewCard(Hearts, Jack), true},   // Jack is trump
		{NewCard(Diamonds, Jack), true}, // Jack is trump
		{NewCard(Clubs, Ace), false},    // Not trump in Grand
		{NewCard(Hearts, Ace), false},   // Not trump in Grand
	}

	for _, tt := range tests {
		got := tt.card.IsTrump(GameGrand)
		if got != tt.isTrump {
			t.Errorf("%s.IsTrump(Grand) = %v, want %v", tt.card, got, tt.isTrump)
		}
	}
}

func TestIsTrumpNull(t *testing.T) {
	// In Null games, nothing is trump
	cards := []Card{
		NewCard(Clubs, Jack),
		NewCard(Clubs, Ace),
		NewCard(Hearts, King),
	}

	for _, card := range cards {
		if card.IsTrump(GameNull) {
			t.Errorf("%s.IsTrump(Null) = true, want false", card)
		}
	}
}
