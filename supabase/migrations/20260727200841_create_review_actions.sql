-- Candidate decisions are append-only. The most recent action for one
-- owner/import/direction/symbol is the current review state, while older rows
-- remain available for audit and future workflow analysis.
create table public.review_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users(id)
    on update restrict
    on delete cascade,
  import_batch_id uuid not null,
  direction text not null
    check (direction in ('bullish', 'bearish')),
  ticker_symbol text not null
    check (
      char_length(ticker_symbol) between 1 and 32
      and ticker_symbol = upper(btrim(ticker_symbol))
      and ticker_symbol ~ '^[A-Z0-9][A-Z0-9._/-]{0,31}$'
    ),
  source_row_number bigint not null
    check (source_row_number > 0),
  action text not null
    check (action in ('saved', 'dismissed', 'deferred', 'watchlisted')),
  reason_code text not null
    check (
      reason_code in (
        'strong_setup',
        'needs_research',
        'review_later',
        'event_risk',
        'insufficient_data',
        'duplicate_exposure',
        'outside_plan',
        'other'
      )
    ),
  note text
    check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  constraint review_actions_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.review_actions is
  'Append-only candidate decision history. The latest row per candidate is its current review state.';

comment on column public.review_actions.note is
  'Optional user-authored context. Do not place credentials, API keys, or broker account data here.';

create index review_actions_owner_candidate_created_idx
  on public.review_actions (
    owner_id,
    import_batch_id,
    direction,
    ticker_symbol,
    created_at desc,
    id desc
  );

create index review_actions_batch_owner_idx
  on public.review_actions (import_batch_id, owner_id);

alter table public.review_actions enable row level security;

create policy review_actions_owner_select
  on public.review_actions
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy review_actions_owner_insert
  on public.review_actions
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.review_actions
  from anon, authenticated;

grant select, insert on table public.review_actions
  to authenticated;

grant select, insert, update, delete on table public.review_actions
  to service_role;
