import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { floorplanConfig } from '../../src/domain/floorplan';
import { buildProceduralApartment, disposeSceneResources } from '../../src/scene/buildProceduralApartment';
import { projectWorldPointToScreen } from '../../src/scene/MarkerProjector';
import { parseApartmentScene } from '../../src/scene/parseApartmentScene';

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

describe('MarkerProjector e Marcadores 3D', () => {
  it('projeta ponto no centro da câmera exatamente para o centro da viewport', () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 50);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const scratch = new THREE.Vector3();
    const res = projectWorldPointToScreen(new THREE.Vector3(0, 0, 0), camera, 1440, 810, scratch);

    expect(res.visible).toBe(true);
    expect(res.x).toBeCloseTo(720, 2);
    expect(res.y).toBeCloseTo(405, 2);
  });

  it('oculta pontos posicionados atrás da câmera', () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const scratch = new THREE.Vector3();
    const behind = projectWorldPointToScreen(new THREE.Vector3(0, 0, 15), camera, 800, 800, scratch);
    expect(behind.visible).toBe(false);
  });

  it('projeta todas as 11 âncoras da unidade FINAL 02 dentro da visão geral CAM__all', () => {
    const root = buildProceduralApartment(floorplanConfig);
    const parsed = parseApartmentScene(root, floorplanConfig);
    const presetAll = parsed.cameras.get('all');
    expect(presetAll).toBeDefined();

    const camera = new THREE.PerspectiveCamera(42, 1440 / 900, 0.1, 60);
    camera.position.copy(presetAll!.position);
    camera.lookAt(presetAll!.target);
    camera.updateMatrixWorld(true);

    const worldPos = new THREE.Vector3();
    const scratch = new THREE.Vector3();

    for (const node of parsed.devices.values()) {
      expect(node.anchor).not.toBeNull();
      node.anchor!.getWorldPosition(worldPos);
      const projected = projectWorldPointToScreen(worldPos, camera, 1440, 900, scratch);
      expect(projected.visible).toBe(true);
      expect(projected.x).toBeGreaterThan(0);
      expect(projected.x).toBeLessThan(1440);
      expect(projected.y).toBeGreaterThan(0);
      expect(projected.y).toBeLessThan(900);
    }

    disposeSceneResources(root);
  });

  it('proíbe uso de <Html> do drei em src/scene e src/ui', () => {
    const rootDir = resolve(__dirname, '../..');
    const files = [
      ...listSourceFiles(resolve(rootDir, 'src/scene')),
      ...listSourceFiles(resolve(rootDir, 'src/ui')),
    ];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toMatch(/<Html[\s>]/);
    }
  });
});
