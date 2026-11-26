import rawFloorplanConfig from './floorplan.config.json';
import type {
  ClimateCapability,
  FloorplanConfig,
  FloorplanDeviceConfig,
  LightCapability,
  SmartDevice,
  TvCapability,
} from './types';

export const floorplanConfig = rawFloorplanConfig as unknown as FloorplanConfig;

const DEFAULT_TV_SOURCES = ['HDMI 1', 'HDMI 2', 'Streaming', 'TV Aberta'];

const CANONICAL_DEVICE_NAMES: Record<string, string> = {
  DEV__light_varanda: 'Luz Varanda',
  DEV__light_cozinha: 'Luz Cozinha',
  DEV__light_sala_superior: 'Luz Sala (Corredor)',
  DEV__light_sala_inferior: 'Luz Sala (Porta)',
  DEV__light_circulacao: 'Luz Circulação',
  DEV__light_banheiro_suite: 'Luz Banheiro Suíte',
  DEV__light_suite: 'Luz Suíte',
  DEV__light_banheiro_social: 'Luz Banheiro Social',
  DEV__light_quarto_2: 'Luz Quarto 2',
  DEV__ac_sala: 'Ar-Condicionado Sala',
  DEV__tv_sala: 'TV Sala',
};

function resolveDeviceName(device: FloorplanDeviceConfig, roomLabelById: Map<string, string>): string {
  if (device.label) return device.label;
  if (CANONICAL_DEVICE_NAMES[device.id]) return CANONICAL_DEVICE_NAMES[device.id];

  const roomLabel = roomLabelById.get(device.room) ?? device.room;
  if (device.type === 'light') return `Luz ${roomLabel}`;
  if (device.type === 'ac') return `Ar-Condicionado ${roomLabel}`;
  return `TV ${roomLabel}`;
}

/**
 * Verifica integridade estrutural de `floorplan.config.json` (cômodos, partições, vãos e dispositivos).
 */
export function validateFloorplanConfig(config: FloorplanConfig): string[] {
  const errors: string[] = [];
  const roomIds = new Set<string>();

  for (const room of config.rooms) {
    if (roomIds.has(room.id)) {
      errors.push(`Cômodo duplicado: ${room.id}`);
    }
    roomIds.add(room.id);

    if (room.shape === 'L') {
      if (!room.segments || room.segments.length < 2) {
        errors.push(`Cômodo em L sem segmentos suficientes: ${room.id}`);
      }
      for (const seg of room.segments) {
        if (seg.w <= 0 || seg.d <= 0) {
          errors.push(`Segmento inválido em ${room.id}`);
        }
      }
    } else if (room.bounds.w <= 0 || room.bounds.d <= 0) {
      errors.push(`Dimensões inválidas no cômodo ${room.id}`);
    }
  }

  for (const part of config.customPartitions) {
    const dx = part.end[0] - part.start[0];
    const dz = part.end[1] - part.start[1];
    if (Math.hypot(dx, dz) <= 0 || part.thickness <= 0 || part.height <= 0) {
      errors.push(`Partição customizada inválida: ${part.id}`);
    }
  }

  for (const opening of config.openings) {
    if (opening.width <= 0) {
      errors.push(`Abertura com largura inválida: ${opening.id}`);
    }
  }

  const deviceIds = new Set<string>();
  for (const dev of config.devices) {
    if (!dev.id.startsWith('DEV__')) {
      errors.push(`ID de dispositivo fora da convenção DEV__*: ${dev.id}`);
    }
    if (deviceIds.has(dev.id)) {
      errors.push(`Dispositivo duplicado: ${dev.id}`);
    }
    deviceIds.add(dev.id);

    if (!roomIds.has(dev.room)) {
      errors.push(`Dispositivo ${dev.id} referencia cômodo inexistente: ${dev.room}`);
    }
  }

  return errors;
}

/**
 * Cria o estado inicial tipado dos dispositivos a partir de `floorplan.config.json`.
 */
export function createInitialDevicesFromConfig(config: FloorplanConfig = floorplanConfig): SmartDevice[] {
  const roomLabelById = new Map(config.rooms.map((room) => [room.id, room.label]));

  return config.devices.map((entry): SmartDevice => {
    const name = resolveDeviceName(entry, roomLabelById);

    switch (entry.type) {
      case 'light': {
        const capabilities = entry.capabilities as LightCapability[];
        const hasColorTemp = capabilities.includes('colorTemp');
        const hasRgb = capabilities.includes('rgb');
        return {
          id: entry.id,
          name,
          roomId: entry.room,
          type: 'light',
          subtype: entry.subtype ?? 'bulb',
          online: true,
          isOn: false,
          position: [...entry.position],
          facing: entry.facing,
          capabilities,
          brightness: 80,
          colorTempK: hasColorTemp ? 4000 : undefined,
          colorHex: hasRgb ? '#FAFAFA' : undefined,
          colorMode: hasRgb ? 'rgb' : 'cct',
        };
      }

      case 'ac':
        return {
          id: entry.id,
          name,
          roomId: entry.room,
          type: 'ac',
          online: true,
          isOn: false,
          position: [...entry.position],
          facing: entry.facing ?? '-X',
          capabilities: entry.capabilities as ClimateCapability[],
          targetTempC: 22,
          currentTempC: 25,
          mode: 'cool',
          fanSpeed: 'auto',
        };

      case 'tv':
        return {
          id: entry.id,
          name,
          roomId: entry.room,
          type: 'tv',
          online: true,
          isOn: false,
          position: [...entry.position],
          facing: entry.facing ?? '-X',
          capabilities: entry.capabilities as TvCapability[],
          volume: 25,
          muted: false,
          source: DEFAULT_TV_SOURCES[0],
          availableSources: [...DEFAULT_TV_SOURCES],
        };
    }
  });
}
