import { Compass, Layers } from 'lucide-react';
import { useEffect } from 'react';
import { createIoTProvider } from './providers';
import { useDeviceStore } from './store/useDeviceStore';
import { Icon } from './ui/Icon';

export function App() {
  const deviceCount = useDeviceStore((s) => s.deviceIds.length);
  const connectionState = useDeviceStore((s) => s.connectionState);
  const lastError = useDeviceStore((s) => s.lastError);

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
        <div className="scene-stage-placeholder mono tabular">
          CENA 3D · FINAL 02 · AGUARDANDO FASE 2
        </div>
      </section>

      <div className="hud-layer">
        <header className="hud-topbar">
          <div className="hud-badge">
            <span className="hud-badge__dot" aria-hidden="true" />
            <Icon icon={Layers} size={15} />
            <span className="mono tabular">
              FINAL 02 · SIMULAÇÃO · {deviceCount}
              {lastError ? ` · ${lastError}` : connectionState === 'connecting' ? ' · ...' : ''}
            </span>
          </div>

          <button type="button" className="btn btn-tonal">
            <Icon icon={Compass} size={15} />
            <span>Visão Geral</span>
          </button>
        </header>
      </div>
    </main>
  );
}
