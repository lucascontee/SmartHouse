# Tarefa 006: Fluxo de Interação em Dois Níveis (`QuickCard` e `DetailDrawer`)

## Objetivo
Implementar o `QuickCard` (ação rápida) e a visão detalhada polimórfica `DetailDrawer` ("Mais informações") em HTML vivo obedecendo estritamente ao design system monocromático e às `capabilities` de cada dispositivo.

## Referências
- `docs/specs.md` (Seções 2.1 e 5)
- `docs/requirements/ui-design-system-and-qa.md` (Seções 1 e 2)
- `docs/requirements/iot-devices-and-mock-contract.md` (Seções 1, 2 e 3)

## Critérios de Aceite
- [ ] `src/ui/QuickCard.tsx` abre ao clicar no objeto 3D ou marcador, exibindo exclusivamente nome, status em `tabular-nums`, toggle seco (`≥ 44px`), botão tonal **"Mais informações"** e fechar (`X`); ancora na base em `≤ 768px`.
- [ ] `src/ui/DetailDrawer.tsx` + módulos em `src/registry/` renderizam controles reais em HTML vivo (sliders finos, toggles, seletores segmentados) filtrados estritamente por `capabilities` (suportando também `led_strip`/`rgb` quando habilitados).
- [ ] Retorno imediato ao 3D via botão `Voltar ao 3D` ou tecla `Esc`, mantendo parte da cena visível para feedback instantâneo.
- [ ] Geometria `data-radius="sharp"`, bordas `1px`, apenas botões `.btn-solid`/`.btn-tonal`, máximo 2 níveis de caixas aninhadas, transições `120–180ms` respeitando `prefers-reduced-motion`, zero emojis/sparkles/gradientes neon.
