create index watchlist_items_watchlist_owner_idx
  on public.watchlist_items (watchlist_id, owner_id);

create index watchlist_item_sources_item_owner_idx
  on public.watchlist_item_sources (watchlist_item_id, owner_id);
