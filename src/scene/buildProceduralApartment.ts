import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { floorplanConfig } from '../domain/floorplan';
import type {
  FacingDirection,
  FloorplanConfig,
  FloorplanDeviceConfig,
  FloorplanOpening,
  FloorplanRoom,
  RectBounds,
} from '../domain/types';

interface OpeningSpan {
  opening: FloorplanOpening;
  start: number;
  end: number;
}

const DOOR_CLEARANCE_H = 2.1;
const WINDOW_SILL_H = 1.05;
const WINDOW_HEAD_H = 2.2;
const BALCONY_WINDOW_SILL_H = 1.05;
const BALCONY_WINDOW_HEAD_H = 2.45;
const FLOOR_THICKNESS = 0.08;

function pushBox(
  target: THREE.BufferGeometry[],
  width: number,
  height: number,
  depth: number,
  centerX: number,
  centerY: number,
  centerZ: number,
): void {
  if (width <= 0.001 || height <= 0.001 || depth <= 0.001) return;
  const geom = new THREE.BoxGeometry(width, height, depth);
  geom.translate(centerX, centerY, centerZ);
  target.push(geom);
}

function mergeOrNull(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();
  return merged;
}

function resolveOpeningSpan(
  opening: FloorplanOpening,
  axisMin: number,
  axisMax: number,
): OpeningSpan {
  const coord = opening.wall.endsWith('_leste') || opening.wall.endsWith('_oeste') ? opening.z : opening.x;
  const half = opening.width / 2;

  // Portas internas centradas no vão (ex.: banheiros/suíte/quarto_2) usam coord como centro quando start ultrapassa a parede
  const asStartEnd = coord + opening.width;
  const fitsAsStart = coord >= axisMin - 0.001 && asStartEnd <= axisMax + 0.001;
  const fitsAsCenter = coord - half >= axisMin - 0.001 && coord + half <= axisMax + 0.001;

  if (!fitsAsStart && fitsAsCenter) {
    return { opening, start: coord - half, end: coord + half };
  }
  if (opening.wall.startsWith('circ_') || opening.id === 'porta_banheiro_suite') {
    if (fitsAsCenter) {
      return { opening, start: coord - half, end: coord + half };
    }
  }

  return {
    opening,
    start: Math.max(axisMin, coord),
    end: Math.min(axisMax, asStartEnd),
  };
}

function addWallAlongX(
  wallGeoms: THREE.BufferGeometry[],
  frameGeoms: THREE.BufferGeometry[],
  glassGeoms: THREE.BufferGeometry[],
  x1: number,
  x2: number,
  zCenter: number,
  thickness: number,
  ceilingHeight: number,
  openings: FloorplanOpening[],
): void {
  const spans = openings
    .map((o) => resolveOpeningSpan(o, x1, x2))
    .sort((a, b) => a.start - b.start);

  let cursor = x1;
  for (const span of spans) {
    if (span.start > cursor + 0.005) {
      const segW = span.start - cursor;
      pushBox(wallGeoms, segW, ceilingHeight, thickness, cursor + segW / 2, ceilingHeight / 2, zCenter);
    }

    const opW = span.end - span.start;
    const opCenterX = span.start + opW / 2;

    if (span.opening.type === 'window') {
      const sill = span.opening.id === 'janela_varanda' ? BALCONY_WINDOW_SILL_H : WINDOW_SILL_H;
      const head = span.opening.id === 'janela_varanda' ? BALCONY_WINDOW_HEAD_H : WINDOW_HEAD_H;
      pushBox(wallGeoms, opW, sill, thickness, opCenterX, sill / 2, zCenter);
      pushBox(
        wallGeoms,
        opW,
        ceilingHeight - head,
        thickness,
        opCenterX,
        head + (ceilingHeight - head) / 2,
        zCenter,
      );
      pushBox(frameGeoms, opW, 0.04, thickness * 0.65, opCenterX, sill + 0.02, zCenter);
      pushBox(frameGeoms, opW, 0.04, thickness * 0.65, opCenterX, head - 0.02, zCenter);
      pushBox(glassGeoms, opW - 0.04, head - sill - 0.08, 0.02, opCenterX, (sill + head) / 2, zCenter);
    } else {
      pushBox(
        wallGeoms,
        opW,
        ceilingHeight - DOOR_CLEARANCE_H,
        thickness,
        opCenterX,
        DOOR_CLEARANCE_H + (ceilingHeight - DOOR_CLEARANCE_H) / 2,
        zCenter,
      );
      pushBox(frameGeoms, 0.04, DOOR_CLEARANCE_H, thickness * 0.85, span.start + 0.02, DOOR_CLEARANCE_H / 2, zCenter);
      pushBox(frameGeoms, 0.04, DOOR_CLEARANCE_H, thickness * 0.85, span.end - 0.02, DOOR_CLEARANCE_H / 2, zCenter);

      if (span.opening.type === 'sliding_door') {
        pushBox(glassGeoms, opW - 0.08, DOOR_CLEARANCE_H - 0.06, 0.025, opCenterX, DOOR_CLEARANCE_H / 2, zCenter);
      }
    }

    cursor = Math.max(cursor, span.end);
  }

  if (x2 > cursor + 0.005) {
    const tailW = x2 - cursor;
    pushBox(wallGeoms, tailW, ceilingHeight, thickness, cursor + tailW / 2, ceilingHeight / 2, zCenter);
  }
}

