// Tiny outline rectangle that shows an aspect ratio (used in chips and the ratio picker).
import type { AspectRatio } from '@/lib/studio/plans';
import { cx } from '@/components/studio/ui';

const SHAPES: Record<AspectRatio, [number, number]> = {
  '1:1': [1, 1],
  '9:16': [0.62, 1],
  '16:9': [1, 0.62],
};

export function RatioShape({ ratio, size = 14, className }: { ratio: AspectRatio; size?: number; className?: string }) {
  const [w, h] = SHAPES[ratio];
  return (
    <span
      aria-hidden="true"
      className={cx('inline-flex flex-none items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <span
        className="block rounded-[3px] border-[1.5px] border-current"
        style={{ width: Math.round(size * w), height: Math.round(size * h) }}
      />
    </span>
  );
}
