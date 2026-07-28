# Option Strategies

## Principle

The option engine is a deterministic calculator and comparison tool. AI may explain its outputs but must not calculate them.

## Strategy illustration, not recommendation

The user selects a ticker, expiry, legs, and scenario assumptions. The system may rank structures by a user-selected objective such as maximum loss, capital required, or distance to break-even. It must not claim that one structure is the trade the user should place.

## Initial strategy set

- Long call and long put
- Bull call and bear put debit spreads
- Bull put and bear call credit spreads
- Iron condor
- Calendar spread

Long calls, long puts, and debit spreads are the primary workflow. Credit spreads are occasional. Iron condors and calendar spreads are supported comparison structures once their payoff, assignment, and multi-expiry behavior are explicitly tested. Short naked options, ratio spreads, and diagonals remain out of scope.

## Calculation requirements

Every illustration includes:

- contract symbol, underlying, expiry, strike, call/put, side, quantity, and multiplier;
- bid, ask, midpoint, selected fill assumption, quote time, and source;
- net debit/credit;
- expected move over the selected horizon;
- payoff at expiration;
- maximum gain, maximum loss, and break-even(s);
- capital requirement estimate labeled as an estimate;
- commission and slippage assumptions;
- scenario table across underlying prices;
- payoff chart;
- data freshness and warnings; and
- formula/engine version.

The comparison view also shows IV, a precisely defined IV rank/percentile, risk/reward, and Greeks when the required data and disclosed model assumptions are available. Earnings-aware analysis must flag IV-crush and event-gap risk and explain the tradeoffs between long premium and defined-risk spreads without issuing a directive.

American-style exercise and assignment can make pre-expiration outcomes differ from expiration payoff. The system must disclose this and flag short legs near ex-dividend dates or expiration when event data is available.

## Probability

Do not display a generic “probability of profit” in the first release. Later probability estimates require:

- named model and formula;
- IV surface or volatility assumption;
- time-to-expiry and rate/dividend assumptions;
- distinction between risk-neutral model probability and empirical frequency;
- validation/calibration results; and
- timestamped inputs.

Broker-displayed probability must not be copied without understanding its method and data rights.

## Greeks and volatility

Greeks are model outputs, not facts. Store model version and assumptions. Show both per-contract and position-level values. IV rank/percentile must define its lookback, sampling, and handling of missing history.

## Strategy comparison

Default comparison dimensions:

- defined vs. undefined risk;
- maximum loss and capital at risk;
- break-even distance;
- payoff shape;
- sensitivity to delta, gamma, theta, and vega;
- liquidity indicators such as spread width, volume, and open interest; and
- event exposure.

No single composite score should hide these tradeoffs.

## Validation

Each payoff function requires algebraic tests, boundary cases, multi-leg sign tests, and golden scenario fixtures. Backtests must use historical option quotes or a clearly labeled approximation; current-chain quotes cannot reconstruct historical fills.

## Applied manual payoff slice

Engine `1.0.0` implements the primary same-expiration debit structures:

- long call;
- long put;
- bull call debit spread; and
- bear put debit spread.

The user enters the underlying, spot price, expiration, optional quote time,
quantity, multiplier, per-leg bid/ask, and estimated total fees. Pricing
assumptions are:

- **Midpoint:** `(bid + ask) / 2` for every leg.
- **Natural:** long legs use ask and short legs use bid.
- **Manual:** every leg uses its explicitly entered fill; fills outside the
  entered market produce a warning.

Premiums and strikes are entered per share. With `Q` contracts, multiplier `M`,
total estimated fees `F`, selected leg fills `P_i`, and a sign of `+1` for a
long premium paid and `-1` for a short premium received:

`net_debit = Σ(sign_i × P_i × Q × M)`

`total_entry_cost = net_debit + F`

At underlying expiration price `S_T`, call intrinsic value is
`max(S_T - K, 0)` and put intrinsic value is `max(K - S_T, 0)`. Long-leg P/L is
`(intrinsic - fill) × Q × M`; short-leg P/L is
`(fill - intrinsic) × Q × M`. Total illustration P/L is the sum of leg P/L
minus `F`.

For a long call, maximum loss is total entry cost, maximum profit is unbounded,
and break-even is strike plus effective debit per share. For a long put,
maximum profit is payoff at an underlying price of zero and break-even is
strike minus effective debit per share. For each vertical debit spread,
maximum profit is spread width times `Q × M` minus total entry cost; maximum
loss is total entry cost. The bull call break-even adds effective debit to the
long lower strike, while the bear put break-even subtracts it from the long
higher strike.

The interface shows missing expected move as unavailable rather than inventing
a volatility input. It does not calculate or imply live fair value,
pre-expiration value, probability, IV, Greeks, buying power, taxes, exercise or
assignment outcomes, dividend risk, or broker margin. Calculations remain local
until the owner explicitly saves a snapshot. Saving stores the raw assumptions
and engine version, not a broker order or recommendation.

### Applied saved-snapshot boundary

`option_illustrations` and `option_illustration_legs` preserve an immutable
owner-scoped snapshot of the symbol, spot, expiration, optional local quote
time, pricing mode, fees, engine version, and ordered raw legs. Derived payoff
metrics and chart samples are intentionally not persisted. The server
reconstructs the input and reruns engine `1.0.0` whenever snapshots load, so
stored assumptions remain auditable and calculation logic remains centralized.

Authenticated owners can select and insert their own snapshots but cannot
update or delete them. RLS, explicit Data API grants, table constraints, and
`save_option_illustration` validate the persistence boundary. A saved snapshot
may prefill a journal plan with its symbol, direction, strategy, maximum loss,
entry capital, and estimated fees. `trade_option_illustration_sources` retains
the exact immutable source after journal creation.

Reviews and active Watchlist items may also launch Strategy Lab with a
server-validated candidate source. The symbol is prefilled and locked to that
source, and the initial long-call or long-put direction follows the scanner
side. The owner still selects the actual contract, quote, expiration, quantity,
and fees.

When the owner explicitly saves the illustration,
`save_sourced_option_illustration` atomically saves its raw assumptions and an
`option_illustration_sources` row containing the exact import batch, direction,
ticker, physical source row, optional watchlist item, and optional exact
`manual_evidence_assessments` snapshot. URL and hidden-form values are
untrusted requests: both the server action and database function revalidate
that the candidate is still current and owner-scoped before insertion. Setup
Alignment remains a rules-matched evidence snapshot, not confidence,
probability, or a recommendation.

### Applied comparison slice

The user may place up to four calculated illustrations in an in-memory
comparison set. Every item must use the same normalized symbol, entered spot
price, and expiration so the displayed payoff shapes share a meaningful
baseline. Strategy, strikes, quantity, pricing assumption, premiums, and fees
may differ.

The comparison uses a shared underlying-price axis and includes each exact
strike, break-even, and the entered spot in its payoff samples. It displays
each structure's legs, pricing mode, optional quote time, net debit, estimated
entry capital, maximum loss, maximum profit, break-even, and finite
risk/reward ratio. It does not rank, score, recommend, or estimate probability
for any structure.

The comparison set itself remains local to the open page and is not restored
after navigation. Individual illustrations may be explicitly saved outside the
comparison set and continued into the journal. Neither action submits to a
broker.

Credit spreads, iron condors, and calendars remain deferred. Their assignment,
collateral, multi-expiry, and pre-expiration behavior require dedicated tests
and disclosures before UI support.
