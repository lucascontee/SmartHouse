# Tarefa 002: Domínio Tipado, `floorplan.config.json` (`FINAL 02`) e Registro Polimórfico

## Objetivo
Materializar `src/domain/floorplan.config.json` como fonte única da verdade da unidade `FINAL 02`, definir os contratos discriminados de dispositivos/comandos e criar o `DeviceRegistry` polimórfico.

## Referências
- `docs/specs.md` (Seções 2.1 e 4)
- `docs/requirements/iot-devices-and-mock-contract.md` (Seções 1, 2 e 3)
- `docs/requirements/scene-3d-procedural-and-animations.md` (Seção 3)

## Critérios de Aceite
- [x] `src/domain/floorplan.config.json` criado exatamente com os metadados, 8 cômodos, `customPartitions` (incluindo `0,75 m × 1,45 m`), 10 `openings` e 11 `devices` especificados para a unidade `FINAL 02`.
- [x] `src/domain/types.ts` e `src/domain/commands.ts` definem a união discriminada `SmartDevice` (`light` com `subtype: 'bulb' | 'led_strip'` + suporte a `rgb`, `ac` e `tv`) e o contrato `FloorplanConfig`.
- [x] `src/registry/` implementa `DeviceRegistry` modular (`light.module.tsx`, `climate.module.tsx`, `tv.module.tsx`) expondo `getIcon`, `formatSummary` e `getAccentSwatch`, sem `switch/if` espalhados na UI.
- [x] Testes unitários em `tests/domain/` validam integridade dos 11 dispositivos do config, faixas válidas e formatação de resumo via `npm test`.
