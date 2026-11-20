import { useEffect, useState } from 'react';
import { GAME_MODES } from '../../game/modes';
import type { GameModeId } from '../../game/types';
import { leaderboard, type ScoreEntry } from '../../leaderboard';
import { Icon } from '../components/Icons';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { Room } from '../components/Room';
import { navigate, routeHref } from '../router';

const TOP_N = 10;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; entries: ScoreEntry[] }
  | { kind: 'error'; message: string };

/** Result of a request, tagged with the request it belongs to. */
type Loaded = { key: string; state: LoadState };

export function LeaderboardScreen({ mode }: { mode: GameModeId }) {
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requestKey = `${mode}:${reloadCount}`;
  // Anything not loaded for the current request is still loading.
  const state: LoadState = loaded?.key === requestKey ? loaded.state : { kind: 'loading' };

  useEffect(() => {
    let cancelled = false;
    leaderboard
      .top(mode, TOP_N)
      .then((entries) => {
        if (!cancelled) setLoaded({ key: requestKey, state: { kind: 'ready', entries } });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erro ao carregar o placar.';
          setLoaded({ key: requestKey, state: { kind: 'error', message } });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, requestKey]);

  return (
    <Room className="page-room">
      <main className="panel leaderboard-panel">
        <header className="panel-header">
          <a className="icon-button" href={routeHref({ name: 'home' })} aria-label="Voltar ao menu">
            <Icon name="back" />
          </a>
          <h1 className="panel-title">
            <Icon name="trophy" size={32} /> Leaderboard
          </h1>
        </header>

        <div className="tabs" role="tablist" aria-label="Modo de jogo">
          {(Object.keys(GAME_MODES) as GameModeId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === mode}
              className={`tab${id === mode ? ' is-active' : ''}`}
              onClick={() => navigate({ name: 'leaderboard', mode: id }, { replace: true })}
            >
              {GAME_MODES[id].name}
            </button>
          ))}
        </div>

        <section role="tabpanel" aria-live="polite" className="leaderboard-body">
          {state.kind === 'loading' && <p className="leaderboard-empty">Carregando…</p>}
          {state.kind === 'error' && (
            <div className="leaderboard-empty">
              <p className="form-error">{state.message}</p>
              <button type="button" className="button button-small" onClick={() => setReloadCount((n) => n + 1)}>
                Tentar de novo
              </button>
            </div>
          )}
          {state.kind === 'ready' && <LeaderboardTable entries={state.entries} />}
        </section>

        <p className="form-hint">{leaderboard.description}</p>

        <footer className="panel-actions">
          <a className="button" href={routeHref({ name: 'play', mode })}>
            Jogar {GAME_MODES[mode].name}
          </a>
        </footer>
      </main>
    </Room>
  );
}
