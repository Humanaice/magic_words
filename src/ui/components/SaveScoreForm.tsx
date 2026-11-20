import { useId, useState, type FormEvent } from 'react';
import type { GameModeId } from '../../game/types';
import {
  NICKNAME_MAX_LENGTH,
  cleanNickname,
  leaderboard,
  loadNickname,
  saveNickname,
  validateNewScore,
} from '../../leaderboard';
import { routeHref } from '../router';

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** Nickname form shown on the game over screen (no account needed). */
export function SaveScoreForm({ score, mode }: { score: number; mode: GameModeId }) {
  const inputId = useId();
  const [nickname, setNickname] = useState(loadNickname);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (state.kind === 'saving' || state.kind === 'saved') return;
    const entry = { nickname: cleanNickname(nickname), score, mode };
    const error = validateNewScore(entry);
    if (error) {
      setState({ kind: 'error', message: error });
      return;
    }
    setState({ kind: 'saving' });
    try {
      await leaderboard.submit(entry);
      saveNickname(entry.nickname);
      setState({ kind: 'saved' });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Não foi possível salvar.' });
    }
  }

  if (state.kind === 'saved') {
    return (
      <p className="save-score-done" role="status">
        Pontuação salva!{' '}
        <a href={routeHref({ name: 'leaderboard', mode })}>Ver Leaderboard</a>
      </p>
    );
  }

  return (
    <form className="save-score" onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId}>Seu apelido</label>
      <div className="save-score-row">
        <input
          id={inputId}
          className="text-input"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX_LENGTH}
          autoComplete="nickname"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="Willow"
        />
        <button type="submit" className="button button-small" disabled={state.kind === 'saving'}>
          {state.kind === 'saving' ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {state.kind === 'error' ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : (
        <p className="form-hint">{leaderboard.description}</p>
      )}
    </form>
  );
}
