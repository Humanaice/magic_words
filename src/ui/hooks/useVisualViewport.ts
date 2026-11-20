import { useEffect } from 'react';

/**
 * Publishes the *visual* viewport (the part of the page not covered by the
 * on-screen keyboard) as CSS variables:
 *   --vv-height  visible height in px
 *   --vv-top     offset of the visible area from the top of the layout viewport
 *
 * Chrome on Android already shrinks the layout when the keyboard opens because
 * of `interactive-widget=resizes-content` in the viewport meta tag. iOS Safari
 * ignores that and overlays the keyboard instead, so the game screen is sized
 * with these variables to stay above the keyboard everywhere.
 */
export function useVisualViewportVars(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = vv ? vv.height : window.innerHeight;
        const top = vv ? vv.offsetTop : 0;
        root.style.setProperty('--vv-height', `${Math.round(height)}px`);
        root.style.setProperty('--vv-top', `${Math.round(top)}px`);
      });
    };
    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);
}

/** True on touch-first devices (phones/tablets). */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
}
