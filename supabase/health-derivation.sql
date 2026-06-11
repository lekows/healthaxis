-- Motor de derivação pós-upload: histórico de health scores + idempotência de lembretes.
-- Rodar uma vez no SQL editor do Supabase.

create table if not exists public.health_scores_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  overall integer not null default 0,
  metabolic integer not null default 0,
  cardiovascular integer not null default 0,
  lifestyle integer not null default 0,
  preventive integer not null default 0,
  date_label text,
  recorded_at date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, recorded_at)
);

alter table public.health_scores_history enable row level security;

create policy "users can manage their own health score history"
  on public.health_scores_history for all using (auth.uid() = user_id);

-- Remove duplicatas antes do índice único (seeds antigos podem ter repetido títulos)
delete from public.preventive_reminders a using public.preventive_reminders b
  where a.id > b.id and a.user_id = b.user_id and a.title = b.title;

create unique index if not exists preventive_reminders_user_title
  on public.preventive_reminders (user_id, title);
