import type { IoTProvider } from './iot-provider';
import { MockIoTProvider, type MockIoTProviderOptions } from './mock-provider';

export type ProviderKind = 'mock' | 'ha-ws' | 'bff';

export function resolveProviderKind(envValue?: string, search?: string): ProviderKind {
  const query =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';

  if (query) {
    const modeParam = new URLSearchParams(query).get('mode');
    if (modeParam === 'mock') return 'mock';
  }

  const rawEnv =
    envValue ??
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_IOT_PROVIDER;

  if (rawEnv === 'ha-ws' || rawEnv === 'bff') {
    return rawEnv;
  }
  return 'mock';
}

export function createIoTProvider(options?: MockIoTProviderOptions): IoTProvider {
  const kind = resolveProviderKind();
  if (kind === 'mock') {
    return new MockIoTProvider(options);
  }

  throw new Error(
    `Provedor "${kind}" reservado para a Fase 6 (integração Home Assistant). Utilize VITE_IOT_PROVIDER=mock ou ?mode=mock na V1.`,
  );
}

export { MockIoTProvider, type MockIoTProviderOptions, type MockStorage } from './mock-provider';
export type { ConnectionState, IoTEvent, IoTProvider, ProviderMode } from './iot-provider';
