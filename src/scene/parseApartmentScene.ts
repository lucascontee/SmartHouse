import * as THREE from 'three';
import { floorplanConfig } from '../domain/floorplan';
import type { FloorplanConfig } from '../domain/types';

export interface ParsedDeviceNode {
  id: string;
  root: THREE.Object3D;
  anchor: THREE.Object3D | null;
  emissiveMesh: THREE.Mesh | null;
  lightOrigin: THREE.Object3D | null;
  airOrigin: THREE.Object3D | null;
}

export interface CameraPreset {
  roomId: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface ParsedApartmentScene {
  root: THREE.Group;
  rooms: Map<string, THREE.Object3D>;
  cameras: Map<string, CameraPreset>;
  devices: Map<string, ParsedDeviceNode>;
  missingDeviceIds: string[];
}

const FUNCTIONAL_SUFFIXES = [
  '__ANCHOR',
  '__EMISSIVE',
  '__LIGHT_ORIGIN',
  '__AIR_ORIGIN',
] as const;

function stripSuffix(name: string, suffix: string): string {
  return name.slice(0, -suffix.length);
}

function isFunctionalNode(name: string): boolean {
  return FUNCTIONAL_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function ensureDeviceEntry(map: Map<string, ParsedDeviceNode>, id: string, fallbackRoot: THREE.Object3D): ParsedDeviceNode {
  let entry = map.get(id);
  if (!entry) {
    entry = {
      id,
      root: fallbackRoot,
      anchor: null,
      emissiveMesh: null,
      lightOrigin: null,
      airOrigin: null,
    };
    map.set(id, entry);
  }
  return entry;
}

/**
 * Sobe na hierarquia a partir do objeto atingido pelo raycast até encontrar o nó `DEV__*` pai.
 */
export function findDeviceIdFromObject(object: THREE.Object3D | null): string | null {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor.name.startsWith('DEV__') && !isFunctionalNode(cursor.name)) {
      return cursor.name;
    }
    cursor = cursor.parent;
  }
  return null;
}

/**
 * Percorre o Scene Graph (`procedural` ou `.glb`) e vincula cômodos, câmeras e nós `DEV__*`.
 */
export function parseApartmentScene(
  root: THREE.Group,
  config: FloorplanConfig = floorplanConfig,
): ParsedApartmentScene {
  root.updateMatrixWorld(true);

  const rooms = new Map<string, THREE.Object3D>();
  const camPositions = new Map<string, THREE.Object3D>();
  const camTargets = new Map<string, THREE.Object3D>();
  const devices = new Map<string, ParsedDeviceNode>();

  root.traverse((obj) => {
    const { name } = obj;
    if (!name) return;

    if (name.startsWith('ROOM__')) {
      rooms.set(name.slice('ROOM__'.length), obj);
      return;
    }

    if (name.startsWith('CAM_TARGET__')) {
      camTargets.set(name.slice('CAM_TARGET__'.length), obj);
      return;
    }

    if (name.startsWith('CAM__')) {
      camPositions.set(name.slice('CAM__'.length), obj);
      return;
    }

    if (!name.startsWith('DEV__')) return;

    if (name.endsWith('__ANCHOR')) {
      const id = stripSuffix(name, '__ANCHOR');
      const entry = ensureDeviceEntry(devices, id, obj.parent ?? obj);
      entry.anchor = obj;
      return;
    }

    if (name.endsWith('__EMISSIVE')) {
      const id = stripSuffix(name, '__EMISSIVE');
      const entry = ensureDeviceEntry(devices, id, obj.parent ?? obj);
      if (obj instanceof THREE.Mesh) {
        entry.emissiveMesh = obj;
      }
      return;
    }

    if (name.endsWith('__LIGHT_ORIGIN')) {
      const id = stripSuffix(name, '__LIGHT_ORIGIN');
      const entry = ensureDeviceEntry(devices, id, obj.parent ?? obj);
      entry.lightOrigin = obj;
      return;
    }

    if (name.endsWith('__AIR_ORIGIN')) {
      const id = stripSuffix(name, '__AIR_ORIGIN');
      const entry = ensureDeviceEntry(devices, id, obj.parent ?? obj);
      entry.airOrigin = obj;
      return;
    }

    const entry = ensureDeviceEntry(devices, name, obj);
    entry.root = obj;
  });

  const cameras = new Map<string, CameraPreset>();
  for (const [roomId, camObj] of camPositions.entries()) {
    const pos = new THREE.Vector3();
    camObj.getWorldPosition(pos);

    const target = new THREE.Vector3();
    const targetObj = camTargets.get(roomId);
    if (targetObj) {
      targetObj.getWorldPosition(target);
    }

    cameras.set(roomId, { roomId, position: pos, target });
  }

  const missingDeviceIds: string[] = [];
  for (const deviceCfg of config.devices) {
    const parsed = devices.get(deviceCfg.id);
    if (!parsed || !parsed.anchor) {
      missingDeviceIds.push(deviceCfg.id);
    }
  }

  if (missingDeviceIds.length > 0 && import.meta.env?.DEV) {
    console.warn(
      `[parseApartmentScene] Dispositivos sem nó ou __ANCHOR na cena 3D: ${missingDeviceIds.join(', ')}`,
    );
  }

  return {
    root,
    rooms,
    cameras,
    devices,
    missingDeviceIds,
  };
}
