import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { useUiStore } from '../store/useUiStore';
import { AirflowEffect } from './AirflowEffect';
import { disposeSceneResources } from './buildProceduralApartment';
import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { MarkerProjector } from './MarkerProjector';
import { findDeviceIdFromObject, type ParsedApartmentScene } from './parseApartmentScene';
import { loadApartmentScene, type SceneSource } from './SceneLoader';
import { TvScreenEffect } from './TvScreenEffect';

export interface ApartmentCanvasProps {
  source?: SceneSource;
  glbUrl?: string;
  markerElementsRef?: RefObject<Map<string, HTMLButtonElement>>;
  onSceneReady?: (scene: ParsedApartmentScene) => void;
}

export function resolveCanvasFrameloop(isHidden: boolean): 'always' | 'never' {
  return isHidden ? 'never' : 'always';
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
  markerElementsRef,
  onSceneReady,
}: ApartmentCanvasProps) {
  const activeRoom = useUiStore((s) => s.activeRoom);
  const openQuickCard = useUiStore((s) => s.openQuickCard);
  const closeInteraction = useUiStore((s) => s.closeInteraction);

  const [parsedScene, setParsedScene] = useState<ParsedApartmentScene | null>(null);
  const [dpr, setDpr] = useState<[number, number]>(getViewportDpr);
  const [isDocumentHidden, setIsDocumentHidden] = useState<boolean>(
    () => typeof document !== 'undefined' && document.hidden,
  );

  useEffect(() => {
    const handleResize = () => setDpr(getViewportDpr());
    const handleVisibilityChange = () => setIsDocumentHidden(document.hidden);

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      frameloop={resolveCanvasFrameloop(isDocumentHidden)}
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
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#CBD5E1', '#0F1014', 0.42]} />
      <directionalLight position={[6, 11, 7]} intensity={0.48} />

      {parsedScene && (
        <>
          <CameraRig cameras={parsedScene.cameras} activeRoom={activeRoom} />
          <LightingRig devices={parsedScene.devices} />
          <AirflowEffect devices={parsedScene.devices} />
          <TvScreenEffect devices={parsedScene.devices} />
          {markerElementsRef && (
            <MarkerProjector devices={parsedScene.devices} markerElementsRef={markerElementsRef} />
          )}
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
