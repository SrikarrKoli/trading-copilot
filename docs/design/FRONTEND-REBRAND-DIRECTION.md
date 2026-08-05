# Frontend Rebrand Direction

**Status:** Approved August 5, 2026 — implementation in progress  
**Prepared:** August 5, 2026  
**Approved name:** Setup Lens

## 1. Executive direction

The product should be positioned as an **evidence-first market-scanning workspace**, not a broker, automated adviser, or general-purpose trading terminal.

Its primary promise is:

> Turn today's scanner list into a traceable, prioritized research queue.

The redesign should concentrate the experience around one canonical daily workflow: import the current Thinkorswim scanner results, inspect the evidence, rank complete setups, review candidates, and deliberately save only what is worth retaining. Schwab will become a read-only market-data source when its API contract is available. Order entry and execution remain outside this application.

The recommended visual direction takes Novali's discipline—not its code, assets, claims, or identity—and adapts it into an original product system:

- Warm, light-first editorial surfaces for orientation and public pages
- A controlled dark workspace for dense market analysis
- Strong typography, thin rules, precise alignment, and squared layouts
- Real product screens as the primary visual evidence
- One restrained brand accent that is not reused as a market-direction color
- Minimal motion and no decorative financial animation
- Fewer destinations, fewer repeated cards, and a clearer hierarchy

The approved naming direction is **Setup Lens**, still subject to formal legal and domain clearance before any public commercial launch.

## 2. Actual product audit

### What exists today

The application is a private, owner-operated Next.js workspace backed by Supabase. Its working capabilities are:

- Thinkorswim `.xlsx` scanner import
- Daily bullish and bearish candidate lists
- Manual evidence entry against a ten-rule setup framework
- Deterministic ranking of candidates with complete evidence
- Candidate reviews
- Persistent watchlists and watchlist provenance
- Deliberately saved scan snapshots
- Manual trading journal entries
- Manual options payoff modeling
- Passwordless owner sign-in

The current database has 18 public tables with row-level security enabled. At audit time it contained 23 imported candidates across older import batches, plus saved review and watchlist records. The current-day application correctly showed no candidates because no import existed for the current Chicago trading date.

### What does not exist today

The repository does not currently contain:

- Schwab OAuth credentials or an active Schwab market-data call
- Brokerage account, balance, order, position, or execution functionality
- Real-time or delayed bid/ask data
- Level II or market-depth data
- Historical price series suitable for charts
- Options-chain ingestion
- Alerts or automated trade signals
- Backtesting
- A model-backed AI analysis call

This distinction is essential. The redesigned interface must not visually imply that unavailable capabilities are live.

### Current scanner observation contract

The normalized observation contract presently supports:

- Symbol and source
- Observation timestamp
- Price
- Market capitalization
- EMA 20 and EMA 50
- MACD signal
- RSI
- ATR percentage
- ADX
- Average volume
- Twenty-day high and low

It does **not** support instrument name, absolute or percentage price change, bid, ask, market session, market status, quote freshness classification, order-book levels, or historical series.

### Current interface diagnosis

The existing shell is functional but communicates a generic prototype rather than a credible market product:

- Eight destinations have equal visual weight even though the daily scanner flow is the dominant job.
- Overview, imports, evidence, reviews, and scans divide one workflow across separate pages.
- Large headings compete with the data instead of establishing a compact operating hierarchy.
- Rounded panels repeat at every level, making navigation, actions, summaries, and evidence feel equally important.
- The dark green palette, grid background, radial glow, and entry animation read as decorative rather than analytical.
- Dense forms use small labels and long vertical runs without progressive disclosure.
- Mobile navigation overflows horizontally and hides later destinations.
- Data-source and freshness language is not consistently attached to the values it qualifies.
- Empty states often consume more attention than active work.

### Existing journeys

#### Daily scanner review

1. Open Overview.
2. Navigate to Imports.
3. Upload a Thinkorswim scanner export.
4. Navigate to Evidence.
5. Enter or import the ten-rule evidence.
6. Navigate to Strategy Lab to see completed candidates ranked.
7. Navigate to Reviews to disposition a candidate.
8. Save selected candidates to a watchlist or saved scan.

The logical journey is sound; the page switching is not.

#### Persistent research

1. Save a candidate to a watchlist or snapshot.
2. Revisit the saved context after the daily scanner list changes.
3. Add manual research or a journal entry.

This is the correct retention model: the current scanner universe refreshes daily, while only deliberate saves persist.

