import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { ParsedDeviceNode } from './parseApartmentScene';

export interface ProjectedScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Projeta um ponto 3D no espaço do mundo para coordenadas de tela (px) sem alocar novos vetores.
 */
export function projectWorldPointToScreen(
  worldPoint: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  scratch: THREE.Vector3,
): ProjectedScreenPoint {
  scratch.copy(worldPoint).project(camera);

  const visible =
    scratch.z >= -1 &&
    scratch.z <= 1 &&
    Math.abs(scratch.x) <= 1.15 &&
    Math.abs(scratch.y) <= 1.15;

  return {
    x: (scratch.x * 0.5 + 0.5) * width,
    y: (-scratch.y * 0.5 + 0.5) * height,
    visible,
  };
}

export interface MarkerProjectorProps {
  devices: Map<string, ParsedDeviceNode>;
  markerElementsRef: RefObject<Map<string, HTMLButtonElement>>;
}

export function MarkerProjector({ devices, markerElementsRef }: MarkerProjectorProps) {
  const worldPosRef = useRef(new THREE.Vector3());
  const scratchProjectedRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    const elements = markerElementsRef.current;
    if (!elements || elements.size === 0) return;

    const { width, height } = state.size;
    if (width <= 0 || height <= 0) return;

    for (const node of devices.values()) {
      const el = elements.get(node.id);
      if (!el || !node.anchor) continue;

      node.anchor.getWorldPosition(worldPosRef.current);
      const projected = projectWorldPointToScreen(
        worldPosRef.current,
        state.camera,
        width,
        height,
        scratchProjectedRef.current,
      );

      if (!projected.visible) {
        if (el.style.visibility !== 'hidden') {
          el.style.visibility = 'hidden';
        }
        continue;
      }

      if (el.style.visibility !== 'visible') {
        el.style.visibility = 'visible';
      }
      el.style.transform = `translate3d(${projected.x.toFixed(1)}px, ${projected.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}
