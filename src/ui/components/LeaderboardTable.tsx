import type { ScoreEntry } from '../../leaderboard';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Nicknames are rendered as plain React text, which escapes them. Never use
 * dangerouslySetInnerHTML here: nicknames are user input.
 */
export function LeaderboardTable({ entries, highlightId }: { entries: ScoreEntry[]; highlightId?: string | null }) {
  if (entries.length === 0) {
    return <p className="leaderboard-empty">Ninguém jogou este modo ainda. Seja o primeiro!</p>;
  }
  return (
    <ol className="leaderboard-list">
      {entries.map((entry, index) => (
        <li key={entry.id} className={entry.id === highlightId ? 'is-highlighted' : undefined}>
          <span className="lb-rank">{index + 1}º</span>
          <span className="lb-name">{entry.nickname}</span>
          <span className="lb-score">{entry.score}</span>
          <span className="lb-date">{dateFormat.format(new Date(entry.createdAt))}</span>
        </li>
      ))}
    </ol>
  );
}