function addWallAlongZ(
  wallGeoms: THREE.BufferGeometry[],
  frameGeoms: THREE.BufferGeometry[],
  glassGeoms: THREE.BufferGeometry[],
  z1: number,
  z2: number,
  xCenter: number,
  thickness: number,
  ceilingHeight: number,
  openings: FloorplanOpening[],
): void {
  const spans = openings
    .map((o) => resolveOpeningSpan(o, z1, z2))
    .sort((a, b) => a.start - b.start);

  let cursor = z1;
  for (const span of spans) {
    if (span.start > cursor + 0.005) {
      const segD = span.start - cursor;
      pushBox(wallGeoms, thickness, ceilingHeight, segD, xCenter, ceilingHeight / 2, cursor + segD / 2);
    }

    const opD = span.end - span.start;
    const opCenterZ = span.start + opD / 2;

    if (span.opening.type === 'window') {
      pushBox(wallGeoms, thickness, WINDOW_SILL_H, opD, xCenter, WINDOW_SILL_H / 2, opCenterZ);
      pushBox(
        wallGeoms,
        thickness,
        ceilingHeight - WINDOW_HEAD_H,
        opD,
        xCenter,
        WINDOW_HEAD_H + (ceilingHeight - WINDOW_HEAD_H) / 2,
        opCenterZ,
      );
      pushBox(frameGeoms, thickness * 0.65, 0.04, opD, xCenter, WINDOW_SILL_H + 0.02, opCenterZ);
      pushBox(frameGeoms, thickness * 0.65, 0.04, opD, xCenter, WINDOW_HEAD_H - 0.02, opCenterZ);
      pushBox(
        glassGeoms,
        0.02,
        WINDOW_HEAD_H - WINDOW_SILL_H - 0.08,
        opD - 0.04,
        xCenter,
        (WINDOW_SILL_H + WINDOW_HEAD_H) / 2,
        opCenterZ,
      );
    } else {
      pushBox(
        wallGeoms,
        thickness,
        ceilingHeight - DOOR_CLEARANCE_H,
        opD,
        xCenter,
        DOOR_CLEARANCE_H + (ceilingHeight - DOOR_CLEARANCE_H) / 2,
        opCenterZ,
      );
      pushBox(frameGeoms, thickness * 0.85, DOOR_CLEARANCE_H, 0.04, xCenter, DOOR_CLEARANCE_H / 2, span.start + 0.02);
      pushBox(frameGeoms, thickness * 0.85, DOOR_CLEARANCE_H, 0.04, xCenter, DOOR_CLEARANCE_H / 2, span.end - 0.02);
    }

    cursor = Math.max(cursor, span.end);
  }

  if (z2 > cursor + 0.005) {
    const tailD = z2 - cursor;
    pushBox(wallGeoms, thickness, ceilingHeight, tailD, xCenter, ceilingHeight / 2, cursor + tailD / 2);
  }
}

