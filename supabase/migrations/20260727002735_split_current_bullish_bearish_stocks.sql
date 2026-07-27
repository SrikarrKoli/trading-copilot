-- Current-state stock storage.
--
-- Bullish and bearish rows live in separate tables. Replacing one direction
-- deletes that direction's current rows before inserting the new workbook,
-- all inside one subtransaction. If any insert or reconciliation fails, the
-- deletion rolls back and the previous usable list remains intact.
--
-- Batch and audit records retain operational metadata and counts, but old
-- ticker rows are not retained.

alter table public.import_batches
  add column direction text;

update public.import_batches as batch
set direction = source.direction
from (
  select
    import_batch_id,
    min(direction) as direction
  from public.imported_stock_rows
  group by import_batch_id
  having count(distinct direction) = 1
) as source
where source.import_batch_id = batch.id;

alter table public.import_batches
  alter column direction set not null,
  add constraint import_batches_direction_valid
    check (direction in ('bullish', 'bearish'));

alter table public.import_batches
  drop constraint import_batches_owner_hash_key,
  drop constraint import_batches_status_valid,
  drop constraint import_batches_completed_at_valid;

alter table public.import_batches
  add constraint import_batches_status_valid
    check (
      processing_status in (
        'received',
        'validating',
        'ready',
        'processing',
        'completed',
        'failed',
        'superseded'
      )
    ),
  add constraint import_batches_completed_at_valid
    check (
      (
        processing_status in ('completed', 'failed', 'superseded')
        and completed_at is not null
        and completed_at >= created_at
      )
      or (
        processing_status not in ('completed', 'failed', 'superseded')
        and completed_at is null
      )
    );

create unique index import_batches_owner_direction_hash_active_key
  on public.import_batches (owner_id, direction, file_sha256)
  where processing_status <> 'superseded';

create table public.bullish_stocks (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  owner_id uuid not null,
  source_sheet_name text not null,
  original_row_number bigint not null,
  ticker_symbol text,
  raw_source_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_status text not null,
  validation_errors jsonb not null default '[]'::jsonb,
  source_observation_timestamp timestamptz,
  duplicate_of_row_id uuid,
  created_at timestamptz not null default now(),

  constraint bullish_stocks_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches (id, owner_id)
    on delete restrict,
  constraint bullish_stocks_id_batch_key
    unique (id, import_batch_id),
  constraint bullish_stocks_physical_row_key
    unique (import_batch_id, source_sheet_name, original_row_number),
  constraint bullish_stocks_duplicate_batch_fkey
    foreign key (duplicate_of_row_id, import_batch_id)
    references public.bullish_stocks (id, import_batch_id)
    on delete restrict,
  constraint bullish_stocks_sheet_not_blank
    check (char_length(btrim(source_sheet_name)) between 1 and 255),
  constraint bullish_stocks_row_number_positive
    check (original_row_number > 0),
  constraint bullish_stocks_ticker_normalized
    check (
      ticker_symbol is null
      or (
        char_length(ticker_symbol) between 1 and 32
        and ticker_symbol = upper(btrim(ticker_symbol))
      )
    ),
  constraint bullish_stocks_raw_object
    check (jsonb_typeof(raw_source_data) = 'object'),
  constraint bullish_stocks_normalized_object
    check (jsonb_typeof(normalized_data) = 'object'),
  constraint bullish_stocks_validation_status_valid
    check (validation_status in ('valid', 'invalid', 'duplicate')),
  constraint bullish_stocks_validation_errors_array
    check (jsonb_typeof(validation_errors) = 'array'),
  constraint bullish_stocks_duplicate_reference_valid
    check (
      (
        validation_status = 'duplicate'
        and duplicate_of_row_id is not null
        and duplicate_of_row_id <> id
      )
      or (
        validation_status <> 'duplicate'
        and duplicate_of_row_id is null
      )
    )
);

