# Tarefa 010: Checkpoint QA 2 — Performance WebGL (`perf.mjs`), Testes e Build PWA

## Objetivo
Validar o orçamento de renderização 3D, a responsividade com todas as animações ativas, a suíte de testes unitários e o build final PWA da V1 local.

## Referências
- `docs/requirements/scene-3d-procedural-and-animations.md` (Seção 4)
- `docs/requirements/ui-design-system-and-qa.md` (Seção 3)
- `docs/documentation.md` (Seção 3)

## Critérios de Aceite
- [ ] `C:\IA\Skills\taste-skill\skills\taste-skill\scripts\perf.mjs` confirma exatamente 1 contexto WebGL, draw calls `≤ 60` (meta `≤ 45`), frame CPU `< 8ms` e zero engasgo de shader ao acionar luzes/AC/TV (ativando pooling de máx. 6 luzes se necessário no mobile).
- [ ] `scripts/shoot.mjs` revalidado em `1440px`, `1024px`, `768px` e `390px` com luzes, fios de ar e TV ligados simultaneamente.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` e `npm run preview` passam sem erros, confirmando registro de Service Worker e manifest PWA.
- [ ] Confirmado que nenhum comando proibido (`gate.mjs --start`, `.taste-skill/build.json`, `layout/deal.mjs`, `moments.mjs`, `copy-lint.mjs`, `consistency.mjs`) foi executado.
