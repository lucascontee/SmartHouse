# Tarefa 004: Cena 3D Procedural (`FINAL 02`), `SceneLoader` e Auto-Binding `DEV__*`

## Objetivo
Construir o `<Canvas>` WebGL único com abstração `SceneSource: 'procedural' | 'glb'`, gerando a planta fiel `FINAL 02` e todos os nós `ROOM__*`, `CAM__*` e `DEV__*` com raycasting de seleção.

## Referências
- `docs/specs.md` (Seções 2.1, 3.3 e 4)
- `docs/requirements/scene-3d-procedural-and-animations.md` (Seções 1, 2, 3 e 4)

## Critérios de Aceite
- [x] `src/scene/ApartmentCanvas.tsx` monta exatamente 1 `<Canvas>` WebGL (`100dvh`), `dpr` `[1, 2]` desktop / `[1, 1.5]` mobile, `ACESFilmicToneMapping` e `OrbitControls`.
- [x] `src/scene/SceneLoader.ts` e gerador procedural constroem a unidade `FINAL 02` a partir de `floorplan.config.json`: 8 cômodos (incluindo `suite` em `L`), paredes por espessura do config, `parede_cozinha_sala_extensao` (`0,75 m × 1,45 m`), 10 `openings` e mobiliário essencial low-poly.
- [x] Scene Graph nomeado exatamente conforme contrato (`ROOM__*`, `CAM__*`, `CAM_TARGET__*`, `DEV__*`, `*__ANCHOR`, `*__EMISSIVE`, `*__LIGHT_ORIGIN`, `DEV__ac_sala__AIR_ORIGIN` com `facing: "-X"` e `DEV__tv_sala` logo abaixo em `y = 1,20 m`).
- [x] `parseApartmentScene.ts` valida em dev que todos os 11 dispositivos do config possuem nó e `__ANCHOR` correspondentes.
- [x] Clique em qualquer dispositivo na cena 3D seleciona o aparelho correspondente e anima a câmera suavemente ao trocar de cômodo.
