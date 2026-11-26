import { Compass, Layers } from 'lucide-react';
import { useEffect } from 'react';
import { createIoTProvider } from './providers';
import { ApartmentCanvas } from './scene/ApartmentCanvas';
import { useDeviceStore } from './store/useDeviceStore';
import { useUiStore } from './store/useUiStore';
import { Icon } from './ui/Icon';

export function App() {
  const deviceCount = useDeviceStore((s) => s.deviceIds.length);
  const devices = useDeviceStore((s) => s.devices);
  const connectionState = useDeviceStore((s) => s.connectionState);
  const lastError = useDeviceStore((s) => s.lastError);

  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const setActiveRoom = useUiStore((s) => s.setActiveRoom);
  const closeInteraction = useUiStore((s) => s.closeInteraction);

  const selectedDevice = selectedDeviceId ? devices[selectedDeviceId] : undefined;

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
        <ApartmentCanvas source="procedural" />
      </section>

      <div className="hud-layer">
        <header className="hud-topbar">
          <div className="hud-badge">
            <span className="hud-badge__dot" aria-hidden="true" />
            <Icon icon={Layers} size={15} />
            <span className="mono tabular">
              FINAL 02 · SIMULAÇÃO · {deviceCount}
              {selectedDevice ? ` · ${selectedDevice.name}` : ''}
              {lastError ? ` · ${lastError}` : connectionState === 'connecting' ? ' · ...' : ''}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-tonal"
            onClick={() => {
              setActiveRoom('all');
              closeInteraction();
            }}
          >
            <Icon icon={Compass} size={15} />
            <span>Visão Geral</span>
          </button>
        </header>
      </div>
    </main>
  );
}
