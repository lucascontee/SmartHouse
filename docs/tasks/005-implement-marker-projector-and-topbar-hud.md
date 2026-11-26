# Tarefa 005: `MarkerProjector` GPU-Composited, Marcadores 3D e `TopBar`

## Objetivo
Implementar a projeção 3D→2D de alta performance para os 11 marcadores ancorados nos dispositivos e a barra superior minimalista de seleção dos 8 cômodos e status de simulação.

## Referências
- `docs/specs.md` (Seções 2.1 e 5)
- `docs/requirements/scene-3d-procedural-and-animations.md` (Seção 5.4)
- `docs/requirements/ui-design-system-and-qa.md` (Seções 1 e 2)

## Critérios de Aceite
- [ ] `src/scene/MarkerProjector.tsx` projeta os 11 nós `*__ANCHOR` no `useFrame` reutilizando um único `THREE.Vector3` e mutando `style.transform = translate3d(...)` via refs DOM (sem `<Html>` do drei e sem `setState` por frame).
- [ ] `src/ui/DeviceMarkersOverlay.tsx` exibe os 11 marcadores com ícones Lucide (`strokeWidth={1.5}`), diferenciando claramente `Ligado` vs `Desligado` com tokens monocromáticos e área de toque `≥ 44px` (`gap ≥ 8px`).
- [ ] `src/ui/TopBar.tsx` oferece seleção rápida (`Visão Geral` + 8 cômodos de `FINAL 02`) e indicador discreto do modo `SIMULAÇÃO` (e reset em dev), sem scroll horizontal até `390px`/`320px`.
- [ ] Canvas 3D permanece visível ocupando `≥ 80%` da viewport `100dvh` em desktop e mobile.
