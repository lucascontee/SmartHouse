import { Tv, Volume2, VolumeX } from 'lucide-react';
import { DEVICE_LIMITS, type TvDevice } from '../domain/types';
import { Icon } from '../ui/Icon';
import { PowerToggle } from '../ui/controls/PowerToggle';
import { SegmentedControl } from '../ui/controls/SegmentedControl';
import { ThinSlider } from '../ui/controls/ThinSlider';
import type { DeviceDetailProps, DeviceRegistryModule } from './device-registry';

function TvDetailControls({ device, onCommand }: DeviceDetailProps<TvDevice>) {
  const hasVolume = device.capabilities.includes('volume');
  const hasMute = device.capabilities.includes('mute');
  const hasSource = device.capabilities.includes('source');

  const sourceOptions = device.availableSources.map((src) => ({
    value: src,
    label: src,
  }));

  return (
    <div className="detail-controls" data-device-type="tv">
      <div className="control-section">
        <PowerToggle
          checked={device.isOn}
          pending={device.pending}
          onToggle={(isOn) => onCommand({ type: 'power', isOn })}
        />
      </div>

      {(hasVolume || hasMute) && (
        <div className="control-section">
          {hasVolume && (
            <ThinSlider
              label="Volume"
              value={device.volume}
              min={DEVICE_LIMITS.VOLUME_MIN}
              max={DEVICE_LIMITS.VOLUME_MAX}
              displayValue={device.muted ? 'Mudo' : `${device.volume}%`}
              onChange={(volume) => onCommand({ type: 'volume', volume })}
            />
          )}

          {hasMute && (
            <button
              type="button"
              aria-pressed={device.muted}
              className={`btn control-mute-btn ${device.muted ? 'btn-solid' : 'btn-tonal'}`}
              onClick={() => onCommand({ type: 'mute', muted: !device.muted })}
            >
              <Icon icon={device.muted ? VolumeX : Volume2} size={15} />
              <span>{device.muted ? 'Mudo ativado' : 'Silenciar'}</span>
            </button>
          )}
        </div>
      )}

      {hasSource && (
        <div className="control-section">
          <SegmentedControl
            label="Entrada / Fonte"
            options={sourceOptions}
            value={device.source}
            columns={2}
            onChange={(source) => onCommand({ type: 'source', source })}
          />
        </div>
      )}
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

  DetailControls: TvDetailControls,
};
