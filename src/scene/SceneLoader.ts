import type * as THREE from 'three';
import { floorplanConfig } from '../domain/floorplan';
import type { FloorplanConfig } from '../domain/types';
import { buildProceduralApartment } from './buildProceduralApartment';
import { parseApartmentScene, type ParsedApartmentScene } from './parseApartmentScene';

export type SceneSource = 'procedural' | 'glb';

export interface SceneLoadOptions {
  source: SceneSource;
  glbUrl?: string;
  config?: FloorplanConfig;
}

/**
 * Carregador plug-and-play que entrega o mesmo contrato Scene Graph (`DEV__*`)
 * tanto na geração procedural da V1 quanto em uma futura substituição por `.glb`.
 */
export async function loadApartmentScene(options: SceneLoadOptions): Promise<ParsedApartmentScene> {
  const config = options.config ?? floorplanConfig;

  if (options.source === 'procedural') {
    const root = buildProceduralApartment(config);
    return parseApartmentScene(root, config);
  }

  if (!options.glbUrl) {
    throw new Error('glbUrl é obrigatório quando SceneSource === "glb".');
  }

  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(options.glbUrl);
  const root: THREE.Group = gltf.scene;
  return parseApartmentScene(root, config);
}
