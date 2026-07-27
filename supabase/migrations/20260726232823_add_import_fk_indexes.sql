-- Cover the composite foreign keys in their declared column order.
-- Owner-leading indexes remain separate because they support RLS filtering.

create index imported_stock_rows_batch_owner_idx
  on public.imported_stock_rows (import_batch_id, owner_id);

create index import_audit_history_batch_owner_idx
  on public.import_audit_history (import_batch_id, owner_id);
