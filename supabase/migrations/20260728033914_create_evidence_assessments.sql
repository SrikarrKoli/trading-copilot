-- Complete manual Setup Alignment snapshots are append-only. The database
-- calculates the score from the stored observations so clients cannot supply
-- or alter a score independently from its evidence.
create table public.manual_evidence_assessments (
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
  score_version text not null
    default 'manual-high-conviction-v1.0.0'
    check (score_version = 'manual-high-conviction-v1.0.0'),
  observation_timestamp timestamptz not null,
  observation_source text not null
    check (
      char_length(btrim(observation_source)) between 1 and 120
      and observation_source = btrim(observation_source)
    ),
  price numeric(18, 6) not null
    check (price > 0),
  market_cap_billions numeric(18, 6) not null
    check (market_cap_billions >= 0),
  ema_20 numeric(18, 6) not null
    check (ema_20 > 0),
  ema_50 numeric(18, 6) not null
    check (ema_50 > 0),
  macd_signal text not null
    check (macd_signal in ('bullish', 'bearish', 'neutral')),
  rsi numeric(8, 4) not null
    check (rsi between 0 and 100),
  atr_percent numeric(10, 6) not null
    check (atr_percent >= 0),
  adx numeric(10, 6) not null
    check (adx >= 0),
  average_volume_millions numeric(18, 6) not null
    check (average_volume_millions >= 0),
  range_reference_20_day numeric(18, 6) not null
    check (range_reference_20_day > 0),
  setup_alignment integer generated always as (
    10 * (
      case when price > 20 then 1 else 0 end
      + case when market_cap_billions > 5 then 1 else 0 end
      + case
          when direction = 'bullish' and price > ema_20 then 1
          when direction = 'bearish' and price < ema_20 then 1
          else 0
        end
      + case
          when direction = 'bullish' and price > ema_50 then 1
          when direction = 'bearish' and price < ema_50 then 1
          else 0
        end
      + case when macd_signal = direction then 1 else 0 end
      + case
          when direction = 'bullish' and rsi between 55 and 70 then 1
          when direction = 'bearish' and rsi between 30 and 45 then 1
          else 0
        end
      + case when atr_percent > 1.5 then 1 else 0 end
      + case when adx > 25 then 1 else 0 end
      + case when average_volume_millions > 3 then 1 else 0 end
      + case
          when direction = 'bullish'
            and range_reference_20_day >= price
            and (
              (range_reference_20_day - price)
              / range_reference_20_day
              * 100
            ) between 0 and 2
            then 1
          when direction = 'bearish'
            and range_reference_20_day <= price
            and (
              (price - range_reference_20_day)
              / range_reference_20_day
              * 100
            ) between 0 and 2
            then 1
          else 0
        end
    )
  ) stored,
  saved_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint manual_evidence_assessments_batch_owner_fkey
    foreign key (import_batch_id, owner_id)
    references public.import_batches(id, owner_id)
    on update restrict
    on delete restrict
);

comment on table public.manual_evidence_assessments is
  'Append-only complete manual Setup Alignment snapshots. setup_alignment is generated from the stored v1 observations and is not confidence or probability.';

comment on column public.manual_evidence_assessments.observation_source is
  'Owner-entered market observation source label. Never store credentials, API keys, or broker account data.';

comment on column public.manual_evidence_assessments.setup_alignment is
  'Database-generated deterministic rule match from 0 through 100 in 10-point increments; not statistical confidence.';

create index manual_evidence_owner_candidate_saved_idx
  on public.manual_evidence_assessments (
    owner_id,
    import_batch_id,
    direction,
    ticker_symbol,
    saved_at desc,
    id desc
  );

create index manual_evidence_batch_owner_idx
  on public.manual_evidence_assessments (import_batch_id, owner_id);

alter table public.manual_evidence_assessments enable row level security;

create policy manual_evidence_owner_select
  on public.manual_evidence_assessments
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy manual_evidence_owner_insert
  on public.manual_evidence_assessments
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on table public.manual_evidence_assessments
  from anon, authenticated;

grant select, insert on table public.manual_evidence_assessments
  to authenticated;

grant select, insert, update, delete
  on table public.manual_evidence_assessments
  to service_role;
