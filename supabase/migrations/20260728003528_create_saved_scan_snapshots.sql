create table public.scanner_definitions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users(id)
    on update restrict
    on delete cascade,
  scanner_key text not null
    check (
      char_length(scanner_key) between 1 and 80
      and scanner_key = lower(btrim(scanner_key))
      and scanner_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  version_major integer not null default 1
    check (version_major >= 0),
  version_minor integer not null default 0
    check (version_minor >= 0),
  version_patch integer not null default 0
    check (version_patch >= 0),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 120),
  direction text not null
    check (direction in ('bullish', 'bearish')),
  market text not null default 'us_equities'
    check (market = 'us_equities'),
  timeframe text not null
    check (char_length(btrim(timeframe)) between 1 and 80),
  session_scope text not null
    check (session_scope in ('regular', 'extended', 'all', 'unspecified')),
  lifecycle_status text not null default 'experimental'
    check (lifecycle_status = 'experimental'),
  rule_summary text not null
    check (char_length(btrim(rule_summary)) between 1 and 4000),
  change_note text not null
    check (char_length(btrim(change_note)) between 1 and 1000),
  rules_json jsonb,
  code_version text
    check (code_version is null or char_length(btrim(code_version)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (
    owner_id,
    scanner_key,
    version_major,
    version_minor,
    version_patch
  ),
  constraint scanner_definitions_rules_object
    check (rules_json is null or jsonb_typeof(rules_json) = 'object')
);

comment on table public.scanner_definitions is
  'Immutable, owner-scoped scanner definition versions. The first UI only creates experimental definitions because imported symbol lists do not prove executable Thinkorswim rules.';

comment on column public.scanner_definitions.rules_json is
  'Reserved for exact structured scanner criteria once captured. Null means the definition is descriptive and must not be presented as executable or validated.';

create index scanner_definitions_owner_key_version_idx
  on public.scanner_definitions (
    owner_id,
    scanner_key,
    version_major desc,
    version_minor desc,
    version_patch desc
  );

create table public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null
    references auth.users(id)
    on update restrict
    on delete cascade,
  scanner_definition_id uuid not null,
  import_batch_id uuid not null,
  name text not null
    check (char_length(btrim(name)) between 1 and 120),
  notes text
    check (notes is null or char_length(notes) <= 4000),
  direction text not null
    check (direction in ('bullish', 'bearish')),
  run_kind text not null default 'import_snapshot'
    check (run_kind = 'import_snapshot'),
  market_data_timestamp timestamptz,
  saved_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint scan_runs_definition_owner_fkey
    foreign key (scanner_definition_id, owner_id)
    references public.scanner_definitions(id, owner_id)
    on update restrict
    on delete restrict,
  constraint scan_runs_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.scan_runs is
  'Immutable saved snapshots of imported candidates. import_snapshot does not claim the scanner rules were executed or validated by this platform.';

create index scan_runs_owner_saved_idx
  on public.scan_runs (owner_id, saved_at desc, id desc);

create index scan_runs_definition_owner_idx
  on public.scan_runs (scanner_definition_id, owner_id);

create index scan_runs_batch_owner_idx
  on public.scan_runs (import_batch_id, owner_id);

create table public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid not null,
  owner_id uuid not null,
  import_batch_id uuid not null,
  ticker_symbol text not null
    check (
      char_length(ticker_symbol) between 1 and 32
      and ticker_symbol = upper(btrim(ticker_symbol))
      and ticker_symbol ~ '^[A-Z0-9][A-Z0-9._/-]{0,31}$'
    ),
  direction text not null
    check (direction in ('bullish', 'bearish')),
  candidate_order bigint not null
    check (candidate_order > 0),
  source_sheet_name text not null
    check (char_length(btrim(source_sheet_name)) between 1 and 255),
  first_source_row_number bigint not null
    check (first_source_row_number > 0),
  source_occurrence_count bigint not null default 1
    check (source_occurrence_count > 0),
  source_observation_timestamp timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (scan_run_id, ticker_symbol),
  unique (scan_run_id, candidate_order),
  constraint scan_results_run_owner_fkey
    foreign key (scan_run_id, owner_id)
    references public.scan_runs(id, owner_id)
    on update restrict
    on delete restrict,
  constraint scan_results_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.scan_results is
  'One immutable row per distinct saved ticker. candidate_order preserves workbook order and is not a score, confidence, or recommendation rank.';

create index scan_results_run_owner_order_idx
  on public.scan_results (scan_run_id, owner_id, candidate_order);

create index scan_results_batch_owner_idx
  on public.scan_results (import_batch_id, owner_id);

create index scan_results_owner_ticker_saved_idx
  on public.scan_results (owner_id, ticker_symbol, created_at desc);

alter table public.scanner_definitions enable row level security;
alter table public.scan_runs enable row level security;
alter table public.scan_results enable row level security;

create policy scanner_definitions_owner_select
  on public.scanner_definitions
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy scanner_definitions_owner_insert
  on public.scanner_definitions
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy scan_runs_owner_select
  on public.scan_runs
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy scan_runs_owner_insert
  on public.scan_runs
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy scan_results_owner_select
  on public.scan_results
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy scan_results_owner_insert
  on public.scan_results
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.scanner_definitions
  from anon, authenticated;
revoke all on table public.scan_runs
  from anon, authenticated;
revoke all on table public.scan_results
  from anon, authenticated;

grant select, insert on table public.scanner_definitions
  to authenticated;
grant select, insert on table public.scan_runs
  to authenticated;
grant select, insert on table public.scan_results
  to authenticated;

grant select, insert, update, delete on table public.scanner_definitions
  to service_role;
grant select, insert, update, delete on table public.scan_runs
  to service_role;
grant select, insert, update, delete on table public.scan_results
  to service_role;

create or replace function public.create_scanner_definition_version(
  p_scanner_key text,
  p_display_name text,
  p_direction text,
  p_timeframe text,
  p_session_scope text,
  p_rule_summary text,
  p_change_note text,
  p_bump_kind text default 'patch'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_scanner_key text := lower(btrim(p_scanner_key));
  v_version_major integer;
  v_version_minor integer;
  v_version_patch integer;
  v_definition_id uuid;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if v_scanner_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(v_scanner_key) > 80
    or char_length(btrim(p_display_name)) not between 1 and 120
    or p_direction not in ('bullish', 'bearish')
    or char_length(btrim(p_timeframe)) not between 1 and 80
    or p_session_scope not in ('regular', 'extended', 'all', 'unspecified')
    or char_length(btrim(p_rule_summary)) not between 1 and 4000
    or char_length(btrim(p_change_note)) not between 1 and 1000
    or p_bump_kind not in ('patch', 'minor', 'major')
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_scanner_definition';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || v_scanner_key, 0)
  );

  select
    version_major,
    version_minor,
    version_patch
  into
    v_version_major,
    v_version_minor,
    v_version_patch
  from public.scanner_definitions
  where owner_id = v_owner_id
    and scanner_key = v_scanner_key
  order by
    version_major desc,
    version_minor desc,
    version_patch desc
  limit 1;

  if not found then
    v_version_major := 1;
    v_version_minor := 0;
    v_version_patch := 0;
  elsif p_bump_kind = 'major' then
    v_version_major := v_version_major + 1;
    v_version_minor := 0;
    v_version_patch := 0;
  elsif p_bump_kind = 'minor' then
    v_version_minor := v_version_minor + 1;
    v_version_patch := 0;
  else
    v_version_patch := v_version_patch + 1;
  end if;

  insert into public.scanner_definitions (
    owner_id,
    scanner_key,
    version_major,
    version_minor,
    version_patch,
    display_name,
    direction,
    timeframe,
    session_scope,
    lifecycle_status,
    rule_summary,
    change_note
  )
  values (
    v_owner_id,
    v_scanner_key,
    v_version_major,
    v_version_minor,
    v_version_patch,
    btrim(p_display_name),
    p_direction,
    btrim(p_timeframe),
    p_session_scope,
    'experimental',
    btrim(p_rule_summary),
    btrim(p_change_note)
  )
  returning id into v_definition_id;

  return v_definition_id;
end;
$$;

create or replace function public.save_current_import_scan(
  p_import_batch_id uuid,
  p_scanner_definition_id uuid,
  p_name text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_direction text;
  v_definition_direction text;
  v_market_data_timestamp timestamptz;
  v_scan_run_id uuid;
  v_result_count bigint;
begin
  if v_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if char_length(btrim(p_name)) not between 1 and 120
    or char_length(p_notes) > 4000
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_scan_metadata';
  end if;

  select direction, market_data_timestamp
  into v_direction, v_market_data_timestamp
  from public.import_batches
  where id = p_import_batch_id
    and owner_id = v_owner_id
    and processing_status = 'completed';

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'completed_import_not_found';
  end if;

  select direction
  into v_definition_direction
  from public.scanner_definitions
  where id = p_scanner_definition_id
    and owner_id = v_owner_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'scanner_definition_not_found';
  end if;

  if v_definition_direction <> v_direction then
    raise exception using
      errcode = '22023',
      message = 'scan_direction_mismatch';
  end if;

  if v_direction = 'bullish' then
    select count(*)
    into v_result_count
    from public.bullish_stocks
    where owner_id = v_owner_id
      and import_batch_id = p_import_batch_id
      and ticker_symbol is not null
      and validation_status in ('valid', 'duplicate');
  else
    select count(*)
    into v_result_count
    from public.bearish_stocks
    where owner_id = v_owner_id
      and import_batch_id = p_import_batch_id
      and ticker_symbol is not null
      and validation_status in ('valid', 'duplicate');
  end if;

  if v_result_count = 0 then
    raise exception using
      errcode = 'P0002',
      message = 'current_import_rows_not_found';
  end if;

  insert into public.scan_runs (
    owner_id,
    scanner_definition_id,
    import_batch_id,
    name,
    notes,
    direction,
    run_kind,
    market_data_timestamp
  )
  values (
    v_owner_id,
    p_scanner_definition_id,
    p_import_batch_id,
    btrim(p_name),
    nullif(btrim(p_notes), ''),
    v_direction,
    'import_snapshot',
    v_market_data_timestamp
  )
  returning id into v_scan_run_id;

  if v_direction = 'bullish' then
    insert into public.scan_results (
      scan_run_id,
      owner_id,
      import_batch_id,
      ticker_symbol,
      direction,
      candidate_order,
      source_sheet_name,
      first_source_row_number,
      source_occurrence_count,
      source_observation_timestamp
    )
    select
      v_scan_run_id,
      v_owner_id,
      p_import_batch_id,
      source.ticker_symbol,
      v_direction,
      row_number() over (
        order by source.first_source_row_number, source.ticker_symbol
      ),
      source.source_sheet_name,
      source.first_source_row_number,
      source.source_occurrence_count,
      source.source_observation_timestamp
    from (
      select
        ticker_symbol,
        (array_agg(source_sheet_name order by original_row_number))[1]
          as source_sheet_name,
        min(original_row_number) as first_source_row_number,
        count(*) as source_occurrence_count,
        min(source_observation_timestamp) as source_observation_timestamp
      from public.bullish_stocks
      where owner_id = v_owner_id
        and import_batch_id = p_import_batch_id
        and ticker_symbol is not null
        and validation_status in ('valid', 'duplicate')
      group by ticker_symbol
    ) as source;
  else
    insert into public.scan_results (
      scan_run_id,
      owner_id,
      import_batch_id,
      ticker_symbol,
      direction,
      candidate_order,
      source_sheet_name,
      first_source_row_number,
      source_occurrence_count,
      source_observation_timestamp
    )
    select
      v_scan_run_id,
      v_owner_id,
      p_import_batch_id,
      source.ticker_symbol,
      v_direction,
      row_number() over (
        order by source.first_source_row_number, source.ticker_symbol
      ),
      source.source_sheet_name,
      source.first_source_row_number,
      source.source_occurrence_count,
      source.source_observation_timestamp
    from (
      select
        ticker_symbol,
        (array_agg(source_sheet_name order by original_row_number))[1]
          as source_sheet_name,
        min(original_row_number) as first_source_row_number,
        count(*) as source_occurrence_count,
        min(source_observation_timestamp) as source_observation_timestamp
      from public.bearish_stocks
      where owner_id = v_owner_id
        and import_batch_id = p_import_batch_id
        and ticker_symbol is not null
        and validation_status in ('valid', 'duplicate')
      group by ticker_symbol
    ) as source;
  end if;

  return v_scan_run_id;
end;
$$;

revoke all on function public.create_scanner_definition_version(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.create_scanner_definition_version(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;

revoke all on function public.save_current_import_scan(
  uuid,
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.save_current_import_scan(
  uuid,
  uuid,
  text,
  text
) to authenticated, service_role;
