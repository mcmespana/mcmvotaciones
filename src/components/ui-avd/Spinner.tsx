import type { CSSProperties } from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const SIZE_CLASS: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-[2.5px]',
  lg: 'w-9 h-9 border-[3px]',
};

export function Spinner({ size = 'md', className, style }: SpinnerProps) {
  return (
    <div
      className={`shrink-0 rounded-full border-[var(--avd-border)] border-t-[var(--avd-brand)] animate-spin [animation-duration:0.7s] ${SIZE_CLASS[size]}${className ? ` ${className}` : ''}`}
      style={style}
    />
  );
}