create table public.bearish_stocks (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  owner_id uuid not null,
  source_sheet_name text not null,
  original_row_number bigint not null,
  ticker_symbol text,
  raw_source_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_status text not null,
  validation_errors jsonb not null default '[]'::jsonb,
  source_observation_timestamp timestamptz,
  duplicate_of_row_id uuid,
  created_at timestamptz not null default now(),

  constraint bearish_stocks_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches (id, owner_id)
    on delete restrict,
  constraint bearish_stocks_id_batch_key
    unique (id, import_batch_id),
  constraint bearish_stocks_physical_row_key
    unique (import_batch_id, source_sheet_name, original_row_number),
  constraint bearish_stocks_duplicate_batch_fkey
    foreign key (duplicate_of_row_id, import_batch_id)
    references public.bearish_stocks (id, import_batch_id)
    on delete restrict,
  constraint bearish_stocks_sheet_not_blank
    check (char_length(btrim(source_sheet_name)) between 1 and 255),
  constraint bearish_stocks_row_number_positive
    check (original_row_number > 0),
  constraint bearish_stocks_ticker_normalized
    check (
      ticker_symbol is null
      or (
        char_length(ticker_symbol) between 1 and 32
        and ticker_symbol = upper(btrim(ticker_symbol))
      )
    ),
  constraint bearish_stocks_raw_object
    check (jsonb_typeof(raw_source_data) = 'object'),
  constraint bearish_stocks_normalized_object
    check (jsonb_typeof(normalized_data) = 'object'),
  constraint bearish_stocks_validation_status_valid
    check (validation_status in ('valid', 'invalid', 'duplicate')),
  constraint bearish_stocks_validation_errors_array
    check (jsonb_typeof(validation_errors) = 'array'),
  constraint bearish_stocks_duplicate_reference_valid
    check (
      (
        validation_status = 'duplicate'
        and duplicate_of_row_id is not null
        and duplicate_of_row_id <> id
      )
      or (
        validation_status <> 'duplicate'
        and duplicate_of_row_id is null
      )
    )
);

create index bullish_stocks_owner_batch_idx
  on public.bullish_stocks (owner_id, import_batch_id);
create index bullish_stocks_owner_ticker_observed_idx
  on public.bullish_stocks (
    owner_id,
    ticker_symbol,
    source_observation_timestamp desc
  )
  where ticker_symbol is not null;
create index bullish_stocks_duplicate_reference_idx
  on public.bullish_stocks (duplicate_of_row_id, import_batch_id)
  where duplicate_of_row_id is not null;

create index bearish_stocks_owner_batch_idx
  on public.bearish_stocks (owner_id, import_batch_id);
create index bearish_stocks_owner_ticker_observed_idx
  on public.bearish_stocks (
    owner_id,
    ticker_symbol,
    source_observation_timestamp desc
  )
  where ticker_symbol is not null;
create index bearish_stocks_duplicate_reference_idx
  on public.bearish_stocks (duplicate_of_row_id, import_batch_id)
  where duplicate_of_row_id is not null;

alter table public.bullish_stocks enable row level security;
alter table public.bearish_stocks enable row level security;

create policy bullish_stocks_owner_select
  on public.bullish_stocks
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy bullish_stocks_owner_update
  on public.bullish_stocks
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy bearish_stocks_owner_select
  on public.bearish_stocks
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy bearish_stocks_owner_update
  on public.bearish_stocks
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on table public.bullish_stocks
  from anon, authenticated, service_role;
revoke all on table public.bearish_stocks
  from anon, authenticated, service_role;

grant select on table public.bullish_stocks to authenticated;
grant select on table public.bearish_stocks to authenticated;

grant select, insert, update, delete on table public.bullish_stocks
  to service_role;
grant select, insert, update, delete on table public.bearish_stocks
  to service_role;

-- Preserve only the latest completed list for each owner and direction.
with ranked_batches as (
  select
    id,
    owner_id,
    direction,
    row_number() over (
      partition by owner_id, direction
      order by completed_at desc, created_at desc, id desc
    ) as recency
  from public.import_batches
  where processing_status = 'completed'
)
insert into public.bullish_stocks (
  id,
  import_batch_id,
  owner_id,
  source_sheet_name,
  original_row_number,
  ticker_symbol,
  raw_source_data,
  normalized_data,
  validation_status,
  validation_errors,
  source_observation_timestamp,
  duplicate_of_row_id,
  created_at
)
select
  row.id,
  row.import_batch_id,
  row.owner_id,
  row.source_sheet_name,
  row.original_row_number,
  row.ticker_symbol,
  row.raw_source_data,
  row.normalized_data,
  row.validation_status,
  row.validation_errors,
  row.source_observation_timestamp,
  row.duplicate_of_row_id,
  row.created_at
