import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TvDevice } from '../domain/types';
import { useDeviceStore } from '../store/useDeviceStore';
import type { ParsedDeviceNode } from './parseApartmentScene';

const OFF_SCREEN_COLOR = new THREE.Color('#08080A');

/**
 * Calcula a posição mundial da luz frontal de bounce da TV ao longo do eixo local +Z (facing).
 */
export function resolveTvLightWorldPosition(
  tvNode: ParsedDeviceNode,
  forwardOffset = 0.38,
): THREE.Vector3 {
  tvNode.root.updateWorldMatrix(true, false);
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const forward = new THREE.Vector3(0, 0, 1);

  tvNode.root.getWorldPosition(pos);
  tvNode.root.getWorldQuaternion(quat);
  forward.applyQuaternion(quat).normalize();

  return pos.addScaledVector(forward, forwardOffset);
}

interface SingleTvEffectProps {
  node: ParsedDeviceNode;
}

function SingleTvEffect({ node }: SingleTvEffectProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const reducedRef = useRef(false);

  const lightPos = useMemo(() => resolveTvLightWorldPosition(node, 0.38), [node]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const handleChange = (event: MediaQueryListEvent) => {
      reducedRef.current = event.matches;
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const device = useDeviceStore.getState().devices[node.id] as TvDevice | undefined;
    const isOn = Boolean(device?.isOn);

    const screenMat = node.emissiveMesh?.material;
    if (screenMat instanceof THREE.MeshStandardMaterial) {
      if (!isOn) {
        screenMat.color.copy(OFF_SCREEN_COLOR);
        screenMat.roughness = 0.12;
      }
      const shimmer =
        isOn && !reducedRef.current ? Math.sin(state.clock.elapsedTime * 1.4) * 0.08 : 0;
      const targetEmissive = isOn ? 1.15 + shimmer : 0;
      screenMat.emissiveIntensity = THREE.MathUtils.damp(
        screenMat.emissiveIntensity,
        targetEmissive,
        8,
        dt,
      );
    }

    if (lightRef.current) {
      const targetLightIntensity = isOn ? 0.45 : 0;
      lightRef.current.intensity = THREE.MathUtils.damp(
        lightRef.current.intensity,
        targetLightIntensity,
        8,
        dt,
      );
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={[lightPos.x, lightPos.y, lightPos.z]}
      color="#C7DCFF"
      intensity={0}
      distance={2.8}
      decay={2}
      castShadow={false}
    />
  );
}

export interface TvScreenEffectProps {
  devices: Map<string, ParsedDeviceNode>;
}

export function TvScreenEffect({ devices }: TvScreenEffectProps) {
  const tvNodes = useMemo(
    () =>
      Array.from(devices.values()).filter(
        (node) => node.id.startsWith('DEV__tv_') && node.emissiveMesh !== null,
      ),
    [devices],
  );

  return (
    <>
      {tvNodes.map((node) => (
        <SingleTvEffect key={node.id} node={node} />
      ))}
    </>
  );
}
