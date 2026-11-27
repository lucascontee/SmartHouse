import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { floorplanConfig } from '../../src/domain/floorplan';
import { buildAirflowRibbonsGeometry } from '../../src/scene/AirflowEffect';
import { resolveMaxActiveDynamicLights } from '../../src/scene/ApartmentCanvas';
import { buildProceduralApartment, disposeSceneResources } from '../../src/scene/buildProceduralApartment';

function countGeometryTriangles(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) {
    return index.count / 3;
  }
  const pos = geometry.getAttribute('position');
  return pos ? pos.count / 3 : 0;
}

describe('Orçamento de Performance WebGL e Integridade PWA', () => {
  it('mantém a cena procedural + fios de ar dentro do teto de draw calls e triângulos', () => {
    const root = buildProceduralApartment(floorplanConfig);
    const airflowGeo = buildAirflowRibbonsGeometry(5, 24);

    let meshCount = 0;
    let totalTriangles = 0;

    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshCount += 1;
        totalTriangles += countGeometryTriangles(obj.geometry);
      }
    });

    // Soma a malha dos fios de ar montada em runtime por AirflowEffect
    const runtimeDrawCallsEstimate = meshCount + 1;
    const runtimeTrianglesEstimate = totalTriangles + countGeometryTriangles(airflowGeo);

    expect(runtimeDrawCallsEstimate).toBeLessThanOrEqual(45);
    expect(runtimeDrawCallsEstimate).toBeLessThanOrEqual(60);
    expect(runtimeTrianglesEstimate).toBeGreaterThan(0);
    expect(runtimeTrianglesEstimate).toBeLessThan(45000);

    airflowGeo.dispose();
    disposeSceneResources(root);
  });

  it('ativa pooling de no máximo 6 luzes dinâmicas no mobile (<= 768px) e 9 no desktop', () => {
    expect(resolveMaxActiveDynamicLights(1440)).toBe(9);
    expect(resolveMaxActiveDynamicLights(1024)).toBe(9);
    expect(resolveMaxActiveDynamicLights(768)).toBe(6);
    expect(resolveMaxActiveDynamicLights(390)).toBe(6);
  });

  it('garante presença dos ícones PWA referenciados no manifest e ausência de .taste-skill/build.json', () => {
    const iconPaths = ['public/icons/icon.svg', 'public/icons/icon-192.png', 'public/icons/icon-512.png'];

    for (const relPath of iconPaths) {
      const absPath = path.resolve(relPath);
      expect(fs.existsSync(absPath)).toBe(true);
      expect(fs.statSync(absPath).size).toBeGreaterThan(0);
    }

    expect(fs.existsSync(path.resolve('.taste-skill/build.json'))).toBe(false);
  });
});
