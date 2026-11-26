import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { DeviceCommand } from '../domain/commands';
import type { ClimateDevice, DeviceType, LightDevice, SmartDevice, TvDevice } from '../domain/types';
import { climateModule } from './climate.module';
import { lightModule } from './light.module';
import { tvModule } from './tv.module';

export interface DeviceDetailProps<T extends SmartDevice = SmartDevice> {
  device: T;
  onCommand: (command: DeviceCommand) => void;
}

export interface DeviceRegistryModule<T extends SmartDevice = SmartDevice> {
  getIcon(device: T): LucideIcon;
  formatSummary(device: T): string;
  getAccentSwatch(device: T): string | null;
  DetailControls: ComponentType<DeviceDetailProps<T>>;
}

export interface DeviceRegistryMap {
  light: DeviceRegistryModule<LightDevice>;
  ac: DeviceRegistryModule<ClimateDevice>;
  tv: DeviceRegistryModule<TvDevice>;
}

export const deviceRegistry: DeviceRegistryMap = {
  light: lightModule,
  ac: climateModule,
  tv: tvModule,
};

export function getDeviceModule<T extends SmartDevice>(device: T): DeviceRegistryModule<T> {
  return deviceRegistry[device.type] as unknown as DeviceRegistryModule<T>;
}

export function getDeviceModuleByType<K extends DeviceType>(type: K): DeviceRegistryMap[K] {
  return deviceRegistry[type];
}
