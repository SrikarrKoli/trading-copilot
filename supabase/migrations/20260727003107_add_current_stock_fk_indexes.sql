-- Cover the composite batch/owner foreign keys in their declared order.

create index bullish_stocks_batch_owner_idx
  on public.bullish_stocks (import_batch_id, owner_id);

create index bearish_stocks_batch_owner_idx
  on public.bearish_stocks (import_batch_id, owner_id);
