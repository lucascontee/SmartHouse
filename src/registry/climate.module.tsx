import { AirVent } from 'lucide-react';
import { CLIMATE_MODE_LABELS, type ClimateDevice } from '../domain/types';
import type { DeviceDetailProps, DeviceRegistryModule } from './device-registry';

function ClimateDetailPlaceholder({ device }: DeviceDetailProps<ClimateDevice>) {
  return (
    <div className="panel mono tabular" data-device-type="ac">
      {device.name} · {climateModule.formatSummary(device)}
    </div>
  );
}

export const climateModule: DeviceRegistryModule<ClimateDevice> = {
  getIcon() {
    return AirVent;
  },

  formatSummary(device) {
    if (!device.isOn) return 'Desligado';
    return `${device.targetTempC} °C · ${CLIMATE_MODE_LABELS[device.mode]}`;
  },

  getAccentSwatch() {
    return null;
  },

  DetailControls: ClimateDetailPlaceholder,
};
