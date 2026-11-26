import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useUiStore } from '../store/useUiStore';
import { disposeSceneResources } from './buildProceduralApartment';
import { CameraRig } from './CameraRig';
import { findDeviceIdFromObject, type ParsedApartmentScene } from './parseApartmentScene';
import { loadApartmentScene, type SceneSource } from './SceneLoader';

export interface ApartmentCanvasProps {
  source?: SceneSource;
  glbUrl?: string;
  onSceneReady?: (scene: ParsedApartmentScene) => void;
}

function getViewportDpr(): [number, number] {
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return [1, 1.5];
  }
  return [1, 2];
}

export function ApartmentCanvas({
  source = 'procedural',
  glbUrl,
  onSceneReady,
}: ApartmentCanvasProps) {
  const activeRoom = useUiStore((s) => s.activeRoom);
  const openQuickCard = useUiStore((s) => s.openQuickCard);
  const closeInteraction = useUiStore((s) => s.closeInteraction);

  const [parsedScene, setParsedScene] = useState<ParsedApartmentScene | null>(null);
  const [dpr, setDpr] = useState<[number, number]>(getViewportDpr);

  useEffect(() => {
    const handleResize = () => setDpr(getViewportDpr());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadedScene: ParsedApartmentScene | null = null;

    void loadApartmentScene({ source, glbUrl }).then((scene) => {
      if (cancelled) {
        disposeSceneResources(scene.root);
        return;
      }
      loadedScene = scene;
      setParsedScene(scene);
      onSceneReady?.(scene);
    });

    return () => {
      cancelled = true;
      document.body.style.cursor = 'auto';
      if (loadedScene) {
        disposeSceneResources(loadedScene.root);
      }
    };
  }, [source, glbUrl, onSceneReady]);

  const handleSceneClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > 6) return;
      const deviceId = findDeviceIdFromObject(event.object);
      if (!deviceId) return;
      event.stopPropagation();
      openQuickCard(deviceId);
    },
    [openQuickCard],
  );

  const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (findDeviceIdFromObject(event.object)) {
      event.stopPropagation();
      document.body.style.cursor = 'pointer';
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <Canvas
      dpr={dpr}
      shadows={false}
      camera={{ position: [0, 8.8, 7.5], fov: 42, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onPointerMissed={() => closeInteraction()}
    >
      <color attach="background" args={['#070708']} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#E4E4E7', '#18181B', 0.45]} />
      <directionalLight position={[5, 9, 6]} intensity={0.55} />

      {parsedScene && (
        <>
          <CameraRig cameras={parsedScene.cameras} activeRoom={activeRoom} />
          <primitive
            object={parsedScene.root}
            onClick={handleSceneClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </>
      )}
    </Canvas>
  );
}
