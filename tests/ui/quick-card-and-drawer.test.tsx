import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialDevicesFromConfig } from '../../src/domain/floorplan';
import type { ClimateDevice, LightDevice, TvDevice } from '../../src/domain/types';
import { DetailDrawerView } from '../../src/ui/DetailDrawer';
import { QuickCardView } from '../../src/ui/QuickCard';

const noop = () => {};

describe('QuickCard & DetailDrawer (Polimorfismo e Capabilities)', () => {
  const baseDevices = createInitialDevicesFromConfig();

  it('renderiza QuickCard com nome, status, toggle e botão Mais informações', () => {
    const salaSup = baseDevices.find((d) => d.id === 'DEV__light_sala_superior')!;

    const html = renderToStaticMarkup(
      <QuickCardView
        device={salaSup}
        onToggle={noop}
        onOpenMore={noop}
        onClose={noop}
      />,
    );

    expect(html).toContain('Luz Sala (Corredor)');
    expect(html).toContain('Desligado');
    expect(html).toContain('role="switch"');
    expect(html).toContain('Mais informações');
  });

  it('filtra controles da iluminação exatamente pelas capabilities (power-only vs dimmer+CCT vs led_strip RGB)', () => {
    const varanda = baseDevices.find((d) => d.id === 'DEV__light_varanda') as LightDevice;
    const salaSup = baseDevices.find((d) => d.id === 'DEV__light_sala_superior') as LightDevice;
    const ledStrip: LightDevice = {
      id: 'DEV__led_sala_sanca',
      name: 'Fita Sanca',
      roomId: 'sala',
      type: 'light',
      subtype: 'led_strip',
      online: true,
      isOn: true,
      position: [2, 2.5, 2],
      capabilities: ['power', 'brightness', 'rgb'],
      brightness: 70,
      colorHex: '#60A5FA',
      colorMode: 'rgb',
    };

    const simpleHtml = renderToStaticMarkup(
      <DetailDrawerView device={varanda} roomLabel="Varanda" onCommand={noop} onClose={noop} />,
    );
    expect(simpleHtml).toContain('Luz Varanda');
    expect(simpleHtml).toContain('Controle simples (liga/desliga)');
    expect(simpleHtml).not.toContain('Intensidade');
    expect(simpleHtml).not.toContain('Temperatura de cor');

    const cctHtml = renderToStaticMarkup(
      <DetailDrawerView device={salaSup} roomLabel="Sala" onCommand={noop} onClose={noop} />,
    );
    expect(cctHtml).toContain('Intensidade');
    expect(cctHtml).toContain('Temperatura de cor');
    expect(cctHtml).not.toContain('Cor RGB');

    const rgbHtml = renderToStaticMarkup(
      <DetailDrawerView device={ledStrip} roomLabel="Sala" onCommand={noop} onClose={noop} />,
    );
    expect(rgbHtml).toContain('Fita Sanca');
    expect(rgbHtml).toContain('Intensidade');
    expect(rgbHtml).toContain('Cor RGB');
    expect(rgbHtml).toContain('#60A5FA');
  });

  it('renderiza controles granulares do AC e da TV com retorno ao 3D', () => {
    const ac = baseDevices.find((d) => d.id === 'DEV__ac_sala') as ClimateDevice;
    const tv = baseDevices.find((d) => d.id === 'DEV__tv_sala') as TvDevice;

    const acHtml = renderToStaticMarkup(
      <DetailDrawerView device={ac} roomLabel="Sala" onCommand={noop} onClose={noop} />,
    );
    expect(acHtml).toContain('Voltar ao 3D');
    expect(acHtml).toContain('Temperatura alvo');
    expect(acHtml).toContain('Refrigerar');
    expect(acHtml).toContain('Desumidificar');
    expect(acHtml).toContain('Velocidade do vento');

    const tvHtml = renderToStaticMarkup(
      <DetailDrawerView device={tv} roomLabel="Sala" onCommand={noop} onClose={noop} />,
    );
    expect(tvHtml).toContain('TV Sala');
    expect(tvHtml).toContain('Volume');
    expect(tvHtml).toContain('Silenciar');
    expect(tvHtml).toContain('HDMI 1');
    expect(tvHtml).toContain('Streaming');
  });

  it('mantém QuickCard e DetailDrawer sem switch por tipo e sem emojis', () => {
    const rootDir = resolve(__dirname, '../..');
    const quickSrc = readFileSync(resolve(rootDir, 'src/ui/QuickCard.tsx'), 'utf8');
    const detailSrc = readFileSync(resolve(rootDir, 'src/ui/DetailDrawer.tsx'), 'utf8');

    expect(quickSrc).not.toMatch(/\bswitch\s*\(/);
    expect(detailSrc).not.toMatch(/\bswitch\s*\(/);
    expect(quickSrc + detailSrc).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
