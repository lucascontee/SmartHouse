import { applyCommandToDevice, type DeviceCommand } from '../domain/commands';
import { createInitialDevicesFromConfig } from '../domain/floorplan';
import type { SmartDevice } from '../domain/types';
import type { ConnectionState, IoTEvent, IoTProvider } from './iot-provider';

export type MockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface MockIoTProviderOptions {
  latencyMs?: number;
  storage?: MockStorage | null;
  storageKey?: string;
  thermalTickMs?: number;
  shouldFail?: boolean | ((deviceId: string, command: DeviceCommand) => boolean);
}

const DEFAULT_STORAGE_KEY = 'smarthouse:mock-devices:v1';
const DEFAULT_LATENCY_MS = 120;
const DEFAULT_THERMAL_TICK_MS = 4000;

function resolveDefaultLatencyMs(): number {
  const raw = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_MOCK_LATENCY_MS;
  if (!raw) return DEFAULT_LATENCY_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LATENCY_MS;
}

function resolveDefaultStorage(): MockStorage | null {
  try {
    return typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergePersistedDevices(base: SmartDevice[], rawJson: string | null): SmartDevice[] {
  if (!rawJson) return base;
  try {
    const parsed = JSON.parse(rawJson) as Record<string, Partial<SmartDevice>>;
    if (!parsed || typeof parsed !== 'object') return base;

    return base.map((device) => {
      const saved = parsed[device.id];
      if (!saved || saved.type !== device.type) return device;

      switch (device.type) {
        case 'light': {
          const savedLight = saved as Partial<typeof device>;
          return {
            ...device,
            isOn: typeof savedLight.isOn === 'boolean' ? savedLight.isOn : device.isOn,
            brightness: typeof savedLight.brightness === 'number' ? savedLight.brightness : device.brightness,
            colorTempK:
              device.capabilities.includes('colorTemp') && typeof savedLight.colorTempK === 'number'
                ? savedLight.colorTempK
                : device.colorTempK,
            colorHex:
              device.capabilities.includes('rgb') && typeof savedLight.colorHex === 'string'
                ? savedLight.colorHex
                : device.colorHex,
            colorMode: savedLight.colorMode === 'rgb' && device.capabilities.includes('rgb') ? 'rgb' : 'cct',
          };
        }
        case 'ac': {
          const savedAc = saved as Partial<typeof device>;
          return {
            ...device,
            isOn: typeof savedAc.isOn === 'boolean' ? savedAc.isOn : device.isOn,
            targetTempC: typeof savedAc.targetTempC === 'number' ? savedAc.targetTempC : device.targetTempC,
            currentTempC: typeof savedAc.currentTempC === 'number' ? savedAc.currentTempC : device.currentTempC,
            mode: savedAc.mode ?? device.mode,
            fanSpeed: savedAc.fanSpeed ?? device.fanSpeed,
          };
        }
        case 'tv': {
          const savedTv = saved as Partial<typeof device>;
          return {
            ...device,
            isOn: typeof savedTv.isOn === 'boolean' ? savedTv.isOn : device.isOn,
            volume: typeof savedTv.volume === 'number' ? savedTv.volume : device.volume,
            muted: typeof savedTv.muted === 'boolean' ? savedTv.muted : device.muted,
            source:
              typeof savedTv.source === 'string' && device.availableSources.includes(savedTv.source)
                ? savedTv.source
                : device.source,
          };
        }
      }
    });
  } catch {
    return base;
  }
}

export class MockIoTProvider implements IoTProvider {
  readonly mode = 'mock' as const;

  private readonly latencyMs: number;
  private readonly storage: MockStorage | null;
  private readonly storageKey: string;
  private readonly thermalTickMs: number;
  private readonly shouldFail: boolean | ((deviceId: string, command: DeviceCommand) => boolean);

  private devices = new Map<string, SmartDevice>();
  private listeners = new Set<(event: IoTEvent) => void>();
  private connectionState: ConnectionState = 'disconnected';
  private thermalTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MockIoTProviderOptions = {}) {
    this.latencyMs = options.latencyMs ?? resolveDefaultLatencyMs();
    this.storage = options.storage === undefined ? resolveDefaultStorage() : options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.thermalTickMs = options.thermalTickMs ?? DEFAULT_THERMAL_TICK_MS;
    this.shouldFail = options.shouldFail ?? false;
  }

  async connect(): Promise<void> {
    this.setConnectionState('connecting');
    if (this.latencyMs > 0) {
      await delay(Math.min(this.latencyMs, 80));
    }

    const baseDevices = createInitialDevicesFromConfig();
    const persistedRaw = this.safeReadStorage();
    const hydrated = mergePersistedDevices(baseDevices, persistedRaw);

    this.devices = new Map(hydrated.map((device) => [device.id, device]));
    this.persist();

    this.setConnectionState('connected');
    this.emit({ type: 'snapshot', devices: this.getSnapshot() });
    this.startThermalTimer();
  }

  disconnect(): void {
    if (this.thermalTimer !== null) {
      clearInterval(this.thermalTimer);
      this.thermalTimer = null;
    }
    this.setConnectionState('disconnected');
  }

  subscribe(listener: (event: IoTEvent) => void): () => void {
    this.listeners.add(listener);
    if (this.connectionState === 'connected' && this.devices.size > 0) {
      listener({ type: 'snapshot', devices: this.getSnapshot() });
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
    if (this.latencyMs > 0) {
      await delay(this.latencyMs);
    }

    const mustFail =
      typeof this.shouldFail === 'function' ? this.shouldFail(deviceId, command) : this.shouldFail;
    if (mustFail) {
      throw new Error(`Falha simulada ao executar comando em ${deviceId}`);
    }

    const current = this.devices.get(deviceId);
    if (!current) {
      throw new Error(`Dispositivo não encontrado: ${deviceId}`);
    }

    const updated: SmartDevice = {
      ...applyCommandToDevice(current, command),
      pending: false,
    };

    this.devices.set(deviceId, updated);
    this.persist();
    this.emit({ type: 'device_updated', device: updated });
  }

  async resetSimulation(): Promise<void> {
    try {
      this.storage?.removeItem(this.storageKey);
    } catch {
      // Ignora erro de storage bloqueado
    }
    const fresh = createInitialDevicesFromConfig();
    this.devices = new Map(fresh.map((device) => [device.id, device]));
    this.persist();
    this.emit({ type: 'snapshot', devices: this.getSnapshot() });
  }

  /**
   * Avança 1 ciclo de aproximação térmica (0,5 °C) quando o AC está ligado em Refrigerar ou Auto.
   */
  stepThermalSimulation(): void {
    for (const [id, device] of this.devices.entries()) {
      if (device.type !== 'ac' || !device.isOn) continue;
      if (device.mode !== 'cool' && device.mode !== 'auto') continue;

      const diff = device.targetTempC - device.currentTempC;
      if (Math.abs(diff) < 0.01) continue;

      const nextTemp =
        Math.abs(diff) <= 0.5
          ? device.targetTempC
          : Number((device.currentTempC + Math.sign(diff) * 0.5).toFixed(1));

      const updated: SmartDevice = { ...device, currentTempC: nextTemp };
      this.devices.set(id, updated);
      this.persist();
      this.emit({ type: 'device_updated', device: updated });
    }
  }

  getSnapshot(): SmartDevice[] {
    return Array.from(this.devices.values());
  }

  private startThermalTimer(): void {
    if (this.thermalTimer !== null || this.thermalTickMs <= 0) return;
    this.thermalTimer = setInterval(() => {
      this.stepThermalSimulation();
    }, this.thermalTickMs);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.emit({ type: 'connection_changed', state });
  }

  private emit(event: IoTEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private safeReadStorage(): string | null {
    try {
      return this.storage?.getItem(this.storageKey) ?? null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      const record: Record<string, SmartDevice> = {};
      for (const [id, device] of this.devices.entries()) {
        record[id] = device;
      }
      this.storage.setItem(this.storageKey, JSON.stringify(record));
    } catch {
      // Ignora erro de quota ou storage indisponível
    }
  }
}
