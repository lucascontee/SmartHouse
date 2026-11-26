import { ArrowLeft, X } from 'lucide-react';
import { useEffect } from 'react';
import type { DeviceCommand } from '../domain/commands';
import { floorplanConfig } from '../domain/floorplan';
import type { SmartDevice } from '../domain/types';
import { getDeviceModule } from '../registry/device-registry';
import { useDeviceStore } from '../store/useDeviceStore';
import { useUiStore } from '../store/useUiStore';
import { Icon } from './Icon';

export interface DetailDrawerViewProps {
  device: SmartDevice;
  roomLabel: string;
  onCommand: (command: DeviceCommand) => void;
  onClose: () => void;
}

export function DetailDrawerView({
  device,
  roomLabel,
  onCommand,
  onClose,
}: DetailDrawerViewProps) {
  const mod = getDeviceModule(device);
  const DeviceIcon = mod.getIcon(device);
  const summary = mod.formatSummary(device);
  const swatch = mod.getAccentSwatch(device);
  const DetailControls = mod.DetailControls;

  return (
    <aside
      className="panel panel-motion detail-drawer"
      role="dialog"
      aria-label={`Mais informações: ${device.name}`}
    >
      <div className="detail-drawer__nav">
        <button
          type="button"
          className="btn btn-tonal detail-drawer__back"
          onClick={onClose}
        >
          <Icon icon={ArrowLeft} size={15} />
          <span>Voltar ao 3D</span>
        </button>

        <button
          type="button"
          className="btn btn-tonal btn-icon"
          aria-label="Fechar detalhes"
          onClick={onClose}
        >
          <Icon icon={X} size={15} />
        </button>
      </div>

      <header className="detail-drawer__head">
        <span className="detail-drawer__room mono muted">{roomLabel}</span>
        <div className="detail-drawer__title-row">
          <Icon icon={DeviceIcon} size={18} />
          <h2 className="detail-drawer__title">{device.name}</h2>
        </div>
        <div className="detail-drawer__status mono tabular">
          {swatch && (
            <span
              className="color-micro-swatch"
              style={{ backgroundColor: swatch }}
              aria-hidden="true"
            />
          )}
          <span>{summary}</span>
        </div>
      </header>

      <div className="detail-drawer__body">
        <DetailControls device={device} onCommand={onCommand} />
      </div>
    </aside>
  );
}

export function DetailDrawer() {
  const devices = useDeviceStore((s) => s.devices);
  const sendCommand = useDeviceStore((s) => s.sendCommand);

  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const interactionLevel = useUiStore((s) => s.interactionLevel);
  const closeInteraction = useUiStore((s) => s.closeInteraction);

  const isOpen = interactionLevel === 'detail' && selectedDeviceId !== null;
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

  const roomLabel =
    floorplanConfig.rooms.find((room) => room.id === device.roomId)?.label ?? device.roomId;

  return (
    <DetailDrawerView
      device={device}
      roomLabel={roomLabel}
      onCommand={(command) => void sendCommand(device.id, command)}
      onClose={() => closeInteraction()}
    />
  );
}
