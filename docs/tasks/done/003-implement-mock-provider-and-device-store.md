# Tarefa 003: Contrato `IoTProvider`, `MockIoTProvider` e Stores em Tempo Real

## Objetivo
Implementar a camada desacoplada de provedor IoT com `MockIoTProvider` alimentado por `floorplan.config.json`, além das stores Zustand com *optimistic updates* e *rollback*.

## Referências
- `docs/specs.md` (Seções 3.1, 3.2 e 4)
- `docs/requirements/iot-devices-and-mock-contract.md` (Seções 2, 4 e 5)
- `docs/documentation.md` (Seção 2)

## Critérios de Aceite
- [x] `src/providers/iot-provider.ts` define a interface única (`mode`, `connect`, `disconnect`, `subscribe`, `sendCommand`) e factory em `src/providers/index.ts` selecionando via `VITE_IOT_PROVIDER` (padrão `mock`, com override opcional `?mode=mock`).
- [x] `src/providers/mock-provider.ts` carrega os 11 dispositivos de `floorplan.config.json`, aplica latência de `VITE_MOCK_LATENCY_MS`, persiste estado em `localStorage`, permite reset em dev e simula aproximação térmica gradual do `DEV__ac_sala`.
- [x] `src/store/useDeviceStore.ts` executa *optimistic update* imediato (`< 16ms`), debounce curto (`80–120ms`) para comandos contínuos e rollback determinístico em falha/timeout (`3000ms`), mantendo suporte a `getState()` sem re-render React.
- [x] `src/store/useUiStore.ts` gerencia cômodo selecionado, dispositivo focado e nível da interação (`none | quick | detail`).
- [x] Testes unitários em `tests/providers/` e `tests/store/` cobrem fluxo feliz, latência e rollback em erro via `npm test`.
