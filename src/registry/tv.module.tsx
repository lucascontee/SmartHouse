import { Tv } from 'lucide-react';
import type { TvDevice } from '../domain/types';
import type { DeviceDetailProps, DeviceRegistryModule } from './device-registry';

function TvDetailPlaceholder({ device }: DeviceDetailProps<TvDevice>) {
  return (
    <div className="panel mono tabular" data-device-type="tv">
      {device.name} · {tvModule.formatSummary(device)}
    </div>
  );
}

export const tvModule: DeviceRegistryModule<TvDevice> = {
  getIcon() {
    return Tv;
  },

  formatSummary(device) {
    if (!device.isOn) return 'Desligado';
    if (device.muted) return `${device.source} · Mudo`;
    return `${device.source} · Vol ${device.volume}`;
  },

  getAccentSwatch() {
    return null;
  },

  DetailControls: TvDetailPlaceholder,
};
