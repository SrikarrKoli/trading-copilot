-- Trading Copilot import persistence boundary.
-- Browser clients are read-only. A future trusted server transaction will
-- perform batch, row, and audit writes after verifying the Supabase session.

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  original_filename text not null,
  file_sha256 text not null,
  file_size_bytes bigint not null,
  source_type text not null,
  market_data_timestamp timestamptz,
  uploaded_at timestamptz not null default now(),
  processing_status text not null default 'received',
  total_rows bigint not null default 0,
  valid_rows bigint not null default 0,
  invalid_rows bigint not null default 0,
  duplicate_rows bigint not null default 0,
  error_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint import_batches_owner_id_fkey
    foreign key (owner_id)
    references auth.users (id)
    on delete restrict,
  constraint import_batches_id_owner_id_key
    unique (id, owner_id),
  constraint import_batches_owner_hash_key
    unique (owner_id, file_sha256),
  constraint import_batches_filename_not_blank
    check (char_length(btrim(original_filename)) between 1 and 512),
  constraint import_batches_sha256_format
    check (file_sha256 ~ '^[0-9a-f]{64}$'),
  constraint import_batches_file_size_nonnegative
    check (file_size_bytes >= 0),
  constraint import_batches_source_type_not_blank
    check (char_length(btrim(source_type)) between 1 and 100),
  constraint import_batches_status_valid
    check (
      processing_status in (
        'received',
        'validating',
        'ready',
        'processing',
        'completed',
        'failed'
      )
    ),
  constraint import_batches_counts_nonnegative
    check (
      total_rows >= 0
      and valid_rows >= 0
      and invalid_rows >= 0
      and duplicate_rows >= 0
    ),
  constraint import_batches_counts_reconcile
    check (total_rows = valid_rows + invalid_rows + duplicate_rows),
  constraint import_batches_error_summary_object
    check (jsonb_typeof(error_summary) = 'object'),
  constraint import_batches_completed_at_valid
    check (
      (
        processing_status in ('completed', 'failed')
        and completed_at is not null
        and completed_at >= created_at
      )
      or (
        processing_status not in ('completed', 'failed')
        and completed_at is null
      )
    )
);

create table public.imported_stock_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  owner_id uuid not null,
  source_sheet_name text not null,
  original_row_number bigint not null,
  ticker_symbol text,
  direction text not null,
  raw_source_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_status text not null,
  validation_errors jsonb not null default '[]'::jsonb,
  source_observation_timestamp timestamptz,
  duplicate_of_row_id uuid,
  created_at timestamptz not null default now(),

  constraint imported_stock_rows_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches (id, owner_id)
    on delete restrict,
  constraint imported_stock_rows_id_batch_key
    unique (id, import_batch_id),
  constraint imported_stock_rows_physical_row_key
    unique (import_batch_id, source_sheet_name, original_row_number),
  constraint imported_stock_rows_duplicate_batch_fkey
    foreign key (duplicate_of_row_id, import_batch_id)
    references public.imported_stock_rows (id, import_batch_id)
    on delete restrict,
  constraint imported_stock_rows_sheet_not_blank
    check (char_length(btrim(source_sheet_name)) between 1 and 255),
  constraint imported_stock_rows_row_number_positive
    check (original_row_number > 0),
  constraint imported_stock_rows_ticker_normalized
    check (
      ticker_symbol is null
      or (
        char_length(ticker_symbol) between 1 and 32
        and ticker_symbol = upper(btrim(ticker_symbol))
      )
    ),
  constraint imported_stock_rows_direction_valid
    check (direction in ('bullish', 'bearish')),
  constraint imported_stock_rows_raw_object
    check (jsonb_typeof(raw_source_data) = 'object'),
  constraint imported_stock_rows_normalized_object
    check (jsonb_typeof(normalized_data) = 'object'),
  constraint imported_stock_rows_validation_status_valid
    check (validation_status in ('valid', 'invalid', 'duplicate')),
  constraint imported_stock_rows_validation_errors_array
    check (jsonb_typeof(validation_errors) = 'array'),
  constraint imported_stock_rows_duplicate_reference_valid
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

