# Design

## Concept
A **ledger terminal**: a well-kept book of record that is also a command deck. Hairline
rules, tabular figures, one vivid signal rail carrying the only bold gesture on a
screen. Calm, fast, legible one-handed.

## Palette
Every colour is a token on `:root` in `src/styles/global.css`.
- `canvas` `#F7F8F6` — ground
- `surface` `#FFFFFF` — panels and rows
- `ink` `#0F1B2A` — primary text and figures
- `ink-quiet` `#5A6672` — labels, secondary text (a token, never a faded `ink`)
- `line` `#E2E6E2` — hairline rules and dividers
- `signal` `#14746F` — the one bold colour: autonomy rail, positive movement, primary action
- `signal-soft` `#E6F2F0` — signal washes
- `hold` `#B7791F` — waiting on the owner (pending approvals)
- `danger` `#A83E3E` — stop, reject, loss

## Type
- **Sora** (`--font-display`) — headings and the brand mark, heavy but tight.
- **Inter** (`--font-sans`) — all UI and body copy.
- **IBM Plex Mono** (`--font-mono`, tabular) — money, counts, timestamps, IDs. Ledger numerals.

## Layout
One frame per surface, and no page adds its own edges.
- **Gate frame** (`data-frame="gate"`) — owner sign-in and setup: one centred column max
  `28rem`, brand rail, the shared title block, one panel, no navigation. Both pages open
  identically, so the two doors read as one entrance.
- **Store frame** (`data-frame="store"`) — the public storefront, reachable without a
  login: catalog, product, service, plan and status pages. A masthead with the brand
  mark and quiet links, one centred reading column max `48rem`, the shared title block,
  a one-line footer. Its `wide` variant (`data-frame-variant`) is the marketing front:
  no title block, max `5xl`. It shares the console's palette and type on purpose, so a
  buyer recognises the seller.
- **Member frame** (`data-frame="member"`) — the referral partner's wallet: a masthead
  with the brand mark and one sign-out, one reading column, the shared title block. The
  partner never sees owner navigation.
- **Account frame** (`data-frame="account"`) — the signed-in buyer's own home: the
  masthead carries the local navigation (Pesanan saya, Katalog, Paket, Bantuan) with the
  current page marked, one centred reading column max `48rem`, the same title block as
  the store, and a one-line footer. Sign-in, sign-up and the two token pages stay on the
  store frame, because someone not yet signed in is still a visitor.
- **Console frame** (`data-frame="console"`) — every page behind the login. The
  navigation is a **left rail on ≥1024px and a fixed bottom bar with 6 tabs below it**;
  the rail sits against the window edge and the content beside it is capped at
  `72rem` and left-aligned so a wide monitor shows more of the work. The frame owns
  the page title block (eyebrow, title, one-line intent, contextual actions) — pages
  pass a title, an eyebrow and optional actions, never their own heading block.

## Spacing
Named steps only: `block` (0.75rem), `stack` (1.25rem), `section` (2.5rem),
`page` (side padding: 1rem → 1.5rem → 2rem). No one-off margins in pages.

## Signature
The **supervision rail** — a single horizontal band on the dashboard where the
autonomy boundary is drawn in one stroke: work the AI may finish alone on the left of
the divide, work that stops at the owner's desk on the right, with live counts at each
end. It is the only place the design raises its voice.

## Shared parts
- `.heading-tight`, `.eyebrow`, `.figure`, `.field`, `.nav-quiet`, `.tag-shape`,
  `.brand-mark` — the named type, input and nav treatments in `global.css`; size is
  still set with utilities at each use.
- `Panel` / `PanelHead` / `PanelBody` — any bordered block of content, its label row,
  and its padded body.
- `SourceTag` — marks demo data beside anything a demo value fills; never omit it.
- `Stat` — label + `.figure` + one line of context, in rows of two on mobile.
- `Badge` — status pills for agents, proposals, categories.
- `EmptyState` — an invitation to act, never a dead end.
- `Button` / `Field` / `Input` — the control set and labelled fields with beside-field errors.
- `SectionHead` — a block title with an optional link through; `InfoRow` — a titled
  row inside a panel body; `ChoiceChips`, `Segmented`, `SearchInput`, `CountNote` —
  list filtering and totals.
- `CopyValue` — a value to paste into another dashboard, with its copy button.
- `.chip`, `.filter-bar`, `.copy-value`, `.inset-block`, `.message-box` — the repeated
  shapes in `global.css`; reach for one before writing those classes again.

Use a component rather than new markup whenever the thing already exists here. A page
arranges components and passes props; it carries no visual classes of its own.

## Rules for new screens
- A buyer not signed in belongs to the store frame, a signed-in buyer to the account
  frame, the owner to the console frame. A page never styles its own markup.
- A figure is labelled with what it is: revenue appears only after a payment provider
  confirms it, and sample rows say "demo" wherever they appear.
- Recurring money has two surfaces that never mix: the buyer sees their own subscription
  and consent switch; the owner sees MRR, the periods and the request queue.
- The social studio is an owner surface: drafts sit beside their approval state, the
  calendar only shows scheduled days, and a post's publish state is always spelled out,
  never shown as a bare success.
- A channel's connection page (Facebook Page, Instagram Bisnis) puts status and actions
  first, then the numbered Meta guide with the copyable callback address. It never shows
  a token, and a channel reads as connected only when Meta has accepted a stored one.
- The Integrasi screen is an activation checklist: one card per service, its live state,
  the named values to supply, numbered steps; long guidance collapses behind "Cara mengisi".
