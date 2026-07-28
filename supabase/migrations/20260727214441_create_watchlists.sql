create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users(id)
    on update restrict
    on delete cascade,
  name text not null
    check (
      char_length(btrim(name)) between 1 and 80
      and name = btrim(name)
    ),
  direction text not null
    check (direction in ('bullish', 'bearish', 'research')),
  notes text
    check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, owner_id)
);

comment on table public.watchlists is
  'User-named candidate collections. Archive preserves the collection and its membership history.';

create unique index watchlists_owner_active_name_key
  on public.watchlists (owner_id, lower(name))
  where archived_at is null;

create index watchlists_owner_archived_created_idx
  on public.watchlists (owner_id, archived_at, created_at desc);

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null,
  owner_id uuid not null,
  ticker_symbol text not null
    check (
      char_length(ticker_symbol) between 1 and 32
      and ticker_symbol = upper(btrim(ticker_symbol))
      and ticker_symbol ~ '^[A-Z0-9][A-Z0-9._/-]{0,31}$'
    ),
  thesis text
    check (thesis is null or char_length(thesis) <= 2000),
  added_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, owner_id),
  constraint watchlist_items_watchlist_owner_fkey
    foreign key (watchlist_id, owner_id)
    references public.watchlists(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.watchlist_items is
  'Membership history. At most one active membership exists per symbol and watchlist.';

create unique index watchlist_items_active_symbol_key
  on public.watchlist_items (watchlist_id, ticker_symbol)
  where archived_at is null;

create index watchlist_items_owner_watchlist_archived_idx
  on public.watchlist_items (
    owner_id,
    watchlist_id,
    archived_at,
    added_at desc
  );

create table public.watchlist_item_sources (
  id uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null,
  owner_id uuid not null,
  import_batch_id uuid not null,
  direction text not null
    check (direction in ('bullish', 'bearish')),
  source_row_number bigint not null
    check (source_row_number > 0),
  added_at timestamptz not null default now(),
  constraint watchlist_item_sources_item_owner_fkey
    foreign key (watchlist_item_id, owner_id)
    references public.watchlist_items(id, owner_id)
    on update restrict
    on delete restrict,
  constraint watchlist_item_sources_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches(id, owner_id)
    on update restrict
    on delete restrict,
  unique (
    watchlist_item_id,
    import_batch_id,
    direction,
    source_row_number
  )
);

comment on table public.watchlist_item_sources is
  'Every import source contributing to a deduplicated watchlist membership.';

create index watchlist_item_sources_owner_item_idx
  on public.watchlist_item_sources (owner_id, watchlist_item_id);

create index watchlist_item_sources_batch_owner_idx
  on public.watchlist_item_sources (import_batch_id, owner_id);

alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.watchlist_item_sources enable row level security;

create policy watchlists_owner_select
  on public.watchlists
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy watchlists_owner_insert
  on public.watchlists
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy watchlists_owner_update
  on public.watchlists
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy watchlist_items_owner_select
  on public.watchlist_items
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy watchlist_items_owner_insert
  on public.watchlist_items
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy watchlist_items_owner_update
  on public.watchlist_items
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy watchlist_item_sources_owner_select
  on public.watchlist_item_sources
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy watchlist_item_sources_owner_insert
  on public.watchlist_item_sources
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.watchlists
  from anon, authenticated;
revoke all on table public.watchlist_items
  from anon, authenticated;
revoke all on table public.watchlist_item_sources
  from anon, authenticated;

grant select, insert, update on table public.watchlists
  to authenticated;
grant select, insert, update on table public.watchlist_items
  to authenticated;
grant select, insert on table public.watchlist_item_sources
  to authenticated;

grant select, insert, update, delete on table public.watchlists
  to service_role;
grant select, insert, update, delete on table public.watchlist_items
  to service_role;
grant select, insert, update, delete on table public.watchlist_item_sources
  to service_role;

create or replace function public.assign_candidate_to_watchlist(
  p_watchlist_id uuid,
  p_import_batch_id uuid,
  p_direction text,
  p_ticker_symbol text,
  p_reason_code text,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_source_row_number bigint;
  v_watchlist_item_id uuid;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if p_direction not in ('bullish', 'bearish') then
    raise exception using
      errcode = '22023',
      message = 'invalid_direction';
  end if;

  if p_reason_code not in (
    'strong_setup',
    'needs_research',
    'review_later',
    'event_risk',
    'insufficient_data',
    'duplicate_exposure',
    'outside_plan',
    'other'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_reason_code';
  end if;

  if p_note is not null and char_length(p_note) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'note_too_long';
  end if;

  perform 1
  from public.watchlists
  where id = p_watchlist_id
    and owner_id = v_owner_id
    and archived_at is null;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'active_watchlist_not_found';
  end if;

  if p_direction = 'bullish' then
    select min(original_row_number)
    into v_source_row_number
    from public.bullish_stocks
    where owner_id = v_owner_id
      and import_batch_id = p_import_batch_id
      and ticker_symbol = p_ticker_symbol
      and validation_status in ('valid', 'duplicate');
  else
    select min(original_row_number)
    into v_source_row_number
    from public.bearish_stocks
    where owner_id = v_owner_id
      and import_batch_id = p_import_batch_id
      and ticker_symbol = p_ticker_symbol
      and validation_status in ('valid', 'duplicate');
  end if;

  if v_source_row_number is null then
    raise exception using
      errcode = 'P0002',
      message = 'current_candidate_not_found';
  end if;

  select id
  into v_watchlist_item_id
  from public.watchlist_items
  where watchlist_id = p_watchlist_id
    and owner_id = v_owner_id
    and ticker_symbol = p_ticker_symbol
    and archived_at is null
  limit 1;

  if v_watchlist_item_id is null then
    insert into public.watchlist_items (
      watchlist_id,
      owner_id,
      ticker_symbol,
      thesis
    )
    values (
      p_watchlist_id,
      v_owner_id,
      p_ticker_symbol,
      nullif(btrim(p_note), '')
    )
    returning id into v_watchlist_item_id;
  end if;

  insert into public.watchlist_item_sources (
    watchlist_item_id,
    owner_id,
    import_batch_id,
    direction,
    source_row_number
  )
  values (
    v_watchlist_item_id,
    v_owner_id,
    p_import_batch_id,
    p_direction,
    v_source_row_number
  )
  on conflict (
    watchlist_item_id,
    import_batch_id,
    direction,
    source_row_number
  ) do nothing;

  insert into public.review_actions (
    owner_id,
    import_batch_id,
    direction,
    ticker_symbol,
    source_row_number,
    action,
    reason_code,
    note
  )
  values (
    v_owner_id,
    p_import_batch_id,
    p_direction,
    p_ticker_symbol,
    v_source_row_number,
    'watchlisted',
    p_reason_code,
    nullif(btrim(p_note), '')
  );

  return v_watchlist_item_id;
end;
$$;

revoke all on function public.assign_candidate_to_watchlist(
  uuid,
  uuid,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.assign_candidate_to_watchlist(
  uuid,
  uuid,
  text,
  text,
  text,
  text
) to authenticated, service_role;