create table public.import_audit_history (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  owner_id uuid not null,
  event_type text not null,
  previous_status text,
  new_status text,
  event_timestamp timestamptz not null default now(),
  safe_metadata jsonb not null default '{}'::jsonb,

  constraint import_audit_history_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches (id, owner_id)
    on delete restrict,
  constraint import_audit_history_event_type_not_blank
    check (char_length(btrim(event_type)) between 1 and 100),
  constraint import_audit_history_previous_status_valid
    check (
      previous_status is null
      or previous_status in (
        'received',
        'validating',
        'ready',
        'processing',
        'completed',
        'failed'
      )
    ),
  constraint import_audit_history_new_status_valid
    check (
      new_status is null
      or new_status in (
        'received',
        'validating',
        'ready',
        'processing',
        'completed',
        'failed'
      )
    ),
  constraint import_audit_history_safe_metadata_object
    check (jsonb_typeof(safe_metadata) = 'object')
);

comment on table public.import_batches is
  'One immutable file identity per owner and SHA-256 hash; lifecycle fields may be updated by the trusted import boundary.';
comment on column public.import_batches.owner_id is
  'Permanent Supabase auth.users UUID. Email addresses are not ownership keys.';
comment on constraint import_batches_counts_reconcile on public.import_batches is
  'Reconciles stored counters only. The trusted import transaction must separately compare them with imported_stock_rows.';
comment on table public.imported_stock_rows is
  'Physical workbook rows. Filename is inherited from import_batches; sheet and original row number are stored here.';
comment on column public.imported_stock_rows.duplicate_of_row_id is
  'For a repeated ticker occurrence, points to an earlier physical row in the same batch. Repeated rows remain stored.';
comment on table public.import_audit_history is
  'Append-only import event history. Browser roles cannot insert, update, or delete audit events.';
comment on column public.import_audit_history.safe_metadata is
  'Allowlisted operational metadata only. Never store secrets, credentials, raw tokens, or unnecessary personal data.';

create index import_batches_owner_status_created_idx
  on public.import_batches (owner_id, processing_status, created_at desc);

create index imported_stock_rows_owner_batch_idx
  on public.imported_stock_rows (owner_id, import_batch_id);

create index imported_stock_rows_owner_ticker_observed_idx
  on public.imported_stock_rows (
    owner_id,
    ticker_symbol,
    source_observation_timestamp desc
  )
  where ticker_symbol is not null;

create index imported_stock_rows_duplicate_reference_idx
  on public.imported_stock_rows (duplicate_of_row_id, import_batch_id)
  where duplicate_of_row_id is not null;

create index import_audit_history_owner_batch_event_idx
  on public.import_audit_history (
    owner_id,
    import_batch_id,
    event_timestamp desc
  );

alter table public.import_batches enable row level security;
alter table public.imported_stock_rows enable row level security;
alter table public.import_audit_history enable row level security;

create policy import_batches_owner_select
  on public.import_batches
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy import_batches_owner_update
  on public.import_batches
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy imported_stock_rows_owner_select
  on public.imported_stock_rows
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy imported_stock_rows_owner_update
  on public.imported_stock_rows
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy import_audit_history_owner_select
  on public.import_audit_history
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

-- The browser receives read access only. Import and audit mutations will be
-- performed together by a future trusted server boundary after session checks.
revoke all on table public.import_batches
  from anon, authenticated, service_role;
revoke all on table public.imported_stock_rows
  from anon, authenticated, service_role;
revoke all on table public.import_audit_history
  from anon, authenticated, service_role;

grant select on table public.import_batches
  to authenticated;
grant select on table public.imported_stock_rows
  to authenticated;
grant select on table public.import_audit_history
  to authenticated;

grant select, insert, update on table public.import_batches
  to service_role;
grant select, insert, update on table public.imported_stock_rows
  to service_role;
grant select, insert on table public.import_audit_history
  to service_role;
