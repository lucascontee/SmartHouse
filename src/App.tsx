import { useEffect, useRef } from 'react';
import { floorplanConfig } from './domain/floorplan';
import { createIoTProvider } from './providers';
import { ApartmentCanvas } from './scene/ApartmentCanvas';
import { useDeviceStore } from './store/useDeviceStore';
import { useUiStore } from './store/useUiStore';
import { DetailDrawer } from './ui/DetailDrawer';
import { DeviceMarkersOverlay } from './ui/DeviceMarkersOverlay';
import { QuickCard } from './ui/QuickCard';
import { TopBar } from './ui/TopBar';

export function App() {
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const interactionLevel = useUiStore((s) => s.interactionLevel);

  useEffect(() => {
    let active = true;
    const provider = createIoTProvider();

    void useDeviceStore
      .getState()
      .initProvider(provider)
      .then(() => {
        if (!active || typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const deviceParam = params.get('device');
        const viewParam = params.get('view');
        const ui = useUiStore.getState();

        if (
          roomParam &&
          (roomParam === 'all' || floorplanConfig.rooms.some((room) => room.id === roomParam))
        ) {
          ui.setActiveRoom(roomParam);
        }

        if (deviceParam && useDeviceStore.getState().devices[deviceParam]) {
          if (viewParam === 'detail') {
            ui.openDetailDrawer(deviceParam);
          } else if (viewParam === 'quick') {
            ui.openQuickCard(deviceParam);
          }
        }
      });

    return () => {
      active = false;
      useDeviceStore.getState().disposeProvider();
    };
  }, []);

  return (
    <main className="app-viewport">
      <section className="scene-stage" aria-label="Cena 3D do apartamento FINAL 02">
        <ApartmentCanvas source="procedural" markerElementsRef={markerElementsRef} />
      </section>

      <DeviceMarkersOverlay markerElementsRef={markerElementsRef} />

      <div className="hud-layer" data-detail={interactionLevel === 'detail' ? 'true' : 'false'}>
        <TopBar />
        <QuickCard />
        <DetailDrawer />
      </div>
    </main>
  );
}
