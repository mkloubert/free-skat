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
	"log"
	"strings"

	"github.com/mkloubert/freeskat-server/internal/session"
)

// Handler processes ISS protocol messages.
type Handler struct {
	sessionManager *session.Manager
}

// NewHandler creates a new protocol handler.
func NewHandler(sessionManager *session.Manager) *Handler {
	return &Handler{
		sessionManager: sessionManager,
	}
}

// HandleConnection handles a new client connection.
func (h *Handler) HandleConnection(sess *session.Session) {
	// Send welcome message
	if err := h.sendWelcome(sess); err != nil {
		log.Printf("[%s] Failed to send welcome: %v", sess.ID, err)
		return
	}

	// Main message loop
	for {
		line, err := sess.ReadLine()
		if err != nil {
			log.Printf("[%s] Connection closed: %v", sess.ID, err)
			return
		}

		if line == "" {
			continue
		}

		log.Printf("[%s] Received: %s", sess.ID, line)

		if err := h.handleMessage(sess, line); err != nil {
			log.Printf("[%s] Error handling message: %v", sess.ID, err)
		}
	}
}

// sendWelcome sends the initial welcome and version messages.
func (h *Handler) sendWelcome(sess *session.Session) error {
	// Send Welcome message
	if err := sess.WriteLine("%s to ISS", MsgWelcome); err != nil {
		return err
	}

	// Send Version message
	if err := sess.WriteLine("%s %d", MsgVersion, ProtocolVersion); err != nil {
		return err
	}

	log.Printf("[%s] Sent welcome messages (protocol v%d)", sess.ID, ProtocolVersion)
	return nil
}

// handleMessage processes a single message from the client.
func (h *Handler) handleMessage(sess *session.Session, message string) error {
	parts := strings.Fields(message)
	if len(parts) == 0 {
		return nil
	}

	command := parts[0]

	switch command {
	case CmdLogin:
		return h.handleLogin(sess, parts)
	default:
		log.Printf("[%s] Unknown command: %s", sess.ID, command)
		return sess.WriteLine("%s Unknown command: %s", MsgError, command)
	}
}

// handleLogin processes a login command.
func (h *Handler) handleLogin(sess *session.Session, parts []string) error {
	if len(parts) < 3 {
		return sess.WriteLine("%s Invalid login format", MsgError)
	}

	username := parts[1]
	// password := parts[2] // For now, accept any password

	sess.Username = username

	// Send password confirmation
	if err := sess.WriteLine(MsgPassword); err != nil {
		return err
	}

	// Send empty client list (for now)
	if err := sess.WriteLine("%s", MsgClients); err != nil {
		return err
	}

	// Send empty table list (for now)
	if err := sess.WriteLine("%s", MsgTables); err != nil {
		return err
	}

	log.Printf("[%s] User '%s' logged in", sess.ID, username)

	return nil
}

// SendError sends an error message to the client.
func (h *Handler) SendError(sess *session.Session, format string, args ...interface{}) error {
	message := fmt.Sprintf(format, args...)
	return sess.WriteLine("%s %s", MsgError, message)
}
