-- Captura de correções do usuário sobre biomarcadores extraídos.
-- Cada correção vira um dado de treino para melhorar o motor de extração
-- (templates por laboratório / fine-tuning futuro).
-- Execute no Supabase SQL Editor.

create table if not exists public.extraction_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles not null,
  slug            text,
  biomarker_name  text,
  field           text,        -- 'value' | 'unit' | 'name' | 'ref_min' | 'ref_max'
  original_value  text,
  corrected_value text,
  error_type      text default 'edited',
  created_at      timestamptz default now()
);

alter table public.extraction_feedback enable row level security;

create policy "user manages own extraction feedback"
  on public.extraction_feedback for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
