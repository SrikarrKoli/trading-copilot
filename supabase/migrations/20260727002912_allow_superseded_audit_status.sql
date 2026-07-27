-- Import replacement records completed -> superseded transitions.

alter table public.import_audit_history
  drop constraint import_audit_history_previous_status_valid,
  drop constraint import_audit_history_new_status_valid;

alter table public.import_audit_history
  add constraint import_audit_history_previous_status_valid
    check (
      previous_status is null
      or previous_status in (
        'received',
        'validating',
        'ready',
        'processing',
        'completed',
        'failed',
        'superseded'
      )
    ),
  add constraint import_audit_history_new_status_valid
    check (
      new_status is null
      or new_status in (
        'received',
        'validating',
        'ready',
        'processing',
        'completed',
        'failed',
        'superseded'
      )
    );
