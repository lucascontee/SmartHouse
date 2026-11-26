# SmartHouse 3D — Especificação e Blueprint Arquitetural

## 1. Objetivo e Público-Alvo

- **Objetivo:** Aplicação web interativa em tela cheia (PWA, `kind: software`) para monitoramento e controle visual de um apartamento inteligente em rede local, tendo um modelo 3D espacialmente fiel à unidade real (**FINAL 02**) como interface principal. Não é uma landing page nem um dashboard convencional.
- **Público-alvo:** Uso pessoal/residencial do proprietário e moradores do apartamento em navegadores desktop e mobile (incluindo instalação como PWA na tela inicial).

---

## 2. Escopo da V1 e Fronteiras

### 2.1. Dentro do Escopo (V1 — Unidade FINAL 02 Simulada)
- **Execução local:** Roda localmente no computador do usuário durante a reforma em modo 100% simulado (`MockIoTProvider`), sem comunicação com hardware físico.
- **Planta 3D procedural fiel (`FINAL 02`):** Geração paramétrica da planta real a partir de `floorplan.config.json` (`1 unidade = 1 metro`, pé-direito `2,60 m`, footprint `7,26 m` × `5,30 m`/`6,13 m`), contemplando os **8 cômodos** (`varanda`, `cozinha_as`, `sala`, `circulacao`, `banheiro_suite`, `suite` em formato `L`, `banheiro_social`, `quarto_2`), 10 aberturas e a extensão estrutural da reforma entre cozinha e sala (`0,75 m` de comprimento × `1,45 m` de altura).
- **Abstração plug-and-play de cena (`SceneSource: 'procedural' | 'glb'`):** A cena procedural da Fase 2 gera exatamente o mesmo contrato de nós `DEV__*` previsto para um futuro `.glb`, permitindo migração sem refatorar raycasting, marcadores, iluminação ou UI.
- **Contexto WebGL único:** Toda a cena 3D (arquitetura, iluminação reativa, fios de ar do ar-condicionado e tela da TV) roda em **1 único `<Canvas>` WebGL**, sem canvases paralelos nem shaders decorativos extras.
- **11 dispositivos reais da V1 em 3 categorias:**
  1. **Iluminação (`light` — 9 pontos):** 1 ponto em cada cômodo (incluindo `circulacao`) e **2 pontos na sala** (`DEV__light_sala_superior` próximo ao corredor e `DEV__light_sala_inferior` próximo à porta de entrada). Arquitetura já preparada para `subtype: 'led_strip'` com controle `rgb` em adições futuras.
  2. **Ar-condicionado (`ac` — 1 ponto):** `DEV__ac_sala` na parede entre sala e banheiro da suíte (`y = 2,30 m`, voltado para `-X`), com controle de energia, temperatura alvo, modo e velocidade do vento.
  3. **Televisão (`tv` — 1 ponto):** `DEV__tv_sala` na mesma parede logo abaixo da evaporadora (`y = 1,20 m`, voltada para `-X`), com controle de energia, volume, mudo e fonte/entrada.
- **Interação em dois níveis sobre o 3D:**
  - Marcadores minimalistas ancorados diretamente nos dispositivos no espaço 3D refletindo `Ligado` / `Desligado`.
  - **Quick Card:** Popover compacto sob demanda com nome, status, toggle seco de liga/desliga e botão **"Mais informações"**.
  - **Visão "Mais informações" (`DetailDrawer`):** Gaveta/painel polimórfico específico por tipo de aparelho com controles granulares em HTML vivo e retorno imediato ao 3D.
- **Reatividade 3D:** Transição suave e contraste real nas 9 luzes; animação contínua e leve de "fios de ar" saindo do AC em direção `-X`; feedback visual na superfície da tela da TV.
- **UI monocromática responsiva:** Identidade visual ultra minimalista monocromática (`#070708` / `#111113` / `#FAFAFA`), responsiva de `1440px` até `390px` e `320px`.

### 2.2. Fora do Escopo (V1)
- Integração ativa com dispositivos físicos reais ou seleção de marcas/protocolos específicos (adiada para pós-reforma).
- Login/autenticação na rede local (uso estritamente doméstico na LAN).
- Acesso remoto pela internet (ver regra obrigatória de segurança em `docs/requirements/security-and-local-network.md`).
- Novos tipos de aparelhos além de `light`, `ac` e `tv`, bem como instalação física de `led_strip` na V1 (suportados apenas pela extensibilidade do domínio/registro).
- Pós-processamento WebGL pesado (ex.: bloom multi-pass).

