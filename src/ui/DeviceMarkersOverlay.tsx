import type { RefObject } from 'react';
import { getDeviceModule } from '../registry/device-registry';
import { useDeviceStore } from '../store/useDeviceStore';
import { useUiStore } from '../store/useUiStore';
import { Icon } from './Icon';

export interface DeviceMarkersOverlayProps {
  markerElementsRef: RefObject<Map<string, HTMLButtonElement>>;
}

export function DeviceMarkersOverlay({ markerElementsRef }: DeviceMarkersOverlayProps) {
  const deviceIds = useDeviceStore((s) => s.deviceIds);
  const devices = useDeviceStore((s) => s.devices);
  const selectedDeviceId = useUiStore((s) => s.selectedDeviceId);
  const openQuickCard = useUiStore((s) => s.openQuickCard);

  return (
    <div className="markers-overlay" aria-label="Marcadores espaciais dos dispositivos">
      {deviceIds.map((id) => {
        const device = devices[id];
        if (!device) return null;

        const mod = getDeviceModule(device);
        const DeviceIcon = mod.getIcon(device);
        const accentSwatch = mod.getAccentSwatch(device);
        const isSelected = selectedDeviceId === device.id;
        const stateLabel = device.isOn ? 'Ligado' : 'Desligado';

        return (
          <button
            key={device.id}
            ref={(el) => {
              const map = markerElementsRef.current;
              if (!map) return;
              if (el) {
                map.set(device.id, el);
              } else {
                map.delete(device.id);
              }
            }}
            type="button"
            className="device-marker"
            data-device-id={device.id}
            data-state={device.isOn ? 'on' : 'off'}
            data-selected={isSelected ? 'true' : 'false'}
            aria-pressed={isSelected}
            aria-label={`${device.name} — ${stateLabel}`}
            onClick={() => openQuickCard(device.id)}
          >
            <span className="device-marker__chip">
              <Icon icon={DeviceIcon} size={15} />
              {device.isOn && (
                <span
                  className="device-marker__dot"
                  style={accentSwatch ? { backgroundColor: accentSwatch } : undefined}
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
