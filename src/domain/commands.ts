import {
  DEVICE_LIMITS,
  clamp,
  isValidHexColor,
  type ClimateMode,
  type FanSpeed,
  type SmartDevice,
} from './types';

export type DeviceCommand =
  | { type: 'power'; isOn: boolean }
  | { type: 'brightness'; brightness: number }
  | { type: 'colorTemp'; colorTempK: number }
  | { type: 'rgb'; colorHex: string }
  | { type: 'targetTemp'; targetTempC: number }
  | { type: 'climateMode'; mode: ClimateMode }
  | { type: 'fanSpeed'; fanSpeed: FanSpeed }
  | { type: 'volume'; volume: number }
  | { type: 'mute'; muted: boolean }
  | { type: 'source'; source: string };

/**
 * Aplica um comando tipado respeitando as capabilities e faixas válidas do dispositivo.
 */
export function applyCommandToDevice(device: SmartDevice, command: DeviceCommand): SmartDevice {
  if (command.type === 'power') {
    return { ...device, isOn: command.isOn };
  }

  switch (device.type) {
    case 'light': {
      if (command.type === 'brightness' && device.capabilities.includes('brightness')) {
        return {
          ...device,
          brightness: Math.round(clamp(command.brightness, DEVICE_LIMITS.BRIGHTNESS_MIN, DEVICE_LIMITS.BRIGHTNESS_MAX)),
        };
      }
      if (command.type === 'colorTemp' && device.capabilities.includes('colorTemp')) {
        return {
          ...device,
          colorTempK: Math.round(clamp(command.colorTempK, DEVICE_LIMITS.COLOR_TEMP_MIN_K, DEVICE_LIMITS.COLOR_TEMP_MAX_K)),
          colorMode: 'cct',
        };
      }
      if (command.type === 'rgb' && device.capabilities.includes('rgb') && isValidHexColor(command.colorHex)) {
        return {
          ...device,
          colorHex: command.colorHex.toUpperCase(),
          colorMode: 'rgb',
        };
      }
      return device;
    }

    case 'ac': {
      if (command.type === 'targetTemp' && device.capabilities.includes('temp')) {
        return {
          ...device,
          targetTempC: Math.round(clamp(command.targetTempC, DEVICE_LIMITS.TEMP_MIN_C, DEVICE_LIMITS.TEMP_MAX_C)),
        };
      }
      if (command.type === 'climateMode' && device.capabilities.includes('mode')) {
        return { ...device, mode: command.mode };
      }
      if (command.type === 'fanSpeed' && device.capabilities.includes('fanSpeed')) {
        return { ...device, fanSpeed: command.fanSpeed };
      }
      return device;
    }

    case 'tv': {
      if (command.type === 'volume' && device.capabilities.includes('volume')) {
        return {
          ...device,
          volume: Math.round(clamp(command.volume, DEVICE_LIMITS.VOLUME_MIN, DEVICE_LIMITS.VOLUME_MAX)),
        };
      }
      if (command.type === 'mute' && device.capabilities.includes('mute')) {
        return { ...device, muted: command.muted };
      }
      if (
        command.type === 'source' &&
        device.capabilities.includes('source') &&
        device.availableSources.includes(command.source)
      ) {
        return { ...device, source: command.source };
      }
      return device;
    }
  }
}
