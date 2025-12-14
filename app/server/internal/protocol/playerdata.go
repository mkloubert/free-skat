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
)

// PlayerStatus represents a player's status at a table (10 parameters in ISS protocol).
type PlayerStatus struct {
	Name           string
	IP             string
	GamesPlayed    int
	GamesWon       int
	LastGameResult int
	TotalPoints    int
	Switch34       bool
	Reserved       int
	TalkEnabled    bool
	ReadyToPlay    bool
	PlayerLeft     bool
}

// NewPlayerStatus creates a new player status with default values.
func NewPlayerStatus(name string) *PlayerStatus {
	return &PlayerStatus{
		Name:        name,
		IP:          "0.0.0.0",
		TalkEnabled: true,
	}
}

// Encode returns the ISS protocol representation of the player status (10 space-separated fields).
func (p *PlayerStatus) Encode() string {
	switch34 := 0
	if p.Switch34 {
		switch34 = 1
	}
	talk := 0
	if p.TalkEnabled {
		talk = 1
	}
	ready := 0
	if p.ReadyToPlay {
		ready = 1
	}

	return fmt.Sprintf("%s %s %d %d %d %d %d %d %d %d",
		p.Name,
		p.IP,
		p.GamesPlayed,
		p.GamesWon,
		p.LastGameResult,
		p.TotalPoints,
		switch34,
		p.Reserved,
		talk,
		ready,
	)
}

// ParsePlayerStatus parses a player status from ISS protocol fields.
func ParsePlayerStatus(fields []string) (*PlayerStatus, error) {
	if len(fields) < 10 {
		return nil, fmt.Errorf("not enough fields for player status: got %d, need 10", len(fields))
	}

	gamesPlayed, _ := strconv.Atoi(fields[2])
	gamesWon, _ := strconv.Atoi(fields[3])
	lastResult, _ := strconv.Atoi(fields[4])
	totalPoints, _ := strconv.Atoi(fields[5])
	switch34, _ := strconv.Atoi(fields[6])
	reserved, _ := strconv.Atoi(fields[7])
	talk, _ := strconv.Atoi(fields[8])
	ready, _ := strconv.Atoi(fields[9])

	return &PlayerStatus{
		Name:           fields[0],
		IP:             fields[1],
		GamesPlayed:    gamesPlayed,
		GamesWon:       gamesWon,
		LastGameResult: lastResult,
		TotalPoints:    totalPoints,
		Switch34:       switch34 == 1,
		Reserved:       reserved,
		TalkEnabled:    talk == 1,
		ReadyToPlay:    ready == 1,
	}, nil
}

// TableData represents a table's data in the ISS protocol.
type TableData struct {
	TableName   string
	MaxPlayers  int
	GamesPlayed int
	Player1     string
	Player2     string
	Player3     string
}

// NewTableData creates a new table data structure.
func NewTableData(name string, maxPlayers int) *TableData {
	return &TableData{
		TableName:  name,
		MaxPlayers: maxPlayers,
	}
}

// Encode returns the ISS protocol representation of the table data.
func (t *TableData) Encode() string {
	players := []string{}
	if t.Player1 != "" {
		players = append(players, t.Player1)
	}
	if t.Player2 != "" {
		players = append(players, t.Player2)
	}
	if t.Player3 != "" {
		players = append(players, t.Player3)
	}

	return fmt.Sprintf("%s %d %d %s",
		t.TableName,
		t.MaxPlayers,
		t.GamesPlayed,
		strings.Join(players, " "),
	)
}

// PlayerCount returns the number of players at the table.
func (t *TableData) PlayerCount() int {
	count := 0
	if t.Player1 != "" {
		count++
	}
	if t.Player2 != "" {
		count++
	}
	if t.Player3 != "" {
		count++
	}
	return count
}

// IsFull returns true if the table has the maximum number of players.
func (t *TableData) IsFull() bool {
	return t.PlayerCount() >= t.MaxPlayers
}
