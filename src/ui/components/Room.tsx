import type { ReactNode } from 'react';
import doodleUrl from '../../assets/ui/DoodleJumpFrame.png';
import windowUrl from '../../assets/ui/Window.png';

/**
 * The room from the original design: dark wall, wooden floor, the Doodle Jump
 * picture on the left and a window on the right (decorations only show on
 * wide screens), with the TV in the middle.
 */
export function Room({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`room ${className}`}>
      <img src={doodleUrl} className="room-decor room-decor-left" alt="" aria-hidden="true" loading="lazy" />
      {children}
      <img src={windowUrl} className="room-decor room-decor-right" alt="" aria-hidden="true" loading="lazy" />
    </div>
  );
}

/** TV bezel around a screen. `controls` render on the bezel (power, pause...). */
export function Tv({ children, controls, off = false }: { children: ReactNode; controls?: ReactNode; off?: boolean }) {
  return (
    <div className={`tv${off ? ' tv-off' : ''}`}>
      <div className="tv-antenna" aria-hidden="true" />
      <div className="tv-body">
        <div className="tv-screen">{children}</div>
        {controls ? <div className="tv-controls">{controls}</div> : null}
      </div>
    </div>
  );
}
