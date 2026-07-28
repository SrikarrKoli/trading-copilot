create table public.option_illustration_sources (
  illustration_id uuid primary key,
  owner_id uuid not null,
  source_kind text not null
    check (source_kind in ('watchlist', 'review')),
  watchlist_item_id uuid,
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
  evidence_assessment_id uuid,
  created_at timestamptz not null default now(),
  constraint option_illustration_sources_kind_check
    check (
      (source_kind = 'watchlist' and watchlist_item_id is not null)
      or
      (source_kind = 'review' and watchlist_item_id is null)
    ),
  constraint option_illustration_sources_parent_owner_fkey
    foreign key (illustration_id, owner_id)
    references public.option_illustrations(id, owner_id)
    on update restrict
    on delete restrict,
  constraint option_illustration_sources_watchlist_owner_fkey
    foreign key (watchlist_item_id, owner_id)
    references public.watchlist_items(id, owner_id)
    on update restrict
    on delete restrict,
  constraint option_illustration_sources_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches(id, owner_id)
    on update restrict
    on delete restrict,
  constraint option_illustration_sources_evidence_owner_fkey
    foreign key (evidence_assessment_id, owner_id)
    references public.manual_evidence_assessments(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.option_illustration_sources is
  'Immutable Watchlist or Reviews provenance for one saved option illustration.';

comment on column public.option_illustration_sources.evidence_assessment_id is
  'Optional immutable Setup Alignment snapshot for the exact imported candidate. It is rule evidence, not confidence or probability.';

create index option_illustration_sources_parent_owner_idx
  on public.option_illustration_sources (illustration_id, owner_id);

create index option_illustration_sources_watchlist_owner_idx
  on public.option_illustration_sources (watchlist_item_id, owner_id)
  where watchlist_item_id is not null;

create index option_illustration_sources_batch_owner_idx
  on public.option_illustration_sources (import_batch_id, owner_id);

create index option_illustration_sources_evidence_owner_idx
  on public.option_illustration_sources (evidence_assessment_id, owner_id)
  where evidence_assessment_id is not null;

alter table public.option_illustration_sources enable row level security;

create policy option_illustration_sources_owner_select
  on public.option_illustration_sources
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy option_illustration_sources_owner_insert
  on public.option_illustration_sources
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.option_illustration_sources
  from anon, authenticated;

grant select, insert on table public.option_illustration_sources
  to authenticated;

grant select, insert, update, delete
  on table public.option_illustration_sources
  to service_role;

create or replace function public.save_sourced_option_illustration(
  p_strategy text,
  p_ticker_symbol text,
  p_spot_price numeric,
  p_expiry date,
  p_quote_time timestamp without time zone,
  p_pricing_mode text,
  p_estimated_fees numeric,
  p_engine_version text,
  p_legs jsonb,
  p_source_kind text,
  p_watchlist_item_id uuid,
  p_import_batch_id uuid,
  p_direction text,
  p_source_row_number bigint,
  p_evidence_assessment_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_illustration_id uuid;
  v_review_row_number bigint;
  v_ticker_symbol text := upper(btrim(p_ticker_symbol));
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if p_source_kind = 'watchlist' then
    perform 1
    from public.watchlist_items item
    join public.watchlists list
      on list.id = item.watchlist_id
      and list.owner_id = item.owner_id
    join public.watchlist_item_sources source
      on source.watchlist_item_id = item.id
      and source.owner_id = item.owner_id
    where item.id = p_watchlist_item_id
      and item.owner_id = v_owner_id
      and item.archived_at is null
      and list.archived_at is null
      and item.ticker_symbol = v_ticker_symbol
      and source.import_batch_id = p_import_batch_id
      and source.direction = p_direction
      and source.source_row_number = p_source_row_number;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'watchlist_strategy_source_not_found';
    end if;
  elsif p_source_kind = 'review' then
    if p_watchlist_item_id is not null then
      raise exception using
        errcode = '22023',
        message = 'review_source_cannot_have_watchlist_item';
    end if;

    if p_direction = 'bullish' then
      select min(original_row_number)
      into v_review_row_number
      from public.bullish_stocks
      where owner_id = v_owner_id
        and import_batch_id = p_import_batch_id
        and ticker_symbol = v_ticker_symbol
        and validation_status in ('valid', 'duplicate');
    elsif p_direction = 'bearish' then
      select min(original_row_number)
      into v_review_row_number
      from public.bearish_stocks
      where owner_id = v_owner_id
        and import_batch_id = p_import_batch_id
        and ticker_symbol = v_ticker_symbol
        and validation_status in ('valid', 'duplicate');
    else
      raise exception using
        errcode = '22023',
        message = 'invalid_review_direction';
    end if;

    if v_review_row_number is null
      or v_review_row_number <> p_source_row_number
    then
      raise exception using
        errcode = 'P0002',
        message = 'current_review_candidate_not_found';
    end if;
  else
    raise exception using
      errcode = '22023',
      message = 'invalid_strategy_source_kind';
  end if;

  if p_evidence_assessment_id is not null then
    perform 1
    from public.manual_evidence_assessments
    where id = p_evidence_assessment_id
      and owner_id = v_owner_id
      and import_batch_id = p_import_batch_id
      and direction = p_direction
      and ticker_symbol = v_ticker_symbol
      and source_row_number = p_source_row_number;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'strategy_evidence_source_not_found';
    end if;
  end if;

  v_illustration_id := public.save_option_illustration(
    p_strategy => p_strategy,
    p_ticker_symbol => v_ticker_symbol,
    p_spot_price => p_spot_price,
    p_expiry => p_expiry,
    p_quote_time => p_quote_time,
    p_pricing_mode => p_pricing_mode,
    p_estimated_fees => p_estimated_fees,
    p_engine_version => p_engine_version,
    p_legs => p_legs
  );

  insert into public.option_illustration_sources (
    illustration_id,
    owner_id,
    source_kind,
    watchlist_item_id,
    import_batch_id,
    direction,
    ticker_symbol,
    source_row_number,
    evidence_assessment_id
  )
  values (
    v_illustration_id,
    v_owner_id,
    p_source_kind,
    p_watchlist_item_id,
    p_import_batch_id,
    p_direction,
    v_ticker_symbol,
    p_source_row_number,
    p_evidence_assessment_id
  );

  return v_illustration_id;
end;
$$;

revoke all on function public.save_sourced_option_illustration(
  text,
  text,
  numeric,
  date,
  timestamp without time zone,
  text,
  numeric,
  text,
  jsonb,
  text,
  uuid,
  uuid,
  text,
  bigint,
  uuid
) from public, anon, authenticated;

grant execute on function public.save_sourced_option_illustration(
  text,
  text,
  numeric,
  date,
  timestamp without time zone,
  text,
  numeric,
  text,
  jsonb,
  text,
  uuid,
  uuid,
  text,
  bigint,
  uuid
) to authenticated, service_role;
