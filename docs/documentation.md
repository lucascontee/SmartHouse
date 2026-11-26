# Documentação Técnica e Operacional — SmartHouse 3D

Este guia concentra os pré-requisitos, variáveis de ambiente, comandos planejados de desenvolvimento/QA e a estratégia operacional de migração futura para servidor local.

---

## 1. Pré-requisitos

### Ambiente Local (V1 — Desenvolvimento e Uso Simulado no PC)
- **Node.js:** v20 LTS ou superior (com `npm` ou `pnpm`).
- **Navegador:** Chromium, Chrome, Edge, Firefox ou Safari com suporte a **WebGL2** e aceleração por hardware habilitada.
- **Playwright / Chromium headless** (opcional para executar os scripts automatizados de QA `shoot.mjs` e `perf.mjs` durante a implementação).

### Servidor Doméstico Futuro (Pós-V1 — Pós-Reforma)
- **Hardware alvo:** Raspberry Pi 4 (2 GB+ RAM) ou Orange Pi 5 (arquitetura `linux/arm64`).
- **Software no host:** Docker Engine + Docker Compose v2.
- **Armazenamento:** Recomendado SSD USB ou microSD de alta durabilidade, com rotação de logs ativa.

---

## 2. Variáveis de Ambiente (`.env.example`)

| Variável | Padrão V1 | Descrição |
| :--- | :--- | :--- |
| `VITE_IOT_PROVIDER` | `mock` | Seleciona o provedor IoT ativo (`mock` na V1; `ha-ws` ou `bff` na integração com Home Assistant). |
| `VITE_MOCK_LATENCY_MS` | `120` | Latência artificial em milissegundos aplicada pelo `MockIoTProvider` para testar estados `pending` e UX. |
| `VITE_HA_WS_URL` | `wss://smarthouse.local/api/websocket` | URL WebSocket do Home Assistant via Caddy (uso futuro pós-V1). |
| `VITE_IOT_BRIDGE_WS_URL` | `wss://smarthouse.local/ws` | URL WebSocket caso seja escolhido o micro-proxy `iot-bridge` (uso futuro pós-V1). |
| `HA_LONG_LIVED_TOKEN` | *(vazio)* | Token de longa duração do Home Assistant (apenas server-side; **nunca** commitar em `.env` versionado). |

---

## 3. Comandos Planejados (Após Aprovação e Fase 0)

> Os scripts abaixo passarão a existir após a execução da Fase 0 (`package.json`).

| Finalidade | Comando planejado | Observação |
| :--- | :--- | :--- |
| Instalar dependências | `npm install` | Executado na raiz após criação do projeto Vite. |
| Rodar em modo dev (Mock) | `npm run dev` | Sobe app local com `VITE_IOT_PROVIDER=mock`. |
| Build de produção + PWA | `npm run build` | Gera `dist/` estático com Service Worker e manifest. |
| Preview local do build PWA | `npm run preview` | Valida cache offline e comportamento PWA no PC. |
| Testes unitários e de contrato | `npm test` | Executa Vitest sobre `tests/` (`domain`, `providers`, `store`). |
| Verificação de tipos | `npx tsc --noEmit` | Checagem TypeScript estrita. |

### Protocolo de QA Visual e Performance (`C:\IA\Skills\taste-skill\skills\taste-skill\`)
Nos checkpoints das Fases 3, 4 e 5, consultar a base de frontend em `C:\IA\Skills\taste-skill\skills\taste-skill\` (`assets/system.css`, `assets/motion/`) e executar apenas as ferramentas permitidas por `docs/requirements/ui-design-system-and-qa.md`:
- Captura responsiva via `scripts/shoot.mjs` nos viewports **`1440px`**, **`1024px`**, **`768px`** e **`390px`**.
- Auditoria de frames/WebGL via `scripts/perf.mjs`.
- **Lembrete crítico:** **Não** executar `scripts/gate.mjs --start`, **não** criar `.taste-skill/build.json` e **não** executar `layout/deal.mjs`, `scripts/moments.mjs`, `scripts/copy-lint.mjs` ou `scripts/consistency.mjs`.

---

## 4. Plano Operacional de Deploy Futuro (Raspberry Pi 4 / Orange Pi 5)

Quando os dispositivos físicos estiverem instalados e testados via Home Assistant:

1. **Stack Docker Compose (`linux/arm64`):**
   - **`caddy`:** Serve os arquivos estáticos de `dist/` com compressão Brotli/Gzip, faz proxy reverso para `/api/websocket` (ou `/ws`) e termina HTTPS local com **`tls internal` (Opção A)**.
   - **`homeassistant`:** Contêiner oficial com `network_mode: host` (para descoberta mDNS/SSDP na rede Wi-Fi IoT) e `recorder` filtrado apenas às entidades relevantes para poupar disco.
   - **`iot-bridge` (se escolhido em `docs/pending/decision-ha-bridge-topology.md`):** Contêiner Alpine leve (<30 MB RAM) isolando o token do HA.
2. **Higiene de hardware embarcado:**
   - Configurar `logging: { driver: "json-file", options: { "max-size": "10m", "max-file": "3" } }` em todos os serviços para evitar esgotamento de escrita no cartão SD.
3. **Instalação do Certificado Raiz (Opção A):**
   - Extrair `root.crt` gerado pelo Caddy (`caddy_data/caddy/pki/authorities/local/root.crt`) e instalar/confiar uma única vez nos dispositivos móveis e computadores da casa para liberar instalação PWA e WebSocket seguro (`wss://`) em rede local sem internet.
4. **Acesso externo (se habilitado no futuro):**
   - Proibido liberar portas sem autenticação. Seguir obrigatoriamente `docs/requirements/security-and-local-network.md` (Tailscale/WireGuard ou proxy autenticado com MFA/mTLS).
