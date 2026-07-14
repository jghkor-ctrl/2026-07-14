create extension if not exists pgcrypto;

create sequence if not exists public.lotto_draws_round_number_seq
  as integer
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.lotto_draws_main_numbers_valid(numbers jsonb)
returns boolean
language sql
immutable
as $$
  select case
    when jsonb_typeof(numbers) <> 'array' then false
    when jsonb_array_length(numbers) <> 6 then false
    when exists (
      select 1
      from jsonb_array_elements_text(numbers) as item(value)
      where item.value !~ '^[0-9]+$'
        or cast(item.value as integer) < 1
        or cast(item.value as integer) > 45
    ) then false
    when (
      select count(distinct cast(item.value as integer))
      from jsonb_array_elements_text(numbers) as item(value)
    ) <> 6 then false
    when (
      select array_agg(cast(item.value as integer) order by cast(item.value as integer))
      from jsonb_array_elements_text(numbers) as item(value)
    ) <> array(
      select cast(item.value as integer)
      from jsonb_array_elements_text(numbers) as item(value)
      order by cast(item.value as integer)
    ) then false
    else true
  end;
$$;

create or replace function public.lotto_draws_bonus_not_in_main_valid(
  numbers jsonb,
  bonus integer
)
returns boolean
language sql
immutable
as $$
  select case
    when jsonb_typeof(numbers) <> 'array' then false
    when bonus < 1 or bonus > 45 then false
    else not exists (
      select 1
      from jsonb_array_elements_text(numbers) as item(value)
      where cast(item.value as integer) = bonus
    )
  end;
$$;

create table if not exists public.lotto_draws (
  id uuid primary key default gen_random_uuid(),
  round_number integer not null unique default nextval('public.lotto_draws_round_number_seq'),
  main_numbers jsonb not null,
  bonus_number integer not null,
  created_at timestamptz not null default now(),
  constraint lotto_draws_main_numbers_valid_check
    check (public.lotto_draws_main_numbers_valid(main_numbers)),
  constraint lotto_draws_bonus_number_range_check
    check (bonus_number between 1 and 45),
  constraint lotto_draws_bonus_not_in_main_check
    check (public.lotto_draws_bonus_not_in_main_valid(main_numbers, bonus_number))
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

alter table public.lotto_draws enable row level security;

drop policy if exists "service role can read lotto draws" on public.lotto_draws;
drop policy if exists "service role can insert lotto draws" on public.lotto_draws;

-- Access is intended only through the Vercel serverless function using the service role key.
-- No public policies are created here.
