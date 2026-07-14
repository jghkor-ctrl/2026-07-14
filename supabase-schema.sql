create extension if not exists pgcrypto;

create sequence if not exists public.lotto_draws_round_number_seq
  as integer
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create table if not exists public.lotto_draws (
  id uuid primary key default gen_random_uuid(),
  round_number integer not null unique default nextval('public.lotto_draws_round_number_seq'),
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

alter sequence public.lotto_draws_round_number_seq
  owned by public.lotto_draws.round_number;

do $$
declare
  next_round integer;
begin
  select coalesce(max(round_number), 0) + 1
    into next_round
  from public.lotto_draws;

  perform setval('public.lotto_draws_round_number_seq', next_round, false);
end $$;

create index if not exists lotto_draws_round_number_desc_idx
  on public.lotto_draws (round_number desc);

create index if not exists lotto_draws_created_at_desc_idx
  on public.lotto_draws (created_at desc);
