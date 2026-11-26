import { AirVent, Lightbulb, SunMedium, Tv } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { applyCommandToDevice } from '../../src/domain/commands';
import {
  createInitialDevicesFromConfig,
  floorplanConfig,
  validateFloorplanConfig,
} from '../../src/domain/floorplan';
import type { ClimateDevice, LightDevice, TvDevice } from '../../src/domain/types';
import { getDeviceModule } from '../../src/registry/device-registry';

describe('Planta Baixa FINAL 02 (floorplan.config.json)', () => {
  it('valida estrutura completa da unidade FINAL 02 sem erros', () => {
    expect(floorplanConfig.meta.unit).toBe('FINAL 02');
    expect(floorplanConfig.meta.ceilingHeight).toBe(2.6);
    expect(floorplanConfig.rooms).toHaveLength(8);
    expect(floorplanConfig.openings).toHaveLength(10);
    expect(floorplanConfig.devices).toHaveLength(11);
    expect(validateFloorplanConfig(floorplanConfig)).toEqual([]);
  });

  it('inclui suíte em formato L e a parede da reforma de 0,75m x 1,45m', () => {
    const suite = floorplanConfig.rooms.find((r) => r.id === 'suite');
    expect(suite?.shape).toBe('L');
    if (suite?.shape === 'L') {
      expect(suite.segments).toHaveLength(2);
    }

    const extension = floorplanConfig.customPartitions.find(
      (p) => p.id === 'parede_cozinha_sala_extensao',
    );
    expect(extension).toBeDefined();
    expect(extension?.height).toBe(1.45);
    const length = Math.hypot(
      (extension?.end[0] ?? 0) - (extension?.start[0] ?? 0),
      (extension?.end[1] ?? 0) - (extension?.start[1] ?? 0),
    );
    expect(length).toBeCloseTo(0.75, 4);
  });

  it('cria os 11 dispositivos canônicos V1 com rótulos e capacidades corretas', () => {
    const devices = createInitialDevicesFromConfig();
    expect(devices).toHaveLength(11);

    const ids = devices.map((d) => d.id);
    expect(ids).toEqual([
      'DEV__light_varanda',
      'DEV__light_cozinha',
      'DEV__light_sala_superior',
      'DEV__light_sala_inferior',
      'DEV__light_circulacao',
      'DEV__light_banheiro_suite',
      'DEV__light_suite',
      'DEV__light_banheiro_social',
      'DEV__light_quarto_2',
      'DEV__ac_sala',
      'DEV__tv_sala',
    ]);

    const salaSup = devices.find((d) => d.id === 'DEV__light_sala_superior');
    expect(salaSup?.name).toBe('Luz Sala (Corredor)');

    const ac = devices.find((d) => d.id === 'DEV__ac_sala');
    const tv = devices.find((d) => d.id === 'DEV__tv_sala');
    expect(ac?.facing).toBe('-X');
    expect(tv?.facing).toBe('-X');
    expect(ac?.position[1]).toBeGreaterThan(tv?.position[1] ?? 0);
  });
});

