import { useEffect, useRef } from 'react';
import { createIoTProvider } from './providers';
import { ApartmentCanvas } from './scene/ApartmentCanvas';
import { useDeviceStore } from './store/useDeviceStore';
import { DeviceMarkersOverlay } from './ui/DeviceMarkersOverlay';
import { TopBar } from './ui/TopBar';

export function App() {
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const provider = createIoTProvider();
    void useDeviceStore.getState().initProvider(provider);

    return () => {
      useDeviceStore.getState().disposeProvider();
    };
  }, []);

  return (
    <main className="app-viewport">
      <section className="scene-stage" aria-label="Cena 3D do apartamento FINAL 02">
        <ApartmentCanvas source="procedural" markerElementsRef={markerElementsRef} />
      </section>

      <DeviceMarkersOverlay markerElementsRef={markerElementsRef} />

      <div className="hud-layer">
        <TopBar />
      </div>
    </main>
  );
}
