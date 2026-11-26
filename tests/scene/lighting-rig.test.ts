import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createInitialDevicesFromConfig, floorplanConfig } from '../../src/domain/floorplan';
import { kelvinToHex, type LightDevice } from '../../src/domain/types';
import { buildProceduralApartment, disposeSceneResources } from '../../src/scene/buildProceduralApartment';
import {
  computeTargetLightIntensity,
  createLedBouncePlaneMaterial,
  DEFAULT_WARM_LIGHT_HEX,
  resolveLightProfile,
  resolveLightTargetColorHex,
} from '../../src/scene/LightingRig';
import { parseApartmentScene } from '../../src/scene/parseApartmentScene';

function makeLightFixture(overrides: Partial<LightDevice> = {}): LightDevice {
  return {
    id: 'DEV__light_test',
    name: 'Luz Teste',
    roomId: 'suite',
    type: 'light',
    subtype: 'bulb',
    online: true,
    isOn: true,
    position: [0, 2.55, 0],
    capabilities: ['power', 'brightness', 'colorTemp'],
    brightness: 80,
    colorTempK: 4000,
    colorMode: 'cct',
    ...overrides,
  };
}

describe('LightingRig (9 luzes reativas e led_strip)', () => {
  it('resolve cor alvo para branco quente padrão, CCT Kelvin (2700K vs 6500K) e RGB led_strip', () => {
    expect(resolveLightTargetColorHex(undefined)).toBe(DEFAULT_WARM_LIGHT_HEX);

    const powerOnly = makeLightFixture({
      roomId: 'varanda',
      capabilities: ['power'],
      colorTempK: undefined,
    });
    expect(resolveLightTargetColorHex(powerOnly)).toBe(DEFAULT_WARM_LIGHT_HEX);

    const warm2700 = makeLightFixture({ colorTempK: 2700 });
    const cool6500 = makeLightFixture({ colorTempK: 6500 });
    const warmColor = new THREE.Color(resolveLightTargetColorHex(warm2700));
    const coolColor = new THREE.Color(resolveLightTargetColorHex(cool6500));

    expect(resolveLightTargetColorHex(warm2700)).toBe(kelvinToHex(2700));
    expect(resolveLightTargetColorHex(cool6500)).toBe(kelvinToHex(6500));
    expect(warmColor.r).toBeGreaterThan(warmColor.b);
    expect(coolColor.b).toBeGreaterThan(warmColor.b);

    const ledStripRgb = makeLightFixture({
      subtype: 'led_strip',
      capabilities: ['power', 'brightness', 'rgb'],
      colorMode: 'rgb',
      colorHex: '#38BDF8',
    });
    expect(resolveLightTargetColorHex(ledStripRgb)).toBe('#38BDF8');

    const invalidRgb = makeLightFixture({
      subtype: 'led_strip',
      capabilities: ['power', 'rgb'],
      colorMode: 'rgb',
      colorHex: 'invalid',
    });
    expect(resolveLightTargetColorHex(invalidRgb)).toBe(DEFAULT_WARM_LIGHT_HEX);
  });

  it('calcula intensidade zero desligada, escala monotônica por brilho e perfis por cômodo/subtipo', () => {
    expect(computeTargetLightIntensity(undefined)).toEqual({
      lightIntensity: 0,
      emissiveIntensity: 0,
    });

    const offLight = makeLightFixture({ isOn: false, brightness: 100 });
    expect(computeTargetLightIntensity(offLight)).toEqual({
      lightIntensity: 0,
      emissiveIntensity: 0,
    });

    const at20 = computeTargetLightIntensity(makeLightFixture({ brightness: 20 }));
    const at60 = computeTargetLightIntensity(makeLightFixture({ brightness: 60 }));
    const at100 = computeTargetLightIntensity(makeLightFixture({ brightness: 100 }));
    expect(at20.lightIntensity).toBeGreaterThan(0);
    expect(at20.lightIntensity).toBeLessThan(at60.lightIntensity);
    expect(at60.lightIntensity).toBeLessThan(at100.lightIntensity);
    expect(at20.emissiveIntensity).toBeLessThan(at100.emissiveIntensity);

    const powerOnlyFixture = makeLightFixture({
      roomId: 'varanda',
      capabilities: ['power'],
      brightness: 10,
    });
    const compactProfile = resolveLightProfile(powerOnlyFixture);
    expect(compactProfile.hasBouncePlane).toBe(false);
    expect(computeTargetLightIntensity(powerOnlyFixture)).toEqual({
      lightIntensity: compactProfile.maxIntensity,
      emissiveIntensity: compactProfile.maxEmissiveIntensity,
    });

    const salaProfile = resolveLightProfile(makeLightFixture({ roomId: 'sala' }));
    const suiteProfile = resolveLightProfile(makeLightFixture({ roomId: 'suite' }));
    const ledProfile = resolveLightProfile(makeLightFixture({ subtype: 'led_strip' }));

    expect(compactProfile.maxIntensity).toBeLessThan(salaProfile.maxIntensity);
    expect(salaProfile.maxIntensity).toBeLessThan(suiteProfile.maxIntensity);
    expect(ledProfile.hasBouncePlane).toBe(true);
    expect(ledProfile.maxEmissiveIntensity).toBeGreaterThan(0);
  });

  it('cria ShaderMaterial aditivo para light bounce de led_strip inicializado apagado', () => {
    const material = createLedBouncePlaneMaterial();
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.uniforms.uColor.value).toBeInstanceOf(THREE.Color);
    expect(material.uniforms.uOpacity.value).toBe(0);

    material.dispose();
  });

  it('vincula todas as 9 luzes da planta FINAL 02 a nós *__LIGHT_ORIGIN e *__EMISSIVE apagados no boot', () => {
    const root = buildProceduralApartment(floorplanConfig);
    const parsed = parseApartmentScene(root, floorplanConfig);
    const lightDevices = createInitialDevicesFromConfig(floorplanConfig).filter(
      (device): device is LightDevice => device.type === 'light',
    );

    expect(lightDevices).toHaveLength(9);

    for (const lightDevice of lightDevices) {
      const node = parsed.devices.get(lightDevice.id);
      expect(node).toBeDefined();
      expect(node?.lightOrigin).not.toBeNull();
      expect(node?.emissiveMesh).not.toBeNull();
      expect(node?.emissiveMesh?.material).toBeInstanceOf(THREE.MeshStandardMaterial);

      const mat = node!.emissiveMesh!.material as THREE.MeshStandardMaterial;
      expect(mat.emissiveIntensity).toBe(0);
    }

    disposeSceneResources(root);
  });
});