from public.imported_stock_rows as row
join ranked_batches as batch
  on batch.id = row.import_batch_id
where batch.direction = 'bullish'
  and batch.recency = 1;

with ranked_batches as (
  select
    id,
    owner_id,
    direction,
    row_number() over (
      partition by owner_id, direction
      order by completed_at desc, created_at desc, id desc
    ) as recency
  from public.import_batches
  where processing_status = 'completed'
)
insert into public.bearish_stocks (
  id,
  import_batch_id,
  owner_id,
  source_sheet_name,
  original_row_number,
  ticker_symbol,
  raw_source_data,
  normalized_data,
  validation_status,
  validation_errors,
  source_observation_timestamp,
  duplicate_of_row_id,
  created_at
)
select
  row.id,
  row.import_batch_id,
  row.owner_id,
  row.source_sheet_name,
  row.original_row_number,
  row.ticker_symbol,
  row.raw_source_data,
  row.normalized_data,
  row.validation_status,
  row.validation_errors,
  row.source_observation_timestamp,
  row.duplicate_of_row_id,
  row.created_at
from public.imported_stock_rows as row
join ranked_batches as batch
  on batch.id = row.import_batch_id
where batch.direction = 'bearish'
  and batch.recency = 1;

with ranked_batches as (
  select
    id,
    row_number() over (
      partition by owner_id, direction
      order by completed_at desc, created_at desc, id desc
    ) as recency
  from public.import_batches
  where processing_status = 'completed'
)
update public.import_batches as batch
set processing_status = 'superseded'
from ranked_batches
where ranked_batches.id = batch.id
  and ranked_batches.recency > 1;

drop table public.imported_stock_rows;

