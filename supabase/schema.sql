-- Magic Words: online leaderboard table for Supabase (Postgres).
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it only creates what is missing and recreates the policies).
--
-- Security model:
--   * The browser uses the public "anon" (publishable) key, which is visible to
--     anyone who opens the game. So the anon role may only READ and INSERT scores.
--   * No UPDATE or DELETE for anon: nobody can change or erase someone else's score.
--   * CHECK constraints reject junk (empty/huge nicknames, absurd scores, unknown modes).
--   * A client-side game can't prove a score is real: anyone can call the API and
--     insert a fake score. That's acceptable for a casual game; if it gets abused,
--     delete the bad rows in the dashboard (Table Editor) using the service role.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  nickname    text        not null,
  score       integer     not null,
  mode        text        not null,
  created_at  timestamptz not null default now(),

  constraint scores_nickname_length check (char_length(btrim(nickname)) between 1 and 20),
  constraint scores_nickname_no_control_chars check (nickname !~ '[[:cntrl:]]'),
  constraint scores_score_range check (score between 0 and 1000000),
  constraint scores_mode_valid check (mode in ('stairs', 'random'))
);

-- The leaderboard query: best scores of one mode.
create index if not exists scores_mode_score_idx
  on public.scores (mode, score desc, created_at asc);

-- Row Level Security: with RLS on, nothing is allowed unless a policy allows it.
alter table public.scores enable row level security;

drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores"
  on public.scores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit a score" on public.scores;
create policy "Anyone can submit a score"
  on public.scores
  for insert
  to anon, authenticated
  with check (true); -- the CHECK constraints above validate the row

-- Table privileges (defense in depth, on top of RLS): read + insert only,
-- and only the columns the game sends (id and created_at come from defaults).
revoke all on table public.scores from anon, authenticated;
grant select on table public.scores to anon, authenticated;
grant insert (nickname, score, mode) on table public.scores to anon, authenticated;
