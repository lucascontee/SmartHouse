import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { floorplanConfig } from '../../src/domain/floorplan';
import {
  buildAirflowRibbonsGeometry,
  createAirflowShaderMaterial,
  getAirflowSpeedForFan,
} from '../../src/scene/AirflowEffect';
import { resolveCanvasFrameloop } from '../../src/scene/ApartmentCanvas';
import { buildProceduralApartment, disposeSceneResources } from '../../src/scene/buildProceduralApartment';
import { parseApartmentScene } from '../../src/scene/parseApartmentScene';
import { resolveTvLightWorldPosition } from '../../src/scene/TvScreenEffect';

describe('AirflowEffect ("Fios de Ar"), TvScreenEffect e Frameloop Pause', () => {
  it('gera geometria única de fios de ar projetada em -X acima do topo da TV (1,56m)', () => {
    const geometry = buildAirflowRibbonsGeometry(5, 24);
    expect(geometry.getAttribute('position')).toBeDefined();
    expect(geometry.getAttribute('uv')).toBeDefined();
    expect(geometry.getAttribute('aPhase')).toBeDefined();

    const triCount = (geometry.getIndex()?.count ?? 0) / 3;
    expect(triCount).toBeGreaterThan(0);
    expect(triCount).toBeLessThanOrEqual(400);

    const root = buildProceduralApartment(floorplanConfig);
    const parsed = parseApartmentScene(root, floorplanConfig);
    const ac = parsed.devices.get('DEV__ac_sala');
    const tv = parsed.devices.get('DEV__tv_sala');
    expect(ac?.airOrigin).not.toBeNull();
    expect(tv?.emissiveMesh).not.toBeNull();

    ac!.airOrigin!.updateWorldMatrix(true, false);
    const originWorld = new THREE.Vector3();
    ac!.airOrigin!.getWorldPosition(originWorld);

    const tvBox = new THREE.Box3().setFromObject(tv!.root);

    const posAttr = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i += 1) {
      vertex.fromBufferAttribute(posAttr, i);
      expect(vertex.z).toBeGreaterThan(0);

      vertex.applyMatrix4(ac!.airOrigin!.matrixWorld);
      expect(vertex.x).toBeLessThan(originWorld.x);
      expect(vertex.y).toBeGreaterThan(tvBox.max.y);
    }

    geometry.dispose();
    disposeSceneResources(root);
  });

  it('configura ShaderMaterial leve transparente sem depthWrite e velocidades por fanSpeed', () => {
    const material = createAirflowShaderMaterial();
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.uniforms.uTime).toBeDefined();
    expect(material.uniforms.uOpacity).toBeDefined();
    expect(material.uniforms.uSpeed).toBeDefined();
    expect(material.uniforms.uColor).toBeDefined();
    expect(material.uniforms.uReducedMotion).toBeDefined();

    const low = getAirflowSpeedForFan('low', false);
    const medium = getAirflowSpeedForFan('medium', false);
    const high = getAirflowSpeedForFan('high', false);
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);

    expect(getAirflowSpeedForFan('high', true)).toBeLessThanOrEqual(0.05);

    material.dispose();
  });

  it('posiciona a luz frontal da TV na direção -X e pausa o frameloop quando document.hidden=true', () => {
    const root = buildProceduralApartment(floorplanConfig);
    const parsed = parseApartmentScene(root, floorplanConfig);
    const tv = parsed.devices.get('DEV__tv_sala')!;

    const tvPos = new THREE.Vector3();
    tv.root.getWorldPosition(tvPos);

    const bouncePos = resolveTvLightWorldPosition(tv, 0.38);
    expect(bouncePos.x).toBeLessThan(tvPos.x);
    expect(bouncePos.y).toBeCloseTo(tvPos.y, 3);
    expect(bouncePos.z).toBeCloseTo(tvPos.z, 3);

    expect(resolveCanvasFrameloop(true)).toBe('never');
    expect(resolveCanvasFrameloop(false)).toBe('always');

    disposeSceneResources(root);
  });
});
