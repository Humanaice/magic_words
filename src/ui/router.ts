import { useEffect, useState } from 'react';
import { isGameModeId } from '../game/modes';
import type { GameModeId } from '../game/types';

/**
 * Tiny hash router: hash URLs work on GitHub Pages and in nginx without any
 * server-side rewrite rules.
 *   #/                 home (menu + manual and credits)
 *   #/jogar/stairs     game, Stairs mode
 *   #/jogar/random     game, Random mode
 *   #/placar[/mode]    leaderboard
 */
export type Route =
  | { name: 'home' }
  | { name: 'play'; mode: GameModeId }
  | { name: 'leaderboard'; mode: GameModeId };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'jogar' && parts[1] && isGameModeId(parts[1])) return { name: 'play', mode: parts[1] };
  if (parts[0] === 'placar') {
    return { name: 'leaderboard', mode: parts[1] && isGameModeId(parts[1]) ? parts[1] : 'stairs' };
  }
  return { name: 'home' };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'play':
      return `#/jogar/${route.mode}`;
    case 'leaderboard':
      return `#/placar/${route.mode}`;
    default:
      return '#/';
  }
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const href = routeHref(route);
  if (options.replace) {
    history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
