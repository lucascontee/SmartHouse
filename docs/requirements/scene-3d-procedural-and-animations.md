# Cena 3D Procedural (`FINAL 02`), Abstração `SceneSource` e Animações WebGL

Este documento estabelece as regras técnicas da cena 3D procedural baseada em `floorplan.config.json`, a abstração plug-and-play para futura migração para `.glb`, o orçamento de renderização e a estratégia das animações reativas.

---

## 1. Contexto WebGL Único e Abstração `SceneSource`

- **Contexto único obrigatório:** A aplicação deve manter **exatamente 1 contexto WebGL ativo** (`<Canvas>` único em tela cheia ocupando `100dvh`). É proibido criar canvases 3D paralelos ou shaders decorativos em elementos 2D.
- **Processamento 100% no cliente:** Toda a cena, iluminação reativa e shaders executam na GPU do navegador cliente.
- **Pausa de economia energética:** Quando `document.hidden === true`, o loop de animação pausa ou reduz taxa de atualização.
- **Abstração Plug-and-Play (`SceneSource: 'procedural' | 'glb'`):**
  - Um carregador unificado (`SceneLoader`) recebe `source: 'procedural' | 'glb'`.
  - No modo `'procedural'` (V1 / Fase 2), constrói a geometria da unidade `FINAL 02` a partir de `floorplan.config.json` e injeta no Scene Graph **exatamente os mesmos grupos, nomes e âncoras** esperados de um arquivo `.glb` exportado do Blender.
  - No modo `'glb'` (futuro opcional), carrega o `.glb` e executa o mesmo parser de auto-binding (`parseApartmentScene`), mantendo intactos raycasting, marcadores 2D, `LightingRig`, `AirflowEffect` e `TvScreenEffect`.

---

## 2. Convenção de Scene Graph (Contrato Único `DEV__*`)

- **Escala métrica real:** `1 unidade = 1 metro`, plano XZ representando a planta (X = largura `0..7.26`, Z = profundidade `0..6.13`), origem alinhada à planta e eixo **+Y para cima** (pé-direito `2.60 m`).
- **Visibilidade interna:** Paredes externas e divisórias seguem as espessuras e alturas de `floorplan.config.json` sem teto opaco na visão geral/orbital, permitindo interação desobstruída em todos os 8 cômodos.

| Padrão de Nome (`object.name`) | Papel no Scene Graph | Exemplo na Unidade `FINAL 02` |
| :--- | :--- | :--- |
| `ROOM__<roomId>` | Grupo lógico do cômodo | `ROOM__sala`, `ROOM__suite` |
| `CAM__<roomId>` e `CAM_TARGET__<roomId>` | Posição e alvo de câmera preset (`all` para visão geral) | `CAM__sala`, `CAM_TARGET__sala` |
| `DEV__<slug>` (ID do config) | Grupo/malha clicável (raycast) mapeada para o dispositivo | `DEV__light_sala_superior`, `DEV__ac_sala`, `DEV__tv_sala` |
| `<deviceId>__ANCHOR` | `Object3D` auxiliar onde o marcador 2D é projetado | `DEV__ac_sala__ANCHOR` |
| `<deviceId>__EMISSIVE` | Malha com material reativo (bulbo, futura `led_strip`, tela da TV) | `DEV__tv_sala__EMISSIVE` |
| `<deviceId>__LIGHT_ORIGIN` | Posição exata da `PointLight` dinâmica associada | `DEV__light_cozinha__LIGHT_ORIGIN` |
| `<deviceId>__AIR_ORIGIN` | Ponto na aleta da evaporadora com orientação alinhada a `facing` (`-X`) | `DEV__ac_sala__AIR_ORIGIN` |

---

## 3. Fonte Única de Verdade (`floorplan.config.json` — Unidade FINAL 02)

Na implementação, o JSON abaixo deve ser materializado integralmente em `src/domain/floorplan.config.json` e consumido pela cena procedural e pelo `MockIoTProvider`:

