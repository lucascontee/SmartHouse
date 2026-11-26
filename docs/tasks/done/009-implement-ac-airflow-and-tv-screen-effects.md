# Tarefa 009: Animações de "Fios de Ar" do AC (`AirflowEffect`) e Tela da TV (`TvScreenEffect`)

## Objetivo
Implementar o fluxo contínuo de "fios de ar" do `DEV__ac_sala` em direção `-X`, o feedback visual da `DEV__tv_sala` e a pausa automática do loop em segundo plano.

## Referências
- `docs/specs.md` (Seções 2.1 e 6)
- `docs/requirements/scene-3d-procedural-and-animations.md` (Seções 1, 3, 5.2 e 5.3)

## Critérios de Aceite
- [x] `src/scene/AirflowEffect.tsx` renderiza 1 único mesh (`1 draw call`) com 4 a 5 fitas `CatmullRomCurve3` partindo de `DEV__ac_sala__AIR_ORIGIN` na direção `-X` acima da TV (`y = 1,20 m`) usando `ShaderMaterial` enxuto (`uTime`, `uOpacity`, `uSpeed` proporcional a `fanSpeed`, `transparent: true`, `depthWrite: false`).
- [x] Quando `DEV__ac_sala` está desligado (`uOpacity < 0.005`), `mesh.visible = false`; sob `prefers-reduced-motion: reduce`, reduz velocidade ou exibe linhas estáticas sutis.
- [x] `src/scene/TvScreenEffect.tsx` alterna `DEV__tv_sala__EMISSIVE` entre superfície escura semi-reflexiva (`#08080A`) e tela emissiva suave com micro `PointLight` frontal em `-X` (`distance: 2.8`).
- [x] Loop WebGL pausa/reduz custo quando `document.hidden === true`.
