import type { DeviceCommand } from '../domain/commands';
import type { SmartDevice } from '../domain/types';

export type ProviderMode = 'mock' | 'live';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type IoTEvent =
  | { type: 'snapshot'; devices: SmartDevice[] }
  | { type: 'device_updated'; device: SmartDevice }
  | { type: 'connection_changed'; state: ConnectionState };

export interface IoTProvider {
  readonly mode: ProviderMode;
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: (event: IoTEvent) => void): () => void;
  sendCommand(deviceId: string, command: DeviceCommand): Promise<void>;
  resetSimulation?(): Promise<void>;
}
