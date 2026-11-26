import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { applyCommandToDevice, type DeviceCommand } from '../domain/commands';
import type { SmartDevice } from '../domain/types';
import type { ConnectionState, IoTProvider, ProviderMode } from '../providers/iot-provider';

export interface InitProviderOptions {
  commandTimeoutMs?: number;
  debounceMs?: number;
}

export interface DeviceStoreState {
  devices: Record<string, SmartDevice>;
  deviceIds: string[];
  providerMode: ProviderMode;
  connectionState: ConnectionState;
  lastError: string | null;
  commandTimeoutMs: number;
  debounceMs: number;
  initProvider: (provider: IoTProvider, options?: InitProviderOptions) => Promise<void>;
  disposeProvider: () => void;
  sendCommand: (deviceId: string, command: DeviceCommand) => Promise<void>;
  resetSimulation: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_DEBOUNCE_MS = 100;

const CONTINUOUS_COMMAND_TYPES = new Set<DeviceCommand['type']>([
  'brightness',
  'colorTemp',
  'rgb',
  'volume',
]);

let activeProvider: IoTProvider | null = null;
let activeUnsubscribe: (() => void) | null = null;
let commandSequence = 0;

const pendingRollbacks = new Map<string, SmartDevice>();
const latestSeqByDevice = new Map<string, number>();
const debounceTimers = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; resolvePending: () => void }
>();
const activeTimeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearDeviceTimers(deviceId: string): void {
  const debounced = debounceTimers.get(deviceId);
  if (debounced) {
    clearTimeout(debounced.timer);
    debounceTimers.delete(deviceId);
    debounced.resolvePending();
  }
  const timeoutTimer = activeTimeoutTimers.get(deviceId);
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
    activeTimeoutTimers.delete(deviceId);
  }
}

function clearAllInternalState(): void {
  for (const deviceId of Array.from(debounceTimers.keys())) {
    clearDeviceTimers(deviceId);
  }
  for (const timer of activeTimeoutTimers.values()) {
    clearTimeout(timer);
  }
  activeTimeoutTimers.clear();
  pendingRollbacks.clear();
  latestSeqByDevice.clear();
}