function getRoomSegments(room: FloorplanRoom): RectBounds[] {
  return room.shape === 'L' ? room.segments : [room.bounds];
}

function getRoomCenter(room: FloorplanRoom): [number, number] {
  if (room.id === 'suite' && room.shape === 'L') {
    const main = room.segments[0];
    return [main.x + main.w * 0.45, main.z + main.d * 0.55];
  }
  const seg = getRoomSegments(room)[0];
  return [seg.x + seg.w / 2, seg.z + seg.d / 2];
}

function facingToRotationY(facing?: FacingDirection): number {
  switch (facing) {
    case '-X':
      return -Math.PI / 2;
    case '+X':
      return Math.PI / 2;
    case '-Z':
      return Math.PI;
    case '+Z':
    default:
      return 0;
  }
}

function createDeviceAssembly(
  cfg: FloorplanDeviceConfig,
  materials: {
    housingMat: THREE.Material;
    bezelMat: THREE.Material;
  },
): THREE.Group {
  const group = new THREE.Group();
  group.name = cfg.id;
  group.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
  group.rotation.y = facingToRotationY(cfg.facing);

  if (cfg.type === 'light') {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16), materials.housingMat);
    housing.position.set(0, 0.02, 0);
    group.add(housing);

    const emissiveMat = new THREE.MeshStandardMaterial({
      color: '#D4D4D8',
      emissive: '#FFE8CC',
      emissiveIntensity: 0,
      roughness: 0.35,
      metalness: 0.05,
    });
    const diffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 16), emissiveMat);
    diffuser.name = `${cfg.id}__EMISSIVE`;
    diffuser.position.set(0, -0.005, 0);
    group.add(diffuser);

    const anchor = new THREE.Object3D();
    anchor.name = `${cfg.id}__ANCHOR`;
    anchor.position.set(0, -0.15, 0);
    group.add(anchor);

    const lightOrigin = new THREE.Object3D();
    lightOrigin.name = `${cfg.id}__LIGHT_ORIGIN`;
    lightOrigin.position.set(0, -0.14, 0);
    group.add(lightOrigin);

    return group;
  }

  if (cfg.type === 'ac') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.28, 0.2), materials.housingMat);
    body.position.set(0, 0, 0.07);
    group.add(body);

    const stripMat = new THREE.MeshStandardMaterial({
      color: '#52525B',
      emissive: '#E4E4E7',
      emissiveIntensity: 0,
      roughness: 0.3,
    });
    const statusStrip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.015), stripMat);
    statusStrip.name = `${cfg.id}__EMISSIVE`;
    statusStrip.position.set(0, -0.07, 0.172);
    group.add(statusStrip);

    const anchor = new THREE.Object3D();
    anchor.name = `${cfg.id}__ANCHOR`;
    anchor.position.set(0, 0.22, 0.16);
    group.add(anchor);

    const airOrigin = new THREE.Object3D();
    airOrigin.name = `${cfg.id}__AIR_ORIGIN`;
    // Local +Z aponta para -X no mundo (facing "-X") acima da TV
    airOrigin.position.set(0, -0.09, 0.18);
    group.add(airOrigin);

    return group;
  }

  // TV
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.72, 0.04), materials.bezelMat);
  bezel.position.set(0, 0, -0.01);
  group.add(bezel);

  const screenMat = new THREE.MeshStandardMaterial({
    color: '#08080A',
    emissive: '#D4E4FF',
    emissiveIntensity: 0,
    roughness: 0.12,
    metalness: 0.2,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.66), screenMat);
  screen.name = `${cfg.id}__EMISSIVE`;
  screen.position.set(0, 0, 0.012);
  group.add(screen);

  const anchor = new THREE.Object3D();
  anchor.name = `${cfg.id}__ANCHOR`;
  anchor.position.set(0, 0.44, 0.05);
  group.add(anchor);

  return group;
}

/**
 * Constrói a planta 3D procedural fiel à unidade FINAL 02 seguindo exatamente o contrato DEV__*.
 */
