import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { floorplanConfig } from '../../src/domain/floorplan';
import {
  buildProceduralApartment,
  disposeSceneResources,
} from '../../src/scene/buildProceduralApartment';
import { findDeviceIdFromObject, parseApartmentScene } from '../../src/scene/parseApartmentScene';
import { loadApartmentScene } from '../../src/scene/SceneLoader';

describe('Cena 3D Procedural (FINAL 02) & SceneLoader', () => {
  it('gera os 8 cômodos, câmeras preset e todos os 11 nós DEV__* com __ANCHOR', async () => {
    const parsed = await loadApartmentScene({ source: 'procedural' });

    expect(parsed.missingDeviceIds).toEqual([]);
    expect(parsed.devices.size).toBe(11);
    expect(parsed.rooms.size).toBe(8);

    expect(parsed.cameras.has('all')).toBe(true);
    for (const room of floorplanConfig.rooms) {
      expect(parsed.rooms.has(room.id)).toBe(true);
      expect(parsed.cameras.has(room.id)).toBe(true);
    }

    for (const devCfg of floorplanConfig.devices) {
      const node = parsed.devices.get(devCfg.id);
      expect(node).toBeDefined();
      expect(node?.anchor).not.toBeNull();
      expect(node?.emissiveMesh).not.toBeNull();
      if (devCfg.type === 'light') {
        expect(node?.lightOrigin).not.toBeNull();
      }
    }

    disposeSceneResources(parsed.root);
  });

  it('modela a extensão da reforma (0,75m x 1,45m) com dimensões exatas', () => {
    const root = buildProceduralApartment(floorplanConfig);
    root.updateMatrixWorld(true);

    const extension = root.getObjectByName('PARTITION__parede_cozinha_sala_extensao');
    expect(extension).toBeInstanceOf(THREE.Mesh);

    const box = new THREE.Box3().setFromObject(extension!);
    const size = new THREE.Vector3();
    box.getSize(size);

    expect(size.x).toBeCloseTo(0.1, 3);
    expect(size.y).toBeCloseTo(1.45, 3);
    expect(size.z).toBeCloseTo(0.75, 3);

    disposeSceneResources(root);
  });

  it('posiciona DEV__ac_sala acima de DEV__tv_sala com __AIR_ORIGIN apontando para -X', () => {
    const root = buildProceduralApartment(floorplanConfig);
    const parsed = parseApartmentScene(root, floorplanConfig);

    const ac = parsed.devices.get('DEV__ac_sala');
    const tv = parsed.devices.get('DEV__tv_sala');
    expect(ac?.airOrigin).not.toBeNull();

    const acPos = new THREE.Vector3();
    const tvPos = new THREE.Vector3();
    ac!.root.getWorldPosition(acPos);
    tv!.root.getWorldPosition(tvPos);
    expect(acPos.y).toBeGreaterThan(tvPos.y);

    const forward = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion();
    ac!.airOrigin!.getWorldQuaternion(quat);
    forward.applyQuaternion(quat).normalize();

    expect(forward.x).toBeCloseTo(-1, 3);
    expect(forward.y).toBeCloseTo(0, 3);
    expect(forward.z).toBeCloseTo(0, 3);

    disposeSceneResources(root);
  });

  it('resolve raycasting de malha filha __EMISSIVE para o dispositivo pai e respeita orçamento de draw calls', () => {
    const root = buildProceduralApartment(floorplanConfig);
    const parsed = parseApartmentScene(root, floorplanConfig);

    const tv = parsed.devices.get('DEV__tv_sala');
    expect(findDeviceIdFromObject(tv!.emissiveMesh)).toBe('DEV__tv_sala');

    let meshCount = 0;
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount += 1;
    });
    expect(meshCount).toBeLessThanOrEqual(45);

    disposeSceneResources(root);
  });
});
