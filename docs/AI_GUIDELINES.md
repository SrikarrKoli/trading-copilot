# AI Guidelines

## Role

AI is a constrained explanation and synthesis layer over verified structured evidence. It is not the calculator, scanner, backtester, market-data source, or decision-maker.

## Allowed uses

- Explain deterministic indicators and score components in plain language.
- Summarize supporting and opposing evidence supplied by the system.
- Summarize sourced news and known event context.
- Compare and summarize deterministic rankings without changing their inputs or weights.
- Identify missing or stale evidence.
- Compare deterministic option-strategy outputs.
- Turn journal records into candidate patterns for statistical verification.
- Help the user formulate questions and retrospective notes.

## Prohibited uses

- Predict price direction, target, or guaranteed outcome.
- Produce buy/sell/hold or personalized allocation directives.
- Calculate RSI, Greeks, payoff, probability, P&L, or backtest metrics.
- Invent market facts, news, citations, or unavailable data.
- Convert a setup score into a probability.
- Hide disagreement, missing data, model limitations, or prompt failures.
- Submit, stage, or format a brokerage order for execution.

## Required response shape

An AI analysis should contain:

- scope and data-as-of time;
- observed trend, momentum, volume, volatility, and event context when supplied;
- evidence supporting the setup;
- counter-evidence and risks;
- a clearly labeled **Reasons I'm Wrong** section;
- missing/stale information;
- deterministic score explanation;
- historical evidence with cohort and sample size when supplied; and
- neutral questions the user may consider.

It must end without a trade directive.

## Evidence grounding

The model receives fact objects with stable IDs. Every factual sentence in structured output references one or more fact IDs. The server rejects:

- uncited factual claims;
- numeric values not present in the packet;
- altered ticker or timestamp;
- prohibited directive language; and
- fields outside the response schema.

## Confidence

Model self-confidence is never shown to the user. If the system displays confidence, it refers to a separately calculated and validated statistical quantity with method, sample, interval, and cutoff. AI may explain that quantity but not create it.

## Failure behavior

If data is missing, say so. If sources conflict, show the conflict. If the model times out or violates the schema, fall back to deterministic templates. No AI response is better than a fluent unsupported response.

## Prompt and model governance

Store:

- provider and model identifier;
- system/developer prompt version;
- response schema version;
- evidence-packet hash;
- generation timestamp;
- safety/validation result; and
- user feedback.

Re-evaluate prompt/model changes against a fixed test set before release. Test factual faithfulness, unsupported claim rate, directive language, numerical copying, conflict handling, and refusal/fallback behavior.

## Privacy and retention

Send only the minimum evidence needed. Exclude raw workbooks, secrets, account identifiers, and unrelated journal text. Disclose when journal content or market data is sent to a model provider. Define retention and deletion behavior before enabling AI.

## Example

Acceptable:

> META matched the configured bullish trend and momentum rules as of 2:30 PM CT. Relative volume was below the scanner threshold, and earnings are scheduled within the configured risk window. Setup alignment was 70/100 under score v1.2. This is a rule-match score, not a probability of profit.

Unacceptable:

> META has 91% confidence and is a strong buy.
