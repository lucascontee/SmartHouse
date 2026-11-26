import { ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';
import type { SmartDevice } from '../domain/types';
import { getDeviceModule } from '../registry/device-registry';
import { useDeviceStore } from '../store/useDeviceStore';
import { useUiStore } from '../store/useUiStore';
import { Icon } from './Icon';
import { PowerToggle } from './controls/PowerToggle';

export interface QuickCardViewProps {
  device: SmartDevice;
  onToggle: (isOn: boolean) => void;
  onOpenMore: () => void;
  onClose: () => void;
}

export function QuickCardView({
  device,
  onToggle,
  onOpenMore,
  onClose,
}: QuickCardViewProps) {
  const mod = getDeviceModule(device);
  const DeviceIcon = mod.getIcon(device);
  const summary = mod.formatSummary(device);
  const swatch = mod.getAccentSwatch(device);

  return (
    <aside
      className="panel panel-motion quick-card"
      role="dialog"
      aria-label={`Ação rápida: ${device.name}`}
    >
      <div className="quick-card__head">
        <div className="quick-card__identity">
          <span className="quick-card__icon">
            <Icon icon={DeviceIcon} size={16} />
          </span>
          <div className="quick-card__meta">
            <h2 className="quick-card__title">{device.name}</h2>
            <div className="quick-card__status mono tabular">
              {swatch && (
                <span
                  className="color-micro-swatch"
                  style={{ backgroundColor: swatch }}
                  aria-hidden="true"
                />
              )}
              <span>{summary}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-tonal btn-icon"
          aria-label="Fechar card rápido"
          onClick={onClose}
        >
          <Icon icon={X} size={15} />
        </button>
      </div>

      <div className="quick-card__actions">
        <PowerToggle
          checked={device.isOn}
          pending={device.pending}
          onToggle={onToggle}
        />

        <button
          type="button"
          className="btn btn-tonal quick-card__more"
          onClick={onOpenMore}
        >
          <span>Mais informações</span>
          <Icon icon={ChevronRight} size={15} />
        </button>
      </div>
    </aside>
  );
}

export function QuickCard() {
  const devices = useDeviceStore((s) => s.devices);
  const sendCommand = useDeviceStore((s) => s.sendCommand);

  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const interactionLevel = useUiStore((s) => s.interactionLevel);
  const openDetailDrawer = useUiStore((s) => s.openDetailDrawer);
  const closeInteraction = useUiStore((s) => s.closeInteraction);

  const isOpen = interactionLevel === 'quick' && selectedDeviceId !== null;
  const device = selectedDeviceId ? devices[selectedDeviceId] : undefined;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeInteraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeInteraction]);

  if (!isOpen || !device) return null;

  return (
    <QuickCardView
      device={device}
      onToggle={(isOn) => void sendCommand(device.id, { type: 'power', isOn })}
      onOpenMore={() => openDetailDrawer()}
      onClose={() => closeInteraction()}
    />
  );
}
