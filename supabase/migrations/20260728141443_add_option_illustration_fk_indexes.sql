create index option_illustration_legs_parent_owner_idx
  on public.option_illustration_legs (illustration_id, owner_id);

create index trade_option_sources_trade_owner_idx
  on public.trade_option_illustration_sources (trade_id, owner_id);