export const useDeviceStore = create<DeviceStoreState>()(
  subscribeWithSelector((set, get) => {
    const dispatchToProvider = async (
      deviceId: string,
      command: DeviceCommand,
      seq: number,
    ): Promise<void> => {
      const provider = activeProvider;
      if (!provider) return;

      const timeoutMs = get().commandTimeoutMs;
      let settled = false;

      await new Promise<void>((resolve) => {
        const timeoutTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          activeTimeoutTimers.delete(deviceId);

          if (latestSeqByDevice.get(deviceId) === seq) {
            const rollback = pendingRollbacks.get(deviceId);
            pendingRollbacks.delete(deviceId);
            latestSeqByDevice.delete(deviceId);
            set((state) => ({
              devices: rollback
                ? { ...state.devices, [deviceId]: { ...rollback, pending: false } }
                : state.devices,
              lastError: 'Sem resposta',
            }));
          }
          resolve();
        }, timeoutMs);

        activeTimeoutTimers.set(deviceId, timeoutTimer);

        provider
          .sendCommand(deviceId, command)
          .then(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutTimer);
            activeTimeoutTimers.delete(deviceId);

            if (latestSeqByDevice.get(deviceId) === seq) {
              pendingRollbacks.delete(deviceId);
              latestSeqByDevice.delete(deviceId);
              set((state) => {
                const current = state.devices[deviceId];
                if (!current) return state;
                return {
                  devices: {
                    ...state.devices,
                    [deviceId]: { ...current, pending: false },
                  },
                };
              });
            }
            resolve();
          })
          .catch(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutTimer);
            activeTimeoutTimers.delete(deviceId);

            if (latestSeqByDevice.get(deviceId) === seq) {
              const rollback = pendingRollbacks.get(deviceId);
              pendingRollbacks.delete(deviceId);
              latestSeqByDevice.delete(deviceId);
              set((state) => ({
                devices: rollback
                  ? { ...state.devices, [deviceId]: { ...rollback, pending: false } }
                  : state.devices,
                lastError: 'Sem resposta',
              }));
            }
            resolve();
          });
      });
    };

    return {
      devices: {},
      deviceIds: [],
      providerMode: 'mock',
      connectionState: 'disconnected',
      lastError: null,
      commandTimeoutMs: DEFAULT_TIMEOUT_MS,
      debounceMs: DEFAULT_DEBOUNCE_MS,

      async initProvider(provider, options = {}) {
        get().disposeProvider();

        activeProvider = provider;
        set({
          providerMode: provider.mode,
          connectionState: 'connecting',
          lastError: null,
          commandTimeoutMs: options.commandTimeoutMs ?? DEFAULT_TIMEOUT_MS,
          debounceMs: options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
        });

        activeUnsubscribe = provider.subscribe((event) => {
          if (event.type === 'connection_changed') {
            set({ connectionState: event.state });
            return;
          }

          if (event.type === 'snapshot') {
            const nextMap: Record<string, SmartDevice> = {};
            const nextIds: string[] = [];
            for (const dev of event.devices) {
              nextMap[dev.id] = { ...dev, pending: false };
              nextIds.push(dev.id);
            }
            pendingRollbacks.clear();
            latestSeqByDevice.clear();
            set({ devices: nextMap, deviceIds: nextIds });
            return;
          }

          if (event.type === 'device_updated') {
            const incoming = event.device;
            if (latestSeqByDevice.has(incoming.id)) {
              // Se o comando mais recente ainda não concluiu, não sobrescreve estado otimista
              return;
            }
            set((state) => ({
              devices: {
                ...state.devices,
                [incoming.id]: { ...incoming, pending: false },
              },
            }));
          }
        });

        await provider.connect();
      },

      disposeProvider() {
        clearAllInternalState();
        if (activeUnsubscribe) {
          activeUnsubscribe();
          activeUnsubscribe = null;
        }
        if (activeProvider) {
          activeProvider.disconnect();
          activeProvider = null;
        }
        set({ connectionState: 'disconnected' });
      },

      async sendCommand(deviceId, command) {
        const currentDevice = get().devices[deviceId];
        if (!currentDevice || !activeProvider) return;

        if (!pendingRollbacks.has(deviceId)) {
          pendingRollbacks.set(deviceId, { ...currentDevice, pending: false });
        }

        const seq = ++commandSequence;
        latestSeqByDevice.set(deviceId, seq);

        const optimistic: SmartDevice = {
          ...applyCommandToDevice(currentDevice, command),
          pending: true,
        };

        set((state) => ({
          devices: {
            ...state.devices,
            [deviceId]: optimistic,
          },
          lastError: null,
        }));

        const isContinuous = CONTINUOUS_COMMAND_TYPES.has(command.type);
        const waitMs = get().debounceMs;

        if (isContinuous && waitMs > 0) {
          const prev = debounceTimers.get(deviceId);
          if (prev) {
            clearTimeout(prev.timer);
            prev.resolvePending();
          }

          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
              debounceTimers.delete(deviceId);
              void dispatchToProvider(deviceId, command, seq).then(resolve);
            }, waitMs);

            debounceTimers.set(deviceId, {
              timer,
              resolvePending: resolve,
            });
          });
          return;
        }

        const prev = debounceTimers.get(deviceId);
        if (prev) {
          clearTimeout(prev.timer);
          debounceTimers.delete(deviceId);
          prev.resolvePending();
        }
        await dispatchToProvider(deviceId, command, seq);
      },

      async resetSimulation() {
        clearAllInternalState();
        await activeProvider?.resetSimulation?.();
        set({ lastError: null });
      },

      clearError() {
        set({ lastError: null });
      },
    };
  }),
);
