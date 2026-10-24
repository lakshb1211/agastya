-- ==============================================================================
-- Agastya — Your Learning Universe
-- Supabase PostgreSQL Schema & Security Policies (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  grade text,
  preferred_lang text default 'en',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to automatically create a profile row upon Supabase Auth sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, grade)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'grade', 'School')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. USER STREAKS TABLE
create table if not exists public.user_streaks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  streak_count int default 0 not null,
  last_active_date date default current_date not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.user_streaks enable row level security;

create policy "Users can view own streak"
  on public.user_streaks for select
  using (auth.uid() = user_id);

create policy "Users can insert own streak"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own streak"
  on public.user_streaks for update
  using (auth.uid() = user_id);


-- 3. STUDY MATERIALS TABLE
create table if not exists public.study_materials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default 'Study Material',
  content text not null,
  key_topics text[] default array[]::text[],
  sentence_count int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.study_materials enable row level security;

create policy "Users can view own study materials"
  on public.study_materials for select
  using (auth.uid() = user_id);

create policy "Users can insert own study materials"
  on public.study_materials for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own study materials"
  on public.study_materials for delete
  using (auth.uid() = user_id);


-- 4. QUIZ ATTEMPTS TABLE
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  material_id uuid references public.study_materials on delete set null,
  quiz_type text default 'd' not null, -- 'd' = diagnostic, 'p' = practice
  score int not null,
  total int not null,
  percentage int not null,
  weak_topics text[] default array[]::text[],
  topic_breakdown jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own quiz attempts"
  on public.quiz_attempts for delete
  using (auth.uid() = user_id);

create index if not exists idx_quiz_attempts_user_created
  on public.quiz_attempts(user_id, created_at desc);


-- 5. CHAT MESSAGES / DOUBTS TABLE
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  question text not null,
  answer text not null,
  language text default 'en',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

create policy "Users can view own chat messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);
