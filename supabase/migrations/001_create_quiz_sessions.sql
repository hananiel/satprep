-- Quiz session results
create table quiz_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  completed_at timestamptz default now(),
  module text not null,
  domain text,
  difficulty text,
  total_questions int not null,
  correct_answers int not null,
  score_pct int not null,
  questions jsonb not null
);

-- Index for fast user queries
create index idx_quiz_sessions_user on quiz_sessions(user_id, completed_at desc);

-- Row Level Security
alter table quiz_sessions enable row level security;

create policy "Users can view own sessions"
  on quiz_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on quiz_sessions for insert
  with check (auth.uid() = user_id);
