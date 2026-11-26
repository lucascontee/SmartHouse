# Tarefa 008: Iluminação Reativa na Cena 3D (`LightingRig`)

## Objetivo
Implementar a reação luminosa suave dos 9 pontos de iluminação de `FINAL 02` (e extensibilidade de `led_strip`) dentro do único contexto WebGL sem causar recompilação de shaders.

## Referências
- `docs/specs.md` (Seções 2.1 e 6)
- `docs/requirements/scene-3d-procedural-and-animations.md` (Seções 4 e 5.1)

## Critérios de Aceite
- [x] `src/scene/LightingRig.tsx` pré-monta todas as 9 `PointLight`s (`castShadow={false}`, `decay={2}`, `intensity = 0` quando desligadas) nos respectivos nós `*__LIGHT_ORIGIN` no boot, sem nunca desmontá-las.
- [x] Loop `useFrame` lê `useDeviceStore.getState()` imperativamente (zero re-render React) e interpola `intensity`, `color` (conversão Kelvin `colorTempK` → RGB / `colorHex`) e `emissiveIntensity` dos nós `*__EMISSIVE` via `THREE.MathUtils.damp`.
- [x] Ambiente base calibrado em iluminação noturna/crepuscular equilibrada (`ACESFilmicToneMapping`), garantindo contraste inequívoco entre estado aceso e apagado.
- [x] Suporte arquitetural preservado para `subtype: 'led_strip'` (`__EMISSIVE` linear + `PointLight` proxy + plano de *light bounce*).
