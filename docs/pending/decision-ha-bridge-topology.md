# Decisão Pendente: Topologia da Ponte WebSocket com o Home Assistant

- **Tipo:** Decisão arquitetural para deploy pós-V1 (`decision`)
- **Responsável:** Proprietário do apartamento (com recomendação técnica)
- **Status:** Em aberto (necessária apenas na migração para servidor)

## Opções em avaliação

Ao migrar da V1 (`MockIoTProvider` no PC) para o **Raspberry Pi 4 / Orange Pi 5** integrado ao Home Assistant, escolher entre:

1. **Opção Recomendada — Micro-proxy `iot-bridge` no servidor (BFF fino):**
   - Um container leve (Node/Fastify ou Go, ~25 MB RAM) injeta o `HA_LONG_LIVED_TOKEN` exclusivamente no servidor, traduz `entity_id ↔ sceneId` e expõe `/ws` normalizado para o frontend.
   - *Vantagem:* Token do Home Assistant nunca vai para o navegador; facilita evoluir segurança caso haja acesso remoto futuro.
2. **Opção Simples — Conexão direta Frontend ↔ Home Assistant WebSocket (`ha-ws`):**
   - Menos um container no Docker Compose; o navegador conecta direto ao endpoint `/api/websocket` do Home Assistant via Caddy usando token local.
   - *Desvantagem:* O token fica acessível no cliente navegador dentro da LAN.

## O que está bloqueado

- **Bloqueado:** **Fase 6 — Integração Home Assistant & Deploy ARM64** (construção do conector `HaWsProvider` vs `BffProvider` e `docker-compose.yml` definitivo).
- **Não bloqueado:** Toda a V1 local simulada (Fases 0 a 5).
