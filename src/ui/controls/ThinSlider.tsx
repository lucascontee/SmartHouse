import { useId } from 'react';

export interface ThinSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue: string;
  swatchHex?: string | null;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function ThinSlider({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  swatchHex = null,
  disabled = false,
  onChange,
}: ThinSliderProps) {
  const inputId = useId();
  const ratio = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="control-slider">
      <div className="control-slider__header">
        <label className="control-label" htmlFor={inputId}>
          {label}
        </label>
        <div className="control-slider__value">
          {swatchHex && (
            <span
              className="color-micro-swatch"
              style={{ backgroundColor: swatchHex }}
              aria-hidden="true"
            />
          )}
          <span className="mono tabular">{displayValue}</span>
        </div>
      </div>

      <div className="thin-slider-wrap">
        <input
          id={inputId}
          type="range"
          className="thin-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          style={{
            background: `linear-gradient(to right, var(--ink) 0%, var(--ink) ${ratio}%, var(--border-active) ${ratio}%, var(--border-active) 100%)`,
          }}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