---

## 3. Stack Tecnológica e Arquitetura

### 3.1. Stack Definida
| Camada | Tecnologia | Papel |
| :--- | :--- | :--- |
| **Aplicação Web** | React 19 + TypeScript (`strict`) + Vite | SPA/PWA estático com build enxuto e tipagem estrita. |
| **Engine 3D** | Three.js + `@react-three/fiber` + `@react-three/drei` | Único `<Canvas>` WebGL; renderização integral na GPU do cliente. |
| **Estado em Tempo Real** | Zustand (`subscribeWithSelector`) | UI reativa + leitura imperativa `getState()` dentro do `useFrame` a custo zero de re-render. |
| **Ícones** | Lucide (`lucide-react`) | Traço único `1.5px` sem preenchimento no HUD e marcadores 3D. |
| **Estilização** | `system.css` + tokens `:root` + CSS Modules + `motion.css` | Paleta monocromática fixa, `data-radius="sharp"`, `Geist` / `Geist Mono` (`tabular-nums`), baseada em `C:\IA\Skills\taste-skill` (`skills/taste-skill/`). |
| **PWA** | `vite-plugin-pwa` (Workbox) | Shell offline, manifest `standalone`, cache versionado de assets 3D/JS. |
| **Testes e QA** | Vitest + `shoot.mjs` + `perf.mjs` | Testes de domínio/provider e auditoria visual/performance (`1440/1024/768/390px`). |

### 3.2. Topologia Local (V1) e Evolução para Servidor (Pós-V1)
- **V1 (PC Local):** Navegador cliente ↔ `Vite/Preview` local ↔ `MockIoTProvider` alimentado por `floorplan.config.json` (estado persistido em `localStorage` com simulação de latência).
- **Migração para Servidor (Raspberry Pi 4 ou Orange Pi 5, ARM64):**
  - O servidor **nunca** processa gráficos 3D; atua apenas como host estático, proxy reverso e ponte IoT.
  - **Docker Compose:** **Caddy** (arquivos PWA, Brotli, proxy reverso e HTTPS local via `tls internal` — **Opção A**) + **Home Assistant** (ponte local multi-fabricante via WebSocket) + eventual micro-proxy `iot-bridge` para manter o token do HA fora do cliente.

### 3.3. Organização Interna em `src/` e `tests/`
Seguindo `project-structure-standard`, todo código-fonte reside em `src/` e os testes espelhados em `tests/`:

```text
src/
├── styles/       # system.css (tokens :root), motion.css (120–180ms), hud.css
├── domain/       # floorplan.config.json (fonte única), tipos discriminados (SmartDevice, DeviceCommand)
├── providers/    # Interface IoTProvider, MockIoTProvider, futuro HaWsProvider + device-map.json
├── store/        # useDeviceStore (optimistic updates + rollback) e useUiStore
├── registry/     # Polimorfismo por type (light, ac, tv -> ícone, resumo, DetailControls)
├── scene/        # ApartmentCanvas (<Canvas> único), SceneLoader (procedural | glb), LightingRig, AirflowEffect, TvScreenEffect, MarkerProjector
└── ui/           # TopBar, DeviceMarkersOverlay, QuickCard, DetailDrawer e controles HTML vivos
```

---

## 4. Entidades Principais e Modelo de Dados

- **`FloorplanConfig` (`floorplan.config.json`):** Fonte única da verdade contendo `meta`, `rooms` (retangulares ou `shape: "L"` com `segments`), `customPartitions`, `openings` e os `devices` com IDs canônicos `DEV__*`, coordenadas `[x, y, z]`, `facing` e `capabilities`.
- **`SmartDevice` (União Discriminada):** Compartilha `{ id, name, roomId, online, isOn, capabilities, pending?, assumedState? }` e especializa-se por `type`:
  - `LightDevice` (`type: 'light'`, `subtype: 'bulb' | 'led_strip'`, `brightness`, `colorTempK?`, `colorHex?`, `colorMode`).
  - `ClimateDevice` (`type: 'ac'`, `targetTempC`, `currentTempC`, `mode`, `fanSpeed`).
  - `TvDevice` (`type: 'tv'`, `volume`, `muted`, `source`, `availableSources`).
- **`SceneSource`:** `'procedural' | 'glb'` — contrato único de carregamento da cena que entrega as mesmas referências `ROOM__*`, `CAM__*` e `DEV__*` ao sistema de interação e animação.
- **`IoTProvider` e `DeviceRegistry`:** Contratos desacoplados que garantem troca transparente `MockIoTProvider` ↔ `HaWsProvider` e extensibilidade polimórfica na UI.

