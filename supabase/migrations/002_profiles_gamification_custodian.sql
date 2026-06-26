-- User profiles with role (student/custodian)
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  display_name text,
  role text not null default 'student' check (role in ('student', 'custodian')),
  xp int not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  last_practice_date date,
  total_time_seconds int not null default 0,
  total_questions_answered int not null default 0,
  created_at timestamptz default now()
);

-- Custodian-student relationship
create table if not exists custodian_students (
  custodian_id uuid references profiles(id) not null,
  student_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  primary key (custodian_id, student_id)
);

-- Achievements/badges
create table if not exists achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  xp_reward int not null default 0,
  condition_type text not null,  -- 'questions_answered', 'streak', 'score', 'time', 'skill_mastery'
  condition_value int not null   -- threshold to earn
);

-- User earned achievements
create table if not exists user_achievements (
  user_id uuid references profiles(id) not null,
  achievement_id text references achievements(id) not null,
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

-- Add time_seconds to quiz_sessions
alter table quiz_sessions add column if not exists time_seconds int default 0;
alter table quiz_sessions add column if not exists xp_earned int default 0;

-- RLS for profiles
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Custodians can view their students' profiles
drop policy if exists "Custodians can view student profiles" on profiles;
create policy "Custodians can view student profiles"
  on profiles for select
  using (
    id in (
      select student_id from custodian_students
      where custodian_id = auth.uid()
    )
  );

-- RLS for custodian_students
alter table custodian_students enable row level security;

drop policy if exists "Custodians can view own links" on custodian_students;
create policy "Custodians can view own links"
  on custodian_students for select
  using (custodian_id = auth.uid() or student_id = auth.uid());

drop policy if exists "Custodians can insert links" on custodian_students;
create policy "Custodians can insert links"
  on custodian_students for insert
  with check (custodian_id = auth.uid());

-- RLS for achievements (public read)
alter table achievements enable row level security;

drop policy if exists "Anyone can view achievements" on achievements;
create policy "Anyone can view achievements"
  on achievements for select
  using (true);

-- RLS for user_achievements
alter table user_achievements enable row level security;

drop policy if exists "Users can view own achievements" on user_achievements;
create policy "Users can view own achievements"
  on user_achievements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own achievements" on user_achievements;
create policy "Users can insert own achievements"
  on user_achievements for insert
  with check (auth.uid() = user_id);

-- Custodians can view student achievements
drop policy if exists "Custodians can view student achievements" on user_achievements;
create policy "Custodians can view student achievements"
  on user_achievements for select
  using (
    user_id in (
      select student_id from custodian_students
      where custodian_id = auth.uid()
    )
  );

-- Custodians can view student quiz sessions
drop policy if exists "Custodians can view student sessions" on quiz_sessions;
create policy "Custodians can view student sessions"
  on quiz_sessions for select
  using (
    user_id in (
      select student_id from custodian_students
      where custodian_id = auth.uid()
    )
  );

-- Seed achievements
insert into achievements (id, title, description, icon, xp_reward, condition_type, condition_value) values
  ('first_quiz', 'First Steps', 'Complete your first quiz', '🎯', 50, 'questions_answered', 10),
  ('q50', 'Half Century', 'Answer 50 questions', '📚', 100, 'questions_answered', 50),
  ('q100', 'Century Club', 'Answer 100 questions', '💯', 200, 'questions_answered', 100),
  ('q500', 'Knowledge Seeker', 'Answer 500 questions', '🧠', 500, 'questions_answered', 500),
  ('q1000', 'SAT Warrior', 'Answer 1000 questions', '⚔️', 1000, 'questions_answered', 1000),
  ('streak3', 'On a Roll', 'Practice 3 days in a row', '🔥', 75, 'streak', 3),
  ('streak7', 'Week Warrior', 'Practice 7 days in a row', '🔥', 150, 'streak', 7),
  ('streak30', 'Monthly Master', 'Practice 30 days in a row', '🔥', 500, 'streak', 30),
  ('perfect', 'Perfect Score', 'Get 100% on a quiz', '⭐', 100, 'score', 100),
  ('time60', 'Hour Power', 'Practice for 60 minutes total', '⏱️', 100, 'time', 3600),
  ('time300', 'Dedicated', '5 hours of total practice', '⏱️', 300, 'time', 18000),
  ('hard_ace', 'Hard Mode Hero', 'Score 80%+ on hard questions', '💪', 200, 'score', 80),
  ('algebra_master', 'Algebra Master', '90%+ accuracy in Algebra (20+ questions)', '📐', 300, 'skill_mastery', 90),
  ('geometry_master', 'Geometry Master', '90%+ accuracy in Geometry (20+ questions)', '📏', 300, 'skill_mastery', 90)
on conflict (id) do nothing;

-- Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
