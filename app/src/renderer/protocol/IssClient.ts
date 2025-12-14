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

import {
  parseMessage,
  PROTOCOL_VERSION,
  MSG_WELCOME,
  MSG_VERSION,
  MSG_PASSWORD,
  MSG_CLIENTS,
  MSG_TABLES,
  MSG_ERROR,
  CMD_LOGIN,
} from "../../shared/protocol";

/** Connection state. */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticated";

/** Event types emitted by IssClient. */
export interface IssClientEvents {
  /** Connection state changed. */
  stateChange: (state: ConnectionState) => void;
  /** Welcome message received. */
  welcome: (message: string) => void;
  /** Version received from server. */
  version: (version: number) => void;
  /** Successfully authenticated. */
  authenticated: (username: string) => void;
  /** Error occurred. */
  error: (error: string) => void;
  /** Raw message received (for debugging). */
  rawMessage: (message: string) => void;
  /** Client list updated. */
  clients: (clients: string[]) => void;
  /** Table list updated. */
  tables: (tables: string[]) => void;
}

/** Event listener type. */
type EventListener<T extends keyof IssClientEvents> = IssClientEvents[T];

/**
 * ISS Protocol client for communicating with the Skat server.
 */
export class IssClient {
  private connectionId: string | null = null;
  private state: ConnectionState = "disconnected";
  private serverVersion: number | null = null;
  private username: string | null = null;

  private listeners: Map<
    keyof IssClientEvents,
    Set<EventListener<keyof IssClientEvents>>
  > = new Map();

  private cleanupFunctions: (() => void)[] = [];

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Sets up the IPC event handlers.
   */
  private setupEventHandlers(): void {
    // Listen for incoming messages
    const removeMessageHandler = window.freeskat.network.onMessage(
      (connId, message) => {
        if (connId === this.connectionId) {
          this.handleMessage(message);
        }
      }
    );
    this.cleanupFunctions.push(removeMessageHandler);

    // Listen for disconnection
    const removeDisconnectHandler = window.freeskat.network.onDisconnected(
      (connId) => {
        if (connId === this.connectionId) {
          this.connectionId = null;
          this.setState("disconnected");
        }
      }
    );
    this.cleanupFunctions.push(removeDisconnectHandler);

    // Listen for errors
    const removeErrorHandler = window.freeskat.network.onError(
      (connId, error) => {
        if (connId === this.connectionId) {
          this.emit("error", error);
        }
      }
    );
    this.cleanupFunctions.push(removeErrorHandler);
  }

  /**
   * Connects to the ISS server.
   */
  async connect(host: string, port: number): Promise<void> {
    if (this.state !== "disconnected") {
      throw new Error("Already connected or connecting");
    }

    this.setState("connecting");

    const result = await window.freeskat.network.connect(host, port);

    if (!result.success || !result.connectionId) {
      this.setState("disconnected");
      throw new Error(result.error || "Connection failed");
    }

    this.connectionId = result.connectionId;
    this.setState("connected");
  }

  /**
   * Disconnects from the server.
   */
  async disconnect(): Promise<void> {
    if (this.connectionId) {
      await window.freeskat.network.disconnect(this.connectionId);
      this.connectionId = null;
    }
    this.setState("disconnected");
    this.username = null;
    this.serverVersion = null;
  }

  /**
   * Logs in to the server.
   */
  async login(username: string, password: string): Promise<void> {
    if (this.state !== "connected") {
      throw new Error("Not connected to server");
    }

    await this.send(`${CMD_LOGIN} ${username} ${password}`);
    this.username = username;
  }

  /**
   * Sends a raw message to the server.
   */
  async send(message: string): Promise<void> {
    if (!this.connectionId) {
      throw new Error("Not connected");
    }

    const result = await window.freeskat.network.send(
      this.connectionId,
      message
    );
    if (!result.success) {
      throw new Error(result.error || "Send failed");
    }
  }

  /**
   * Handles an incoming message from the server.
   */
  private handleMessage(rawMessage: string): void {
    this.emit("rawMessage", rawMessage);

    const msg = parseMessage(rawMessage);

    switch (msg.command) {
      case MSG_WELCOME:
        this.emit("welcome", msg.raw);
        break;

      case MSG_VERSION:
        if (msg.args.length > 0) {
          this.serverVersion = parseInt(msg.args[0], 10);
          this.emit("version", this.serverVersion);

          if (this.serverVersion !== PROTOCOL_VERSION) {
            console.warn(
              `Server protocol version ${this.serverVersion} differs from client version ${PROTOCOL_VERSION}`
            );
          }
        }
        break;

      case MSG_PASSWORD:
        // Password accepted, authentication successful
        if (this.username) {
          this.setState("authenticated");
          this.emit("authenticated", this.username);
        }
        break;

      case MSG_CLIENTS:
        // Parse client list
        this.emit("clients", msg.args);
        break;

      case MSG_TABLES:
        // Parse table list
        this.emit("tables", msg.args);
        break;

      case MSG_ERROR:
        this.emit("error", msg.args.join(" "));
        break;

      default:
        // Handle other messages in subclasses or via raw message event
        break;
    }
  }

  /**
   * Sets the connection state and emits an event.
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit("stateChange", state);
    }
  }

  /**
   * Gets the current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Gets the server protocol version.
   */
  getServerVersion(): number | null {
    return this.serverVersion;
  }

  /**
   * Gets the current username.
   */
  getUsername(): string | null {
    return this.username;
  }

  /**
   * Checks if connected.
   */
  isConnected(): boolean {
    return this.state === "connected" || this.state === "authenticated";
  }

  /**
   * Checks if authenticated.
   */
  isAuthenticated(): boolean {
    return this.state === "authenticated";
  }

  /**
   * Adds an event listener.
   */
  on<T extends keyof IssClientEvents>(
    event: T,
    listener: IssClientEvents[T]
  ): void {
    let eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      eventListeners = new Set();
      this.listeners.set(event, eventListeners);
    }
    eventListeners.add(listener as EventListener<keyof IssClientEvents>);
  }

  /**
   * Removes an event listener.
   */
  off<T extends keyof IssClientEvents>(
    event: T,
    listener: IssClientEvents[T]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener<keyof IssClientEvents>);
    }
  }

  /**
   * Emits an event to all listeners.
   */
  private emit<T extends keyof IssClientEvents>(
    event: T,
    ...args: Parameters<IssClientEvents[T]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        (listener as (...args: Parameters<IssClientEvents[T]>) => void)(
          ...args
        );
      });
    }
  }

  /**
   * Cleans up resources.
   */
  destroy(): void {
    this.cleanupFunctions.forEach((fn) => fn());
    this.cleanupFunctions = [];
    this.listeners.clear();
  }
}
