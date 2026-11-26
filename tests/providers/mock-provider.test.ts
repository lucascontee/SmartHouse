import { describe, expect, it } from 'vitest';
import type { ClimateDevice, LightDevice } from '../../src/domain/types';
import { MockIoTProvider, resolveProviderKind, type MockStorage } from '../../src/providers';

function createMemoryStorage(): MockStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe('MockIoTProvider e Factory', () => {
  it('conecta e carrega exatamente os 11 dispositivos da unidade FINAL 02', async () => {
    const provider = new MockIoTProvider({
      latencyMs: 0,
      storage: createMemoryStorage(),
      thermalTickMs: 0,
    });

    const events: string[] = [];
    const unsubscribe = provider.subscribe((event) => {
      events.push(event.type);
    });

    await provider.connect();
    const snapshot = provider.getSnapshot();

    expect(snapshot).toHaveLength(11);
    expect(events).toContain('snapshot');
    expect(events).toContain('connection_changed');

    unsubscribe();
    provider.disconnect();
  });

  it('aplica latência configurada, persiste estado em storage e suporta resetSimulation', async () => {
    const storage = createMemoryStorage();

    const first = new MockIoTProvider({
      latencyMs: 25,
      storage,
      thermalTickMs: 0,
    });
    await first.connect();

    const startedAt = Date.now();
    await first.sendCommand('DEV__light_sala_superior', { type: 'power', isOn: true });
    await first.sendCommand('DEV__light_sala_superior', { type: 'brightness', brightness: 45 });
    const elapsed = Date.now() - startedAt;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    first.disconnect();

    // Segunda instância hidrata estado persistido do mesmo storage
    const second = new MockIoTProvider({
      latencyMs: 0,
      storage,
      thermalTickMs: 0,
    });
    await second.connect();
    const restored = second
      .getSnapshot()
      .find((d) => d.id === 'DEV__light_sala_superior') as LightDevice;

    expect(restored.isOn).toBe(true);
    expect(restored.brightness).toBe(45);

    await second.resetSimulation();
    const afterReset = second
      .getSnapshot()
      .find((d) => d.id === 'DEV__light_sala_superior') as LightDevice;
    expect(afterReset.isOn).toBe(false);
    expect(afterReset.brightness).toBe(80);
    second.disconnect();
  });

  it('simula aproximação térmica gradual do AC quando ligado em Refrigerar ou Auto', async () => {
    const provider = new MockIoTProvider({
      latencyMs: 0,
      storage: createMemoryStorage(),
      thermalTickMs: 0,
    });
    await provider.connect();

    await provider.sendCommand('DEV__ac_sala', { type: 'power', isOn: true });
    await provider.sendCommand('DEV__ac_sala', { type: 'targetTemp', targetTempC: 20 });

    const before = provider.getSnapshot().find((d) => d.id === 'DEV__ac_sala') as ClimateDevice;
    expect(before.currentTempC).toBe(25);

    provider.stepThermalSimulation();
    const afterStep = provider.getSnapshot().find((d) => d.id === 'DEV__ac_sala') as ClimateDevice;
    expect(afterStep.currentTempC).toBe(24.5);

    provider.disconnect();
  });

  it('seleciona provedor via VITE_IOT_PROVIDER com override por ?mode=mock', () => {
    expect(resolveProviderKind(undefined, '')).toBe('mock');
    expect(resolveProviderKind('ha-ws', '')).toBe('ha-ws');
    expect(resolveProviderKind('bff', '')).toBe('bff');
    expect(resolveProviderKind('ha-ws', '?mode=mock')).toBe('mock');
  });
});
