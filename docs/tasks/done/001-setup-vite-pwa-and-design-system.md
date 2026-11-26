# Tarefa 001: Setup Vite, PWA e Base do Design System Monocromático

## Objetivo
Inicializar o projeto web (`React 19 + TypeScript strict + Vite + Vitest + vite-plugin-pwa + Lucide`) e implantar os estilos base monocromáticos e de micro-interação alinhados à skill local em `C:\IA\Skills\taste-skill\skills\taste-skill\`.

## Referências
- `docs/specs.md` (Seções 3.1 e 3.3)
- `docs/requirements/ui-design-system-and-qa.md` (Seções 1 e 3)
- `docs/documentation.md` (Seções 1, 2 e 3)

## Critérios de Aceite
- [x] `package.json`, `tsconfig.json` (`strict: true`), `vite.config.ts` e estrutura base sob `src/` criados sem arquivos soltos na raiz.
- [x] `vite-plugin-pwa` configurado com `display: "standalone"`, `theme_color: "#070708"` e estratégia de cache offline para shell/assets.
- [x] `src/styles/system.css`, `src/styles/motion.css` e `src/styles/hud.css` criados com base em `C:\IA\Skills\taste-skill\skills\taste-skill\` (`assets/system.css`, `assets/motion/`), aplicando tokens fixos em `:root`, `data-radius="sharp"`, `Geist` / `Geist Mono` (`tabular-nums`), bordas `1px`, botões `.btn-solid` / `.btn-tonal`, viewport `100dvh` e `@media (prefers-reduced-motion: reduce)`.
- [x] `lucide-react` configurado para ícones de traço `1.5px` sem preenchimento.
- [x] `npx tsc --noEmit` e `npm run build` executam sem erros; nenhum script proibido (`gate.mjs --start`, `.taste-skill/build.json`) foi criado ou executado.
