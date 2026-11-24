// Purpose: Implement the TiltCard components module, keeping this responsibility separate for maintainability.
/**
 * TiltCard: a photo card that leans toward the pointer in 3D, with a soft light
 * sheen that follows it and the picture drifting slightly behind.
 *
 * Adapted from the supplied source: it now fills its container (grid cell) with a
 * fixed aspect ratio, is a real <button> (click / keyboard), and takes `children`
 * that float slightly above the photo. Styles live in TiltCard.css.
 *
 * Props: src, alt, ratio (height / width, default 0.625 = 16:10), max (max tilt in
 * degrees, default 11), sheen, fallbackBackground (shown if the image fails).
 */
import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import './TiltCard.css';

export interface TiltCardProps {
  src?: string;
  alt?: string;
  ratio?: number;
  max?: number;
  sheen?: boolean;
  fallbackBackground?: string;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function TiltCard({
  src,
  alt = '',
  ratio = 0.625,
  max = 11,
  sheen = true,
  fallbackBackground,
  ariaLabel,
  onClick,
  className,
  children,
}: TiltCardProps) {
  const el = useRef<HTMLButtonElement>(null);
  const [ok, setOk] = useState(true);

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const node = el.current;
    if (!node || e.pointerType === 'touch') return;
    const r = node.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    node.style.setProperty('--rx', `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
    node.style.setProperty('--ry', `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    node.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    node.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    node.style.setProperty('--px', `${((px - 0.5) * -14).toFixed(1)}px`);
    node.style.setProperty('--py', `${((py - 0.5) * -14).toFixed(1)}px`);
    node.dataset.live = '';
  };

  const leave = () => {
    const node = el.current;
    if (!node) return;
    delete node.dataset.live;
    for (const k of ['--rx', '--ry', '--px', '--py']) node.style.removeProperty(k);
  };

  return (
    <div className="fd-tc">
      <button
        ref={el}
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`fd-tc-card${className ? ` ${className}` : ''}`}
        data-sheen={sheen || undefined}
        style={{ aspectRatio: `${1 / ratio}` }}
        onPointerMove={move}
        onPointerLeave={leave}
        onPointerCancel={leave}
      >
        <span
          className="fd-tc-photo"
          style={!ok && fallbackBackground ? { background: fallbackBackground } : undefined}
        >
          {src && ok ? (
            <img
              className="fd-tc-img"
              src={src}
              alt={alt}
              draggable={false}
              decoding="async"
              loading="lazy"
              onError={() => setOk(false)}
            />
          ) : null}
        </span>
        <span className="fd-tc-shade" />
        <span className="fd-tc-sheen" />
        <span className="fd-tc-content">{children}</span>
      </button>
    </div>
  );
}
