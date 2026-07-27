-- Atomic, idempotent workbook import boundary.
--
-- Only the service_role may execute this function. The caller is responsible
-- for authenticating the user and deriving p_owner_id from the verified JWT.
-- The function remains SECURITY INVOKER; it does not bypass permissions with
-- SECURITY DEFINER.

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
  v_is_new boolean := false;
begin
  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'owner_required';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_owner_id
      and coalesce(is_anonymous, false) = false
  ) then
    raise exception using errcode = '22023', message = 'owner_not_found';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'rows_must_be_array';
  end if;

  if jsonb_array_length(p_rows) = 0 then
    raise exception using errcode = '22023', message = 'rows_required';
  end if;

  insert into public.import_batches (
    owner_id,
    original_filename,
    file_sha256,
    file_size_bytes,
    source_type,
    market_data_timestamp,
    processing_status
  )
  values (
    p_owner_id,
    p_original_filename,
    p_file_sha256,
    p_file_size_bytes,
    p_source_type,
    p_market_data_timestamp,
    'processing'
  )
  on conflict (owner_id, file_sha256) do nothing
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
      and file_sha256 = p_file_sha256;

    if v_existing_status <> 'failed' then
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

    if exists (
      select 1
      from public.imported_stock_rows
      where import_batch_id = v_batch_id
    ) then
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
      jsonb_build_object('row_count', jsonb_array_length(p_rows))
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
      jsonb_build_object('row_count', jsonb_array_length(p_rows))
    );
  end if;

  begin
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
        select id
        into v_duplicate_of_row_id
        from public.imported_stock_rows
        where import_batch_id = v_batch_id
          and source_sheet_name = v_source_sheet_name
          and original_row_number =
            (v_row ->> 'duplicate_of_row_number')::bigint;

        if v_duplicate_of_row_id is null then
          raise exception using
            errcode = '22023',
            message = 'duplicate_source_row_not_found';
        end if;
      end if;

      insert into public.imported_stock_rows (
        import_batch_id,
        owner_id,
        source_sheet_name,
        original_row_number,
        ticker_symbol,
        direction,
        raw_source_data,
        normalized_data,
        validation_status,
        validation_errors,
        source_observation_timestamp,
        duplicate_of_row_id
      )
      values (
        v_batch_id,
        p_owner_id,
        v_source_sheet_name,
        v_original_row_number,
        v_ticker_symbol,
        v_row ->> 'direction',
        coalesce(v_row -> 'raw_source_data', '{}'::jsonb),
        coalesce(v_row -> 'normalized_data', '{}'::jsonb),
        v_validation_status,
        coalesce(v_row -> 'validation_errors', '[]'::jsonb),
        nullif(v_row ->> 'source_observation_timestamp', '')::timestamptz,
        v_duplicate_of_row_id
      )
      returning id into v_row_id;
    end loop;

    select
      count(*),
      count(*) filter (where validation_status = 'valid'),
      count(*) filter (where validation_status = 'invalid'),
      count(*) filter (where validation_status = 'duplicate')
    into
      v_total_rows,
      v_valid_rows,
      v_invalid_rows,
      v_duplicate_rows
    from public.imported_stock_rows
    where import_batch_id = v_batch_id
      and owner_id = p_owner_id;

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
        jsonb_build_object('code', 'import_processing_failed')
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
    'total_rows', v_total_rows,
    'valid_rows', v_valid_rows,
    'invalid_rows', v_invalid_rows,
    'duplicate_rows', v_duplicate_rows,
    'new_batch', v_is_new
  );
end;
$function$;

comment on function public.commit_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) is
  'Service-only atomic import. Derives counts from persisted child rows, preserves repeated tickers, and returns an existing batch for an owner/hash duplicate.';

revoke all on function public.commit_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) from public, anon, authenticated;

grant execute on function public.commit_import(
  uuid,
  text,
  text,
  bigint,
  text,
  timestamptz,
  jsonb
) to service_role;