- **Destaques estruturais obrigatórios:**
  - `suite` possui `shape: "L"` e deve ser construída unindo os dois retângulos de `segments` sem parede divisória interna entre eles.
  - `customPartitions`:
    - `parede_cozinha_sala_base`: `[1.3, 1.05]` → `[1.3, 2.45]`, espessura `0.10 m`, altura `2.60 m`.
    - `parede_cozinha_sala_extensao`: `[1.3, 2.45]` → `[1.3, 3.20]`, comprimento **`0.75 m`**, espessura `0.10 m`, altura **`1.45 m`** (meia-parede/balcão da reforma).
  - `openings`: 6 portas (`door` / `sliding_door`) e 4 janelas (`window`) gerando vãos reais nas paredes correspondentes.
  - **Eixo da Sala (`AC` + `TV`):** `DEV__ac_sala` (`y = 2.30 m`) e `DEV__tv_sala` (`y = 1.20 m`) estão na mesma coordenada `[3.32, y, 2.05]` na parede que faz divisa com `banheiro_suite`, ambos com `facing: "-X"`. O fluxo de ar do AC sai na direção `-X` com leve inclinação descendente para o centro da sala, sem atravessar a TV posicionada logo abaixo.

```json
{
  "meta": {
    "unit": "FINAL 02",
    "units": "meters",
    "ceilingHeight": 2.6,
    "wallThickness": {
      "exterior": 0.15,
      "interiorStructural": 0.15,
      "interiorPartition": 0.1,
      "bathroomDivider": 0.16
    },
    "footprint": {
      "internalWidthX": 7.26,
      "leftDepthZ": 5.3,
      "rightDepthZ": 6.13
    }
  },
  "rooms": [
    {
      "id": "varanda",
      "label": "Varanda",
      "bounds": { "x": 0.0, "z": 0.0, "w": 3.35, "d": 0.9 }
    },
    {
      "id": "cozinha_as",
      "label": "Cozinha / A.S.",
      "bounds": { "x": 0.0, "z": 1.05, "w": 1.25, "d": 4.25 }
    },
    {
      "id": "sala",
      "label": "Sala",
      "bounds": { "x": 1.35, "z": 1.05, "w": 2.0, "d": 4.25 }
    },
    {
      "id": "circulacao",
      "label": "Circulação",
      "bounds": { "x": 3.5, "z": 3.13, "w": 1.2, "d": 0.9 }
    },
    {
      "id": "banheiro_suite",
      "label": "Banheiro Suíte",
      "bounds": { "x": 3.5, "z": 0.0, "w": 1.2, "d": 2.03 }
    },
    {
      "id": "suite",
      "label": "Suíte",
      "shape": "L",
      "segments": [
        { "x": 4.86, "z": 0.0, "w": 2.4, "d": 2.98 },
        { "x": 3.5, "z": 2.13, "w": 1.36, "d": 0.85 }
      ]
    },
    {
      "id": "banheiro_social",
      "label": "Banheiro Social",
      "bounds": { "x": 3.5, "z": 4.13, "w": 1.2, "d": 2.0 }
    },
    {
      "id": "quarto_2",
      "label": "Quarto 2",
      "bounds": { "x": 4.86, "z": 3.13, "w": 2.4, "d": 3.0 }
    }
  ],
  "customPartitions": [
    {
      "id": "parede_cozinha_sala_base",
      "start": [1.3, 1.05],
      "end": [1.3, 2.45],
      "thickness": 0.1,
      "height": 2.6,
      "notes": "Parede divisória original entre cozinha e sala"
    },
    {
      "id": "parede_cozinha_sala_extensao",
      "start": [1.3, 2.45],
      "end": [1.3, 3.2],
      "thickness": 0.1,
      "height": 1.45,
      "notes": "Extensão de 75cm x 1,45m de altura"
    }
  ],
  "openings": [
    { "type": "door", "id": "entrada_apt", "wall": "sala_sul", "x": 1.05, "z": 5.3, "width": 0.8 },
    { "type": "sliding_door", "id": "acesso_varanda", "wall": "sala_norte", "x": 1.65, "z": 0.97, "width": 1.5 },
    { "type": "door", "id": "porta_suite", "wall": "circ_norte", "x": 4.05, "z": 3.05, "width": 0.75 },
    { "type": "door", "id": "porta_banheiro_suite", "wall": "banheiro_suite_sul", "x": 4.1, "z": 2.08, "width": 0.65 },
    { "type": "door", "id": "porta_quarto_2", "wall": "circ_leste", "x": 4.78, "z": 3.58, "width": 0.75 },
    { "type": "door", "id": "porta_banheiro_social", "wall": "circ_sul", "x": 4.1, "z": 4.08, "width": 0.65 },
    { "type": "window", "id": "janela_varanda", "wall": "varanda_norte", "x": 0.1, "z": 0.0, "width": 3.15 },
    { "type": "window", "id": "janela_banheiro_suite", "wall": "banheiro_suite_norte", "x": 3.8, "z": 0.0, "width": 0.7 },
    { "type": "window", "id": "janela_suite", "wall": "suite_norte", "x": 5.5, "z": 0.0, "width": 1.4 },
    { "type": "window", "id": "janela_quarto_2", "wall": "quarto_2_leste", "x": 7.26, "z": 4.2, "width": 1.2 }
  ],
  "devices": [
    { "id": "DEV__light_varanda", "type": "light", "room": "varanda", "position": [1.68, 2.55, 0.45], "capabilities": ["power"] },
    { "id": "DEV__light_cozinha", "type": "light", "room": "cozinha_as", "position": [0.63, 2.55, 3.18], "capabilities": ["power", "brightness"] },
    { "id": "DEV__light_sala_superior", "type": "light", "room": "sala", "label": "Luz Sala (Corredor)", "position": [2.75, 2.55, 2.45], "capabilities": ["power", "brightness", "colorTemp"] },
    { "id": "DEV__light_sala_inferior", "type": "light", "room": "sala", "label": "Luz Sala (Porta)", "position": [1.95, 2.55, 4.75], "capabilities": ["power", "brightness", "colorTemp"] },
    { "id": "DEV__light_circulacao", "type": "light", "room": "circulacao", "position": [4.1, 2.55, 3.58], "capabilities": ["power"] },
    { "id": "DEV__light_banheiro_suite", "type": "light", "room": "banheiro_suite", "position": [4.1, 2.55, 1.02], "capabilities": ["power"] },
    { "id": "DEV__light_suite", "type": "light", "room": "suite", "position": [6.06, 2.55, 1.49], "capabilities": ["power", "brightness", "colorTemp"] },
    { "id": "DEV__light_banheiro_social", "room": "banheiro_social", "type": "light", "position": [4.1, 2.55, 5.13], "capabilities": ["power"] },
    { "id": "DEV__light_quarto_2", "type": "light", "room": "quarto_2", "position": [6.06, 2.55, 4.63], "capabilities": ["power", "brightness", "colorTemp"] },
    { "id": "DEV__ac_sala", "type": "ac", "room": "sala", "position": [3.32, 2.3, 2.05], "facing": "-X", "capabilities": ["power", "temp", "mode", "fanSpeed"] },
    { "id": "DEV__tv_sala", "type": "tv", "room": "sala", "position": [3.32, 1.2, 2.05], "facing": "-X", "capabilities": ["power", "volume", "mute", "source"] }
  ]
}
```

