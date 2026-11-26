import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LightDevice } from '../../src/domain/types';
import { MockIoTProvider, type IoTProvider, type MockStorage } from '../../src/providers';
import { useDeviceStore } from '../../src/store/useDeviceStore';
import { useUiStore } from '../../src/store/useUiStore';

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

describe('useDeviceStore & useUiStore', () => {
  afterEach(() => {
    useDeviceStore.getState().disposeProvider();
    useUiStore.getState().closeInteraction();
    useUiStore.getState().setActiveRoom('all');
    vi.useRealTimers();
  });

  it('aplica optimistic update imediato (<16ms) e limpa pending após ACK', async () => {
    const provider = new MockIoTProvider({
      latencyMs: 25,
      storage: createMemoryStorage(),
      thermalTickMs: 0,
    });

    await useDeviceStore.getState().initProvider(provider, { debounceMs: 90 });

    const promise = useDeviceStore.getState().sendCommand('DEV__light_varanda', {
      type: 'power',
      isOn: true,
    });

    // Estado otimista imediato visível via getState() sem aguardar rede
    const immediate = useDeviceStore.getState().devices['DEV__light_varanda'] as LightDevice;
    expect(immediate.isOn).toBe(true);
    expect(immediate.pending).toBe(true);

    await promise;
    const settled = useDeviceStore.getState().devices['DEV__light_varanda'] as LightDevice;
    expect(settled.isOn).toBe(true);
    expect(settled.pending).toBe(false);
  });

  it('agrupa comandos contínuos de slider via debounce mantendo feedback visual instantâneo', async () => {
    const base = new MockIoTProvider({
      latencyMs: 0,
      storage: createMemoryStorage(),
      thermalTickMs: 0,
    });
    const sendSpy = vi.spyOn(base, 'sendCommand');

    await useDeviceStore.getState().initProvider(base, { debounceMs: 90 });

    const p1 = useDeviceStore.getState().sendCommand('DEV__light_cozinha', { type: 'brightness', brightness: 30 });
    const p2 = useDeviceStore.getState().sendCommand('DEV__light_cozinha', { type: 'brightness', brightness: 55 });
    const p3 = useDeviceStore.getState().sendCommand('DEV__light_cozinha', { type: 'brightness', brightness: 72 });

    expect((useDeviceStore.getState().devices['DEV__light_cozinha'] as LightDevice).brightness).toBe(72);

    await Promise.all([p1, p2, p3]);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith('DEV__light_cozinha', { type: 'brightness', brightness: 72 });
  });

  it('faz rollback determinístico em falha do provedor e exibe erro', async () => {
    const provider = new MockIoTProvider({
      latencyMs: 10,
      storage: createMemoryStorage(),
      thermalTickMs: 0,
      shouldFail: true,
    });

    await useDeviceStore.getState().initProvider(provider, { debounceMs: 0 });
    expect((useDeviceStore.getState().devices['DEV__light_varanda'] as LightDevice).isOn).toBe(false);

    await useDeviceStore.getState().sendCommand('DEV__light_varanda', { type: 'power', isOn: true });

    const rolledBack = useDeviceStore.getState().devices['DEV__light_varanda'] as LightDevice;
    expect(rolledBack.isOn).toBe(false);
    expect(rolledBack.pending).toBe(false);
    expect(useDeviceStore.getState().lastError).toBe('Sem resposta');
  });

  it('faz rollback determinístico quando comando excede timeout', async () => {
    const base = new MockIoTProvider({
      latencyMs: 0,
      storage: createMemoryStorage(),
      thermalTickMs: 0,
    });
    const hangingProvider: IoTProvider = {
      mode: 'mock',
      connect: () => base.connect(),
      disconnect: () => base.disconnect(),
      subscribe: (listener) => base.subscribe(listener),
      sendCommand: () => new Promise<void>(() => {}),
    };

    await useDeviceStore.getState().initProvider(hangingProvider, {
      commandTimeoutMs: 40,
      debounceMs: 0,
    });

    await useDeviceStore.getState().sendCommand('DEV__light_varanda', { type: 'power', isOn: true });

    const rolledBack = useDeviceStore.getState().devices['DEV__light_varanda'] as LightDevice;
    expect(rolledBack.isOn).toBe(false);
    expect(rolledBack.pending).toBe(false);
    expect(useDeviceStore.getState().lastError).toBe('Sem resposta');
  });

  it('controla seleção de cômodo e níveis de interação no useUiStore', () => {
    const ui = useUiStore.getState();
    expect(ui.activeRoom).toBe('all');
    expect(ui.interactionLevel).toBe('none');

    ui.setActiveRoom('sala');
    expect(useUiStore.getState().activeRoom).toBe('sala');

    ui.openQuickCard('DEV__ac_sala');
    expect(useUiStore.getState().selectedDeviceId).toBe('DEV__ac_sala');
    expect(useUiStore.getState().interactionLevel).toBe('quick');

    ui.openDetailDrawer();
    expect(useUiStore.getState().interactionLevel).toBe('detail');

    ui.backToQuickCard();
    expect(useUiStore.getState().interactionLevel).toBe('quick');
    expect(useUiStore.getState().selectedDeviceId).toBe('DEV__ac_sala');

    ui.closeInteraction();
    expect(useUiStore.getState().interactionLevel).toBe('none');
    expect(useUiStore.getState().selectedDeviceId).toBeNull();
  });
});