create or replace function public.commit_import(
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
  v_batch_id uuid;
  v_existing_status text;
  v_row jsonb;
  v_row_id uuid;
  v_duplicate_of_row_id uuid;
  v_source_sheet_name text;
  v_original_row_number bigint;
  v_validation_status text;
  v_ticker_symbol text;
  v_total_rows bigint;
  v_valid_rows bigint;
  v_invalid_rows bigint;
  v_duplicate_rows bigint;
  v_direction text;
  v_direction_count bigint;
  v_target_table text;
  v_previous_batch_ids uuid[];
  v_failed_batch_has_rows boolean;
  v_is_new boolean := false;
begin
  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'owner_required';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'rows_must_be_array';
  end if;
  if jsonb_array_length(p_rows) = 0 then
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

  v_target_table := case v_direction
    when 'bullish' then 'bullish_stocks'
    else 'bearish_stocks'
  end;

  insert into public.import_batches (
    owner_id,
    original_filename,
    file_sha256,
    file_size_bytes,
    source_type,
    direction,
    market_data_timestamp,
    processing_status
  )
  values (
    p_owner_id,
    p_original_filename,
    p_file_sha256,
    p_file_size_bytes,
    p_source_type,
    v_direction,
    p_market_data_timestamp,
    'processing'
  )
  on conflict (owner_id, direction, file_sha256)
    where processing_status <> 'superseded'
  do nothing
  returning id into v_batch_id;

  if v_batch_id is null then
    select
      id,
      processing_status,
      total_rows,
      valid_rows,
      invalid_rows,
      duplicate_rows
    into
      v_batch_id,
      v_existing_status,
      v_total_rows,
      v_valid_rows,
      v_invalid_rows,
      v_duplicate_rows
    from public.import_batches
    where owner_id = p_owner_id
      and direction = v_direction
      and file_sha256 = p_file_sha256
      and processing_status <> 'superseded';

    if v_existing_status = 'completed' then
      execute format(
        'select exists (
          select 1 from public.%I
          where owner_id = $1 and import_batch_id = $2
        )',
        v_target_table
      )
      into v_failed_batch_has_rows
      using p_owner_id, v_batch_id;

      if v_failed_batch_has_rows then
        return jsonb_build_object(
          'ok', true,
          'duplicate_file', true,
          'batch_id', v_batch_id,
          'processing_status', v_existing_status,
          'total_rows', v_total_rows,
          'valid_rows', v_valid_rows,
          'invalid_rows', v_invalid_rows,
          'duplicate_rows', v_duplicate_rows
        );
      end if;

      return jsonb_build_object(
        'ok', false,
        'duplicate_file', true,
        'batch_id', v_batch_id,
        'processing_status', v_existing_status,
        'error', 'completed_batch_missing_current_rows'
      );
    end if;

    if v_existing_status <> 'failed' then
      return jsonb_build_object(
        'ok', false,
        'duplicate_file', true,
        'batch_id', v_batch_id,
        'processing_status', v_existing_status,
        'error', 'existing_batch_not_completed'
      );
    end if;

    execute format(
      'select exists (
        select 1 from public.%I where import_batch_id = $1
      )',
      v_target_table
    )
    into v_failed_batch_has_rows
    using v_batch_id;

    if v_failed_batch_has_rows then
      return jsonb_build_object(
        'ok', false,
        'duplicate_file', true,
        'batch_id', v_batch_id,
        'processing_status', v_existing_status,
        'error', 'failed_batch_contains_rows'
      );
    end if;

    update public.import_batches
    set
      original_filename = p_original_filename,
      file_size_bytes = p_file_size_bytes,
      source_type = p_source_type,
      market_data_timestamp = p_market_data_timestamp,
      processing_status = 'processing',
      error_summary = '{}'::jsonb,
      completed_at = null
    where id = v_batch_id
      and owner_id = p_owner_id;

    insert into public.import_audit_history (
      import_batch_id,
      owner_id,
      event_type,
      previous_status,
      new_status,
      safe_metadata
    )
    values (
      v_batch_id,
      p_owner_id,
      'import_retry_started',
      'failed',
      'processing',
      jsonb_build_object(
        'direction', v_direction,
        'row_count', jsonb_array_length(p_rows)
      )
    );
  else
    v_is_new := true;

    insert into public.import_audit_history (
      import_batch_id,
      owner_id,
      event_type,
      previous_status,
      new_status,
      safe_metadata
    )
    values (
      v_batch_id,
      p_owner_id,
      'import_started',
      null,
      'processing',
      jsonb_build_object(
        'direction', v_direction,
        'row_count', jsonb_array_length(p_rows)
      )
    );
  end if;

  begin
    execute format(
      'select coalesce(
        array_agg(distinct import_batch_id),
        array[]::uuid[]
      )
      from public.%I
      where owner_id = $1',
      v_target_table
    )
    into v_previous_batch_ids
    using p_owner_id;

    execute format(
      'delete from public.%I where owner_id = $1',
      v_target_table
    )
    using p_owner_id;

    for v_row in
      select value
      from jsonb_array_elements(p_rows)
    loop
      v_source_sheet_name := btrim(v_row ->> 'source_sheet_name');
      v_original_row_number := (v_row ->> 'original_row_number')::bigint;
      v_validation_status := v_row ->> 'validation_status';
      v_ticker_symbol := nullif(v_row ->> 'ticker_symbol', '');
      v_duplicate_of_row_id := null;

      if v_validation_status = 'duplicate' then
        execute format(
          'select id
          from public.%I
          where import_batch_id = $1
            and source_sheet_name = $2
            and original_row_number = $3',
          v_target_table
        )
        into v_duplicate_of_row_id
        using
          v_batch_id,
          v_source_sheet_name,
          (v_row ->> 'duplicate_of_row_number')::bigint;

        if v_duplicate_of_row_id is null then
          raise exception using
            errcode = '22023',
            message = 'duplicate_source_row_not_found';
        end if;
      end if;

      execute format(
        'insert into public.%I (
          import_batch_id,
          owner_id,
          source_sheet_name,
          original_row_number,
          ticker_symbol,
          raw_source_data,
          normalized_data,
          validation_status,
          validation_errors,
          source_observation_timestamp,
          duplicate_of_row_id
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        returning id',
        v_target_table
      )
      into v_row_id
      using
        v_batch_id,
        p_owner_id,
        v_source_sheet_name,
        v_original_row_number,
        v_ticker_symbol,
        coalesce(v_row -> 'raw_source_data', '{}'::jsonb),
        coalesce(v_row -> 'normalized_data', '{}'::jsonb),
        v_validation_status,
        coalesce(v_row -> 'validation_errors', '[]'::jsonb),
        nullif(v_row ->> 'source_observation_timestamp', '')::timestamptz,
        v_duplicate_of_row_id;
    end loop;

    execute format(
      'select
        count(*),
        count(*) filter (where validation_status = ''valid''),
        count(*) filter (where validation_status = ''invalid''),
        count(*) filter (where validation_status = ''duplicate'')
      from public.%I
      where import_batch_id = $1
        and owner_id = $2',
      v_target_table
    )
    into
      v_total_rows,
      v_valid_rows,
      v_invalid_rows,
      v_duplicate_rows
    using v_batch_id, p_owner_id;

    if v_total_rows <> jsonb_array_length(p_rows)
      or v_total_rows <> v_valid_rows + v_invalid_rows + v_duplicate_rows
    then
      raise exception using errcode = '23514', message = 'row_count_mismatch';
    end if;

    update public.import_batches
    set
      processing_status = 'completed',
      total_rows = v_total_rows,
      valid_rows = v_valid_rows,
      invalid_rows = v_invalid_rows,
      duplicate_rows = v_duplicate_rows,
      error_summary = '{}'::jsonb,
      completed_at = now()
    where id = v_batch_id
      and owner_id = p_owner_id;

    with superseded as (
      update public.import_batches
      set processing_status = 'superseded'
      where id = any(v_previous_batch_ids)
        and id <> v_batch_id
        and owner_id = p_owner_id
        and direction = v_direction
        and processing_status = 'completed'
      returning id
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
      'completed',
      'superseded',
      jsonb_build_object(
        'direction', v_direction,
        'replacement_batch_id', v_batch_id
      )
    from superseded;

    insert into public.import_audit_history (
      import_batch_id,
      owner_id,
      event_type,
      previous_status,
      new_status,
      safe_metadata
    )
    values (
      v_batch_id,
      p_owner_id,
      'import_completed',
      'processing',
      'completed',
      jsonb_build_object(
        'direction', v_direction,
        'total_rows', v_total_rows,
        'valid_rows', v_valid_rows,
        'invalid_rows', v_invalid_rows,
        'duplicate_rows', v_duplicate_rows
      )
    );
  exception
    when others then
      update public.import_batches
      set
        processing_status = 'failed',
        total_rows = 0,
        valid_rows = 0,
        invalid_rows = 0,
        duplicate_rows = 0,
        error_summary = jsonb_build_object(
          'code',
          'import_processing_failed'
        ),
        completed_at = now()
      where id = v_batch_id
        and owner_id = p_owner_id;

      insert into public.import_audit_history (
        import_batch_id,
        owner_id,
        event_type,
        previous_status,
        new_status,
        safe_metadata
      )
      values (
        v_batch_id,
        p_owner_id,
        'import_failed',
        'processing',
        'failed',
        jsonb_build_object(
          'code', 'import_processing_failed',
          'direction', v_direction
        )
      );

      return jsonb_build_object(
        'ok', false,
        'duplicate_file', false,
        'batch_id', v_batch_id,
        'processing_status', 'failed',
        'error', 'import_processing_failed'
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'duplicate_file', false,
    'batch_id', v_batch_id,
    'processing_status', 'completed',
    'direction', v_direction,
    'total_rows', v_total_rows,
    'valid_rows', v_valid_rows,
    'invalid_rows', v_invalid_rows,
    'duplicate_rows', v_duplicate_rows,
    'new_batch', v_is_new
  );
end;
$function$;

comment on table public.bullish_stocks is
  'Current bullish workbook rows only. Replaced atomically by a successful bullish import.';
comment on table public.bearish_stocks is
  'Current bearish workbook rows only. Replaced atomically by a successful bearish import.';
comment on column public.import_batches.direction is
  'Direction of the imported workbook; used to supersede only the matching current list.';
comment on function public.commit_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) is
  'Service-only atomic current-list replacement. Deletes and replaces one direction while preserving the other; old ticker rows are not retained.';
