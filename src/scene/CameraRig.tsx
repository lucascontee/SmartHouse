import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import type { SelectedRoom } from '../store/useUiStore';
import type { CameraPreset } from './parseApartmentScene';

export interface CameraRigProps {
  cameras: Map<string, CameraPreset>;
  activeRoom: SelectedRoom;
}

function computeScaledPosition(
  preset: CameraPreset,
  activeRoom: SelectedRoom,
  aspect: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const safeAspect = Math.max(aspect, 0.35);
  const scale =
    activeRoom === 'all'
      ? safeAspect < 1.15
        ? Math.min(2.35, Math.max(1, 1.05 / safeAspect))
        : 1
      : safeAspect < 1.0
        ? Math.min(1.6, Math.max(1, 0.88 / safeAspect))
        : 1;

  out.copy(preset.position).sub(preset.target).multiplyScalar(scale).add(preset.target);
  return out;
}

export function CameraRig({ cameras, activeRoom }: CameraRigProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { size } = useThree();
  const isTransitioning = useRef(false);
  const hasInitialized = useRef(false);
  const desiredPos = useRef(new THREE.Vector3(0, 8.8, 7.5));
  const desiredTarget = useRef(new THREE.Vector3(0, 0.6, 0));

  useEffect(() => {
    const preset = cameras.get(activeRoom) ?? cameras.get('all');
    if (!preset) return;

    const aspect = size.height > 0 ? size.width / size.height : 1.6;
    computeScaledPosition(preset, activeRoom, aspect, desiredPos.current);
    desiredTarget.current.copy(preset.target);

    if (!hasInitialized.current && controlsRef.current) {
      controlsRef.current.object.position.copy(desiredPos.current);
      controlsRef.current.target.copy(desiredTarget.current);
      controlsRef.current.update();
      hasInitialized.current = true;
      isTransitioning.current = false;
      return;
    }

    hasInitialized.current = true;
    isTransitioning.current = true;
  }, [activeRoom, cameras, size.width, size.height]);

  useFrame((state, delta) => {
    if (!isTransitioning.current || !controlsRef.current) return;

    const dt = Math.min(delta, 0.1);
    const cam = state.camera;
    const controls = controlsRef.current;

    cam.position.x = THREE.MathUtils.damp(cam.position.x, desiredPos.current.x, 6, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, desiredPos.current.y, 6, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, desiredPos.current.z, 6, dt);

    controls.target.x = THREE.MathUtils.damp(controls.target.x, desiredTarget.current.x, 6, dt);
    controls.target.y = THREE.MathUtils.damp(controls.target.y, desiredTarget.current.y, 6, dt);
    controls.target.z = THREE.MathUtils.damp(controls.target.z, desiredTarget.current.z, 6, dt);
    controls.update();

    if (
      cam.position.distanceToSquared(desiredPos.current) < 0.0004 &&
      controls.target.distanceToSquared(desiredTarget.current) < 0.0004
    ) {
      cam.position.copy(desiredPos.current);
      controls.target.copy(desiredTarget.current);
      controls.update();
      isTransitioning.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.08}
      minDistance={2.2}
      maxDistance={32}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
}
