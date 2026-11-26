# Design System Monocromático, Contrato de UI e QA Visual/Performance

Este documento consolida todas as regras visuais, ergonômicas, de layout e de verificação automatizada para o frontend do SmartHouse 3D.

---

## 1. Identidade Visual e Tokens Fixos (`:root`)

Toda a camada de interface 2D (HUD, marcadores ancorados, `QuickCard`, barra de cômodos e `DetailDrawer`) segue uma identidade ultra minimalista monocromática definida em `src/styles/system.css` (nunca sortear ou inventar cores):

```css
:root {
  --bg: #070708;
  --surface: #111113;
  --ink: #FAFAFA;
  --muted: #71717A;
  --accent: #E4E4E7;
  --border: rgba(255, 255, 255, 0.08);
  --border-active: rgba(255, 255, 255, 0.24);
}
```

- **Regra estrita de cor:** Toda a expressão cromática concentra-se na iluminação real do modelo 3D. Na UI 2D, cores cromáticas são permitidas **exclusivamente** em micro-indicadores de estado físico (ex.: pequena amostra/swatch `8×8px` da cor ativa de uma fita LED ou lâmpada RGB no seletor ou marcador).
- **Tipografia:**
  - Interface geral: `Geist` (fallback `Inter`, sans-serif).
  - Telemetria e valores numéricos (`°C`, `%`, volume, status): `Geist Mono` com `font-variant-numeric: tabular-nums`.
- **Geometria e superfície:**
  - `data-radius="sharp"` (`border-radius: 0px`) aplicado em toda a interface.
  - Separação exclusivamente por bordas de `1px solid var(--border)` (foco/ativo `var(--border-active)`), sem sombras pesadas e sem blur exagerado.
  - Um único estilo de painel/superfície (`background: var(--surface); border: 1px solid var(--border);`) e **no máximo 2 níveis de caixas aninhadas**.
  - Apenas **2 variantes de botão**:
    - `.btn-solid`: fundo `#FAFAFA`, texto `#070708`.
    - `.btn-tonal`: fundo discreto (`#111113` / leve hover), texto `#FAFAFA`, borda `1px`.
- **Ícones:** Exclusivamente **Lucide (`lucide-react`)** com `strokeWidth={1.5}` e sem preenchimento (`fill="none"`), tanto no HUD/painéis quanto nos marcadores ancorados no 3D.

### Proibições Absolutas
- Zero emojis em textos, botões ou marcadores.
- Zero ícones de brilho/sparkles.
- Zero roxo, lavanda ou gradientes neon.
- Zero legendas soltas abaixo do canvas e zero cards genéricos de dashboard.
- Zero efeitos visuais excessivos na UI: sem tilt 3D em painéis, sem fade-in em cascata e sem carrosséis.

---

## 2. Layout, Fluxo de Interação e Responsividade

- **Viewport fixa (`100dvh`):** O container principal trava em `100dvh` sem rolagem de página. O `<Canvas>` 3D ocupa **no mínimo 80% da área visível** na tela principal; controles de cômodos e dispositivos aparecem sob demanda.
- **Fluxo de interação em dois níveis:**
  1. **Marcador no 3D:** Botão minimalista posicionado sobre o objeto. Mostra visualmente `Ligado` vs `Desligado` (borda `--border-active` + ícone `--ink` + micro-indicador, vs borda `--border` + ícone `--muted`).
  2. **Nível 1 — Quick Card (Ação Rápida):** Popover/painel compacto aberto ao clicar no objeto 3D ou marcador. Contém estritamente: nome do dispositivo, status (`Ligado` / `Desligado` + leitura principal), toggle seco de liga/desliga, botão tonal **"Mais informações"** e fechar (`X`). No mobile (`≤ 768px`), ancora na parte inferior para nunca cortar nas bordas.
  3. **Nível 2 — Visão "Mais informações" (`DetailDrawer`):** Gaveta lateral direita no desktop / *bottom sheet* no mobile mantendo parte do 3D visível para feedback visual instantâneo, com controles reais em HTML vivo:
     - **Iluminação:** Toggle seco, slider fino de intensidade (`0–100%`), temperatura de cor (`2700K–6500K`) e seletor de cor + presets sóbrios quando `capabilities.rgb === true`.
     - **Ar-condicionado:** Toggle seco, ajuste numérico de temperatura (`16–30 °C`), seleção de modo (`Refrigerar`, `Ventilar`, `Auto`, `Desumidificar`) e velocidade do vento.
     - **Televisão:** Toggle seco, slider/controle de volume, toggle mudo e seletor de entrada/fonte.
     - Retorno imediato ao 3D (`Voltar ao 3D` ou tecla `Esc`).
- **Micro-interações e acessibilidade:**
  - Resposta tátil imediata em hover/press com transições entre `120ms` e `180ms`.
  - Respeito estrito a `@media (prefers-reduced-motion: reduce)`.
  - Responsivo até **`390px` e `320px`** sem overflow horizontal e sem sobreposição de controles.
  - Alvos de toque com altura mínima de **`44px`** e espaçamento mínimo de **`8px`** entre botões/controles interativos.

---

## 3. Integração Adaptada da Skill Local (`taste-skill` / `design-taste-frontend`)

Toda a base visual de frontend e o protocolo de verificação utilizam a skill baixada localmente em **`C:\IA\Skills\taste-skill`** (diretório interno da skill: **`C:\IA\Skills\taste-skill\skills\taste-skill\`**), de forma estritamente adaptada:

- **Origem local e arquivos de referência:**
  - Repositório local: `C:\IA\Skills\taste-skill`
  - Diretório da skill (`SKILL.md`): `C:\IA\Skills\taste-skill\skills\taste-skill\`
  - Assets e referências reutilizáveis: `assets/system.css`, `assets/motion/`, `references/system.md`, `references/motion.md`, `references/icons.md` e `references/perf.md`
  - Scripts de QA permitidos: `scripts/shoot.mjs` e `scripts/perf.mjs`
- **Reutilizar:**
  - Sistema de tokens (`assets/system.css`) alinhado à paleta fixa em `:root`.
  - Regras de contraste AA/AAA, semântica HTML e acessibilidade.
  - Diretrizes de micro-interações contidas (`assets/motion/`).
  - Validação visual automatizada via **`scripts/shoot.mjs`** nos breakpoints **`1440px`, `1024px`, `768px` e `390px`**.
  - Auditoria de orçamento de renderização e fluidez via **`scripts/perf.mjs`**.
- **Proibições explícitas (NÃO executar em hipótese alguma):**
  - **NÃO** executar `scripts/gate.mjs --start`.
  - **NÃO** criar `.taste-skill/build.json` (evita bloqueio indevido de Stop hook).
  - **NÃO** executar `layout/deal.mjs`, `scripts/moments.mjs`, `scripts/copy-lint.mjs` nem `scripts/consistency.mjs`.