---

## 4. Orçamento de Performance (Desktop e Mobile `390px`)

| Métrica | Meta / Teto V1 | Regra de Implementação |
| :--- | :--- | :--- |
| **Pixel Ratio (`dpr`)** | `[1, 2]` desktop · `[1, 1.5]` mobile | Limitar superamostragem em telas AMOLED/Retina mobile. |
| **Draw calls** | `≤ 45` (teto absoluto `60`) | Mesclar/instancing nas paredes, pisos e esquadrias gerados proceduralmente. |
| **Triângulos** | `15k – 45k` | Geometria paramétrica limpa + mobiliário low-poly essencial. |
| **Luzes dinâmicas** | 9 `PointLight`s sem sombra (`castShadow={false}`) + 1 bounce da TV | Todas pré-montadas no boot (`intensity = 0` quando desligadas); pooling automático (máx. 6 ativas priorizando o cômodo focado) caso `perf.mjs` detecte pressão em GPU mobile. |
| **Tempo de frame (CPU)** | `< 8 ms` | Leitura via `useDeviceStore.getState()` no `useFrame`; zero `new THREE.Vector3()` no loop; zero `setState` React a 60fps. |

---

## 5. Estratégia das Animações e Reatividade 3D

### 5.1. Iluminação Reativa (9 Pontos + Suporte Futuro a `led_strip`)
- **Pré-montagem obrigatória:** Todas as `PointLight`s dos 9 pontos de luz da unidade `FINAL 02` são montadas uma única vez no boot sem shadow map (`castShadow={false}`, `decay={2}`, `distance` calibrado para o raio do cômodo). Quando desligadas, operam com `intensity = 0` (nunca desmontar lights para evitar recompilação de shaders GLSL).
- **Transição suave:** O `LightingRig` interpola `intensity`, `color` (temperatura de cor em Kelvin → RGB sRGB linear) e `emissiveIntensity` no `useFrame` via `THREE.MathUtils.damp(cur, target, 8, delta)` (~180–250ms percebidos).
- **Extensibilidade para Fitas LED (`subtype: 'led_strip'`):** O `LightingRig` já contempla suporte a malhas `__EMISSIVE` lineares + 1 `PointLight` proxy + plano sutil de *light bounce* junto à parede/teto, pronto para quando fitas de LED forem adicionadas após a V1.
- **Contraste visual:** Iluminação ambiente base em tom noturno/crepuscular equilibrado com `ACESFilmicToneMapping`, garantindo distinção nítida entre cômodos acesos e apagados.

