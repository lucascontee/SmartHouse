import { Power } from 'lucide-react';
import { Icon } from '../Icon';

export interface PowerToggleProps {
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  pending?: boolean;
  labelOn?: string;
  labelOff?: string;
}

export function PowerToggle({
  checked,
  onToggle,
  disabled = false,
  pending = false,
  labelOn = 'Ligado',
  labelOff = 'Desligado',
}: PowerToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={pending}
      disabled={disabled}
      className={`btn control-toggle ${checked ? 'btn-solid' : 'btn-tonal'}`}
      onClick={() => onToggle(!checked)}
    >
      <Icon icon={Power} size={15} />
      <span>{checked ? labelOn : labelOff}</span>
      {pending && <span className="mono tabular control-toggle__pending">·</span>}
    </button>
  );
}
