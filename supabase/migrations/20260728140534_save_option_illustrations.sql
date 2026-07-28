create table public.option_illustrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users(id)
    on update restrict
    on delete cascade,
  strategy text not null
    check (
      strategy in (
        'long_call',
        'long_put',
        'bull_call_debit_spread',
        'bear_put_debit_spread'
      )
    ),
  ticker_symbol text not null
    check (
      char_length(ticker_symbol) between 1 and 32
      and ticker_symbol = upper(btrim(ticker_symbol))
      and ticker_symbol ~ '^[A-Z0-9][A-Z0-9._/-]{0,31}$'
    ),
  spot_price numeric(16, 6) not null
    check (spot_price between 0.01 and 1000000),
  expiry date not null,
  quote_time timestamp without time zone,
  pricing_mode text not null
    check (pricing_mode in ('midpoint', 'natural', 'manual')),
  estimated_fees numeric(16, 6) not null
    check (estimated_fees between 0 and 1000000),
  engine_version text not null
    check (char_length(engine_version) between 1 and 32),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

comment on table public.option_illustrations is
  'Immutable owner-saved option payoff assumptions. Derived payoff values are recalculated by the versioned application engine.';

comment on column public.option_illustrations.quote_time is
  'Owner-entered local market quote time. No timezone or freshness is inferred.';

create index option_illustrations_owner_created_idx
  on public.option_illustrations (owner_id, created_at desc, id desc);