describe('Comandos Tipados e Polimorfismo (DeviceRegistry)', () => {
  it('aplica comandos com clamping e respeita capabilities declaradas', () => {
    const devices = createInitialDevicesFromConfig();
    const varanda = devices.find((d) => d.id === 'DEV__light_varanda') as LightDevice;
    const salaSup = devices.find((d) => d.id === 'DEV__light_sala_superior') as LightDevice;
    const ac = devices.find((d) => d.id === 'DEV__ac_sala') as ClimateDevice;
    const tv = devices.find((d) => d.id === 'DEV__tv_sala') as TvDevice;

    // Luz somente power ignora brightness
    const varandaAfter = applyCommandToDevice(varanda, { type: 'brightness', brightness: 20 }) as LightDevice;
    expect(varandaAfter.brightness).toBe(varanda.brightness);

    // Luz com dimmer/CCT faz clamp de faixas
    const salaOn = applyCommandToDevice(salaSup, { type: 'brightness', brightness: 140 }) as LightDevice;
    const salaCct = applyCommandToDevice(salaOn, { type: 'colorTemp', colorTempK: 1500 }) as LightDevice;
    expect(salaCct.brightness).toBe(100);
    expect(salaCct.colorTempK).toBe(2700);

    // Ar-condicionado faz clamp 16..30°C
    const acCold = applyCommandToDevice(ac, { type: 'targetTemp', targetTempC: 10 }) as ClimateDevice;
    expect(acCold.targetTempC).toBe(16);

    // TV valida source disponível e clamp 0..100
    const tvVol = applyCommandToDevice(tv, { type: 'volume', volume: -12 }) as TvDevice;
    const tvBadSrc = applyCommandToDevice(tvVol, { type: 'source', source: 'VGA' }) as TvDevice;
    const tvGoodSrc = applyCommandToDevice(tvBadSrc, { type: 'source', source: 'Streaming' }) as TvDevice;
    expect(tvGoodSrc.volume).toBe(0);
    expect(tvGoodSrc.source).toBe('Streaming');
  });

  it('suporta extensibilidade de fita LED RGB e validação hex', () => {
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
      brightness: 65,
      colorHex: '#FFA040',
      colorMode: 'rgb',
    };

    const invalid = applyCommandToDevice(ledStrip, { type: 'rgb', colorHex: 'red' }) as LightDevice;
    expect(invalid.colorHex).toBe('#FFA040');

    const updated = applyCommandToDevice(ledStrip, { type: 'rgb', colorHex: '#44aaff' }) as LightDevice;
    expect(updated.colorHex).toBe('#44AAFF');

    const mod = getDeviceModule(updated);
    expect(mod.getIcon(updated)).toBe(SunMedium);
    expect(mod.formatSummary(updated)).toBe('Ligado · 65%');
    expect(mod.getAccentSwatch(updated)).toBe('#44AAFF');
  });

  it('formata resumos, ícones e swatches monocromáticos corretamente por tipo', () => {
    const devices = createInitialDevicesFromConfig();
    const varanda = devices.find((d) => d.id === 'DEV__light_varanda') as LightDevice;
    const salaSup = devices.find((d) => d.id === 'DEV__light_sala_superior') as LightDevice;
    const ac = devices.find((d) => d.id === 'DEV__ac_sala') as ClimateDevice;
    const tv = devices.find((d) => d.id === 'DEV__tv_sala') as TvDevice;

    expect(getDeviceModule(varanda).getIcon(varanda)).toBe(Lightbulb);
    expect(getDeviceModule(varanda).formatSummary(varanda)).toBe('Desligado');
    expect(getDeviceModule(varanda).getAccentSwatch(varanda)).toBeNull();

    const varandaOn = applyCommandToDevice(varanda, { type: 'power', isOn: true }) as LightDevice;
    expect(getDeviceModule(varandaOn).formatSummary(varandaOn)).toBe('Ligado');
    expect(getDeviceModule(varandaOn).getAccentSwatch(varandaOn)).toBeNull();

    const salaOn = applyCommandToDevice(salaSup, { type: 'power', isOn: true }) as LightDevice;
    expect(getDeviceModule(salaOn).formatSummary(salaOn)).toBe('Ligado · 80%');
    expect(getDeviceModule(salaOn).getAccentSwatch(salaOn)).toMatch(/^#[0-9A-F]{6}$/);

    const acOn = applyCommandToDevice(ac, { type: 'power', isOn: true }) as ClimateDevice;
    expect(getDeviceModule(acOn).getIcon(acOn)).toBe(AirVent);
    expect(getDeviceModule(acOn).formatSummary(acOn)).toBe('22 °C · Refrigerar');
    expect(getDeviceModule(acOn).getAccentSwatch(acOn)).toBeNull();

    const tvOn = applyCommandToDevice(tv, { type: 'power', isOn: true }) as TvDevice;
    expect(getDeviceModule(tvOn).getIcon(tvOn)).toBe(Tv);
    expect(getDeviceModule(tvOn).formatSummary(tvOn)).toBe('HDMI 1 · Vol 25');
    expect(getDeviceModule(tvOn).getAccentSwatch(tvOn)).toBeNull();

    const tvMuted = applyCommandToDevice(tvOn, { type: 'mute', muted: true }) as TvDevice;
    expect(getDeviceModule(tvMuted).formatSummary(tvMuted)).toBe('HDMI 1 · Mudo');
  });
});
