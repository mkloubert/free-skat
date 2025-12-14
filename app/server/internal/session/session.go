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

// Package session provides connection session management.
package session

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"sync"
	"time"
)

// Default timeout values.
const (
	DefaultReadTimeout  = 5 * time.Minute
	DefaultWriteTimeout = 30 * time.Second
	DefaultIdleTimeout  = 10 * time.Minute
)

// Session represents a client connection session.
type Session struct {
	ID        string
	Conn      net.Conn
	Username  string
	CreatedAt time.Time

	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration

	reader     *bufio.Reader
	writer     *bufio.Writer
	mu         sync.Mutex
	lastActive time.Time
}

// NewSession creates a new session for a connection.
func NewSession(id string, conn net.Conn) *Session {
	return &Session{
		ID:           id,
		Conn:         conn,
		CreatedAt:    time.Now(),
		lastActive:   time.Now(),
		ReadTimeout:  DefaultReadTimeout,
		WriteTimeout: DefaultWriteTimeout,
		IdleTimeout:  DefaultIdleTimeout,
		reader:       bufio.NewReader(conn),
		writer:       bufio.NewWriter(conn),
	}
}

// ReadLine reads a line from the connection with timeout.
func (s *Session) ReadLine() (string, error) {
	// Set read deadline
	if s.ReadTimeout > 0 {
		s.Conn.SetReadDeadline(time.Now().Add(s.ReadTimeout))
	}

	line, err := s.reader.ReadString('\n')
	if err != nil {
		return "", err
	}

	// Update last active time
	s.mu.Lock()
	s.lastActive = time.Now()
	s.mu.Unlock()

	// Remove trailing newline characters
	if len(line) > 0 && line[len(line)-1] == '\n' {
		line = line[:len(line)-1]
	}
	if len(line) > 0 && line[len(line)-1] == '\r' {
		line = line[:len(line)-1]
	}
	return line, nil
}

// WriteLine writes a line to the connection with timeout.
func (s *Session) WriteLine(format string, args ...interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Set write deadline
	if s.WriteTimeout > 0 {
		s.Conn.SetWriteDeadline(time.Now().Add(s.WriteTimeout))
	}

	message := fmt.Sprintf(format, args...)
	_, err := s.writer.WriteString(message + "\n")
	if err != nil {
		return err
	}

	s.lastActive = time.Now()
	return s.writer.Flush()
}

// LastActive returns the time of the last activity.
func (s *Session) LastActive() time.Time {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.lastActive
}

// IsIdle returns true if the session has been idle longer than IdleTimeout.
func (s *Session) IsIdle() bool {
	if s.IdleTimeout <= 0 {
		return false
	}
	return time.Since(s.LastActive()) > s.IdleTimeout
}

// Close closes the session connection.
func (s *Session) Close() error {
	return s.Conn.Close()
}

// RemoteAddr returns the remote address of the connection.
func (s *Session) RemoteAddr() string {
	return s.Conn.RemoteAddr().String()
}

// Manager manages all active sessions.
type Manager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
	counter  int
}

// NewManager creates a new session manager.
func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
	}
}

// CreateSession creates a new session for a connection.
func (m *Manager) CreateSession(conn net.Conn) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.counter++
	id := fmt.Sprintf("session-%d", m.counter)

	session := NewSession(id, conn)
	m.sessions[id] = session

	log.Printf("[%s] Session created from %s", id, conn.RemoteAddr())

	return session
}

// RemoveSession removes a session.
func (m *Manager) RemoveSession(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if session, exists := m.sessions[id]; exists {
		session.Close()
		delete(m.sessions, id)
		log.Printf("[%s] Session removed", id)
	}
}

// GetSession returns a session by ID.
func (m *Manager) GetSession(id string) *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.sessions[id]
}

// Count returns the number of active sessions.
func (m *Manager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return len(m.sessions)
}

// CloseAll closes all sessions.
func (m *Manager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, session := range m.sessions {
		session.Close()
		log.Printf("[%s] Session closed during shutdown", id)
	}
	m.sessions = make(map[string]*Session)
}
