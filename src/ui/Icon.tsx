import type { LucideIcon, LucideProps } from 'lucide-react';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
}

/**
 * Renderiza ícones Lucide padronizados com traço 1.5px e sem preenchimento.
 */
export function Icon({
  icon: LucideComponent,
  size = 16,
  strokeWidth = 1.5,
  fill = 'none',
  ...props
}: IconProps) {
  return (
    <LucideComponent
      size={size}
      strokeWidth={strokeWidth}
      fill={fill}
      aria-hidden="true"
      {...props}
    />
  );
}