#### Data-source readiness

1. Work from manual Thinkorswim imports today.
2. Show Schwab as pending—not disconnected or live—until OAuth and field contracts exist.
3. Enrich the same canonical observation model when the Schwab connection is available.

## 3. Reference analysis

### Novali: what to adapt

[Novali](https://www.framer.com/community/marketplace/templates/novali/) is the dominant marketing reference. Approximately 70–80% of the public-site art direction should come from these principles:

- A restrained ivory, black, and neutral canvas
- An editorial headline scale with short line lengths
- Thin borders, visible structural grids, and exact alignment
- Large product screenshots that provide evidence instead of illustration
- Alternating light and dark bands with deliberate pacing
- Minimal navigation and one primary action per section
- Compact, credible trading language
- Feature grids built from shared rules rather than detached floating cards
- Generous whitespace around marketing content
- A small accent color applied to focus points, not decoration

The product must remain original. Do not copy Novali's layouts pixel-for-pixel, import its code, reproduce its imagery, or inherit unsupported claims.

### What not to adapt

- Fictional live activity, transaction counts, or market sentiment
- Invented customer logos, testimonials, or performance outcomes
- Execution-oriented calls to action such as “Start trading”
- Claims about wallets, order books, or global coverage
- Constant looping motion
- Marketing sections that exist only because the template contains them

### Order Book decision

The referenced [Order Book component](https://www.framer.com/community/marketplace/components/order-book/) is a visual depth ladder and explicitly expects a real exchange feed to replace its simulator. It is **not suitable for the current product**.

| Requirement | Current application | Decision |
| --- | --- | --- |
| Multiple bid levels | Unavailable | Do not render |
| Multiple ask levels | Unavailable | Do not render |
| Per-level size | Unavailable | Do not render |
| Subscription/update behavior | Undefined | Do not imply streaming |
| Real-time/delayed classification | Undefined | Do not label as live |

No order-book interface should be designed or implemented until a verified provider contract supplies genuine levels, sizes, timestamps, entitlements, and subscription behavior.

### Dashboard Price Widget decision

The [Dashboard Price Widget](https://www.framer.com/community/marketplace/components/dashboardpricewidget/) can inform alignment and density, but not its animated counting or profit framing.

The current product can truthfully show only:

- Symbol
- Observation price, when present
- Source
- Observation timestamp

The component contract may later accept price change, bid, ask, session, market status, and freshness **only after those fields are supplied and normalized**. Missing values must display as “Unavailable” or an em dash—not zero. A sparkline remains prohibited until an accurate time series exists.

### Typewriter decision

Omit the [Typewriter Effect](https://www.framer.com/community/marketplace/components/typewriter-effect/). A looping typing/deleting treatment weakens the institutional tone and adds motion without helping the user understand the product. The hero should use a stable, specific promise.

## 4. Brand platform

### Category

Evidence-first market scanning and setup-review workspace.

### Audience

Active, self-directed traders who already use a scanner and want a more disciplined way to inspect, compare, and retain candidate setups.

### Product promise

Prioritize today's scanner results with transparent evidence and clear data provenance.

### Brand principles

1. **Precision** — exact labels, aligned numbers, deliberate spacing.
2. **Provenance** — every market observation identifies its source and time.
3. **Control** — the trader decides what is reviewed, saved, and acted on.
4. **Restraint** — no invented urgency, signals, certainty, or market theater.
5. **Traceability** — every ranking should be inspectable down to the underlying rule evidence.

### Personality

Calm, exacting, technical, candid, and quietly confident. Never breathless, gamified, or promotional.

### Language system

Prefer:

- “Ranked by setup alignment”
- “Evidence complete”
- “Observed at 09:42 CT”
- “Manual observation”
- “Schwab connection pending”
- “Review candidate”
- “Save snapshot”
- “Unavailable from this source”

Avoid:

- “Best stocks to buy”
- “High-confidence winner”
- “AI pick”
- “Live” without a live entitlement and fresh timestamp
- “Guaranteed,” “optimal,” or “safe”
- “Execute,” “fill,” or “position” when the app does not perform those actions

## 5. Naming landscape

These are exploratory directions, not availability claims.

### Clear and descriptive

| Name | Initial reading |
| --- | --- |
| Setup Lens | Clear view into setup quality and evidence |
| Scanner Desk | A working surface for a daily scanner queue; quite descriptive |
| Market Lens | Broad and expandable, but highly generic |
| Setup Radar | Direct discovery metaphor; familiar category language |
| Opportunity Grid | Communicates comparison, but can sound advisory |

### Technical and analytical

| Name | Initial reading |
| --- | --- |
| Pattern Desk | Serious analytical workspace with broad expansion potential |
| Signal Frame | A structured way to evaluate market signals |
| Vector Scope | Precise and technical, though slightly abstract |
| Signal Matrix | Strong analytical tone; crowded technical phrasing |
| Evidence Grid | Truthful to the product, but an existing AI product uses the phrase |

### Premium and institutional

| Name | Initial reading |
| --- | --- |
| Market Aperture | Strong visual metaphor; “Aperture” is crowded in finance |
| Meridian Grid | Premium and geographic; an existing infrastructure company uses it |
| Northline Intelligence | Credible but long and consultancy-like |
| Keystone Market Intelligence | Institutional, but too formal for the daily product |
| Axiom Desk | Concise and premium; “Axiom” is heavily used in financial services |

### Short invented brands

| Name | Initial reading |
| --- | --- |
| Scanvera | Smooth pronunciation and scanner association; needs explanation |
| Focentra | Focus and center; broad but semantically soft |
| Veytrix | Technical and ownable in tone; pronunciation ambiguity |
| Spectalis | Visibility and spectrum; sounds more scientific than financial |
| Oriven | Compact and flexible; conveys little without brand investment |

### Scanning, visibility, and discovery

| Name | Initial reading |
| --- | --- |
| Ticker Lens | Specific and memorable; conflicts with an existing browser extension |
| Scanline | Excellent visual potential, but commercially crowded |
| Market Beacon | Discovery metaphor; broad and somewhat generic |
| Signal Field | Communicates a field of opportunities without promising advice |
| Scanfield | Compact, visually strong, and expandable; an unrelated design brand exists |

## 6. Shortlist and recommendation

The following evaluation is a preliminary product and web screen, not a trademark opinion. It does not replace a USPTO search, common-law search, attorney review, or registrar confirmation.

| Candidate | Meaning and product fit | Memorability and pronunciation | Visual potential | Expansion and category risk | Provisional availability concern | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Setup Lens** | Directly describes inspecting a setup through its evidence; closely matches the current product | Easy to say, spell, and recall | Aperture, focus brackets, or one detected point within noise | Extends to any data provider; does not sound like a broker or advice service; moderately descriptive | `setuplens.com` appears registered; `setuplens.app` did not return an RDAP registration in the audit snapshot; formal trademark clearance still required | **Recommended** |
| **Pattern Desk** | Frames the app as a serious pattern-review workspace | Clear and professional | Modular desk/grid system, framed pattern mark | Broad enough for research and strategy; low advice risk; “desk” is common in fintech | `patterndesk.com` appears registered; `usepatterndesk.com` did not return an RDAP registration; no obvious exact financial product surfaced in a basic web screen | Strong runner-up |
| **Signal Frame** | Emphasizes structured evaluation rather than raw alerts | Short and easy to pronounce | Signal captured inside a precise frame | Expandable beyond Schwab; “signal” may imply recommendations if copy is careless | `signalframe.com` and `getsignalframe.com` appear registered; technical phrase is commercially broad | Strong product name, weaker availability |
| **Market Aperture** | Suggests a focused opening into market activity | Distinctive but longer | Strongest lens/aperture identity system | Premium and expandable; does not sound like a broker, but “Aperture” is crowded in finance and investment | `marketaperture.com` appears registered; `usemarketaperture.com` did not return an RDAP registration; finance-name confusion risk is elevated | Visually excellent, legally riskier |
| **Scanfield** | A field of scanned opportunities; compact and product-like | Easy to say, though its meaning is less immediate | Grid with a single detected point or sweep | Extends well; low advice/broker risk; requires a descriptor at launch | `scanfield.com` appears registered; `scanfield.app` did not return an RDAP registration; an unrelated design brand uses the name | Ownable tone, moderate confusion risk |

### Recommended direction: Setup Lens

Why it leads:

- It describes the product's real job without claiming to predict outcomes.
- It keeps the trader—not the software—in control of the decision.
- It supports a distinctive focus/aperture identity without using a generic upward arrow.
- It can expand from Thinkorswim imports to Schwab and other data sources.
- It works equally well for a public product story and a compact application masthead.

Provisional descriptor:

> Setup Lens — Evidence-first market scanning

Provisional line:

> See the setup. Trace the evidence.

The user approved Setup Lens on August 5, 2026. Repository implementation may use the name; formal clearance remains required before a public commercial launch.

## 7. Logo direction after naming approval

Do not finalize or deploy a logo before the name is selected.

For Setup Lens, the recommended mark is a **precision aperture crossed by a three-point price path, with one point resolved into focus**. The form should work as:

- A one-color wordmark companion
- A 16 px browser icon
- A 32 px application icon
- A 180 px touch icon
- A 512 px installation icon
- A reversed mark on dark surfaces

The mark should be drawn from simple geometry, remain legible without gradients, and avoid suggesting guaranteed upward movement.

Avoid upward arrows, dollar signs, bulls, bears, rockets, coins, lightning, candlestick-logo clichés, Schwab blue, and thinkorswim green.

## 8. Visual design system

### Color

#### Light editorial mode

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F3F1EA` | Public pages and orientation surfaces |
| Surface | `#FCFBF7` | Primary content plane |
| Ink | `#111312` | Headlines and high-emphasis text |
| Muted ink | `#626763` | Supporting copy |
| Rule | `#D7D8D2` | Dividers and structural grids |
| Brand accent | `#3157D5` | Focus, links, and primary actions only |

#### Dark workspace mode

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#0C0E0E` | Scanner workspace |
| Surface | `#131615` | Tables and primary panels |
| Raised surface | `#191D1B` | Menus and drawers |
| Ink | `#F4F3EE` | High-emphasis content |
| Muted ink | `#A2A8A3` | Secondary labels |
| Rule | `#2C312F` | Dividers and boundaries |
| Brand accent | `#819BFF` | Focus and selection only |

#### Financial semantics

- Positive: `#15865B`, plus sign, and “Positive” or equivalent context
- Negative: `#C24A4A`, minus sign, and “Negative” or equivalent context
- Caution/stale: `#A87921`, clock or warning symbol, and an explicit label
- Neutral/unavailable: neutral ink plus “Unavailable” or an em dash

Brand blue must not communicate price direction. No state may rely on color alone.

### Typography

- Use a disciplined sans-serif system for both marketing and product UI.
- Retain Geist Sans and Geist Mono initially to avoid a decorative font migration before layout is stable.
- Use tabular numerals for all prices, percentages, counts, timestamps, and rule scores.
- Marketing display: 64–96 px desktop, short line length, tightly controlled leading.
- Application page title: 32–48 px desktop; never compete with the current market data.
- Body: 16–18 px marketing, 14–16 px workspace.
- Microcopy: 12 px minimum, reserved for metadata.
- Uppercase tracking is limited to compact section labels and table headers.

### Spacing and geometry

- Base unit: 4 px.
- Common spacing: 8, 12, 16, 24, 32, 48, 64, 96 px.
- Marketing content maximum: 1440 px; reading width: 680–760 px.
- Workspace density is compact but never below 44 px for primary touch targets.
- Panel radius: 8 px maximum; input/button radius: 6 px; feature grids may be square.
- Shadows are reserved for temporary layers such as menus and dialogs.
- One-pixel rules define structure; nested container outlines are avoided.
- The decorative background grid and radial glow should be removed from the application shell.

### Motion

- Interaction response: 120 ms.
- Small transitions: 180 ms.
- Drawers/dialogs: 240 ms maximum.
- Use transform and opacity only when possible.
- Do not animate prices by counting, flashing, or changing width.
- Use stable numeric columns and reserved widths to prevent layout shift.
- Public-page reveal motion may run once and must preserve the complete static composition.
- Respect `prefers-reduced-motion` and provide an equivalent immediate state.
- Do not use the typewriter effect.

## 9. Information architecture

### Recommended primary navigation

1. **Scanner** — canonical daily universe, evidence, ranking, and reviews
2. **Watchlists** — deliberately retained candidates
3. **Journal** — deliberate post-trade records
4. **Strategy** — setup rules and payoff analysis

Secondary navigation:

- Saved scans
- Data connections
- Import history and diagnostics
- Account and sign out

### Route consolidation map

| Current route | New home |
| --- | --- |
| Overview | Scanner summary header |
| Scans | Scanner universe |
| Imports | Scanner import action and import drawer |
| Evidence | Candidate detail/evidence panel |
| Reviews | Scanner review queue and candidate detail |
| Watchlists | Watchlists |
| Journal | Journal |
| Strategy Lab | Strategy |

### Canonical workflow

```text
Thinkorswim import
        ↓
Today's candidate universe
        ↓
Manual or future Schwab enrichment
        ↓
Evidence completeness gate
        ↓
Deterministic ranking
        ↓
Trader review
        ↓
Deliberate save: watchlist, snapshot, or journal
```

This is a research workflow. It does not continue to order execution.

## 10. Scanner workspace concept

### Desktop

#### Workspace header

- Current Chicago trading date
- Source status: Thinkorswim import / Schwab pending / Schwab connected
- Last successful observation time
- Import or refresh action
- Data freshness label

#### Candidate universe

One structured table—not a wall of cards—with:

- Rank
- Symbol
- Bullish/bearish direction
- Setup alignment score
- Evidence completion
- Observation price when available
- Observation source and time
- Review state
- Saved state

Filters should include direction, evidence status, review status, and saved state. Sorting must be explicit and reversible.

#### Candidate detail

A stable side panel or split view contains:

- Market observation summary
- Ten-rule evidence breakdown
- Missing evidence
- Data provenance
- Review controls
- Watchlist and snapshot actions

The selected row and panel must remain linked through an accessible name and focus behavior.

### Mobile

- Four-item bottom or top-level navigation with no horizontal scrolling
- Scanner table becomes a compact ranked list, not a squeezed desktop table
- Candidate evidence opens as a full-height detail view
- Import action remains available but does not dominate the daily review state
- Source and freshness remain visible near the current observation

## 11. Component truth contracts

### Market price summary

| Field | Rendering rule |
| --- | --- |
| Symbol | Required; never substituted by company name |
| Instrument name | Render only when supplied by a verified source |
| Last/observation price | Fixed-width tabular numerals; preserve reported precision |
| Change / percent change | Render only if a valid comparison value exists |
| Bid / ask | Render only from genuine quote fields; never derive from last price |
| Session / market status | Render only from an explicit normalized field |
| Timestamp | Always attached to the observation |
| Freshness | “Real-time,” “Delayed,” “Stale,” or “Manual” only when known |
| Sparkline | Render only from a valid ordered historical series |

Loading reserves the eventual field width. Unavailable values use an em dash with an accessible “Unavailable” label. Zero is rendered only when zero is the actual source value.

### Evidence alignment

- Show the numerator and denominator, such as `8 / 10`, alongside a text label.
- Make missing rules visible rather than averaging them away.
- Separate “incomplete” from “low alignment.”
- Let the user inspect every rule contributing to a rank.
- Do not call the result a probability or confidence score.

### Data-source status

- **Manual observation** — source file or user entry, with time
- **Pending connection** — configuration is incomplete and no data is expected
- **Connected, no observation** — connection works but no value is available
- **Delayed** — provider reports delayed data
- **Stale** — the observation exceeds the product's defined freshness threshold
- **Unavailable** — the field is not present in the source contract
- **Error** — the last request failed, with a recoverable next action

### State matrix

| State | User-facing treatment |
| --- | --- |
| Loading | Stable skeleton structure; no fake numbers |
| Empty today | Explain that today's universe has not been imported; one import action |
| Partial evidence | Identify exactly what is missing; do not rank as complete |
| Stale | Show source timestamp and stale label adjacent to affected values |
| Disconnected | Explain whether credentials, authorization, or provider availability is responsible |
| Rate limited | Preserve the last valid observation, label its age, and state retry behavior |
| Unsupported | Say the source does not supply this field; do not show a broken control |
| Error | Plain-language cause when known, retry path, and diagnostic reference without secrets |

## 12. Accessibility standard

The redesign target is WCAG 2.2 AA.

- Add a skip link and semantic landmarks.
- Preserve a logical heading order even in visually modular layouts.
- Provide visible keyboard focus with at least a two-pixel effective indicator.
- Use native tables for genuinely tabular candidate data and accessible list patterns on mobile.
- Give every icon-only control an accessible name and persistent tooltip.
- Make bullish/bearish, positive/negative, stale/fresh, and selected/unselected states understandable without color.
- Maintain stable reading and focus order when opening candidate detail.
- Use polite live regions only for meaningful import or connection-status changes—not price ticks.
- Avoid automatic focus movement after background refreshes.
- Support 200% zoom without clipped navigation or hidden actions.
- Respect reduced motion and avoid required time-based interactions.
- Keep operational body text at 14 px or larger and primary touch targets at 44 px when space permits.

## 13. Security and data-quality guardrails

- Keep Schwab secrets and refresh tokens server-only.
- Preserve Supabase row-level security on every owner-scoped record.
- Do not expose project references, provider error payloads, or internal diagnostics in public health responses.
- Keep market-data provenance attached to normalized observations.
- Never replace missing financial data with zero, a fabricated estimate, or an optimistic status.
- Treat source file names and imported content as private workspace data.
- Preserve saved watchlists, journal entries, and scan snapshots across daily scanner refreshes.
- Keep the current manual-execution boundary explicit in product copy and controls.
- Do not expose an order-entry control unless the product scope is deliberately expanded and separately reviewed.

## 14. Public-site structure

The existing repository is primarily an authenticated product; it does not yet contain a complete public marketing site. If a public site is approved, use a separate Next.js route group and layout so editorial marketing styles do not leak into the dense workspace.

Recommended pages:

- Home
- Product
- Methodology and data provenance
- Security and privacy
- Integrations / data sources
- FAQ
- Contact
- Terms and privacy

Pricing should not be added until there is an actual commercial model. Testimonials, customer counts, performance returns, and live-data claims must not be fabricated.

The homepage should lead with a real, sanitized product screen and two truthful actions:

- Primary: **Open workspace**
- Secondary: **View methodology**

Recommended stable hero copy:

> **Turn today's scanner into a disciplined research queue.**  
> Rank complete setups, trace every rule, and keep only the opportunities worth revisiting.

## 15. Implementation phases and approval gates

### Phase A — Direction approval (approved August 5, 2026)

- Select or reject the recommended name.
- Approve the brand platform and light-editorial/dark-workspace direction.
- Approve route consolidation into Scanner, Watchlists, Journal, and Strategy.

**Gate:** Passed. The approved direction is Setup Lens, a light editorial/dark workspace system, and Scanner-first route consolidation.

### Phase B — Foundations

- Create semantic color, type, spacing, radius, border, and motion tokens.
- Build accessible primitives for buttons, inputs, tabs, data labels, empty states, dialogs, and tables.
- Add skip navigation, focus treatment, stable numeric styles, and reduced-motion behavior.
- Remove the global decorative grid/glow from the workspace.

**Gate:** Token and primitive review in light, dark, desktop, and mobile states.

### Phase C — Application shell

- Replace the eight-way rail with the four-destination hierarchy.
- Add source, freshness, account, and sign-out utilities.
- Resolve mobile navigation overflow.
- Establish app-wide loading, error, empty, and unavailable patterns.

**Gate:** Keyboard, zoom, mobile, and route-state verification.

### Phase D — Scanner vertical slice

- Consolidate Overview, Scans, Imports, Evidence, and Reviews into the canonical Scanner workspace.
- Build the ranked candidate table/list and evidence detail panel.
- Apply truth contracts for manual observation, incomplete evidence, and ranking.
- Preserve the current database model and owner-scoped behavior.

**Gate:** Verify the entire import → evidence → ranking → review → save journey with current manual data.

### Phase E — Persistent research tools

- Redesign Watchlists, Saved Scans, Journal, and Strategy around the same system.
- Keep deliberate saves persistent while the current scanner universe refreshes daily.
- Simplify long forms with grouping and progressive disclosure.

**Gate:** Verify retention, provenance, and mobile editing flows.

### Phase F — Public product story

- Build the editorial public layout and real product-screen story.
- Add methodology, data-source, privacy, FAQ, and legal structures where relevant.
- Use one controlled reveal pattern; keep the hero static.

**Gate:** Content, legal-language, performance, accessibility, and responsive review.

### Phase G — Schwab connection states

- Implement only after credentials, entitlements, endpoints, fields, and freshness rules are verified.
- Normalize supported quote fields into the product contract.
- Add explicit pending, connected, delayed, stale, rate-limited, unsupported, and error states.
- Add bid/ask or history only if the real response supplies them.

**Gate:** Contract tests against verified responses; no simulated production values.

### Phase H — Quality and release

- Visual regression review at key desktop and mobile breakpoints.
- Keyboard, screen-reader, contrast, zoom, reduced-motion, and error-state review.
- Performance and layout-shift review.
- Security and data-truth review.
- Final copy pass to remove generic claims and unsupported terminology.

## 16. Approved implementation decisions

1. Use **Setup Lens** as the product name.
2. Use a light-editorial public surface plus a dark analytical workspace.
3. Use the four-destination information architecture and Scanner consolidation.
4. Implement the authenticated Scanner workspace before the public homepage so the core product is validated before it is marketed.

These decisions authorize phased implementation while preserving all data-truth, accessibility, security, and verification gates in this document.
