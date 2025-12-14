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

// Package config provides server configuration management.
package config

import (
	"flag"
	"fmt"
)

// Config holds the server configuration.
type Config struct {
	// Host is the address to bind the server to.
	Host string

	// Port is the TCP port to listen on.
	Port int

	// MaxConnections is the maximum number of concurrent connections.
	MaxConnections int
}

// DefaultConfig returns a Config with default values.
func DefaultConfig() *Config {
	return &Config{
		Host:           "0.0.0.0",
		Port:           7000,
		MaxConnections: 100,
	}
}

// ParseFlags parses command-line flags and returns a Config.
func ParseFlags() *Config {
	cfg := DefaultConfig()

	flag.StringVar(&cfg.Host, "host", cfg.Host, "Host address to bind to")
	flag.IntVar(&cfg.Port, "port", cfg.Port, "TCP port to listen on")
	flag.IntVar(&cfg.MaxConnections, "max-connections", cfg.MaxConnections, "Maximum concurrent connections")

	flag.Parse()

	return cfg
}

// Address returns the full address string (host:port).
func (c *Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
