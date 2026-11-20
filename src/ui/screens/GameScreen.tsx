import { useCallback, useEffect, useRef, useState } from 'react';
import slowTimeUrl from '../../assets/sprites/slowtime.png';
import { loadGameAssets } from '../../game/assets';
import { GameAudio } from '../../game/audio';
import { Game } from '../../game/Game';
import { GAME_MODES } from '../../game/modes';
import type { GameModeId, HudState } from '../../game/types';
import { Icon } from '../components/Icons';
import { Room } from '../components/Room';
import { SaveScoreForm } from '../components/SaveScoreForm';
import { isCoarsePointer } from '../hooks/useVisualViewport';
import { navigate, routeHref } from '../router';

const INITIAL_HUD: HudState = {
  status: 'ready',
  score: 0,
  extraLife: false,
  slowTime: 0,
  guard: false,
  double: 0,
  typed: '',
  typedMatches: true,
  fallCountdown: null,
  inSpace: false,
};

export function GameScreen({ mode }: { mode: GameModeId }) {
  const rules = GAME_MODES[mode];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [runId, setRunId] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // One audio manager per screen; created lazily so it's not rebuilt on every render.
  const [audio] = useState(() => new GameAudio());
  const [muted, setMuted] = useState(() => audio.muted);
  const [touch] = useState(isCoarsePointer);

  // Lock page scrolling while the game is on screen (avoids jumps when the keyboard opens).
  useEffect(() => {
    document.documentElement.classList.add('is-playing');
    return () => document.documentElement.classList.remove('is-playing');
  }, []);

  // Create the engine once the sprites and fonts are loaded.
  useEffect(() => {
    let disposed = false;

    loadGameAssets()
      .then((assets) => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        if (disposed || !canvas || !stage) return;
        const game = new Game(canvas, assets, rules, audio, {
          onHud: setHud,
          onGameOver: (score) => {
            setFinalScore(score);
            inputRef.current?.blur();
          },
        });
        gameRef.current = game;
        // Dev server only (stripped from production builds): lets browser tests inspect the game.
        if (import.meta.env.DEV) Object.assign(window, { __magicWordsGame: game });
        game.resize(stage.clientWidth, stage.clientHeight);
        setReady(true);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)));

    return () => {
      disposed = true;
      gameRef.current?.destroy();
      gameRef.current = null;
      audio.dispose();
    };
  }, [rules, audio]);

  // Keep the canvas fitted to the stage (window resize, rotation, keyboard opening).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => gameRef.current?.resize(stage.clientWidth, stage.clientHeight);
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    // devicePixelRatio changes (browser zoom, moving to another monitor) don't resize the element.
    const dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener('change', fit);
    return () => {
      observer.disconnect();
      dprQuery.removeEventListener('change', fit);
    };
  }, [ready]);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input) input.focus({ preventScroll: true });
  }, []);

  const clearInput = useCallback(() => {
    if (inputRef.current) inputRef.current.value = '';
    gameRef.current?.setTyped('');
  }, []);

  const start = useCallback(() => {
    // Focus synchronously inside the tap/click handler: iOS only opens the
    // keyboard for focus() calls made during a user gesture.
    focusInput();
    clearInput();
    setFinalScore(null);
    setRunId((id) => id + 1);
    gameRef.current?.start();
  }, [clearInput, focusInput]);

  const resume = useCallback(() => {
    focusInput();
    gameRef.current?.resume();
  }, [focusInput]);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    if (game.getStatus() === 'paused') resume();
    else game.pause();
  }, [resume]);

  const toggleMute = useCallback(() => {
    audio.setMuted(!audio.muted);
    setMuted(audio.muted);
  }, [audio]);

  // Typing: read the whole input value on `input` events. Mobile keyboards
  // report keyCode 229 on keydown (IME composition), so keydown can't be used
  // to know which letter was typed; the input's value is always right.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const onInput = () => {
      const game = gameRef.current;
      if (!game) return;
      // Space or Enter clears the current attempt.
      if (/\s/.test(input.value)) {
        clearInput();
        return;
      }
      if (game.setTyped(input.value)) input.value = '';
    };
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
        event.preventDefault();
        clearInput();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        clearInput();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        togglePause();
      }
    };
    input.addEventListener('input', onInput);
    input.addEventListener('beforeinput', onBeforeInput);
    input.addEventListener('keydown', onKeyDown);
    return () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('beforeinput', onBeforeInput);
      input.removeEventListener('keydown', onKeyDown);
    };
  }, [clearInput, togglePause]);

  // Desktop: typing anywhere goes to the game input, and Escape pauses.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const game = gameRef.current;
      const input = inputRef.current;
      if (!game || !input || event.target === input) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') {
        togglePause();
        return;
      }
      if (game.getStatus() === 'playing' && (event.key.length === 1 || event.key === 'Backspace')) {
        // Focusing during keydown makes the browser deliver this key to the input.
        input.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [togglePause]);

  // Pause automatically when the tab/app goes to the background.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) gameRef.current?.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const status = hud.status;
  const playing = status === 'playing';

  return (
    <Room className="game-room">
      <div className="game-shell">
        <header className="hud">
          <div className="hud-score" aria-live="off">
            <span className="hud-label">Pontuação</span>
            <span className="hud-value">{hud.score}</span>
          </div>

          <div className="hud-powers" aria-label="Poderes ativos">
            {hud.extraLife && (
              <span className="power power-life" title="Vida extra">
                +1
              </span>
            )}
            {hud.double > 0 && (
              <span className="power power-double" title="Pontos em dobro">
                2x
                <span className="power-timer" style={{ transform: `scaleX(${hud.double})` }} />
              </span>
            )}
            {hud.slowTime > 0 && (
              <span className="power power-slow" title="Tempo devagar">
                <img src={slowTimeUrl} alt="Tempo devagar" />
                <span className="power-timer" style={{ transform: `scaleX(${hud.slowTime})` }} />
              </span>
            )}
            {hud.guard && (
              <span className="power power-guard" title="Escudo: protege da próxima nuvem ruim">
                <Icon name="shield" size={28} title="Escudo" />
              </span>
            )}
          </div>

          <div className="hud-buttons">
            <button
              type="button"
              className="round-button"
              onClick={toggleMute}
              aria-label={muted ? 'Ligar o som' : 'Desligar o som'}
              aria-pressed={muted}
            >
              <Icon name={muted ? 'volumeOff' : 'volumeUp'} />
            </button>
            <button
              type="button"
              className={`round-button${status === 'paused' ? ' is-inverted' : ''}`}
              onClick={togglePause}
              disabled={status !== 'playing' && status !== 'paused'}
              aria-label={status === 'paused' ? 'Continuar' : 'Pausar'}
            >
              <Icon name={status === 'paused' ? 'play' : 'pause'} />
            </button>
            <a className="round-button power-button" href={routeHref({ name: 'home' })} aria-label="Sair para o menu">
              <Icon name="power" />
            </a>
          </div>
        </header>

        <div
          className="stage"
          ref={stageRef}
          // Keep the hidden input focused when tapping the game (no keyboard flicker)...
          onPointerDown={(e) => {
            if (playing && !(e.target as HTMLElement).closest('button, a, input')) e.preventDefault();
          }}
          // ...and re-open the keyboard if it was closed.
          onClick={() => {
            if (playing) focusInput();
          }}
        >
          <canvas ref={canvasRef} className="game-canvas" aria-label={`Magic Words, modo ${rules.name}`} />

          {loadError && (
            <div className="overlay">
              <div className="overlay-panel">
                <p className="form-error">Não foi possível carregar o jogo: {loadError}</p>
                <a className="button" href={routeHref({ name: 'home' })}>
                  Voltar
                </a>
              </div>
            </div>
          )}

          {status === 'ready' && !loadError && (
            <div className="overlay">
              <div className="overlay-panel">
                <h1 className="overlay-title">{rules.name}</h1>
                <p className="overlay-text">{rules.description}</p>
                <p className="overlay-text">
                  Digite a palavra de uma nuvem para a Willow pular nela. Espaço ou Enter apagam o que você digitou.
                </p>
                <div className="overlay-actions">
                  <a className="button button-danger" href={routeHref({ name: 'home' })}>
                    Voltar
                  </a>
                  <button type="button" className="button button-go" onClick={start} disabled={!ready}>
                    {ready ? 'Começar' : 'Carregando…'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'paused' && (
            <div className="overlay overlay-dim">
              <div className="overlay-panel overlay-panel-plain">
                <h1 className="overlay-title overlay-title-huge">Pausado</h1>
                <div className="overlay-actions">
                  <a className="button button-danger" href={routeHref({ name: 'home' })}>
                    Voltar
                  </a>
                  <button type="button" className="button button-go" onClick={resume}>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'over' && finalScore !== null && (
            <div className="overlay overlay-dim">
              <div className="overlay-panel">
                <h1 className="overlay-title overlay-title-huge">Game Over</h1>
                <p className="final-score">
                  Pontuação Final: <strong>{finalScore}</strong>
                </p>
                {finalScore > 0 && <SaveScoreForm key={runId} score={finalScore} mode={mode} />}
                <div className="overlay-actions">
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => navigate({ name: 'home' })}
                  >
                    Voltar
                  </button>
                  <button type="button" className="button button-go" onClick={start}>
                    Recomeçar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className={`typing-bar${playing ? '' : ' is-idle'}`}>
          {hud.fallCountdown !== null && playing && (
            <span className={`countdown${hud.fallCountdown <= 3 ? ' is-urgent' : ''}`} aria-live="polite">
              {hud.fallCountdown > 0 ? `Caindo em ${hud.fallCountdown}s` : 'Caindo!'}
            </span>
          )}
          <label className={`typed-box${hud.typedMatches ? '' : ' is-wrong'}`}>
            <span className="typed-text" aria-hidden="true">
              {hud.typed || <span className="typed-placeholder">{touch ? 'toque aqui' : 'digite…'}</span>}
            </span>
            {/*
              The real input. It is invisible but focusable, so it summons the
              on-screen keyboard; it covers the typed box so tapping the box
              focuses it natively (the most reliable way on iOS).
            */}
            <input
              ref={inputRef}
              className="game-input"
              type="text"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="enter"
              maxLength={24}
              aria-label="Digite a palavra"
              disabled={!ready}
            />
          </label>
          {touch && (
            <button
              type="button"
              className="round-button"
              onClick={focusInput}
              aria-label="Abrir o teclado"
              disabled={!playing}
            >
              <Icon name="keyboard" />
            </button>
          )}
        </footer>
      </div>
    </Room>
  );
}