### 5.2. "Fios de Ar" do Ar-Condicionado (`DEV__ac_sala`)
- **Geometria única (`1 draw call`):** 1 malha leve composta por 4 a 5 fitas curvas geradas via `CatmullRomCurve3` partindo de `DEV__ac_sala__AIR_ORIGIN` na direção `-X` (`facing: "-X"`), projetando-se para o centro da sala acima da linha da TV (`y = 1.20 m`) com leve abertura em leque.
- **`ShaderMaterial` dedicado:**
  - Uniforms: `uTime`, `uOpacity` (`0 ↔ 1`), `uSpeed` (`low: 0.45`, `medium: 0.8`, `high: 1.25`, `auto: 0.7`), `uColor` (`#E4E4E7` frio sutil).
  - Fragment shader com ondas senoidais e `smoothstep` nas extremidades (`transparent: true`, `depthWrite: false`, `side: THREE.DoubleSide`).
  - Quando desligado (`uOpacity < 0.005`), `mesh.visible = false` (custo zero).
  - Sob `prefers-reduced-motion: reduce`, a velocidade cai para `0.04` ou exibe linhas estáticas sutis.

### 5.3. Feedback da Televisão (`DEV__tv_sala`)
- **Desligada:** Superfície `DEV__tv_sala__EMISSIVE` voltada para `-X` usa material escuro (`#08080A`, `roughness: 0.12`, `emissiveIntensity: 0`) refletindo discretamente as luzes da sala.
- **Ligada:** Interpolação suave de `emissiveIntensity` com variação discreta de luminância + micro `PointLight` frontal na direção `-X` (`distance: 2.8`, `intensity: 0.4`) projetando reflexo suave na sala.

### 5.4. Projeção dos Marcadores 3D (`MarkerProjector`)
- Um único `MarkerProjector` no `useFrame` projeta os 11 nós `*__ANCHOR` usando um único `THREE.Vector3` pré-alocado e muta diretamente `element.style.transform = translate3d(x, y, 0)` (GPU-composited, zero `<Html>` do drei e zero reflow CSS).
