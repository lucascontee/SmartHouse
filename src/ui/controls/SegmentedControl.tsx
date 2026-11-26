export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  columns = 2,
  disabled = false,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="control-group" role="group" aria-label={label}>
      <span className="control-label">{label}</span>
      <div className={`segmented-grid segmented-grid--cols-${columns}`}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              className={`btn segmented-grid__btn ${active ? 'btn-solid' : 'btn-tonal'}`}
              onClick={() => onChange(opt.value)}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
