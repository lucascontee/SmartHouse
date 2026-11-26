import { createPortal, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  clamp,
  isValidHexColor,
  kelvinToHex,
  type LightDevice,
  type RoomId,
} from '../domain/types';
import { useDeviceStore } from '../store/useDeviceStore';
import { useUiStore } from '../store/useUiStore';
import type { ParsedDeviceNode } from './parseApartmentScene';

export const DEFAULT_WARM_LIGHT_HEX = '#FFE9CC';
export const DEFAULT_MAX_DYNAMIC_LIGHTS = 9;

const COMPACT_LIGHT_ROOMS = new Set<RoomId>([
  'varanda',
  'banheiro_suite',
  'banheiro_social',
  'circulacao',
]);

const LED_BOUNCE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LED_BOUNCE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float dist = length(centered);
    float falloff = smoothstep(1.0, 0.0, dist);
    float glow = falloff * falloff;
    float alpha = glow * uOpacity * 0.42;

    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * glow, alpha);
  }
`;

export interface LightRigProfile {
  maxIntensity: number;
  distance: number;
  maxEmissiveIntensity: number;
  hasBouncePlane: boolean;
}

export interface TargetLightIntensity {
  lightIntensity: number;
  emissiveIntensity: number;
}

/**
 * Resolve a cor alvo em hexadecimal respeitando modo RGB, temperatura Kelvin (CCT) ou branco quente padrão.
 */
export function resolveLightTargetColorHex(device?: LightDevice): string {
  if (!device) {
    return DEFAULT_WARM_LIGHT_HEX;
  }

  if (
    device.colorMode === 'rgb' &&
    device.capabilities.includes('rgb') &&
    typeof device.colorHex === 'string' &&
    isValidHexColor(device.colorHex)
  ) {
    return device.colorHex;
  }

  if (
    device.capabilities.includes('colorTemp') &&
    typeof device.colorTempK === 'number' &&
    Number.isFinite(device.colorTempK)
  ) {
    return kelvinToHex(device.colorTempK);
  }

  return DEFAULT_WARM_LIGHT_HEX;
}

/**
 * Define o perfil físico de alcance e intensidade de pico por subtipo e escala do cômodo.
 */
export function resolveLightProfile(device?: LightDevice): LightRigProfile {
  if (device?.subtype === 'led_strip') {
    return {
      maxIntensity: 7.0,
      distance: 4.5,
      maxEmissiveIntensity: 2.6,
      hasBouncePlane: true,
    };
  }

  if (device && COMPACT_LIGHT_ROOMS.has(device.roomId)) {
    return {
      maxIntensity: 6.5,
      distance: 4.2,
      maxEmissiveIntensity: 2.2,
      hasBouncePlane: false,
    };
  }

  if (device?.roomId === 'sala') {
    return {
      maxIntensity: 7.5,
      distance: 5.0,
      maxEmissiveIntensity: 2.4,
      hasBouncePlane: false,
    };
  }

  return {
    maxIntensity: 9.5,
    distance: 5.6,
    maxEmissiveIntensity: 2.5,
    hasBouncePlane: false,
  };
}

/**
 * Calcula os alvos de intensidade física (PointLight) e brilho emissivo do difusor.
 */
export function computeTargetLightIntensity(device?: LightDevice): TargetLightIntensity {
  if (!device || !device.isOn) {
    return { lightIntensity: 0, emissiveIntensity: 0 };
  }

  const profile = resolveLightProfile(device);
  const brightnessFactor = device.capabilities.includes('brightness')
    ? clamp(device.brightness / 100, 0, 1)
    : 1;

  return {
    lightIntensity: profile.maxIntensity * brightnessFactor,
    emissiveIntensity: profile.maxEmissiveIntensity * brightnessFactor,
  };
}

/**
 * Cria o ShaderMaterial aditivo de light bounce para fitas LED (`subtype: 'led_strip'`).
 */
export function createLedBouncePlaneMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: LED_BOUNCE_VERTEX_SHADER,
    fragmentShader: LED_BOUNCE_FRAGMENT_SHADER,
    uniforms: {
      uColor: { value: new THREE.Color(DEFAULT_WARM_LIGHT_HEX) },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

interface LightRigEntry {
  node: ParsedDeviceNode & { lightOrigin: THREE.Object3D };
  initialDistance: number;
  initialColorHex: string;
  isLedStrip: boolean;
  pointLight: THREE.PointLight | null;
  bounceMesh: THREE.Mesh | null;
  bounceMaterial: THREE.ShaderMaterial | null;
  poolScore: number;
  allowDynamicPointLight: boolean;
}

interface LightOriginPortalProps {
  entry: LightRigEntry;
}

function LightOriginPortal({ entry }: LightOriginPortalProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const bounceMeshRef = useRef<THREE.Mesh>(null);

  const bounceResources = useMemo(() => {
    if (!entry.isLedStrip) return null;
    return {
      geometry: new THREE.PlaneGeometry(1.5, 0.8),
      material: createLedBouncePlaneMaterial(),
    };
  }, [entry.isLedStrip]);

  useEffect(() => {
    entry.pointLight = lightRef.current;
    entry.bounceMesh = bounceMeshRef.current;
    entry.bounceMaterial = bounceResources?.material ?? null;

    return () => {
      entry.pointLight = null;
      entry.bounceMesh = null;
      entry.bounceMaterial = null;
    };
  }, [entry, bounceResources]);

  useEffect(() => {
    if (!bounceResources) return;
    return () => {
      bounceResources.geometry.dispose();
      bounceResources.material.dispose();
    };
  }, [bounceResources]);

  return createPortal(
    <>
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        color={entry.initialColorHex}
        intensity={0}
        distance={entry.initialDistance}
        decay={2}
        castShadow={false}
      />
      {bounceResources && (
        <mesh
          ref={bounceMeshRef}
          position={[0, -0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={bounceResources.geometry}
          material={bounceResources.material}
          visible={false}
          frustumCulled={false}
        />
      )}
    </>,
    entry.node.lightOrigin,
  );
}

function dampColor(target: THREE.Color, goal: THREE.Color, lambda: number, dt: number): void {
  target.r = THREE.MathUtils.damp(target.r, goal.r, lambda, dt);
  target.g = THREE.MathUtils.damp(target.g, goal.g, lambda, dt);
  target.b = THREE.MathUtils.damp(target.b, goal.b, lambda, dt);
}

const SCRATCH_TARGET_COLOR = new THREE.Color();

export interface LightingRigProps {
  devices: Map<string, ParsedDeviceNode>;
  maxActiveDynamicLights?: number;
}

/**
 * Gerencia todas as luzes reativas da planta em um único useFrame sem alocações ou re-renders.
 */
export function LightingRig({
  devices,
  maxActiveDynamicLights = DEFAULT_MAX_DYNAMIC_LIGHTS,
}: LightingRigProps) {
  const entries = useMemo<LightRigEntry[]>(() => {
    const initialStoreDevices = useDeviceStore.getState().devices;
    const list: LightRigEntry[] = [];

    for (const node of devices.values()) {
      if (!node.lightOrigin) continue;

      const storeDevice = initialStoreDevices[node.id];
      const lightDevice = storeDevice?.type === 'light' ? storeDevice : undefined;
      const profile = resolveLightProfile(lightDevice);

      list.push({
        node: node as ParsedDeviceNode & { lightOrigin: THREE.Object3D },
        initialDistance: profile.distance,
        initialColorHex: resolveLightTargetColorHex(lightDevice),
        isLedStrip: lightDevice?.subtype === 'led_strip',
        pointLight: null,
        bounceMesh: null,
        bounceMaterial: null,
        poolScore: -1,
        allowDynamicPointLight: true,
      });
    }

    return list;
  }, [devices]);

  const rankedEntries = useMemo(() => [...entries], [entries]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const storeDevices = useDeviceStore.getState().devices;
    const activeRoom = useUiStore.getState().activeRoom;
    const poolingLimited = maxActiveDynamicLights < entries.length;

    if (poolingLimited) {
      for (let i = 0; i < rankedEntries.length; i += 1) {
        const entry = rankedEntries[i];
        const raw = storeDevices[entry.node.id];
        const dev = raw?.type === 'light' ? raw : undefined;

        if (!dev || !dev.isOn) {
          entry.poolScore = -1;
          continue;
        }

        const roomPriority = activeRoom !== 'all' && dev.roomId === activeRoom ? 1000 : 0;
        const brightnessScore = dev.capabilities.includes('brightness') ? dev.brightness : 100;
        entry.poolScore = roomPriority + brightnessScore;
      }

      rankedEntries.sort((a, b) => b.poolScore - a.poolScore);

      const cap = Math.max(0, maxActiveDynamicLights);
      for (let i = 0; i < rankedEntries.length; i += 1) {
        rankedEntries[i].allowDynamicPointLight = i < cap && rankedEntries[i].poolScore >= 0;
      }
    } else {
      for (let i = 0; i < entries.length; i += 1) {
        entries[i].allowDynamicPointLight = true;
      }
    }

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const raw = storeDevices[entry.node.id];
      const dev = raw?.type === 'light' ? raw : undefined;
      const profile = resolveLightProfile(dev);
      const { lightIntensity, emissiveIntensity } = computeTargetLightIntensity(dev);
      const targetColorHex = resolveLightTargetColorHex(dev);
      SCRATCH_TARGET_COLOR.set(targetColorHex);

      const targetPointIntensity = entry.allowDynamicPointLight ? lightIntensity : 0;

      const light = entry.pointLight;
      if (light) {
        if (light.distance !== profile.distance) {
          light.distance = profile.distance;
        }

        if (targetPointIntensity > 0 && light.intensity < 0.01) {
          light.color.copy(SCRATCH_TARGET_COLOR);
        } else {
          dampColor(light.color, SCRATCH_TARGET_COLOR, 9, dt);
        }

        const nextIntensity = THREE.MathUtils.damp(light.intensity, targetPointIntensity, 9, dt);
        light.intensity = targetPointIntensity === 0 && nextIntensity < 0.002 ? 0 : nextIntensity;
      }

      const emissiveMat = entry.node.emissiveMesh?.material;
      if (emissiveMat instanceof THREE.MeshStandardMaterial) {
        if (emissiveIntensity > 0 && emissiveMat.emissiveIntensity < 0.01) {
          emissiveMat.emissive.copy(SCRATCH_TARGET_COLOR);
        } else {
          dampColor(emissiveMat.emissive, SCRATCH_TARGET_COLOR, 10, dt);
        }

        const nextEmissive = THREE.MathUtils.damp(
          emissiveMat.emissiveIntensity,
          emissiveIntensity,
          10,
          dt,
        );
        emissiveMat.emissiveIntensity =
          emissiveIntensity === 0 && nextEmissive < 0.002 ? 0 : nextEmissive;
      }

      if (entry.bounceMesh && entry.bounceMaterial) {
        const opacityUniform = entry.bounceMaterial.uniforms.uOpacity;
        const colorUniform = entry.bounceMaterial.uniforms.uColor.value as THREE.Color;
        const targetBounceOpacity =
          dev?.isOn && profile.maxEmissiveIntensity > 0
            ? clamp(emissiveIntensity / profile.maxEmissiveIntensity, 0, 1)
            : 0;

        if (targetBounceOpacity > 0 && (opacityUniform.value as number) < 0.01) {
          colorUniform.copy(SCRATCH_TARGET_COLOR);
        } else {
          dampColor(colorUniform, SCRATCH_TARGET_COLOR, 9, dt);
        }

        const nextOpacity = THREE.MathUtils.damp(
          opacityUniform.value as number,
          targetBounceOpacity,
          9,
          dt,
        );
        opacityUniform.value = targetBounceOpacity === 0 && nextOpacity < 0.002 ? 0 : nextOpacity;
        entry.bounceMesh.visible = (opacityUniform.value as number) >= 0.005;
      }
    }
  });

  return (
    <>
      {entries.map((entry) => (
        <LightOriginPortal key={entry.node.id} entry={entry} />
      ))}
    </>
  );
}
