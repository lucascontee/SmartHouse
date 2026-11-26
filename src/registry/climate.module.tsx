import { AirVent, Minus, Plus } from 'lucide-react';
import {
  CLIMATE_MODE_LABELS,
  DEVICE_LIMITS,
  FAN_SPEED_LABELS,
  type ClimateDevice,
  type ClimateMode,
  type FanSpeed,
} from '../domain/types';
import { Icon } from '../ui/Icon';
import { PowerToggle } from '../ui/controls/PowerToggle';
import { SegmentedControl, type SegmentedOption } from '../ui/controls/SegmentedControl';
import { ThinSlider } from '../ui/controls/ThinSlider';
import type { DeviceDetailProps, DeviceRegistryModule } from './device-registry';

const MODE_OPTIONS: SegmentedOption<ClimateMode>[] = [
  { value: 'cool', label: CLIMATE_MODE_LABELS.cool },
  { value: 'fan', label: CLIMATE_MODE_LABELS.fan },
  { value: 'auto', label: CLIMATE_MODE_LABELS.auto },
  { value: 'dry', label: CLIMATE_MODE_LABELS.dry },
];

const FAN_OPTIONS: SegmentedOption<FanSpeed>[] = [
  { value: 'low', label: FAN_SPEED_LABELS.low },
  { value: 'medium', label: FAN_SPEED_LABELS.medium },
  { value: 'high', label: FAN_SPEED_LABELS.high },
  { value: 'auto', label: FAN_SPEED_LABELS.auto },
];

function ClimateDetailControls({ device, onCommand }: DeviceDetailProps<ClimateDevice>) {
  const hasTemp = device.capabilities.includes('temp');
  const hasMode = device.capabilities.includes('mode');
  const hasFan = device.capabilities.includes('fanSpeed');

  return (
    <div className="detail-controls" data-device-type="ac">
      <div className="control-section">
        <PowerToggle
          checked={device.isOn}
          pending={device.pending}
          onToggle={(isOn) => onCommand({ type: 'power', isOn })}
        />
      </div>

      {hasTemp && (
        <div className="control-section">
          <div className="climate-temp-row">
            <div>
              <span className="control-label">Temperatura alvo</span>
              <div className="climate-temp-readout mono tabular">{device.targetTempC} °C</div>
              <div className="control-hint mono tabular muted">
                Ambiente {device.currentTempC.toFixed(1)} °C
              </div>
            </div>

            <div className="climate-temp-steppers">
              <button
                type="button"
                className="btn btn-tonal btn-icon"
                aria-label="Diminuir temperatura"
                disabled={device.targetTempC <= DEVICE_LIMITS.TEMP_MIN_C}
                onClick={() =>
                  onCommand({ type: 'targetTemp', targetTempC: device.targetTempC - 1 })
                }
              >
                <Icon icon={Minus} size={15} />
              </button>
              <button
                type="button"
                className="btn btn-tonal btn-icon"
                aria-label="Aumentar temperatura"
                disabled={device.targetTempC >= DEVICE_LIMITS.TEMP_MAX_C}
                onClick={() =>
                  onCommand({ type: 'targetTemp', targetTempC: device.targetTempC + 1 })
                }
              >
                <Icon icon={Plus} size={15} />
              </button>
            </div>
          </div>

          <ThinSlider
            label="Ajuste fino"
            value={device.targetTempC}
            min={DEVICE_LIMITS.TEMP_MIN_C}
            max={DEVICE_LIMITS.TEMP_MAX_C}
            step={1}
            displayValue={`${device.targetTempC} °C`}
            onChange={(targetTempC) => onCommand({ type: 'targetTemp', targetTempC })}
          />
        </div>
      )}

      {hasMode && (
        <div className="control-section">
          <SegmentedControl
            label="Modo de operação"
            options={MODE_OPTIONS}
            value={device.mode}
            columns={2}
            onChange={(mode) => onCommand({ type: 'climateMode', mode })}
          />
        </div>
      )}

      {hasFan && (
        <div className="control-section">
          <SegmentedControl
            label="Velocidade do vento"
            options={FAN_OPTIONS}
            value={device.fanSpeed}
            columns={2}
            onChange={(fanSpeed) => onCommand({ type: 'fanSpeed', fanSpeed })}
          />
        </div>
      )}
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

  DetailControls: ClimateDetailControls,
};
