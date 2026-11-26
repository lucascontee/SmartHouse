# Domínio IoT, Inventário V1 (`FINAL 02`) e Contrato de Simulação (`MockIoTProvider`)

Este documento define as regras obrigatórias para modelagem dos dispositivos, o inventário oficial dos 11 dispositivos da V1, o polimorfismo por categoria e a troca transparente entre o modo simulado e a futura integração via Home Assistant.

---

## 1. Modelo de Dispositivos e Capacidades (`floorplan.config.json`)

Todos os dispositivos compartilham a estrutura base (`BaseDevice`):
- `id`: identificador canônico `DEV__*` definido em `floorplan.config.json` (ex.: `DEV__light_sala_superior`, `DEV__ac_sala`, `DEV__tv_sala`).
- `name`: nome legível exibido no Quick Card e na gaveta "Mais informações" (usa `label` do config ou rótulo derivado do cômodo).
- `roomId`: identificador do cômodo (`varanda`, `cozinha_as`, `sala`, `circulacao`, `banheiro_suite`, `suite`, `banheiro_social`, `quarto_2`).
- `online`: booleano indicando disponibilidade de rede.
- `isOn`: estado principal (`Ligado` / `Desligado`).
- `capabilities`: lista declarada por dispositivo para habilitar exatamente os controles suportados na UI.
- `pending?`: indica comando otimista aguardando confirmação do provedor.
- `assumedState?`: suporte opcional futuro para equipamentos controlados por emissor IR sem telemetria de retorno.

Especializações suportadas pelo domínio:

| Tipo (`type`) | Campos específicos | Faixas, capacidades e extensibilidade |
| :--- | :--- | :--- |
| **`light`** | `subtype` (`'bulb' \| 'led_strip'`), `brightness`, `colorTempK?`, `colorHex?`, `colorMode` (`'cct' \| 'rgb'`) | Capacidades: `'power'`, `'brightness'` (`0..100`), `'colorTemp'` (`2700..6500K`), `'rgb'` (`#RRGGBB`). Embora a V1 inicie sem fitas de LED físicas, o tipo `subtype: 'led_strip'` e `'rgb'` permanecem 100% suportados na arquitetura. |
| **`ac`** | `targetTempC`, `currentTempC`, `mode`, `fanSpeed` | Capacidades: `'power'`, `'temp'` (`16..30` °C), `'mode'` (`'cool' \| 'fan' \| 'auto' \| 'dry'`), `'fanSpeed'` (`'low' \| 'medium' \| 'high' \| 'auto'`). |
| **`tv`** | `volume`, `muted`, `source`, `availableSources` | Capacidades: `'power'`, `'volume'` (`0..100`), `'mute'` (`boolean`), `'source'` (`HDMI 1`, `HDMI 2`, `Streaming`, etc.). |

---

## 2. Inventário Oficial da V1 (11 Dispositivos — Unidade `FINAL 02`)

O `MockIoTProvider` e a cena procedural consomem os mesmos 11 dispositivos diretamente de `src/domain/floorplan.config.json`:

| ID Canônico (`DEV__*`) | Tipo | Cômodo (`roomId`) | Rótulo sugerido na UI | Capacidades habilitadas na V1 |
| :--- | :--- | :--- | :--- | :--- |
| `DEV__light_varanda` | `light` | `varanda` | Luz Varanda | `power` |
| `DEV__light_cozinha` | `light` | `cozinha_as` | Luz Cozinha | `power`, `brightness` |
| `DEV__light_sala_superior` | `light` | `sala` | Luz Sala (Corredor) | `power`, `brightness`, `colorTemp` |
| `DEV__light_sala_inferior` | `light` | `sala` | Luz Sala (Porta) | `power`, `brightness`, `colorTemp` |
| `DEV__light_circulacao` | `light` | `circulacao` | Luz Circulação | `power` |
| `DEV__light_banheiro_suite` | `light` | `banheiro_suite` | Luz Banheiro Suíte | `power` |
| `DEV__light_suite` | `light` | `suite` | Luz Suíte | `power`, `brightness`, `colorTemp` |
| `DEV__light_banheiro_social` | `light` | `banheiro_social` | Luz Banheiro Social | `power` |
| `DEV__light_quarto_2` | `light` | `quarto_2` | Luz Quarto 2 | `power`, `brightness`, `colorTemp` |
| `DEV__ac_sala` | `ac` | `sala` | Ar-Condicionado Sala | `power`, `temp`, `mode`, `fanSpeed` |
| `DEV__tv_sala` | `tv` | `sala` | TV Sala | `power`, `volume`, `mute`, `source` |

---

## 3. Polimorfismo via `DeviceRegistry`

A interface 2D (marcadores, `QuickCard`, `DetailDrawer`) nunca deve conter `if/switch` espalhados por `type` fora de `src/registry/`. Cada tipo registra um módulo que implementa:
1. **`getIcon(device)`:** retorna o ícone Lucide (`strokeWidth={1.5}`) correspondente ao tipo/subtipo.
2. **`formatSummary(device)`:** retorna resumo curto em `Geist Mono` (`Ligado · 75%`, `22 °C · Refrigerar`, `HDMI 1 · Vol 28` ou `Desligado`).
3. **`getAccentSwatch(device)`:** retorna a cor hex apenas para `light` ligada com `rgb` ou temperatura `colorTemp`; retorna `null` nos demais casos para preservar o monocromático estrito da UI.
4. **`DetailControls`:** renderiza apenas os controles correspondentes às `capabilities` declaradas do dispositivo dentro de `DetailDrawer` ("Mais informações"). Por exemplo, luzes com apenas `["power"]` exibem apenas o controle de energia + retorno ao 3D, sem sliders inoperantes.

---

## 4. Contrato `IoTProvider` e Troca Transparente

A store comunica-se exclusivamente com a interface `IoTProvider`:
- `readonly mode: 'mock' | 'live'`
- `connect(): Promise<void>`
- `disconnect(): void`
- `subscribe(listener: (event: IoTEvent) => void): () => void`
- `sendCommand(deviceId: DeviceId, command: DeviceCommand): Promise<void>`

### Regras do `MockIoTProvider` (V1)
- Inicializa exatamente os 11 dispositivos listados em `floorplan.config.json`.
- Aplica latência simulada configurável (`VITE_MOCK_LATENCY_MS`, padrão `120ms`, ou `0ms` em testes unitários).
- Persiste o estado simulado em `localStorage` para manter continuidade entre recargas do navegador, com função de reset disponível em desenvolvimento.
- **Simulação térmica do AC:** quando `DEV__ac_sala` está ligado em `cool` ou `auto`, aproxima gradualmente `currentTempC` de `targetTempC`.
- **Evolução futura sem refatoração:** Ao migrar para o Home Assistant na Fase 6, um arquivo `providers/device-map.json` mapeará cada `DEV__*` para o respectivo `entity_id` do Home Assistant.

---

## 5. Regras de Estado em Tempo Real (Optimistic UI)

1. **Resposta imediata (< 16ms):** Ao acionar toggle ou controle discreto, `useDeviceStore` aplica o novo estado localmente de forma otimista antes da resposta do provedor.
2. **Debounce em sliders contínuos:** Arrastar brilho ou volume atualiza o estado visual 3D imediatamente a 60fps, mas envia `sendCommand` ao provedor com debounce curto (`80–120ms`).
3. **Rollback determinístico:** Se `sendCommand` falhar ou exceder timeout (`3000ms`), a store reverte o dispositivo para o snapshot anterior e sinaliza erro discreto no HUD (`Sem resposta`).
