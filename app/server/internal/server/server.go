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

// Package server provides the main TCP server implementation.
package server

import (
	"context"
	"log"
	"net"
	"sync"

	"github.com/mkloubert/freeskat-server/internal/config"
	"github.com/mkloubert/freeskat-server/internal/protocol"
	"github.com/mkloubert/freeskat-server/internal/session"
)

// Server represents the FreeSkat TCP server.
type Server struct {
	config         *config.Config
	listener       net.Listener
	sessionManager *session.Manager
	handler        *protocol.Handler
	wg             sync.WaitGroup
	ctx            context.Context
	cancel         context.CancelFunc
}

// New creates a new server instance.
func New(cfg *config.Config) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	sessionManager := session.NewManager()

	return &Server{
		config:         cfg,
		sessionManager: sessionManager,
		handler:        protocol.NewHandler(sessionManager),
		ctx:            ctx,
		cancel:         cancel,
	}
}

// Start starts the server and listens for connections.
func (s *Server) Start() error {
	listener, err := net.Listen("tcp", s.config.Address())
	if err != nil {
		return err
	}
	s.listener = listener

	log.Printf("FreeSkat Server listening on %s", s.config.Address())
	log.Printf("Protocol version: %d", protocol.ProtocolVersion)

	go s.acceptLoop()

	return nil
}

// acceptLoop accepts incoming connections.
func (s *Server) acceptLoop() {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			select {
			case <-s.ctx.Done():
				return
			default:
				log.Printf("Accept error: %v", err)
				continue
			}
		}

		// Check max connections
		if s.sessionManager.Count() >= s.config.MaxConnections {
			log.Printf("Max connections reached, rejecting %s", conn.RemoteAddr())
			conn.Close()
			continue
		}

		// Create session and handle in goroutine
		sess := s.sessionManager.CreateSession(conn)
		s.wg.Add(1)
		go s.handleConnection(sess)
	}
}

// handleConnection handles a single client connection.
func (s *Server) handleConnection(sess *session.Session) {
	defer s.wg.Done()
	defer s.sessionManager.RemoveSession(sess.ID)

	s.handler.HandleConnection(sess)
}

// Shutdown gracefully shuts down the server.
func (s *Server) Shutdown() {
	log.Println("Shutting down server...")

	// Signal shutdown
	s.cancel()

	// Close listener to stop accepting new connections
	if s.listener != nil {
		s.listener.Close()
	}

	// Close all sessions
	s.sessionManager.CloseAll()

	// Wait for all handlers to finish
	s.wg.Wait()

	log.Println("Server shutdown complete")
}

// Wait blocks until the server context is done.
func (s *Server) Wait() {
	<-s.ctx.Done()
}
