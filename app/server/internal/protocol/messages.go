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

// Package protocol provides ISS protocol handling.
package protocol

// ProtocolVersion is the ISS protocol version supported by this server.
const ProtocolVersion = 14

// Message types for the ISS protocol.
const (
	MsgWelcome  = "Welcome"
	MsgVersion  = "Version"
	MsgPassword = "password:"
	MsgClients  = "clients"
	MsgTables   = "tables"
	MsgTable    = "table"
	MsgError    = "error"
	MsgText     = "text"
	MsgYell     = "yell"
)

// Client command types.
const (
	CmdLogin   = "login"
	CmdCreate  = "create"
	CmdJoin    = "join"
	CmdObserve = "observe"
	CmdInvite  = "invite"
	CmdLeave   = "leave"
)
