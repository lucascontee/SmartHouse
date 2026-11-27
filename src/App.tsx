import { useCallback, useEffect, useRef, useState } from 'react';
import { floorplanConfig } from './domain/floorplan';
import { createIoTProvider } from './providers';
import { ApartmentCanvas } from './scene/ApartmentCanvas';
import { useDeviceStore } from './store/useDeviceStore';
import { useUiStore } from './store/useUiStore';
import { DetailDrawer } from './ui/DetailDrawer';
import { DeviceMarkersOverlay } from './ui/DeviceMarkersOverlay';
import { QuickCard } from './ui/QuickCard';
import { TopBar } from './ui/TopBar';

async function activateDemoPreset(): Promise<void> {
  const store = useDeviceStore.getState();
  const deviceIds = Object.keys(store.devices);

  await Promise.all(
    deviceIds.map((id) => store.sendCommand(id, { type: 'power', isOn: true })),
  );

  await Promise.all([
    store.sendCommand('DEV__light_cozinha', { type: 'brightness', brightness: 92 }),
    store.sendCommand('DEV__light_sala_superior', { type: 'brightness', brightness: 90 }),
    store.sendCommand('DEV__light_sala_inferior', { type: 'brightness', brightness: 88 }),
    store.sendCommand('DEV__light_suite', { type: 'brightness', brightness: 86 }),
    store.sendCommand('DEV__light_quarto_2', { type: 'brightness', brightness: 90 }),
    store.sendCommand('DEV__light_sala_superior', { type: 'colorTemp', colorTempK: 3200 }),
    store.sendCommand('DEV__light_sala_inferior', { type: 'colorTemp', colorTempK: 3000 }),
    store.sendCommand('DEV__light_suite', { type: 'colorTemp', colorTempK: 2700 }),
    store.sendCommand('DEV__light_quarto_2', { type: 'colorTemp', colorTempK: 5200 }),
    store.sendCommand('DEV__ac_sala', { type: 'climateMode', mode: 'cool' }),
    store.sendCommand('DEV__ac_sala', { type: 'fanSpeed', fanSpeed: 'high' }),
    store.sendCommand('DEV__ac_sala', { type: 'targetTemp', targetTempC: 21 }),
    store.sendCommand('DEV__tv_sala', { type: 'volume', volume: 30 }),
    store.sendCommand('DEV__tv_sala', { type: 'source', source: 'Streaming' }),
  ]);
}

export function App() {
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const interactionLevel = useUiStore((s) => s.interactionLevel);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isInitReady, setIsInitReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    setIsSceneReady(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isSceneReady && isInitReady) {
      document.documentElement.dataset.ready = '1';
    }
    return () => {
      delete document.documentElement.dataset.ready;
    };
  }, [isSceneReady, isInitReady]);

  useEffect(() => {
    let active = true;
    const provider = createIoTProvider();

    void useDeviceStore
      .getState()
      .initProvider(provider)
      .then(async () => {
        if (!active || typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const deviceParam = params.get('device');
        const viewParam = params.get('view');
        const demoParam = params.get('demo');
        const ui = useUiStore.getState();

        if (demoParam === 'active') {
          await activateDemoPreset();
          if (!active) return;
        }

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

        setIsInitReady(true);
      });

    return () => {
      active = false;
      useDeviceStore.getState().disposeProvider();
    };
  }, []);

  return (
    <main className="app-viewport">
      <section className="scene-stage" aria-label="Cena 3D do apartamento FINAL 02">
        <ApartmentCanvas
          source="procedural"
          markerElementsRef={markerElementsRef}
          onSceneReady={handleSceneReady}
        />
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