create table public.option_illustration_legs (
  illustration_id uuid not null,
  owner_id uuid not null,
  leg_order smallint not null
    check (leg_order between 1 and 2),
  side text not null
    check (side in ('long', 'short')),
  option_type text not null
    check (option_type in ('call', 'put')),
  strike numeric(16, 6) not null
    check (strike between 0.01 and 1000000),
  bid numeric(16, 6) not null
    check (bid between 0 and 1000000),
  ask numeric(16, 6) not null
    check (ask between 0 and 1000000 and ask >= bid),
  manual_fill numeric(16, 6)
    check (manual_fill is null or manual_fill between 0 and 1000000),
  quantity integer not null
    check (quantity between 1 and 1000),
  multiplier integer not null
    check (multiplier between 1 and 10000),
  primary key (illustration_id, leg_order),
  constraint option_illustration_legs_parent_owner_fkey
    foreign key (illustration_id, owner_id)
    references public.option_illustrations(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.option_illustration_legs is
  'Ordered immutable raw legs for a saved option illustration.';

create index option_illustration_legs_owner_parent_idx
  on public.option_illustration_legs (owner_id, illustration_id);

create table public.trade_option_illustration_sources (
  trade_id uuid primary key,
  option_illustration_id uuid not null,
  owner_id uuid not null,
  linked_at timestamptz not null default now(),
  constraint trade_option_sources_trade_owner_fkey
    foreign key (trade_id, owner_id)
    references public.trades(id, owner_id)
    on update restrict
    on delete restrict,
  constraint trade_option_sources_illustration_owner_fkey
    foreign key (option_illustration_id, owner_id)
    references public.option_illustrations(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.trade_option_illustration_sources is
  'Immutable provenance link from one journal trade to the saved option illustration that started its plan.';

create index trade_option_sources_illustration_owner_idx
  on public.trade_option_illustration_sources (
    option_illustration_id,
    owner_id
  );

alter table public.option_illustrations enable row level security;
alter table public.option_illustration_legs enable row level security;
alter table public.trade_option_illustration_sources enable row level security;

create policy option_illustrations_owner_select
  on public.option_illustrations
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy option_illustrations_owner_insert
  on public.option_illustrations
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy option_illustration_legs_owner_select
  on public.option_illustration_legs
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy option_illustration_legs_owner_insert
  on public.option_illustration_legs
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy trade_option_sources_owner_select
  on public.trade_option_illustration_sources
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy trade_option_sources_owner_insert
  on public.trade_option_illustration_sources
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.option_illustrations
  from anon, authenticated;
revoke all on table public.option_illustration_legs
  from anon, authenticated;
revoke all on table public.trade_option_illustration_sources
  from anon, authenticated;

grant select, insert on table public.option_illustrations
  to authenticated;
grant select, insert on table public.option_illustration_legs
  to authenticated;
grant select, insert on table public.trade_option_illustration_sources
  to authenticated;

grant select, insert, update, delete on table public.option_illustrations
  to service_role;
grant select, insert, update, delete on table public.option_illustration_legs
  to service_role;
grant select, insert, update, delete on table public.trade_option_illustration_sources
  to service_role;

create or replace function public.save_option_illustration(
  p_strategy text,
  p_ticker_symbol text,
  p_spot_price numeric,
  p_expiry date,
  p_quote_time timestamp without time zone,
  p_pricing_mode text,
  p_estimated_fees numeric,
  p_engine_version text,
  p_legs jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_illustration_id uuid;
  v_expected_leg_count integer;
  v_net_debit numeric;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if p_strategy not in (
    'long_call',
    'long_put',
    'bull_call_debit_spread',
    'bear_put_debit_spread'
  )
    or p_pricing_mode not in ('midpoint', 'natural', 'manual')
    or jsonb_typeof(p_legs) <> 'array'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_option_illustration';
  end if;

  v_expected_leg_count := case
    when p_strategy in ('long_call', 'long_put') then 1
    else 2
  end;

  if jsonb_array_length(p_legs) <> v_expected_leg_count then
    raise exception using
      errcode = '22023',
      message = 'invalid_option_leg_count';
  end if;

  insert into public.option_illustrations (
    owner_id,
    strategy,
    ticker_symbol,
    spot_price,
    expiry,
    quote_time,
    pricing_mode,
    estimated_fees,
    engine_version
  )
  values (
    v_owner_id,
    p_strategy,
    upper(btrim(p_ticker_symbol)),
    p_spot_price,
    p_expiry,
    p_quote_time,
    p_pricing_mode,
    p_estimated_fees,
    p_engine_version
  )
  returning id into v_illustration_id;

  insert into public.option_illustration_legs (
    illustration_id,
    owner_id,
    leg_order,
    side,
    option_type,
    strike,
    bid,
    ask,
    manual_fill,
    quantity,
    multiplier
  )
  select
    v_illustration_id,
    v_owner_id,
    leg.ordinality::smallint,
    leg.value ->> 'side',
    leg.value ->> 'optionType',
    (leg.value ->> 'strike')::numeric,
    (leg.value ->> 'bid')::numeric,
    (leg.value ->> 'ask')::numeric,
    case
      when leg.value -> 'manualFill' = 'null'::jsonb then null
      else (leg.value ->> 'manualFill')::numeric
    end,
    (leg.value ->> 'quantity')::integer,
    (leg.value ->> 'multiplier')::integer
  from jsonb_array_elements(p_legs) with ordinality as leg(value, ordinality);

  if not exists (
    select 1
    from public.option_illustration_legs
    where illustration_id = v_illustration_id
      and owner_id = v_owner_id
      and leg_order = 1
      and side = 'long'
      and option_type = case
        when p_strategy in ('long_call', 'bull_call_debit_spread')
          then 'call'
        else 'put'
      end
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_primary_option_leg';
  end if;

  if v_expected_leg_count = 2 and not exists (
    select 1
    from public.option_illustration_legs first_leg
    join public.option_illustration_legs second_leg
      on second_leg.illustration_id = first_leg.illustration_id
      and second_leg.owner_id = first_leg.owner_id
      and second_leg.leg_order = 2
    where first_leg.illustration_id = v_illustration_id
      and first_leg.owner_id = v_owner_id
      and first_leg.leg_order = 1
      and second_leg.side = 'short'
      and second_leg.option_type = first_leg.option_type
      and second_leg.quantity = first_leg.quantity
      and second_leg.multiplier = first_leg.multiplier
      and (
        (p_strategy = 'bull_call_debit_spread'
          and first_leg.strike < second_leg.strike)
        or
        (p_strategy = 'bear_put_debit_spread'
          and first_leg.strike > second_leg.strike)
      )
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_vertical_option_legs';
  end if;

  if p_pricing_mode = 'manual' and exists (
    select 1
    from public.option_illustration_legs
    where illustration_id = v_illustration_id
      and owner_id = v_owner_id
      and manual_fill is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'manual_fill_required';
  end if;

  select sum(
    case when side = 'long' then 1 else -1 end
    * case p_pricing_mode
        when 'midpoint' then (bid + ask) / 2
        when 'natural' then case when side = 'long' then ask else bid end
        else manual_fill
      end
    * quantity
    * multiplier
  )
  into v_net_debit
  from public.option_illustration_legs
  where illustration_id = v_illustration_id
    and owner_id = v_owner_id;

  if v_net_debit is null or v_net_debit <= 0 then
    raise exception using
      errcode = '22023',
      message = 'positive_net_debit_required';
  end if;

  return v_illustration_id;
end;
$$;

create or replace function public.create_manual_trade_from_option_illustration(
  p_option_illustration_id uuid,
  p_status text,
  p_direction text,
  p_strategy_type text,
  p_thesis text,
  p_trade_plan text,
  p_reasons_wrong text,
  p_ticker_symbol text,
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
  v_trade_id uuid;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  perform 1
  from public.option_illustrations
  where id = p_option_illustration_id
    and owner_id = v_owner_id
    and ticker_symbol = upper(btrim(p_ticker_symbol))
    and strategy = p_strategy_type;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'option_illustration_not_found';
  end if;

  v_trade_id := public.create_manual_trade(
    p_status => p_status,
    p_direction => p_direction,
    p_strategy_type => p_strategy_type,
    p_thesis => p_thesis,
    p_trade_plan => p_trade_plan,
    p_reasons_wrong => p_reasons_wrong,
    p_ticker_symbol => p_ticker_symbol,
    p_source_watchlist_item_id => null,
    p_intended_risk => p_intended_risk,
    p_entry_net_value => p_entry_net_value,
    p_exit_net_value => p_exit_net_value,
    p_fees => p_fees,
    p_realized_pnl => p_realized_pnl,
    p_note => p_note,
    p_tags => p_tags
  );

  insert into public.trade_option_illustration_sources (
    trade_id,
    option_illustration_id,
    owner_id
  )
  values (
    v_trade_id,
    p_option_illustration_id,
    v_owner_id
  );

  return v_trade_id;
end;
$$;

revoke all on function public.save_option_illustration(
  text,
  text,
  numeric,
  date,
  timestamp without time zone,
  text,
  numeric,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_option_illustration(
  text,
  text,
  numeric,
  date,
  timestamp without time zone,
  text,
  numeric,
  text,
  jsonb
) to authenticated, service_role;

revoke all on function public.create_manual_trade_from_option_illustration(
  uuid,
  text,
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
  text[]
) from public, anon, authenticated;

grant execute on function public.create_manual_trade_from_option_illustration(
  uuid,
  text,
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
  text[]
) to authenticated, service_role;
