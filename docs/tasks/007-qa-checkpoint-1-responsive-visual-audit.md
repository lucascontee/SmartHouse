# Tarefa 007: Checkpoint QA 1 — Auditoria Visual e Responsiva (`shoot.mjs`)

## Objetivo
Validar o layout HUD, marcadores 3D, `QuickCard` e `DetailDrawer` em múltiplos viewports usando `scripts/shoot.mjs` da skill `C:\IA\Skills\taste-skill\skills\taste-skill\`.

## Referências
- `docs/requirements/ui-design-system-and-qa.md` (Seções 1, 2 e 3)
- `docs/documentation.md` (Seção 3)

## Critérios de Aceite
- [ ] Capturas geradas e inspecionadas com `C:\IA\Skills\taste-skill\skills\taste-skill\scripts\shoot.mjs` nos breakpoints `1440px`, `1024px`, `768px` e `390px` (estado padrão, `QuickCard` aberto e `DetailDrawer` aberto), além de checagem em `320px`.
- [ ] Zero overflow horizontal, zero sobreposição de controles, alvos de toque `≥ 44px` com `gap ≥ 8px`, canvas 3D ocupando `≥ 80%` da tela principal e contraste AA/AAA verificado.
- [ ] Confirmado que **não** foram executados `scripts/gate.mjs --start`, `layout/deal.mjs`, `scripts/moments.mjs`, `scripts/copy-lint.mjs` ou `scripts/consistency.mjs`, e que `.taste-skill/build.json` não existe.
