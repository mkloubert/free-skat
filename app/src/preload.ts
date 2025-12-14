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

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

/** Network event callback types. */
type MessageCallback = (connectionId: string, message: string) => void;
type ConnectionCallback = (connectionId: string) => void;
type ErrorCallback = (connectionId: string, error: string) => void;

/** Network API exposed to the renderer process. */
export interface NetworkApi {
  /** Connect to a server. */
  connect(
    host: string,
    port: number
  ): Promise<{ success: boolean; connectionId?: string; error?: string }>;

  /** Disconnect from a server. */
  disconnect(connectionId: string): Promise<boolean>;

  /** Send a message to a server. */
  send(
    connectionId: string,
    message: string
  ): Promise<{ success: boolean; error?: string }>;

  /** Check if connected. */
  isConnected(connectionId: string): Promise<boolean>;

  /** Get all active connection IDs. */
  getConnections(): Promise<string[]>;

  /** Register a callback for incoming messages. */
  onMessage(callback: MessageCallback): () => void;

  /** Register a callback for connection events. */
  onConnected(callback: ConnectionCallback): () => void;

  /** Register a callback for disconnection events. */
  onDisconnected(callback: ConnectionCallback): () => void;

  /** Register a callback for error events. */
  onError(callback: ErrorCallback): () => void;
}

/** FreeSkat API exposed to the renderer process. */
export interface FreeSkatApi {
  network: NetworkApi;
}

// Create event listener management
const createEventHandler = <T extends (...args: unknown[]) => void>(
  channel: string
) => {
  return (callback: T): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...(args as Parameters<T>));
    };
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  };
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("freeskat", {
  network: {
    connect: (host: string, port: number) =>
      ipcRenderer.invoke("network:connect", host, port),

    disconnect: (connectionId: string) =>
      ipcRenderer.invoke("network:disconnect", connectionId),

    send: (connectionId: string, message: string) =>
      ipcRenderer.invoke("network:send", connectionId, message),

    isConnected: (connectionId: string) =>
      ipcRenderer.invoke("network:isConnected", connectionId),

    getConnections: () => ipcRenderer.invoke("network:getConnections"),

    onMessage: createEventHandler<MessageCallback>("network:message"),

    onConnected: createEventHandler<ConnectionCallback>("network:connected"),

    onDisconnected: createEventHandler<ConnectionCallback>(
      "network:disconnected"
    ),

    onError: createEventHandler<ErrorCallback>("network:error"),
  },
} as FreeSkatApi);

// Declare the global type for TypeScript
declare global {
  interface Window {
    freeskat: FreeSkatApi;
  }
}
