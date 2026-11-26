import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ClimateDevice, FanSpeed } from '../domain/types';
import { useDeviceStore } from '../store/useDeviceStore';
import type { ParsedDeviceNode } from './parseApartmentScene';

export const AIRFLOW_FAN_SPEEDS: Record<FanSpeed, number> = {
  low: 0.45,
  medium: 0.8,
  high: 1.25,
  auto: 0.7,
};

export function getAirflowSpeedForFan(fanSpeed: FanSpeed, reducedMotion: boolean): number {
  return reducedMotion ? 0.04 : AIRFLOW_FAN_SPEEDS[fanSpeed];
}

/**
 * Gera uma malha única (1 draw call) com fitas curvas saindo do eixo local +Z de __AIR_ORIGIN.
 * Mantém a trajetória acima da linha superior da TV (y = 1,56 m) quando aplicada em DEV__ac_sala.
 */
export function buildAirflowRibbonsGeometry(
  ribbonCount = 5,
  segments = 24,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const phases: number[] = [];
  const indices: number[] = [];

  const spreadSpan = 0.56;
  let vertexOffset = 0;

  for (let r = 0; r < ribbonCount; r += 1) {
    const t = ribbonCount === 1 ? 0.5 : r / (ribbonCount - 1);
    const x0 = (t - 0.5) * spreadSpan;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x0, 0.0, 0.02),
      new THREE.Vector3(x0 * 1.12, -0.1, 0.42),
      new THREE.Vector3(x0 * 1.28, -0.26, 0.88),
      new THREE.Vector3(x0 * 1.45, -0.46, 1.38),
    ]);

    const points = curve.getPoints(segments);
    const phase = r * 1.37;

    for (let i = 0; i <= segments; i += 1) {
      const u = i / segments;
      const p = points[i];
      const halfW = 0.011 + 0.009 * Math.sin(u * Math.PI);

      positions.push(p.x - halfW, p.y, p.z);
      positions.push(p.x + halfW, p.y, p.z);

      uvs.push(u, 0);
      uvs.push(u, 1);

      phases.push(phase, phase);

      if (i < segments) {
        const a = vertexOffset + i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }

    vertexOffset += (segments + 1) * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const AIRFLOW_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uReducedMotion;
  attribute float aPhase;
  varying vec2 vUv;
  varying float vPhase;

  void main() {
    vUv = uv;
    vPhase = aPhase;
    vec3 pos = position;
    float motionMask = 1.0 - step(0.5, uReducedMotion);
    float wave = sin(uv.x * 9.0 - uTime * uSpeed * 3.2 + aPhase) * 0.018 * uv.x * motionMask;
    pos.y += wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const AIRFLOW_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vPhase;

  void main() {
    float edgeFade = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.68, 1.0, vUv.x));
    float widthSoft = 1.0 - abs(vUv.y * 2.0 - 1.0);
    widthSoft = pow(clamp(widthSoft, 0.0, 1.0), 1.35);

    float streamPos = fract(vUv.x * 2.1 - uTime * uSpeed + vPhase * 0.27);
    float pulse = smoothstep(0.05, 0.35, streamPos) * (1.0 - smoothstep(0.55, 0.92, streamPos));
    float alpha = uOpacity * edgeFade * widthSoft * (0.18 + 0.55 * pulse);

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function createAirflowShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uSpeed: { value: AIRFLOW_FAN_SPEEDS.auto },
      uColor: { value: new THREE.Color('#E4E4E7') },
      uReducedMotion: { value: 0 },
    },
    vertexShader: AIRFLOW_VERTEX_SHADER,
    fragmentShader: AIRFLOW_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

interface AcUnitAirflowProps {
  node: ParsedDeviceNode;
}

const COOL_TINT = new THREE.Color('#DCE8F8');
const NEUTRAL_TINT = new THREE.Color('#E4E4E7');

function AcUnitAirflow({ node }: AcUnitAirflowProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const reducedRef = useRef(false);

  const { geometry, material } = useMemo(
    () => ({
      geometry: buildAirflowRibbonsGeometry(5, 24),
      material: createAirflowShaderMaterial(),
    }),
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = mq.matches;
      material.uniforms.uReducedMotion.value = mq.matches ? 1 : 0;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [material]);

  useEffect(() => {
    const mesh = meshRef.current;
    const origin = node.airOrigin;
    if (!mesh || !origin) return;

    origin.updateWorldMatrix(true, false);
    origin.getWorldPosition(mesh.position);
    origin.getWorldQuaternion(mesh.quaternion);
    mesh.visible = false;
  }, [node]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.1);
    const device = useDeviceStore.getState().devices[node.id] as ClimateDevice | undefined;
    const isOn = Boolean(device?.isOn);

    const nextOpacity = THREE.MathUtils.damp(
      material.uniforms.uOpacity.value as number,
      isOn ? 1 : 0,
      7,
      dt,
    );
    material.uniforms.uOpacity.value = nextOpacity;
    mesh.visible = nextOpacity >= 0.005;

    if (mesh.visible) {
      const speed = getAirflowSpeedForFan(device?.fanSpeed ?? 'auto', reducedRef.current);
      material.uniforms.uSpeed.value = speed;
      material.uniforms.uTime.value = (material.uniforms.uTime.value as number) + dt;
      const targetColor = device?.mode === 'cool' ? COOL_TINT : NEUTRAL_TINT;
      (material.uniforms.uColor.value as THREE.Color).lerp(targetColor, Math.min(1, dt * 6));
    }

    const emissiveMat = node.emissiveMesh?.material;
    if (emissiveMat instanceof THREE.MeshStandardMaterial) {
      emissiveMat.emissiveIntensity = THREE.MathUtils.damp(
        emissiveMat.emissiveIntensity,
        isOn ? 1.4 : 0,
        8,
        dt,
      );
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} visible={false} frustumCulled={false} />;
}

export interface AirflowEffectProps {
  devices: Map<string, ParsedDeviceNode>;
}

export function AirflowEffect({ devices }: AirflowEffectProps) {
  const acNodes = useMemo(
    () => Array.from(devices.values()).filter((node) => node.airOrigin !== null),
    [devices],
  );

  return (
    <>
      {acNodes.map((node) => (
        <AcUnitAirflow key={node.id} node={node} />
      ))}
    </>
  );
}