---

## 5. Diretrizes de UI/UX e Requisitos Não-Funcionais

Os contratos detalhados residem em `docs/requirements/`:
- **Design System e QA (`docs/requirements/ui-design-system-and-qa.md`):** Paleta fixa (`#070708`, `#111113`, `#FAFAFA`, `#71717A`, `#E4E4E7`, bordas `1px`), `data-radius="sharp"`, apenas botões `solid` e `tonal`, máximo 2 níveis de caixas aninhadas, cor restrita ao 3D e micro-swatches, viewport fixa `100dvh` com canvas `≥ 80%`, alvos de toque `≥ 44px`, zero emojis/sparkles/gradientes neon, e uso adaptado da skill local `C:\IA\Skills\taste-skill` (`skills/taste-skill/`: `assets/system.css`, `assets/motion/`, `scripts/shoot.mjs` + `scripts/perf.mjs`, sem `gate.mjs --start` ou `.taste-skill/build.json`).
- **Cena 3D e Performance (`docs/requirements/scene-3d-procedural-and-animations.md`):** `floorplan.config.json` integral (`FINAL 02`), contrato `SceneSource: 'procedural' | 'glb'`, convenção `DEV__*` / `*__ANCHOR` / `*__EMISSIVE` / `*__LIGHT_ORIGIN` / `*__AIR_ORIGIN`, luzes sem sombra pré-montadas (`intensity = 0` quando desligadas), fios de ar `-X` em `ShaderMaterial` único (`1 draw call`) e projeção 3D→2D via mutação direta de `transform`.
- **Domínio IoT e Simulação (`docs/requirements/iot-devices-and-mock-contract.md`):** Inventário completo dos 11 dispositivos da V1, suporte a `capabilities` granulares, optimistic UI em `< 16ms`, rollback automático e persistência local no mock.
- **Rede Local e Segurança (`docs/requirements/security-and-local-network.md`):** Sem login na LAN local; HTTPS via `tls internal` (Opção A) no servidor; **regra mandatória** de camada de segurança robusta antes de qualquer acesso remoto futuro.

---

## 6. Roadmap de Alto Nível (V1 100% Desbloqueada → Migração)

1. **Fase 0 — Fundação & Design System:** Setup Vite + React + TS, `system.css`, `motion.css`, `lucide-react` e PWA manifest inicial.
2. **Fase 1 — Domínio, `floorplan.config.json` & `MockIoTProvider`:** Contratos tipados para `light` (incluindo `led_strip`), `ac` e `tv`, carga dos 11 dispositivos de `FINAL 02`, `useDeviceStore` (optimistic update/rollback), `DeviceRegistry` e testes unitários em Vitest.
3. **Fase 2 — Planta 3D Procedural (`FINAL 02`) & Auto-Binding:** `<Canvas>` único com `SceneSource: 'procedural' | 'glb'`, geração geométrica fiel de cômodos, `customPartitions` (parede de `0,75 m × 1,45 m`), aberturas, câmeras por cômodo e `MarkerProjector`.
4. **Fase 3 — HUD, Quick Card & Visão "Mais informações":** Seletor dos 8 cômodos, 11 marcadores ancorados, `QuickCard`, `DetailDrawer` adaptado por `capabilities` + Checkpoint QA 1 (`shoot.mjs` em `1440/1024/768/390px`).
5. **Fase 4 — Reatividade e Animações 3D:** `LightingRig` (9 luzes + suporte `led_strip`), `AirflowEffect` ("fios de ar" `-X` sem colidir com a TV abaixo), `TvScreenEffect`, `prefers-reduced-motion` + Checkpoint QA 2 (`perf.mjs` + `shoot.mjs`).
6. **Fase 5 — Evolução Opcional de Acabamentos / `.glb` (Pós-Obra):** Refinamento visual com fotos reais finais ou substituição via `SceneSource = 'glb'` preservando todo o contrato `DEV__*` + Checkpoint QA 3 (`shoot.mjs` + `perf.mjs`).
7. **Fase 6 — Integração Home Assistant & Deploy ARM64 (Pós-Reforma):** Conector `HaWsProvider`, `device-map.json`, Docker Compose no Raspberry Pi 4 / Orange Pi 5 com Caddy (Opção A `tls internal`) e Home Assistant.
