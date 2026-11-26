import { Lightbulb, SunMedium } from 'lucide-react';
import { DEVICE_LIMITS, kelvinToHex, type LightDevice } from '../domain/types';
import { PowerToggle } from '../ui/controls/PowerToggle';
import { ThinSlider } from '../ui/controls/ThinSlider';
import type { DeviceDetailProps, DeviceRegistryModule } from './device-registry';

const RGB_SWATCH_PRESETS = ['#FAFAFA', '#FFBE76', '#F87171', '#60A5FA', '#4ADE80'] as const;

function LightDetailControls({ device, onCommand }: DeviceDetailProps<LightDevice>) {
  const hasBrightness = device.capabilities.includes('brightness');
  const hasColorTemp = device.capabilities.includes('colorTemp');
  const hasRgb = device.capabilities.includes('rgb');
  const hasGranularControls = hasBrightness || hasColorTemp || hasRgb;

  const currentColorTemp = device.colorTempK ?? 4000;
  const currentHex = device.colorHex ?? '#FAFAFA';

  return (
    <div className="detail-controls" data-device-type="light">
      <div className="control-section">
        <PowerToggle
          checked={device.isOn}
          pending={device.pending}
          onToggle={(isOn) => onCommand({ type: 'power', isOn })}
        />
        {!hasGranularControls && (
          <p className="control-hint muted">Controle simples (liga/desliga)</p>
        )}
      </div>

      {hasBrightness && (
        <div className="control-section">
          <ThinSlider
            label="Intensidade"
            value={device.brightness}
            min={DEVICE_LIMITS.BRIGHTNESS_MIN}
            max={DEVICE_LIMITS.BRIGHTNESS_MAX}
            displayValue={`${device.brightness}%`}
            onChange={(brightness) => onCommand({ type: 'brightness', brightness })}
          />
        </div>
      )}

      {hasColorTemp && (
        <div className="control-section">
          <ThinSlider
            label="Temperatura de cor"
            value={currentColorTemp}
            min={DEVICE_LIMITS.COLOR_TEMP_MIN_K}
            max={DEVICE_LIMITS.COLOR_TEMP_MAX_K}
            step={100}
            displayValue={`${currentColorTemp} K`}
            swatchHex={kelvinToHex(currentColorTemp)}
            onChange={(colorTempK) => onCommand({ type: 'colorTemp', colorTempK })}
          />
        </div>
      )}

      {hasRgb && (
        <div className="control-section">
          <div className="control-slider__header">
            <span className="control-label">Cor RGB</span>
            <div className="control-slider__value">
              <span
                className="color-micro-swatch"
                style={{ backgroundColor: currentHex }}
                aria-hidden="true"
              />
              <span className="mono tabular">{currentHex}</span>
            </div>
          </div>

          <div className="color-swatch-row">
            {RGB_SWATCH_PRESETS.map((hex) => {
              const active = device.colorMode === 'rgb' && currentHex.toUpperCase() === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Selecionar cor ${hex}`}
                  aria-pressed={active}
                  className={`btn btn-tonal color-preset-btn ${active ? 'is-active' : ''}`}
                  onClick={() => onCommand({ type: 'rgb', colorHex: hex })}
                >
                  <span
                    className="color-micro-swatch"
                    style={{ backgroundColor: hex }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}

            <label className="btn btn-tonal color-picker-btn" aria-label="Seletor de cor personalizada">
              <input
                type="color"
                value={currentHex}
                className="color-picker-input"
                onChange={(event) => onCommand({ type: 'rgb', colorHex: event.target.value })}
              />
              <span className="mono">HEX</span>
            </label>
          </div>
        </div>
      )}
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

  DetailControls: LightDetailControls,
};
