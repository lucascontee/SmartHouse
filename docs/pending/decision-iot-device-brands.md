# Decisão Pendente: Marcas e Protocolos Finais dos Dispositivos IoT

- **Tipo:** Decisão adiada pós-reforma (`decision`)
- **Responsável:** Proprietário do apartamento
- **Status:** Em aberto (adiada propositalmente para pós-V1)

## O que precisa ser definido

Quando os equipamentos físicos forem adquiridos e instalados após a reforma, confirmar para cada categoria:
1. **Iluminação (lâmpadas e fitas LED):** Marca/protocolo escolhido (ex.: Tuya Local, Wiz, Yeelight, ESPHome, Zigbee via ZHA/Zigbee2MQTT) e suporte real a dimmer/CCT/RGB.
2. **Ar-condicionado:** Modelo e forma de integração no Home Assistant — Wi-Fi nativo com retorno de estado (ex.: LG ThinQ, Midea, Daikin, Samsung) ou emissor infravermelho Wi-Fi (*stateless* / `assumedState: true`).
3. **Televisão:** Sistema/integração no Home Assistant (ex.: LG WebOS, Samsung Tizen, Android TV/ADB) e fontes de entrada disponíveis (`HDMI 1`, apps, etc.).

## O que está bloqueado

- **Bloqueado:** Mapeamento final em `providers/device-map.json` e implementação da integração física na **Fase 6 (Pós-Reforma)**.
- **Não bloqueado:** Toda a **V1 em modo simulado (`MockIoTProvider`)** segue sem dependência dessa definição.
