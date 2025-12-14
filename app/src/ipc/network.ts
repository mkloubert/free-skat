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

import { ipcMain, BrowserWindow } from "electron";
import * as net from "net";

/** Connection state for a TCP connection. */
interface ConnectionState {
  socket: net.Socket;
  buffer: string;
  connected: boolean;
}

/** Active connections mapped by connection ID. */
const connections = new Map<string, ConnectionState>();

/** Counter for generating unique connection IDs. */
let connectionCounter = 0;

/**
 * Generates a unique connection ID.
 */
function generateConnectionId(): string {
  connectionCounter++;
  return `conn-${connectionCounter}-${Date.now()}`;
}

/**
 * Sends an event to all renderer windows.
 */
function sendToAllWindows(channel: string, ...args: unknown[]): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, ...args);
  });
}

/**
 * Registers all network-related IPC handlers.
 */
export function registerNetworkIpc(): void {
  // Connect to a server
  ipcMain.handle(
    "network:connect",
    async (
      _event,
      host: string,
      port: number
    ): Promise<{ success: boolean; connectionId?: string; error?: string }> => {
      return new Promise((resolve) => {
        const connectionId = generateConnectionId();
        const socket = new net.Socket();

        const state: ConnectionState = {
          socket,
          buffer: "",
          connected: false,
        };

        // Connection timeout
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({ success: false, error: "Connection timeout" });
        }, 10000);

        socket.on("connect", () => {
          clearTimeout(timeout);
          state.connected = true;
          connections.set(connectionId, state);
          resolve({ success: true, connectionId });
          sendToAllWindows("network:connected", connectionId);
        });

        socket.on("data", (data: Buffer) => {
          state.buffer += data.toString("utf-8");

          // Process complete lines
          let newlineIndex: number;
          while ((newlineIndex = state.buffer.indexOf("\n")) !== -1) {
            const line = state.buffer
              .substring(0, newlineIndex)
              .replace(/\r$/, "");
            state.buffer = state.buffer.substring(newlineIndex + 1);

            if (line.length > 0) {
              sendToAllWindows("network:message", connectionId, line);
            }
          }
        });

        socket.on("close", () => {
          connections.delete(connectionId);
          sendToAllWindows("network:disconnected", connectionId);
        });

        socket.on("error", (err: Error) => {
          clearTimeout(timeout);
          if (!state.connected) {
            resolve({ success: false, error: err.message });
          } else {
            sendToAllWindows("network:error", connectionId, err.message);
          }
        });

        socket.connect(port, host);
      });
    }
  );

  // Disconnect from a server
  ipcMain.handle(
    "network:disconnect",
    async (_event, connectionId: string): Promise<boolean> => {
      const state = connections.get(connectionId);
      if (state) {
        state.socket.destroy();
        connections.delete(connectionId);
        return true;
      }
      return false;
    }
  );

  // Send a message to a server
  ipcMain.handle(
    "network:send",
    async (
      _event,
      connectionId: string,
      message: string
    ): Promise<{ success: boolean; error?: string }> => {
      const state = connections.get(connectionId);
      if (!state || !state.connected) {
        return { success: false, error: "Not connected" };
      }

      return new Promise((resolve) => {
        // Ensure message ends with newline
        const data = message.endsWith("\n") ? message : message + "\n";

        state.socket.write(data, "utf-8", (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    }
  );

  // Check if connected
  ipcMain.handle(
    "network:isConnected",
    async (_event, connectionId: string): Promise<boolean> => {
      const state = connections.get(connectionId);
      return state?.connected ?? false;
    }
  );

  // Get all active connection IDs
  ipcMain.handle("network:getConnections", async (): Promise<string[]> => {
    return Array.from(connections.keys());
  });
}

/**
 * Cleans up all connections on app quit.
 */
export function cleanupConnections(): void {
  connections.forEach((state, id) => {
    state.socket.destroy();
    connections.delete(id);
  });
}
