# Rede Local, HTTPS (PWA) e Segurança

Este documento define as regras de rede, ausência de autenticação na V1 local e os requisitos obrigatórios de segurança para evolução futura (servidor local e eventual acesso remoto).

---

## 1. Operação na V1 (Localhost / LAN Privada)

- **Sem login na rede local:** Conforme decisão do projeto, a aplicação não exibe tela de login nem solicita senha durante o uso local (V1 no PC e futura operação exclusiva na rede Wi-Fi doméstica), garantindo acesso instantâneo ao abrir o PWA.
- **Isolamento de rede:** A V1 opera 100% offline/local em modo simulado (`MockIoTProvider`), sem abrir portas externas nem enviar telemetria para fora da máquina.

---

## 2. HTTPS Local para PWA na Migração ao Servidor (Opção A)

Para que o aplicativo seja instalável como PWA (`display: standalone`) e registre Service Workers em smartphones iOS e Android dentro da rede local quando migrado para **Raspberry Pi 4** ou **Orange Pi 5**, os navegadores exigem contexto seguro (`HTTPS` / `WSS`):

- **Estratégia escolhida (Opção A — 100% LAN):**
  - O proxy reverso **Caddy** executa em container Docker com diretiva `tls internal`, emitindo certificados locais sem depender de domínio público nem internet.
  - O certificado raiz público gerado pelo Caddy (`root.crt`) é instalado manualmente uma única vez nos dispositivos pessoais (PC/celulares da residência).
  - Todo o tráfego entre cliente, PWA estático e ponte IoT (WebSocket do Home Assistant / `iot-bridge`) trafega sob `https://` e `wss://` exclusivamente na rede interna.

---

## 3. Regra Mandatória para Futuro Acesso Externo (Fora da Rede Local)

Caso uma versão futura adicione acesso remoto fora da rede doméstica, **é estritamente proibido expor a aplicação ou o Home Assistant diretamente na internet via port-forwarding sem autenticação**. Essa funcionalidade **só pode ser habilitada** após a implementação de uma camada robusta de segurança composta por:

1. **Acesso preferencial via VPN Zero-Trust privada** (ex.: **Tailscale** ou **WireGuard** ponto a ponto no Raspberry Pi / Orange Pi), evitando exposição pública de portas na internet; **ou**, caso haja endpoint HTTPS público:
2. **Proxy reverso endurecido com:**
   - Autenticação forte com **MFA (Multi-Factor Authentication)** ou **mTLS (certificados de cliente)** obrigatória antes de alcançar a aplicação e qualquer API/WebSocket;
   - TLS 1.3 estrito com renovação automática;
   - Rate limiting, proteção contra força bruta e bloqueio por IP/sessão;
   - Logs de auditoria de acesso e comandos remotos.

---

## 4. Proteção de Segredos e Tokens do Home Assistant

- Nenhum token (`HA_LONG_LIVED_TOKEN`), certificado privado ou arquivo `.env` real pode ser commitado no repositório Git.
- Na migração para o Home Assistant, a decisão final sobre manter o token isolado em um micro-proxy `iot-bridge` (recomendado) vs conexão direta no WebSocket do HA será encerrada em `docs/pending/decision-ha-bridge-topology.md`.
