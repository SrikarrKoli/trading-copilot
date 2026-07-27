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
