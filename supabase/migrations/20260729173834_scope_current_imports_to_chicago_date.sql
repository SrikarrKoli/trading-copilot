-- Daily scanner rollover.
--
-- Current bullish/bearish rows are ephemeral and scoped to the Chicago
-- calendar date on which the import is committed. Explicitly saved watchlists,
-- journal entries, scan snapshots, and import/audit metadata are not deleted.

alter table public.import_batches
  add column trading_date date;

update public.import_batches
set trading_date = (uploaded_at at time zone 'America/Chicago')::date
where trading_date is null;

alter table public.import_batches
  alter column trading_date
    set default ((now() at time zone 'America/Chicago')::date),
  alter column trading_date set not null;

create index import_batches_owner_trading_date_direction_idx
  on public.import_batches (
    owner_id,
    trading_date desc,
    direction,
    uploaded_at desc
  );

comment on column public.import_batches.trading_date is
  'Server-derived America/Chicago calendar date that scopes replaceable current scanner data. Saved user artifacts remain independent of this rollover.';

create or replace function public.commit_daily_import(
  p_owner_id uuid,
  p_original_filename text,
  p_file_sha256 text,
  p_file_size_bytes bigint,
  p_source_type text,
  p_market_data_timestamp timestamptz,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_direction text;
  v_direction_count bigint;
  v_result jsonb;
  v_trading_date date :=
    (pg_catalog.statement_timestamp() at time zone 'America/Chicago')::date;
begin
  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'owner_required';
  end if;
  if jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) = 0
  then
    raise exception using errcode = '22023', message = 'rows_required';
  end if;

  select count(distinct value ->> 'direction'), min(value ->> 'direction')
  into v_direction_count, v_direction
  from jsonb_array_elements(p_rows);

  if v_direction_count <> 1
    or v_direction not in ('bullish', 'bearish')
  then
    raise exception using errcode = '22023', message = 'direction_invalid';
  end if;

  -- Serialize both daily directions for one owner so two simultaneous first
  -- imports cannot race the rollover cleanup.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_id::text || ':daily-scanner-import',
      0
    )
  );

  -- The existing import boundary identifies an active duplicate by file hash.
  -- Supersede only an older day's matching identity so the same scanner export
  -- may legitimately become today's current list.
  with prior as (
    select id, processing_status
    from public.import_batches
    where owner_id = p_owner_id
      and direction = v_direction
      and file_sha256 = p_file_sha256
      and trading_date <> v_trading_date
      and processing_status in ('completed', 'failed')
    for update
  ),
  superseded as (
    update public.import_batches as batch
    set processing_status = 'superseded'
    from prior
    where batch.id = prior.id
    returning batch.id, prior.processing_status
  )
  insert into public.import_audit_history (
    import_batch_id,
    owner_id,
    event_type,
    previous_status,
    new_status,
    safe_metadata
  )
  select
    id,
    p_owner_id,
    'import_superseded',
    processing_status,
    'superseded',
    jsonb_build_object(
      'direction', v_direction,
      'reason', 'new_trading_date',
      'replacement_trading_date', v_trading_date
    )
  from superseded;

  v_result := public.commit_import(
    p_owner_id,
    p_original_filename,
    p_file_sha256,
    p_file_size_bytes,
    p_source_type,
    p_market_data_timestamp,
    p_rows
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception using
      errcode = 'P0001',
      message = 'daily_import_failed';
  end if;

  -- The matching direction was replaced by commit_import. Once that succeeds,
  -- remove only stale physical rows from the other current table. Saved scan
  -- results, watchlists, journal entries, and their provenance are untouched.
  delete from public.bullish_stocks as stock
  using public.import_batches as batch
  where stock.import_batch_id = batch.id
    and stock.owner_id = p_owner_id
    and batch.owner_id = p_owner_id
    and batch.trading_date <> v_trading_date;

  delete from public.bearish_stocks as stock
  using public.import_batches as batch
  where stock.import_batch_id = batch.id
    and stock.owner_id = p_owner_id
    and batch.owner_id = p_owner_id
    and batch.trading_date <> v_trading_date;

  with prior as (
    select id, processing_status
    from public.import_batches
    where owner_id = p_owner_id
      and trading_date <> v_trading_date
      and processing_status = 'completed'
    for update
  ),
  superseded as (
    update public.import_batches as batch
    set processing_status = 'superseded'
    from prior
    where batch.id = prior.id
    returning batch.id, batch.direction, prior.processing_status
  )
  insert into public.import_audit_history (
    import_batch_id,
    owner_id,
    event_type,
    previous_status,
    new_status,
    safe_metadata
  )
  select
    id,
    p_owner_id,
    'import_superseded',
    processing_status,
    'superseded',
    jsonb_build_object(
      'direction', direction,
      'reason', 'daily_rollover',
      'replacement_batch_id', v_result ->> 'batch_id',
      'replacement_trading_date', v_trading_date
    )
  from superseded;

  return v_result || jsonb_build_object('trading_date', v_trading_date);
end;
$function$;

comment on function public.commit_daily_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) is
  'Service-only daily import boundary. Uses the Chicago calendar date, replaces the uploaded direction, removes stale opposite-direction current rows only after success, and preserves saved user artifacts.';

revoke all on function public.commit_daily_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) from public, anon, authenticated;

grant execute on function public.commit_daily_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) to service_role;
