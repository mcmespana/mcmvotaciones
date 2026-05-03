import type { CSSProperties } from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const SIZE: Record<NonNullable<SpinnerProps['size']>, { wh: number; border: number }> = {
  sm: { wh: 16, border: 2 },
  md: { wh: 28, border: 2.5 },
  lg: { wh: 36, border: 3 },
};

export function Spinner({ size = 'md', className, style }: SpinnerProps) {
  const { wh, border } = SIZE[size];
  return (
    <div
      className={className}
      style={{
        width: wh, height: wh, flexShrink: 0,
        border: `${border}px solid var(--avd-border)`,
        borderTopColor: 'var(--avd-brand)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        ...style,
      }}
    />
  );
}
