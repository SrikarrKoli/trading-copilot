# Setup Lens type, control, and icon exploration

**Status:** Approved and implemented in shared application primitives  
**Prepared:** August 5, 2026

## Current implementation audit

- The application currently loads Geist and Geist Mono with `next/font/google`.
- No font files are checked into the repository.
- Application icons currently come from Lucide and vary in visual metaphor and density.
- The repository has no public marketing homepage, Schwab order entry, positions, orders, alerts, or settings workspace.
- The comparison therefore treats the homepage as a proposed public surface and the order ticket as a clearly labeled, non-functional future reference. It does not add those capabilities to the product.

## Font directions

### A — Focus Editorial (recommended)

- **Display:** Instrument Serif Regular / Italic
- **UI:** Geist
- **Financial data:** Geist Mono
- **Use:** Instrument Serif only in the public hero and occasional major editorial heading. Geist remains the entire operational interface.
- **Why:** Creates the clearest brand distinction with the smallest performance and migration cost because two of the three families already exist in the project.
- **License:** Instrument Serif and Geist are licensed under the SIL Open Font License 1.1.
- **Performance:** One new display family, Latin subset, two styles. Load with `next/font/google` so it is self-hosted and does not produce a browser request to Google.
- **Readability:** The display face is intended for large sizes; it must never be used in forms, tables, buttons, or market data.

### B — Research Journal

- **Display:** Newsreader
- **UI:** Inter
- **Financial data:** IBM Plex Mono
- **Use:** An editorial, research-led tone with a calmer serif and highly familiar interface sans.
- **Why:** Strong long-form readability and a credible research-publication character.
- **License:** All three are available under the SIL Open Font License 1.1.
- **Performance:** Three new families replace the two already used by the application. Variable files and a Latin subset keep the cost manageable, but it is still the heaviest migration.
- **Readability:** Inter explicitly supports tabular numbers, but financial columns remain IBM Plex Mono to preserve stable widths and a clear data voice.

### C — Technical Grid

- **Display:** Space Grotesk
- **UI:** IBM Plex Sans
- **Financial data:** IBM Plex Mono
- **Use:** A more technical, sans-only identity with less editorial contrast.
- **Why:** The most systematic family relationship and the strongest OpenType numeric feature set; Space Grotesk documents tabular figures.
- **License:** Space Grotesk and IBM Plex are available under the SIL Open Font License 1.1.
- **Performance:** Three new families, though IBM Plex Sans and Mono share a coherent family system. Use only the required 400 and 500 weights and Latin subset.
- **Readability:** Excellent for dense product interfaces, but visually closer to other technical SaaS products and therefore less distinctive than A.

## Button directions

### 1 — Signal Rail (recommended)

- Rectangular neutral button with a three-pixel Setup Lens focus rail.
- The arrow has its own aligned cell and moves two pixels on hover.
- No glow, gradient, pill shape, or looping motion.
- Use only for non-transactional primary actions such as Open workspace, Review evidence, or View methodology.

### 2 — Key Step

- A restrained interpretation of the Work Louder keycap reference.
- One shallow lower edge and a two-pixel press movement create a physical response.
- More memorable but more playful; suitable for marketing, not dense application chrome.

### 3 — Focus Bracket

- Neutral outline with small opposing focus corners and a filled arrow cell.
- Precise and technical, but slightly more decorative and less immediate than Signal Rail.

Trading controls do not inherit these expressive treatments. Buy, Sell, Cancel, and Preview remain rectangular, text-labeled, stable, and semantically colored only where necessary. Buy and Sell are never icon-only and are not distinguished by color alone.

## Recommended icon direction — Focus Grid

Create a small owned icon family with:

- A 24 × 24 grid
- 1.5 px optical stroke
- Square caps and mitered or minimally rounded joins
- No filled circular containers
- One focus motif shared with the Setup Lens mark
- Labels in navigation and for unfamiliar actions
- Familiar metaphors preserved for alerts, documents/orders, sliders/settings, and bidirectional trade

Exploration covers Scanner, Watchlist, Markets, Positions, Trade, Orders, Alerts, and Settings. Only Scanner and Watchlist correspond to current product capabilities. The remaining marks are future vocabulary and must not create new navigation destinations until those features exist.

## Reference findings

- The [Work Louder Button](https://www.framer.com/community/marketplace/components/work-louder-button/) uses a keycap-like surface, shallow physical depth, and hover/press response. Setup Lens should adapt the tactile idea, not copy the component or its assets.
- The [CMS Dual Font Text](https://www.framer.com/community/marketplace/components/cms-dual-font-text/) demonstrates phrase-level contrast. Setup Lens should use this only in a stable public hero phrase, with semantic heading markup and no word-by-word animation.
- [Instrument Serif](https://github.com/Instrument/instrument-serif), [Geist](https://github.com/vercel/geist-font), [Newsreader](https://github.com/productiontype/Newsreader), [Inter](https://github.com/rsms/inter), [Space Grotesk](https://github.com/floriankarsten/space-grotesk), and [IBM Plex](https://github.com/IBM/plex) provide open-source license information from their primary repositories.
- [Next.js font optimization](https://nextjs.org/docs/app/getting-started/fonts) self-hosts supported Google fonts, removes runtime Google requests, supports subsets, and reduces layout shift.

## Approved direction

Approved August 5, 2026:

1. **Focus Editorial:** Instrument Serif + existing Geist + existing Geist Mono
2. **Signal Rail:** expressive non-transactional primary action
3. **Focus Grid:** owned geometric icon family

Implementation begins in shared font, button, and icon primitives and is applied to the existing overview, authentication, navigation, Scanner, Watchlists, Journal, Evidence, Import, and Strategy Lab surfaces. No public marketing route, order ticket, or future navigation destination is added under the current read-only scope.
