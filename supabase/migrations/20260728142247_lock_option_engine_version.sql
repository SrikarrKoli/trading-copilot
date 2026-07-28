alter table public.option_illustrations
  drop constraint option_illustrations_engine_version_check;

alter table public.option_illustrations
  add constraint option_illustrations_engine_version_check
  check (engine_version = '1.0.0');
