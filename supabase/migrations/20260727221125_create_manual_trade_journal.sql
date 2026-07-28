create table public.trades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users(id)
    on update restrict
    on delete cascade,
  ticker_symbol text not null
    check (
      char_length(ticker_symbol) between 1 and 32
      and ticker_symbol = upper(btrim(ticker_symbol))
      and ticker_symbol ~ '^[A-Z0-9][A-Z0-9._/-]{0,31}$'
    ),
  source_watchlist_item_id uuid,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint trades_source_watchlist_item_owner_fkey
    foreign key (source_watchlist_item_id, owner_id)
    references public.watchlist_items(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.trades is
  'Immutable manual trade identity. Current state is the latest append-only journal entry.';

create index trades_owner_created_idx
  on public.trades (owner_id, created_at desc);

create index trades_source_watchlist_item_owner_idx
  on public.trades (source_watchlist_item_id, owner_id)
  where source_watchlist_item_id is not null;

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null,
  owner_id uuid not null,
  entry_type text not null
    check (
      entry_type in (
        'plan_created',
        'plan_revised',
        'status_changed',
        'reflection'
      )
    ),
  trade_status text not null
    check (trade_status in ('planned', 'open', 'closed', 'cancelled')),
  direction text not null
    check (direction in ('bullish', 'bearish', 'neutral')),
  strategy_type text not null
    check (
      strategy_type in (
        'long_call',
        'long_put',
        'bull_call_debit_spread',
        'bear_put_debit_spread',
        'bull_put_credit_spread',
        'bear_call_credit_spread',
        'iron_condor',
        'calendar_spread',
        'stock',
        'other'
      )
    ),
  thesis text not null
    check (char_length(btrim(thesis)) between 1 and 4000),
  trade_plan text not null
    check (char_length(btrim(trade_plan)) between 1 and 4000),
  reasons_wrong text not null
    check (char_length(btrim(reasons_wrong)) between 1 and 4000),
  intended_risk numeric(14, 2)
    check (intended_risk is null or intended_risk >= 0),
  entry_net_value numeric(14, 2),
  exit_net_value numeric(14, 2),
  fees numeric(14, 2)
    check (fees is null or fees >= 0),
  realized_pnl numeric(14, 2),
  note text
    check (note is null or char_length(note) <= 4000),
  mistakes text
    check (mistakes is null or char_length(mistakes) <= 4000),
  lessons text
    check (lessons is null or char_length(lessons) <= 4000),
  tags text[] not null default '{}'::text[]
    check (
      cardinality(tags) <= 20
      and array_position(tags, null) is null
      and char_length(array_to_string(tags, '')) <= 800
    ),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint journal_entries_trade_owner_fkey
    foreign key (trade_id, owner_id)
    references public.trades(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.journal_entries is
  'Append-only full trade snapshots. Corrections and status changes create new rows.';

comment on column public.journal_entries.reasons_wrong is
  'Required counter-evidence, invalidation conditions, missing information, and event risks.';

comment on column public.journal_entries.entry_net_value is
  'Manual signed position value. Positive means debit paid; negative means credit received.';

comment on column public.journal_entries.exit_net_value is
  'Manual signed closing value using the same debit-positive, credit-negative convention.';

create index journal_entries_owner_trade_created_idx
  on public.journal_entries (owner_id, trade_id, created_at desc, id desc);

create index journal_entries_trade_owner_idx
  on public.journal_entries (trade_id, owner_id);

alter table public.trades enable row level security;
alter table public.journal_entries enable row level security;

create policy trades_owner_select
  on public.trades
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy trades_owner_insert
  on public.trades
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy journal_entries_owner_select
  on public.journal_entries
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy journal_entries_owner_insert
  on public.journal_entries
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.trades
  from anon, authenticated;
revoke all on table public.journal_entries
  from anon, authenticated;

grant select, insert on table public.trades
  to authenticated;
grant select, insert on table public.journal_entries
  to authenticated;

grant select, insert, update, delete on table public.trades
  to service_role;
grant select, insert, update, delete on table public.journal_entries
  to service_role;

create or replace function public.create_manual_trade(
  p_status text,
  p_direction text,
  p_strategy_type text,
  p_thesis text,
  p_trade_plan text,
  p_reasons_wrong text,
  p_ticker_symbol text default null,
  p_source_watchlist_item_id uuid default null,
  p_intended_risk numeric default null,
  p_entry_net_value numeric default null,
  p_exit_net_value numeric default null,
  p_fees numeric default null,
  p_realized_pnl numeric default null,
  p_note text default null,
  p_tags text[] default '{}'::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_ticker_symbol text := upper(btrim(p_ticker_symbol));
  v_trade_id uuid;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if p_source_watchlist_item_id is not null then
    select ticker_symbol
    into v_ticker_symbol
    from public.watchlist_items
    where id = p_source_watchlist_item_id
      and owner_id = v_owner_id
      and archived_at is null;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'active_watchlist_item_not_found';
    end if;
  end if;

  if v_ticker_symbol is null
    or v_ticker_symbol !~ '^[A-Z0-9][A-Z0-9._/-]{0,31}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_ticker_symbol';
  end if;

  if p_status not in ('planned', 'open', 'closed', 'cancelled')
    or p_direction not in ('bullish', 'bearish', 'neutral')
    or p_strategy_type not in (
      'long_call',
      'long_put',
      'bull_call_debit_spread',
      'bear_put_debit_spread',
      'bull_put_credit_spread',
      'bear_call_credit_spread',
      'iron_condor',
      'calendar_spread',
      'stock',
      'other'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_trade_classification';
  end if;

  if char_length(btrim(p_thesis)) not between 1 and 4000
    or char_length(btrim(p_trade_plan)) not between 1 and 4000
    or char_length(btrim(p_reasons_wrong)) not between 1 and 4000
  then
    raise exception using
      errcode = '22023',
      message = 'required_trade_text_invalid';
  end if;

  if p_intended_risk < 0
    or p_fees < 0
    or char_length(p_note) > 4000
    or cardinality(p_tags) > 20
    or array_position(p_tags, null) is not null
    or char_length(array_to_string(p_tags, '')) > 800
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_trade_value';
  end if;

  insert into public.trades (
    owner_id,
    ticker_symbol,
    source_watchlist_item_id
  )
  values (
    v_owner_id,
    v_ticker_symbol,
    p_source_watchlist_item_id
  )
  returning id into v_trade_id;

  insert into public.journal_entries (
    trade_id,
    owner_id,
    entry_type,
    trade_status,
    direction,
    strategy_type,
    thesis,
    trade_plan,
    reasons_wrong,
    intended_risk,
    entry_net_value,
    exit_net_value,
    fees,
    realized_pnl,
    note,
    tags
  )
  values (
    v_trade_id,
    v_owner_id,
    'plan_created',
    p_status,
    p_direction,
    p_strategy_type,
    btrim(p_thesis),
    btrim(p_trade_plan),
    btrim(p_reasons_wrong),
    p_intended_risk,
    p_entry_net_value,
    p_exit_net_value,
    p_fees,
    p_realized_pnl,
    nullif(btrim(p_note), ''),
    p_tags
  );

  return v_trade_id;
end;
$$;

create or replace function public.append_manual_trade_event(
  p_trade_id uuid,
  p_entry_type text,
  p_status text,
  p_note text default null,
  p_thesis text default null,
  p_trade_plan text default null,
  p_reasons_wrong text default null,
  p_intended_risk numeric default null,
  p_entry_net_value numeric default null,
  p_exit_net_value numeric default null,
  p_fees numeric default null,
  p_realized_pnl numeric default null,
  p_mistakes text default null,
  p_lessons text default null,
  p_tags text[] default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_latest public.journal_entries%rowtype;
  v_entry_id uuid;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  perform 1
  from public.trades
  where id = p_trade_id
    and owner_id = v_owner_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'trade_not_found';
  end if;

  select *
  into v_latest
  from public.journal_entries
  where trade_id = p_trade_id
    and owner_id = v_owner_id
  order by created_at desc, id desc
  limit 1;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'trade_snapshot_not_found';
  end if;

  if p_entry_type not in ('plan_revised', 'status_changed', 'reflection')
    or p_status not in ('planned', 'open', 'closed', 'cancelled')
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_journal_event';
  end if;

  if p_entry_type = 'status_changed' then
    if not (
      (v_latest.trade_status = 'planned' and p_status in ('open', 'closed', 'cancelled'))
      or (v_latest.trade_status = 'open' and p_status in ('closed', 'cancelled'))
    ) then
      raise exception using
        errcode = '22023',
        message = 'invalid_status_transition';
    end if;
  elsif p_status <> v_latest.trade_status then
    raise exception using
      errcode = '22023',
      message = 'status_change_requires_status_event';
  end if;

  if p_entry_type = 'plan_revised'
    and p_thesis is null
    and p_trade_plan is null
    and p_reasons_wrong is null
  then
    raise exception using
      errcode = '22023',
      message = 'plan_revision_requires_change';
  end if;

  if p_entry_type = 'reflection'
    and nullif(btrim(p_note), '') is null
    and nullif(btrim(p_mistakes), '') is null
    and nullif(btrim(p_lessons), '') is null
  then
    raise exception using
      errcode = '22023',
      message = 'reflection_requires_content';
  end if;

  if char_length(p_note) > 4000
    or char_length(p_mistakes) > 4000
    or char_length(p_lessons) > 4000
    or p_intended_risk < 0
    or p_fees < 0
    or cardinality(p_tags) > 20
    or array_position(p_tags, null) is not null
    or char_length(array_to_string(p_tags, '')) > 800
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_journal_value';
  end if;

  insert into public.journal_entries (
    trade_id,
    owner_id,
    entry_type,
    trade_status,
    direction,
    strategy_type,
    thesis,
    trade_plan,
    reasons_wrong,
    intended_risk,
    entry_net_value,
    exit_net_value,
    fees,
    realized_pnl,
    note,
    mistakes,
    lessons,
    tags
  )
  values (
    p_trade_id,
    v_owner_id,
    p_entry_type,
    p_status,
    v_latest.direction,
    v_latest.strategy_type,
    coalesce(nullif(btrim(p_thesis), ''), v_latest.thesis),
    coalesce(nullif(btrim(p_trade_plan), ''), v_latest.trade_plan),
    coalesce(nullif(btrim(p_reasons_wrong), ''), v_latest.reasons_wrong),
    coalesce(p_intended_risk, v_latest.intended_risk),
    coalesce(p_entry_net_value, v_latest.entry_net_value),
    coalesce(p_exit_net_value, v_latest.exit_net_value),
    coalesce(p_fees, v_latest.fees),
    coalesce(p_realized_pnl, v_latest.realized_pnl),
    nullif(btrim(p_note), ''),
    nullif(btrim(p_mistakes), ''),
    nullif(btrim(p_lessons), ''),
    coalesce(p_tags, v_latest.tags)
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.create_manual_trade(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text[]
) from public, anon, authenticated;

grant execute on function public.create_manual_trade(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text[]
) to authenticated, service_role;

revoke all on function public.append_manual_trade_event(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text[]
) from public, anon, authenticated;

grant execute on function public.append_manual_trade_event(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text[]
) to authenticated, service_role;
