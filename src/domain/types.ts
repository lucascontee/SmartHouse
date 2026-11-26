export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type FacingDirection = '-X' | '+X' | '-Z' | '+Z';

export type RoomId =
  | 'varanda'
  | 'cozinha_as'
  | 'sala'
  | 'circulacao'
  | 'banheiro_suite'
  | 'suite'
  | 'banheiro_social'
  | 'quarto_2'
  | (string & {});

export interface RectBounds {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface FloorplanRectRoom {
  id: RoomId;
  label: string;
  bounds: RectBounds;
  shape?: undefined;
}

export interface FloorplanLRoom {
  id: RoomId;
  label: string;
  shape: 'L';
  segments: RectBounds[];
  bounds?: undefined;
}

export type FloorplanRoom = FloorplanRectRoom | FloorplanLRoom;

export interface CustomPartition {
  id: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  notes?: string;
}

export type OpeningType = 'door' | 'sliding_door' | 'window';

export interface FloorplanOpening {
  type: OpeningType;
  id: string;
  wall: string;
  x: number;
  z: number;
  width: number;
}

export type DeviceType = 'light' | 'ac' | 'tv';
export type LightSubtype = 'bulb' | 'led_strip';

export type LightCapability = 'power' | 'brightness' | 'colorTemp' | 'rgb';
export type ClimateCapability = 'power' | 'temp' | 'mode' | 'fanSpeed';
export type TvCapability = 'power' | 'volume' | 'mute' | 'source';
export type DeviceCapability = LightCapability | ClimateCapability | TvCapability;

export interface FloorplanDeviceConfig {
  id: string;
  type: DeviceType;
  subtype?: LightSubtype;
  room: RoomId;
  label?: string;
  position: Vec3;
  facing?: FacingDirection;
  capabilities: DeviceCapability[];
}

export interface FloorplanConfig {
  meta: {
    unit: string;
    units: 'meters';
    ceilingHeight: number;
    wallThickness: {
      exterior: number;
      interiorStructural: number;
      interiorPartition: number;
      bathroomDivider: number;
    };
    footprint: {
      internalWidthX: number;
      leftDepthZ: number;
      rightDepthZ: number;
    };
  };
  rooms: FloorplanRoom[];
  customPartitions: CustomPartition[];
  openings: FloorplanOpening[];
  devices: FloorplanDeviceConfig[];
}

export type ClimateMode = 'cool' | 'fan' | 'auto' | 'dry';
export type FanSpeed = 'low' | 'medium' | 'high' | 'auto';

export interface BaseDevice {
  id: string;
  name: string;
  roomId: RoomId;
  online: boolean;
  isOn: boolean;
  position: Vec3;
  facing?: FacingDirection;
  pending?: boolean;
  assumedState?: boolean;
}

export interface LightDevice extends BaseDevice {
  type: 'light';
  subtype: LightSubtype;
  capabilities: LightCapability[];
  brightness: number;
  colorTempK?: number;
  colorHex?: string;
  colorMode: 'cct' | 'rgb';
}

export interface ClimateDevice extends BaseDevice {
  type: 'ac';
  capabilities: ClimateCapability[];
  targetTempC: number;
  currentTempC: number;
  mode: ClimateMode;
  fanSpeed: FanSpeed;
}

export interface TvDevice extends BaseDevice {
  type: 'tv';
  capabilities: TvCapability[];
  volume: number;
  muted: boolean;
  source: string;
  availableSources: string[];
}

export type SmartDevice = LightDevice | ClimateDevice | TvDevice;

export const DEVICE_LIMITS = {
  BRIGHTNESS_MIN: 0,
  BRIGHTNESS_MAX: 100,
  COLOR_TEMP_MIN_K: 2700,
  COLOR_TEMP_MAX_K: 6500,
  TEMP_MIN_C: 16,
  TEMP_MAX_C: 30,
  VOLUME_MIN: 0,
  VOLUME_MAX: 100,
} as const;

export const CLIMATE_MODE_LABELS: Record<ClimateMode, string> = {
  cool: 'Refrigerar',
  fan: 'Ventilar',
  auto: 'Automático',
  dry: 'Desumidificar',
};

export const FAN_SPEED_LABELS: Record<FanSpeed, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  auto: 'Automática',
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Converte temperatura de cor (2700K–6500K) em hex sRGB aproximado para swatch/emissão.
 */
export function kelvinToHex(kelvin: number): string {
  const temp = clamp(kelvin, DEVICE_LIMITS.COLOR_TEMP_MIN_K, DEVICE_LIMITS.COLOR_TEMP_MAX_K) / 100;

  let red: number;
  let green: number;
  let blue: number;

  if (temp <= 66) {
    red = 255;
    green = clamp(99.4708025861 * Math.log(temp) - 161.1195681661, 0, 255);
    blue = temp <= 19 ? 0 : clamp(138.5177312231 * Math.log(temp - 10) - 305.0447927307, 0, 255);
  } else {
    red = clamp(329.698727446 * Math.pow(temp - 60, -0.1332047592), 0, 255);
    green = clamp(288.1221695283 * Math.pow(temp - 60, -0.0755148492), 0, 255);
    blue = 255;
  }

  const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