export function buildProceduralApartment(config: FloorplanConfig = floorplanConfig): THREE.Group {
  const root = new THREE.Group();
  root.name = 'APARTMENT_ROOT';

  const { ceilingHeight, wallThickness, footprint } = config.meta;
  const offsetX = -footprint.internalWidthX / 2;
  const offsetZ = -footprint.rightDepthZ / 2;

  const model = new THREE.Group();
  model.name = 'FINAL_02_LOCAL';
  model.position.set(offsetX, 0, offsetZ);
  root.add(model);

  const openingsByWall = new Map<string, FloorplanOpening[]>();
  for (const op of config.openings) {
    const list = openingsByWall.get(op.wall) ?? [];
    list.push(op);
    openingsByWall.set(op.wall, list);
  }
  const wallOps = (wall: string) => openingsByWall.get(wall) ?? [];

  // Materiais sóbrios arquitetônicos para alto contraste com iluminação reativa
  const dryFloorMat = new THREE.MeshStandardMaterial({ color: '#242429', roughness: 0.86, metalness: 0.05 });
  const wetFloorMat = new THREE.MeshStandardMaterial({ color: '#1B1B20', roughness: 0.65, metalness: 0.08 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#33333A', roughness: 0.88, metalness: 0.04 });
  const partitionMat = new THREE.MeshStandardMaterial({ color: '#3E3E47', roughness: 0.82, metalness: 0.05 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.5, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#94A3B8',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.22,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#2B2724', roughness: 0.78, metalness: 0.05 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: '#262830', roughness: 0.92, metalness: 0.02 });
  const housingMat = new THREE.MeshStandardMaterial({ color: '#E4E4E7', roughness: 0.35, metalness: 0.2 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.3, metalness: 0.35 });

  const dryFloorGeoms: THREE.BufferGeometry[] = [];
  const wetFloorGeoms: THREE.BufferGeometry[] = [];
  const wallGeoms: THREE.BufferGeometry[] = [];
  const frameGeoms: THREE.BufferGeometry[] = [];
  const glassGeoms: THREE.BufferGeometry[] = [];
  const woodGeoms: THREE.BufferGeometry[] = [];
  const fabricGeoms: THREE.BufferGeometry[] = [];

  const wetRoomIds = new Set(['varanda', 'cozinha_as', 'banheiro_suite', 'banheiro_social']);

  // Grupos de cômodos + pisos + câmeras preset
  for (const room of config.rooms) {
    const roomGroup = new THREE.Group();
    roomGroup.name = `ROOM__${room.id}`;
    model.add(roomGroup);

    const floorBucket = wetRoomIds.has(room.id) ? wetFloorGeoms : dryFloorGeoms;
    for (const seg of getRoomSegments(room)) {
      pushBox(
        floorBucket,
        seg.w,
        FLOOR_THICKNESS,
        seg.d,
        seg.x + seg.w / 2,
        -FLOOR_THICKNESS / 2,
        seg.z + seg.d / 2,
      );
    }

    const [cx, cz] = getRoomCenter(room);
    const camPos = new THREE.Object3D();
    camPos.name = `CAM__${room.id}`;
    camPos.position.set(cx - 0.85, 4.3, cz + 3.25);
    model.add(camPos);

    const camTarget = new THREE.Object3D();
    camTarget.name = `CAM_TARGET__${room.id}`;
    camTarget.position.set(cx, 0.9, cz);
    model.add(camTarget);
  }

  // Câmera de visão geral ("all")
  const camAll = new THREE.Object3D();
  camAll.name = 'CAM__all';
  camAll.position.set(footprint.internalWidthX * 0.5, 8.8, footprint.rightDepthZ + 4.4);
  model.add(camAll);

  const camAllTarget = new THREE.Object3D();
  camAllTarget.name = 'CAM_TARGET__all';
  camAllTarget.position.set(footprint.internalWidthX * 0.5, 0.6, footprint.rightDepthZ * 0.48);
  model.add(camAllTarget);

  // Paredes externas (perímetro)
  const ext = wallThickness.exterior;
  const part = wallThickness.interiorPartition;
  const struct = wallThickness.interiorStructural;
  const bath = wallThickness.bathroomDivider;

  // Norte: z = -ext..0 (segmentada por varanda, banheiro suíte e suíte)
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 0, 3.35, -ext / 2, ext, ceilingHeight, wallOps('varanda_norte'));
  pushBox(wallGeoms, struct, ceilingHeight, ext, 3.35 + struct / 2, ceilingHeight / 2, -ext / 2);
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 3.5, 4.7, -ext / 2, ext, ceilingHeight, wallOps('banheiro_suite_norte'));
  pushBox(wallGeoms, bath, ceilingHeight, ext, 4.7 + bath / 2, ceilingHeight / 2, -ext / 2);
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 4.86, 7.26, -ext / 2, ext, ceilingHeight, wallOps('suite_norte'));

  // Oeste: x = -ext..0
  pushBox(wallGeoms, ext, ceilingHeight, 5.3 + 2 * ext, -ext / 2, ceilingHeight / 2, 5.3 / 2);
  // Leste: x = 7.26..7.26+ext
  pushBox(wallGeoms, ext, ceilingHeight, ext, 7.26 + ext / 2, ceilingHeight / 2, -ext / 2);
  addWallAlongZ(wallGeoms, frameGeoms, glassGeoms, 0, 6.13, 7.26 + ext / 2, ext, ceilingHeight, wallOps('quarto_2_leste'));
  pushBox(wallGeoms, ext, ceilingHeight, ext, 7.26 + ext / 2, ceilingHeight / 2, 6.13 + ext / 2);

  // Sul esquerda (z = 5.3..5.3+ext) + degrau + Sul direita (z = 6.13..6.13+ext)
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 0, 3.35, 5.3 + ext / 2, ext, ceilingHeight, wallOps('sala_sul'));
  pushBox(wallGeoms, ext, ceilingHeight, 6.13 + ext - 5.3, 3.35 + ext / 2, ceilingHeight / 2, 5.3 + (6.13 + ext - 5.3) / 2);
  pushBox(wallGeoms, 7.26 - 3.5, ceilingHeight, ext, 3.5 + (7.26 - 3.5) / 2, ceilingHeight / 2, 6.13 + ext / 2);

  // Parede entre Varanda e Cozinha/Sala (z = 0.90..1.05)
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 0, 3.35, 0.975, struct, ceilingHeight, wallOps('sala_norte'));

  // Parede estrutural vertical Sala <-> Banheiro Suíte / Suíte L / Banheiro Social (com vão aberto na circulação z=3.13..4.03)
  pushBox(wallGeoms, struct, ceilingHeight, 3.13, 3.35 + struct / 2, ceilingHeight / 2, 3.13 / 2);
  pushBox(wallGeoms, struct, ceilingHeight, 5.3 - 4.03, 3.35 + struct / 2, ceilingHeight / 2, 4.03 + (5.3 - 4.03) / 2);

  // Divisórias internas dos quartos/banheiros/circulação
  pushBox(wallGeoms, bath, ceilingHeight, 2.13, 4.7 + bath / 2, ceilingHeight / 2, 2.13 / 2);
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 3.5, 4.7, 2.08, part, ceilingHeight, wallOps('banheiro_suite_sul'));
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 3.5, 4.86, 3.055, struct, ceilingHeight, wallOps('circ_norte'));
  pushBox(wallGeoms, 7.26 - 4.86, ceilingHeight, struct, 4.86 + (7.26 - 4.86) / 2, ceilingHeight / 2, 3.055);
  addWallAlongZ(wallGeoms, frameGeoms, glassGeoms, 3.13, 4.03, 4.78, bath, ceilingHeight, wallOps('circ_leste'));
  pushBox(wallGeoms, bath, ceilingHeight, 6.13 - 4.03, 4.78, ceilingHeight / 2, 4.03 + (6.13 - 4.03) / 2);
  addWallAlongX(wallGeoms, frameGeoms, glassGeoms, 3.5, 4.7, 4.08, part, ceilingHeight, wallOps('circ_sul'));

  // customPartitions (parede cozinha/sala base + extensão da reforma 0,75m x 1,45m)
  for (const custom of config.customPartitions) {
    const dx = custom.end[0] - custom.start[0];
    const dz = custom.end[1] - custom.start[1];
    const length = Math.hypot(dx, dz);
    const cx = (custom.start[0] + custom.end[0]) / 2;
    const cz = (custom.start[1] + custom.end[1]) / 2;

    if (custom.id === 'parede_cozinha_sala_extensao') {
      const extMesh = new THREE.Mesh(
        new THREE.BoxGeometry(custom.thickness, custom.height, length),
        partitionMat,
      );
      extMesh.name = `PARTITION__${custom.id}`;
      extMesh.position.set(cx, custom.height / 2, cz);
      extMesh.rotation.y = Math.atan2(dx, dz);
      model.add(extMesh);
    } else if (Math.abs(dx) < Math.abs(dz)) {
      pushBox(wallGeoms, custom.thickness, custom.height, length, cx, custom.height / 2, cz);
    } else {
      pushBox(wallGeoms, length, custom.height, custom.thickness, cx, custom.height / 2, cz);
    }
  }

  // Mobiliário low-poly essencial por cômodo (coerente com planta e posição da TV/AC)
  // Cozinha: bancada na parede oeste
  pushBox(woodGeoms, 0.55, 0.88, 2.8, 0.275, 0.44, 2.7);
  // Sala: sofá voltado para +X (de frente para a TV em x=3.32) + mesa de centro + rack sob a TV
  pushBox(fabricGeoms, 0.85, 0.42, 2.0, 1.88, 0.21, 2.15);
  pushBox(fabricGeoms, 0.18, 0.78, 2.0, 1.54, 0.39, 2.15);
  pushBox(woodGeoms, 0.55, 0.32, 0.9, 2.55, 0.16, 2.15);
  pushBox(woodGeoms, 0.38, 0.48, 1.45, 3.16, 0.24, 2.05);
  // Suíte: cama casal encostada na parede leste
  pushBox(woodGeoms, 1.85, 0.28, 1.45, 6.28, 0.14, 1.45);
  pushBox(fabricGeoms, 1.75, 0.22, 1.38, 6.28, 0.39, 1.45);
  // Quarto 2: cama solteiro/casal compacta
  pushBox(woodGeoms, 1.75, 0.26, 1.25, 6.32, 0.13, 4.65);
  pushBox(fabricGeoms, 1.65, 0.2, 1.18, 6.32, 0.36, 4.65);
  // Banheiros: bancada compacta
  pushBox(woodGeoms, 0.42, 0.82, 0.7, 3.72, 0.41, 1.25);
  pushBox(woodGeoms, 0.42, 0.82, 0.7, 3.72, 0.41, 4.95);

  const staticBatches: Array<[string, THREE.BufferGeometry | null, THREE.Material]> = [
    ['ARCH__dry_floors', mergeOrNull(dryFloorGeoms), dryFloorMat],
    ['ARCH__wet_floors', mergeOrNull(wetFloorGeoms), wetFloorMat],
    ['ARCH__walls', mergeOrNull(wallGeoms), wallMat],
    ['ARCH__frames', mergeOrNull(frameGeoms), frameMat],
    ['ARCH__glass', mergeOrNull(glassGeoms), glassMat],
    ['FURN__wood', mergeOrNull(woodGeoms), woodMat],
    ['FURN__fabric', mergeOrNull(fabricGeoms), fabricMat],
  ];

  for (const [name, geom, mat] of staticBatches) {
    if (!geom) continue;
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = name;
    model.add(mesh);
  }

  // Todos os 11 dispositivos de floorplan.config.json com DEV__* e âncoras/auxiliares
  for (const deviceCfg of config.devices) {
    const assembly = createDeviceAssembly(deviceCfg, { housingMat, bezelMat });
    model.add(assembly);
  }

  return root;
}

export function disposeSceneResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      geometries.add(obj.geometry);
      if (Array.isArray(obj.material)) {
        for (const m of obj.material) materials.add(m);
      } else if (obj.material) {
        materials.add(obj.material);
      }
    }
  });

  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();
}
