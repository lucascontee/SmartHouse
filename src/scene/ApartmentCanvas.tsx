import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
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

export interface SceneTelemetrySnapshot {
  drawCalls: number;
  triangles: number;
  programs: number;
  geometries: number;
  textures: number;
  frameCount: number;
  lastFrameCpuMs: number;
  avgFrameCpuMs: number;
  maxFrameCpuMs: number;
  maxActiveDynamicLights: number;
}

declare global {
  interface Window {
    __SMARTHOUSE_TELEMETRY__?: SceneTelemetrySnapshot;
  }
}

export interface ApartmentCanvasProps {
  source?: SceneSource;
  glbUrl?: string;
  markerElementsRef?: RefObject<Map<string, HTMLButtonElement>>;
  onSceneReady?: (scene: ParsedApartmentScene) => void;
}

export function resolveCanvasFrameloop(isHidden: boolean): 'always' | 'never' {
  return isHidden ? 'never' : 'always';
}

export function resolveMaxActiveDynamicLights(viewportWidth: number): number {
  return viewportWidth <= 768 ? 6 : 9;
}

function getViewportDpr(): [number, number] {
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return [1, 1.5];
  }
  return [1, 2];
}

interface FrameClockStartProps {
  frameStartRef: RefObject<number>;
}

function FrameClockStart({ frameStartRef }: FrameClockStartProps) {
  useFrame(() => {
    frameStartRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
  });
  return null;
}

interface SceneTelemetryProbeProps {
  frameStartRef: RefObject<number>;
  maxActiveDynamicLights: number;
}

function SceneTelemetryProbe({ frameStartRef, maxActiveDynamicLights }: SceneTelemetryProbeProps) {
  const { gl } = useThree();
  const totalCpuMsRef = useRef(0);
  const snapshotRef = useRef<SceneTelemetrySnapshot>({
    drawCalls: 0,
    triangles: 0,
    programs: 0,
    geometries: 0,
    textures: 0,
    frameCount: 0,
    lastFrameCpuMs: 0,
    avgFrameCpuMs: 0,
    maxFrameCpuMs: 0,
    maxActiveDynamicLights,
  });

  useEffect(() => {
    snapshotRef.current.maxActiveDynamicLights = maxActiveDynamicLights;
    if (typeof window !== 'undefined') {
      window.__SMARTHOUSE_TELEMETRY__ = snapshotRef.current;
    }
  }, [maxActiveDynamicLights]);

  useFrame(() => {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return;
    const cpuMs = Math.max(0, performance.now() - frameStartRef.current);
    const snap = snapshotRef.current;
    snap.frameCount += 1;
    totalCpuMsRef.current += cpuMs;
    snap.lastFrameCpuMs = Number(cpuMs.toFixed(3));
    snap.avgFrameCpuMs = Number((totalCpuMsRef.current / snap.frameCount).toFixed(3));
    if (cpuMs > snap.maxFrameCpuMs) {
      snap.maxFrameCpuMs = Number(cpuMs.toFixed(3));
    }
    snap.drawCalls = gl.info.render.calls;
    snap.triangles = gl.info.render.triangles;
    snap.programs = gl.info.programs?.length ?? 0;
    snap.geometries = gl.info.memory.geometries;
    snap.textures = gl.info.memory.textures;
    snap.maxActiveDynamicLights = maxActiveDynamicLights;
    window.__SMARTHOUSE_TELEMETRY__ = snap;
  });

  return null;
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

  const frameStartRef = useRef(0);
  const [parsedScene, setParsedScene] = useState<ParsedApartmentScene | null>(null);
  const [dpr, setDpr] = useState<[number, number]>(getViewportDpr);
  const [maxDynamicLights, setMaxDynamicLights] = useState<number>(() =>
    typeof window !== 'undefined' ? resolveMaxActiveDynamicLights(window.innerWidth) : 9,
  );
  const [isDocumentHidden, setIsDocumentHidden] = useState<boolean>(
    () => typeof document !== 'undefined' && document.hidden,
  );

  useEffect(() => {
    const handleResize = () => {
      setDpr(getViewportDpr());
      setMaxDynamicLights(resolveMaxActiveDynamicLights(window.innerWidth));
    };
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
      fallback={
        <div className="scene-fallback" data-fx-fallback="webgl" role="status">
          <p className="scene-fallback__title">Visualização 3D indisponível</p>
          <p className="scene-fallback__text">
            WebGL não está ativo neste navegador. Os controles dos dispositivos seguem disponíveis pela barra superior.
          </p>
        </div>
      }
      onPointerMissed={() => closeInteraction()}
    >
      <FrameClockStart frameStartRef={frameStartRef} />
      <color attach="background" args={['#070708']} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#CBD5E1', '#0F1014', 0.42]} />
      <directionalLight position={[6, 11, 7]} intensity={0.48} />

      {parsedScene && (
        <>
          <CameraRig cameras={parsedScene.cameras} activeRoom={activeRoom} />
          <LightingRig
            devices={parsedScene.devices}
            maxActiveDynamicLights={maxDynamicLights}
          />
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
          <SceneTelemetryProbe
            frameStartRef={frameStartRef}
            maxActiveDynamicLights={maxDynamicLights}
          />
        </>
      )}
    </Canvas>
  );
}
