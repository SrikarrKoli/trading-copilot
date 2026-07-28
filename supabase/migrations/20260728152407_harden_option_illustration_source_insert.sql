drop policy option_illustration_sources_owner_insert
  on public.option_illustration_sources;

create policy option_illustration_sources_owner_insert
  on public.option_illustration_sources
  for insert
  to authenticated
  with check (
    (select auth.uid()) = option_illustration_sources.owner_id
    and exists (
      select 1
      from public.option_illustrations illustration
      where illustration.id =
        option_illustration_sources.illustration_id
        and illustration.owner_id =
          option_illustration_sources.owner_id
        and illustration.ticker_symbol =
          option_illustration_sources.ticker_symbol
    )
    and (
      (
        option_illustration_sources.source_kind = 'watchlist'
        and exists (
          select 1
          from public.watchlist_items item
          join public.watchlists list
            on list.id = item.watchlist_id
            and list.owner_id = item.owner_id
          join public.watchlist_item_sources source
            on source.watchlist_item_id = item.id
            and source.owner_id = item.owner_id
          where item.id =
              option_illustration_sources.watchlist_item_id
            and item.owner_id =
              option_illustration_sources.owner_id
            and item.archived_at is null
            and list.archived_at is null
            and item.ticker_symbol =
              option_illustration_sources.ticker_symbol
            and source.import_batch_id =
              option_illustration_sources.import_batch_id
            and source.direction =
              option_illustration_sources.direction
            and source.source_row_number =
              option_illustration_sources.source_row_number
        )
      )
      or
      (
        option_illustration_sources.source_kind = 'review'
        and option_illustration_sources.watchlist_item_id is null
        and (
          (
            option_illustration_sources.direction = 'bullish'
            and option_illustration_sources.source_row_number = (
              select min(stock.original_row_number)
              from public.bullish_stocks stock
              where stock.owner_id =
                  option_illustration_sources.owner_id
                and stock.import_batch_id =
                  option_illustration_sources.import_batch_id
                and stock.ticker_symbol =
                  option_illustration_sources.ticker_symbol
                and stock.validation_status in ('valid', 'duplicate')
            )
          )
          or
          (
            option_illustration_sources.direction = 'bearish'
            and option_illustration_sources.source_row_number = (
              select min(stock.original_row_number)
              from public.bearish_stocks stock
              where stock.owner_id =
                  option_illustration_sources.owner_id
                and stock.import_batch_id =
                  option_illustration_sources.import_batch_id
                and stock.ticker_symbol =
                  option_illustration_sources.ticker_symbol
                and stock.validation_status in ('valid', 'duplicate')
            )
          )
        )
      )
    )
    and (
      option_illustration_sources.evidence_assessment_id is null
      or exists (
        select 1
        from public.manual_evidence_assessments evidence
        where evidence.id =
            option_illustration_sources.evidence_assessment_id
          and evidence.owner_id =
            option_illustration_sources.owner_id
          and evidence.import_batch_id =
            option_illustration_sources.import_batch_id
          and evidence.direction =
            option_illustration_sources.direction
          and evidence.ticker_symbol =
            option_illustration_sources.ticker_symbol
          and evidence.source_row_number =
            option_illustration_sources.source_row_number
      )
    )
  );
