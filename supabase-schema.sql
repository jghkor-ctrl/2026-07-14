create extension if not exists pgcrypto;

create table if not exists public.lotto_draws (
  id uuid primary key default gen_random_uuid(),
  round_number integer not null unique,
  main_numbers jsonb not null,
  bonus_number integer not null,
  created_at timestamptz not null default now(),
  constraint lotto_draws_main_numbers_is_array check (
    jsonb_typeof(main_numbers) = 'array'
  ),
  constraint lotto_draws_main_numbers_length check (
    jsonb_array_length(main_numbers) = 6
  ),
  constraint lotto_draws_bonus_number_range check (
    bonus_number between 1 and 45
  )
);

create index if not exists lotto_draws_round_number_desc_idx
  on public.lotto_draws (round_number desc);
