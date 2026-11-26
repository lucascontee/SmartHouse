import { Lightbulb, SunMedium } from 'lucide-react';
import { kelvinToHex, type LightDevice } from '../domain/types';
import type { DeviceDetailProps, DeviceRegistryModule } from './device-registry';

function LightDetailPlaceholder({ device }: DeviceDetailProps<LightDevice>) {
  return (
    <div className="panel mono tabular" data-device-type="light">
      {device.name} · {lightModule.formatSummary(device)}
    </div>
  );
}

export const lightModule: DeviceRegistryModule<LightDevice> = {
  getIcon(device) {
    return device.subtype === 'led_strip' ? SunMedium : Lightbulb;
  },

  formatSummary(device) {
    if (!device.isOn) return 'Desligado';
    if (device.capabilities.includes('brightness')) {
      return `Ligado · ${device.brightness}%`;
    }
    return 'Ligado';
  },

  getAccentSwatch(device) {
    if (!device.isOn) return null;
    if (device.colorMode === 'rgb' && device.colorHex) {
      return device.colorHex;
    }
    if (device.capabilities.includes('colorTemp') && device.colorTempK !== undefined) {
      return kelvinToHex(device.colorTempK);
    }
    return null;
  },

  DetailControls: LightDetailPlaceholder,
};
