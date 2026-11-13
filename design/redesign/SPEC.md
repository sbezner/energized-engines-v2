# Energized Engines store redesign spec

- **For:** the build agent working on `sbezner/energized-engines-v2` (test site https://sbezner.github.io/energized-engines-v2/).
- **Prepared:** Iris (UX/visual), Thu Nov 12, 2026. This is a design deliverable only. Nothing was pushed, deployed or changed in the repo.
- **Goal:** a store that sells and becomes the best one-stop shop for Sumner lift parts. It will replace Shopify later, with Stripe checkout.
- **Rules lifted:** the old "keep live colours" rule is gone. Keep the Energized Engines logo art as-is (`docs/logo.png`, 400x152).
- **Mockups:** HTML/CSS in `mock/`, renders in `shots/`. `mock/tokens.css` is the source of truth for tokens; `mock/site.css` and `mock/pages.css` hold the component CSS. `mock/build.py` regenerates the pages.

| Shot | What it shows |
|---|---|
| `shots/mock-home-1440.png` | Home, desktop (full page) |
| `shots/mock-search-typeahead-1440.png` | Header search with typeahead open |
| `shots/mock-product-1440.png` | Product page, desktop (full page) |
| `shots/mock-cart-drawer-1440.png` | Cart drawer after add to cart |
| `shots/mock-listing-1440.png` | Model/category listing with filters, grid and list rows, card states |
| `shots/mock-checkout-1440.png` | Single-page checkout, Stripe style |
| `shots/mock-home-390.png`, `shots/mock-product-390.png` | Phone (390 px, 2x) |
| `shots/live-*.png` | Current test site at 1440 and 390 |
| `shots/bench-*.png` | Benchmark home pages at 1440 |

**Data used.** All products, prices, Sumner part numbers, photos and fitment text in the mockups come from the real EE catalog snapshot in `/workspace/ee-qa/repo-pr19/data/` (Shopify export, Sep 28, 2026). Counts (2,369 parts, 36 models, 123 EE brand parts, parts per series tag) come from the same file. Anything else is example data and is labelled in the yellow "Mockup note" strip at the bottom of each mock page. The build must not ship the mock note.

---

## 1. What makes the current test site look unprofessional

Seen in `shots/live-*.png` (loaded Nov 12, 2026, 6:03 PM CT).

1. **It isn't a store.** There's no cart, no add to cart, and no quantity. The only action on a product is "Buy on energizedengines.com". Listing cards end in a red "Details" pill, so every card has the same loud button and no buying intent.
2. **No product photos anywhere.** Product pages say "Photo coming soon" and cards have no images, even for EE brand parts that have real photos in the catalog. A parts store with no pictures reads as unfinished. (Caveat: 1,446 of the 2,168 Sumner listings have a 225x225 first image, which in all 6 I opened is the Sumner logo, so those still need a "No photo yet" tile.)
3. **Weak hierarchy on home.** A centered "Sumner Lift Parts" heading, one search box, then three equal cards (Parts, Rentals, Winch rebuilds). Parts get the same weight as side services. No products, prices, models or savings above the fold.
4. **Search is an afterthought.** The header search is a 180 px pill with "Search part numbers...", it has no typeahead, and it sits on a navy bar where it doesn't stand out. Results are cards with no image.
5. **Type.** Questrial at small sizes is thin and reads faint. Headings in Archivo are navy-on-white with no weight contrast to body. Part numbers are in browser-default Courier ("Part #: 778371"), which looks like a debugging leftover.
6. **Colour.** Heavy navy header plus red buttons plus yellow pills gives three loud colours with no neutral system. Yellow "OEM" pills are the brightest thing on the page and carry the least information.
7. **Density.** Listing cards are tall but say little: an all-caps Shopify title, a pill, "Part #", "Fits", then a two-line description that repeats the title. Three per row at 1440 with lots of dead space.
8. **Trust signals are buried.** Free shipping over $150 and free local delivery only appear in the footer text. No returns, secure checkout or phone in a utility bar. The phone and email sit in small type at the top right.
9. **Titles are raw Shopify data.** "Sumner 785985 MAST ROLLER COVER KIT, 2118" in all caps, used as the H1 at 40 px over two lines.
10. **Mobile.** At 390 the hero takes the whole first screen to show one search field and one button. The menu is a hamburger with five text links.

## 2. Benchmarks

All URLs loaded on Nov 12, 2026 around 6:05 PM CT. Grainger returned 200 to curl but 403 to headless Chrome (bot wall), so its screenshot is blank. The others rendered.

| Store | URL | Steal | Avoid |
|---|---|---|---|
| **Parts Town** (closest analogue) | https://www.partstown.com/ | 1. Search box is the visual centre of the header with "Enter keyword or Part #". 2. A "Find Equipment Manuals" picker (manufacturer, model, document type) in the header. 3. Phone number and "Search by Serial #" in the top bar. | The hero carousel with marketing slogans ("FIND IT. GET IT. FIX IT. FAST!") and a location modal on first visit. |
| **McMaster-Carr** | https://www.mcmaster.com/ | 1. Part number first: the part number is the link and the label. 2. Dense, calm list rows with a spec table and a price per row. 3. Nearly instant pages, no hero, no imagery for decoration. | The almost unbranded look. EE needs to feel like a store with a brand, not a catalogue PDF. |
| **FCP Euro** | https://www.fcpeuro.com/ | 1. A thin trust bar under the header: "Free Shipping Over $49, Hassle-Free Returns, Lifetime Replacement". 2. "Select your vehicle" (year, make, model) as the first thing on the page, our "Select your lift". 3. Phone shown as "Talk to an expert!" next to search. | Busy photo banners and promo tiles competing with the vehicle picker. |
| **Grainger** | https://www.grainger.com/ | 1. Stock and ship-by on every result ("In stock, ships today"). 2. B2B touches: quick reorder, PO field, quantity in the result row. | Heavy mega-menus with hundreds of links. EE has about 10 categories; keep the nav short. |
| **eReplacementParts** | https://www.ereplacementparts.com/ | 1. "Search By Model or Part Number" as one box. 2. Model pages that pair the parts list with the exploded diagram. 3. Phone number in the top bar. | "Official OEM Guarantee" style claims. EE must not claim official or authorized status for Sumner. |

## 3. Visual direction

Clean light base, near-black ink, one strong red sampled from the logo, a condensed industrial heading face, and monospace part numbers. No gradients, no stock photos of people, no navy.

### 3.1 Colour tokens

The accent is sampled from `docs/logo.png`: the most common opaque pixel is `#EA0917`. Contrast ratios below are against the background shown, computed with the WCAG formula.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--red-500` | `#EA0917` | Logo, bolt icon, selected-column rule, large display accents only | 4.62:1 on white (use for 24 px+ or non-text only) |
| `--red-600` | `#D10812` | Primary buttons (white text), search button, cart count | white on it 5.59:1 |
| `--red-700` | `#B00610` | Hover on primary, red text links, "See all" links | 7.29:1 on white |
| `--red-800` | `#9F0510` | Test banner background | white on it 8.39:1 |
| `--red-50` | `#FDE8E9` | Light red tint (rare) | |
| `--ink` | `#14171C` | Body text, dark buttons, selected chips | 17.96:1 on white |
| `--ink-2` | `#4A525D` | Secondary text, labels | 7.91:1 |
| `--muted` | `#6B737E` | Captions, meta, placeholder | 4.8:1 |
| `--line` | `#E2E5E9` | Hairlines, card borders | |
| `--line-strong` | `#CDD2D8` | Input borders, hover borders | |
| `--bg` | `#F5F6F8` | Page background | |
| `--surface` | `#FFFFFF` | Cards, header, panels | |
| `--charcoal` | `#1C2026` | Utility bar, EE brand band, footer | |
| `--charcoal-2` | `#2A2F37` | Cards on charcoal | |
| `--on-dark-2` | `#B8BEC6` | Secondary text on charcoal | 9.6:1 on `#14171C` |
| `--ok` / `--ok-bg` | `#147A3A` / `#E6F4EC` | In stock, fitment verified | 4.78:1 on its bg |
| `--low` / `--low-bg` | `#9A4A00` / `#FFF3DF` | Low stock ("Only 2 left"), "Fitment not yet verified" | 5.71:1 |
| `--back` / `--back-bg` | `#1B56B0` / `#E8F0FC` | Backorder, Diagram badge, manual links | 6.09:1 |
| `--out` / `--out-bg` | `#4A525D` / `#EEF0F2` | Out of stock | |
| `--sale` / `--sale-bg` | `#B00610` / `#FDE8E9` | Save %, sale price. On images and on charcoal, use the solid version: white on `--red-600` | |
| `--focus` | `#1B56B0` | Focus ring (blue so it never reads as an error) | |

Rules: red is for actions and savings only. Never use red for body text or for stock states. One primary (red) button per view; secondary buttons are white with a 1.5 px ink border; tertiary actions are ink-filled (search, quick add).

### 3.2 Type

Load from Google Fonts: `Inter:wght@400;500;600;700`, `Barlow Condensed:wght@600;700`, `JetBrains Mono:wght@500;600`.

- **UI and body:** Inter, 16 px base, line-height 1.5. Prices use Inter 700 with `font-variant-numeric: tabular-nums`.
- **Headings:** Barlow Condensed 700, line-height 1.05, letter-spacing 0.01em. H1 on home and product pages is uppercase.
- **Part numbers:** JetBrains Mono 500 everywhere a part number appears (cards, typeahead, product page, cart, compare table). On the product page, the part number sits in a chip: bg `--bg`, 1 px `--line` border, radius 4 px, padding 2 px 8 px.
- **Eyebrows:** Inter 600, 12 px, uppercase, letter-spacing 0.08em, `--muted`.

| Token | rem / px | Used for |
|---|---|---|
| `--fs-56` | 3.5 / 56 | Home hero H1 (desktop) |
| `--fs-40` | 2.5 / 40 | Page H1, product title, product price; hero H1 at 390 |
| `--fs-32` | 2 / 32 | Section H2; product title and price at 390 |
| `--fs-24` | 1.5 / 24 | Model tile title, drawer title, H2 at 390 |
| `--fs-20` | 1.25 / 20 | H3, card price |
| `--fs-18` | 1.125 / 18 | Lede, list-row price |
| `--fs-16` | 1 / 16 | Body, inputs, buttons |
| `--fs-14` | .875 / 14 | Card names, nav, table cells |
| `--fs-13` | .8125 / 13 | Meta, part numbers on cards, labels |
| `--fs-12` | .75 / 12 | Badges, eyebrows, legal |

### 3.3 Spacing, shape, layout

- **Spacing scale (4 px base):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 (`--s-1` to `--s-20`). Section padding 48 px desktop, 32 px at 390. Card gap 16 px desktop, 12 px tablet and phone.
- **Radii:** 4 px (badges, small chips, checkboxes), 6 px (buttons, inputs), 10 px (cards, panels, drawer items), 999 px (pills: fitment chips and the fitment flag only).
- **Shadows:** `--sh-1` `0 1px 2px rgba(20,23,28,.06), 0 1px 1px rgba(20,23,28,.04)` for resting panels; `--sh-2` `0 4px 12px rgba(20,23,28,.08), 0 1px 3px rgba(20,23,28,.06)` for card hover and the finder; `--sh-3` `0 12px 32px rgba(20,23,28,.16), 0 2px 6px rgba(20,23,28,.08)` for typeahead and drawer.
- **Max width** 1320 px content, gutter 24 px (16 px under 640 px). Checkout max width 1120 px.
- **Grid:** 12 columns. Home hero 7/5. Product page 7/5 (gallery/buy box). Listing 260 px filter rail + fluid grid of 4 cards. Checkout 7/5.
- **Breakpoints:** base 0 to 639 (phone, designed at 390), 640 to 959 (tablet: 2-column cards, single column layouts), 960 to 1199 (small desktop), 1200+ (desktop, designed at 1440).
- **Buttons:** 48 px tall default, 40 px small, 56 px for the checkout Pay button. Padding 0 24 px (0 16 px small). Inter 600 16 px.
- **Inputs and selects:** 48 px tall, 1.5 px `--line-strong` border, radius 6 px, padding 0 14 px. Label above: Inter 600 13 px `--ink-2`, 6 px gap.

## 4. Header

Order top to bottom, every page:

1. **Test banner** (see section 13). 6 px vertical padding, Inter 600 13 px, white on `--red-800`, centred.
2. **Utility bar**, 36 px, `--charcoal`, Inter 13 px `--on-dark-2`, key words in white 600. Left: "Free ground shipping on orders over $150, Lower 48" and "Free local delivery within 10 miles of Jersey Village, TX". Right: "30-day returns on unused parts" and "Call or text 832-444-5426". 14 px line icons. Hidden under 640 px (the same facts move into the trust bar and product page).
3. **Main header**, 72 px, white, 1 px bottom border, `position: sticky; top: 0`.
   - Logo left, 44 px tall.
   - Search in the middle, flex 1, max 720 px. 48 px tall, 2 px `--ink` border, radius 6 px. Placeholder exactly **"Search part number, model or keyword"**. Search button 56 px wide, `--red-600`, white 22 px magnifier.
   - Right: "Questions? Call or text" (13 px) over **832-444-5426** (16 px, 600, tabular), then the cart icon (26 px) with a count badge (20 px circle, `--red-600`, white 11 px 700, 2 px white ring).
4. **Category nav**, 48 px, white, 1 px bottom border. First item is a dark button "Shop by lift model" (ink fill, white, 36 px, grid icon, chevron) that opens a mega panel: series in columns, each listing its models with part counts. Then plain links: Series 2000, Series 2100, Series 2400, Roust-A-Bout, Eventer, Gantry. Right side: "Manuals and diagrams" and "EE brand parts" (red-700). Max 8 links, `white-space: nowrap`.

**Typeahead** (`shots/mock-search-typeahead-1440.png`):
- Opens after 2 characters, debounce 120 ms, runs on the client from `search-data.json`.
- Panel: 6 px below the field, full field width, white, 1 px `--line-strong`, radius 10 px, `--sh-3`.
- Group "Parts": up to 5 rows. Each row is a 48 px thumbnail, name (Inter 500 14 px), part number line in mono 13 px ("EE 1021 · replaces 779002") and price right-aligned (700, tabular). The matched characters get `<mark>` with bg `#FFF1A8`.
- Group "Lift models": chips for matching series or models.
- Footer row: "See all N results for "query"" in red-700 600.
- Arrow keys move the highlight (bg `--bg`), Enter opens it, Esc closes. ARIA combobox pattern.
- Match order: exact part number, then Sumner part number an EE part replaces, then model, then title words. Searching "779002" must return both EE 1021 and Sumner 779002.

**Mobile header (under 640 px):** row 1 is 56 px: hamburger (44x44), logo 32 px tall, then call icon and cart icon (44x44 each). Row 2 is the full-width search, 44 px tall, always visible (it scrolls away with the page but row 1 stays sticky; tapping the search icon in row 1 after scrolling brings it back). Category nav and utility bar are hidden; the hamburger drawer holds Shop by lift model (accordion by series), Manuals and diagrams, EE brand parts, Shipping, Returns, Contact.

## 5. Home

See `shots/mock-home-1440.png` and `shots/mock-home-390.png`.

1. **Hero: "Find parts for your lift".** White with a 32 px grid of `--line` hairlines (CSS background, no photo).
   - Left (7 cols): eyebrow "Sumner lift parts · OEM and EE brand", H1 "FIND PARTS FOR YOUR LIFT" (Barlow 56 px), lede "Pick your Sumner series and model to see every part that fits it, or search by part number." (18 px, `--ink-2`).
   - Finder card (white, 1 px `--line-strong`, radius 10, `--sh-2`, padding 20): Series select, Model select (filtered by series), red button "Show parts for {model}". An "OR" divider. Then a part-number field (placeholder in mono "e.g. 779002") with a dark "Search" button.
   - Stats row: "2,369 parts listed", "36 Sumner models", "123 EE brand parts" (Barlow 32 px numbers). Pull these from the build data, don't hard-code.
   - Right (5 cols): "Not sure of your model? It's on the plate on the mast" helper card with an SVG ID plate (model field outlined in red) and a link to a help page. Hidden at 390.
2. **Shop by lift model.** 4x2 grid of text tiles (no images): series name in Barlow 24 px uppercase, models in mono 13 px, part count and a red chevron at the bottom. 3 px ink top border that turns `--red-500` on hover. Min height 148 px. 2 columns at 390.
3. **Popular parts.** 8 product cards, 4 per row (2 at 390). Ranking needs sales data; until it exists, use a hand-picked list of wear parts.
4. **EE brand band.** Full-width `--charcoal`. Eyebrow "EE brand", H2 "Our own replacement parts, priced below the Sumner part", one plain sentence, link "Shop all 123 EE brand parts". 4 compare tiles: photo (4:3), "EE 2019 · replaces Sumner 785991", name, then a two-column price block: "EE brand $85.00" and "Sumner part ~~$387.00~~", and a solid red "Save 78%" badge. Save % = round((Sumner price - EE price) / Sumner price x 100), computed from the two live listings. At 390 the tiles become a horizontal scroll-snap row (72% width each).
5. **Trust bar.** White band, 4 columns, red-600 28 px line icons: "Free ground shipping over $150" (Lower 48, free local delivery within 10 miles of Jersey Village, TX), "30-day returns" (unused parts in original packaging), "Talk to a parts person" (call or text 832-444-5426 with your model and serial), "Secure checkout" (card payments handled by Stripe; we never see your card number). One column at 390.
6. **Manuals and diagrams.** Left: eyebrow, H2 "Find the part on the exploded diagram", one sentence, secondary button "Browse manuals and diagrams". Right: 2x2 list of manual rows (doc icon in `--back`, title, "Fits 2010, 2015, 2020, 2025 · PDF", chevron). Source: `notes/manual-sources.csv` (13 manuals). Link to the PDF on sumner.com and label it "Sumner PDF".
7. **Services row.** Two slim dashed-border strips: Lift rentals (Sumner 2118, 2124, 2412 and 2416, daily, weekly or monthly) and Winch rebuilds. They stay on home, but small and below the parts content.
8. **Footer** on `--charcoal`: logo, one-line description, phone and email; columns Shop, Help, Services. Legal line: "Sumner is a trademark of its owner. Sumner part numbers are shown for reference." and "Secure checkout by Stripe".

## 6. Product card

Markup in `mock/build.py` `card()`, CSS `.card` in `site.css`/`pages.css`. States are shown in `shots/mock-listing-1440.png` and on home.

- White, 1 px `--line`, radius 10. Hover: `--sh-2` and `--line-strong` border. The whole card is one link; the quick-add button is a separate button inside it.
- **Image:** square (1:1), white, `object-fit: contain`, padding 32 px top (room for badges) and 16 px sides. Top-left badges: "EE brand" (ink bg, white, red bolt) or "Sumner OEM" (white, 1 px border), then "Save 38%" (solid red, white) for EE parts with a Sumner price, then "Diagram" (`--back-bg`/`--back`) when the part is matched in `notes/diagram-map.csv`.
- **Body** (padding 16): part number line in mono 13 px `--ink-2` ("EE 1021 · replaces 779002", the "replaces" part is hidden at 390); name, Inter 600 14 px, clamp 2 lines; "Fits" plus up to 3 fitment chips (22 px pills, 12 px) (2 at 390); price row: price Inter 700 20 px plus "Sumner ~~$112.00~~" 13 px `--muted` for EE parts; footer row: stock state left, quick add right.
- **Quick add:** 40x40 ink button with a white plus (48x48 hit area on phones). Adds qty 1, opens the cart drawer.
- **Stock states** (8 px dot + 13 px 600 label):
  - In stock: `--ok`, "In stock".
  - Low stock (qty 1 to 3): `--low`, "Only 2 left".
  - Backorder: `--back`, "Backorder, ships in 2 to 3 weeks" (just "Backorder" at 390).
  - Out of stock: `--out`, "Out of stock". Quick add is replaced by a secondary "Notify me" button.
  - Sale: price in `--sale` with the struck-through old price. Only when there's a real compare-at price.
- **Name cleanup:** drop the vendor prefix and the part number from the Shopify title for display ("Sumner 779002 CASTER, STEM W/SPACER" becomes "Caster, Stem with Spacer"), and convert all-caps to title case with a small exceptions list (EE, OEM, RAB, 2 Ton, in.). Keep the raw title in the data for search.
- **No photo:** 1,446 of the 2,168 Sumner listings have a 225x225 first image, which was the Sumner logo placeholder in all 6 I opened; others use a line diagram. Detect the placeholder (225x225, about 6.5 KB) and show a neutral grey "No photo yet" tile instead; never show the Sumner logo on a card. Line diagrams are fine.

## 7. Product page

See `shots/mock-product-1440.png`, `shots/mock-product-390.png`, `shots/mock-cart-drawer-1440.png`.

- Breadcrumb: Home > Series > Category > part number (13 px, `--muted`, current item `--ink`).
- **Gallery (7 cols):** 72 px vertical thumbnails on the left (selected one has a 2 px ink border), main image square, white, contained, "1 / 2" counter bottom right. Sticky (`top: 96px`) on desktop. At 390: full-bleed main image, thumbnails in a row below, swipe between images.
- **Buy box (5 cols), top to bottom:**
  1. Badges: "EE brand" and, when matched, "Diagram: Series 2000, p. 1".
  2. Title: Barlow 700 40 px uppercase, cleaned title.
  3. Part number row: "Part number" + chip `EE 1021`, divider, "Replacement for Sumner" + chip `779002`.
  4. Price block between two hairlines: price Inter 700 40 px; to the right "Sumner 779002 is ~~$112.00~~" and a "You save $42.40 (38%)" badge.
  5. Stock and ship-by: "In stock" plus "Ships from Jersey Village, TX", then "Order in the next 3 hr 12 min and it ships Friday, Nov 13". The cutoff time needs an owner decision; use 2 PM CT on business days as the placeholder.
  6. Quantity stepper (48 px, 44 px buttons) + "Add to cart" primary button filling the row.
  7. Help line on `--bg`: "Not sure it fits? Call or text 832-444-5426 with your model and serial number. We check before it ships."
  8. **Fits these models** panel (white, 1 px `--line-strong`, radius 10): header with the fitment flag, then one row per series with chips "Fits Sumner 2010", "Fits Sumner 2015" and so on. Flag states: "Verified in Sumner manual" (`--ok` pill, when `exact_verified` has the model), "Listed for this series" (neutral, when `series_listed`), or "Fitment not yet verified" (`--low` pill) plus the sentence "Models come from the product listing and have not been checked against the Sumner manual yet. Check your model and serial number before ordering." Keep this honesty from the earlier fitment work.
  9. Mini trust list (shipping, returns, secure checkout).
- **"EE brand or Sumner OEM" compare table** (only when both exist): columns EE part (highlighted: `#FBFBFC` and a 3 px `--red-500` left rule) and Sumner part. Rows: price (with Save %), availability, what's in the box, fits, exploded diagram, warranty, and a final row with "Add EE 1021" (primary) and "View Sumner 779002" (secondary). Unknown values say "Ask us", never blank. The pairing comes from the Sumner number in the EE title ("After Market Sumner 779002"); a quick match found 45 priced pairs in the Sep 28 data, so expect at least that many.
- **Details and specs**, two columns: plain description (rewrite of the Shopify body), a manual row linking the diagram PDF, and a spec table (part number, replaces, brand, category, ships from, weight when known).
- **Often bought together:** 4 cards. Until there's order data, use same-series parts in the same category or the EE parts listed on the same diagram page.
- **Mobile sticky add to cart** (under 640 px): fixed bottom bar, white, top border and shadow, padding 10 px 16 px plus safe-area. Price (20 px) and stock state on the left, full-width red "Add to cart" on the right. Shows once the in-page button scrolls out of view. Add `padding-bottom: 80px` to the body.

## 8. Listing and search results

See `shots/mock-listing-1440.png`. Model pages, category pages and search results share this template.

- H1 "SERIES 2000 PARTS" (Barlow uppercase) plus a one-line intro with a link to the series diagram PDF.
- **Filter rail**, 260 px, sticky. Groups with a 1 px top rule: Model (with counts), Brand (EE brand / Sumner OEM), Availability (In stock), Category, Has diagram. 20 px checkboxes inside 32 px+ rows (44 px rows on touch). Counts in `--muted` tabular. Each change updates the URL query string (`?model=2025&brand=ee&stock=1`) so results can be shared.
- **Toolbar:** result count ("272 parts"), applied-filter chips (ink, white, with x) and "Clear all"; right side Sort select (Best match, Price low to high, Price high to low, Part number) and a grid/list segmented toggle (44x40 per segment).
- **Grid:** 4 cards per row at 1440, 3 at 1200, 2 under 960.
- **List view:** rows with 64 px image, part number + name + fitment chips + badges, stock, price (18 px), qty stepper, Add button. This is the McMaster-style dense view for repeat buyers.
- **Pagination:** "Show 24 more" button plus "Showing 8 of 272". No infinite scroll.
- **Phone:** filters open in a full-screen sheet from a "Filters (2)" button next to Sort; results stay 2 columns.
- **Zero results:** "No parts match "query"" plus "Call or text 832-444-5426 with the part number and we'll look it up", plus links to the model picker and manuals.

## 9. Cart and checkout

**Cart drawer** (`shots/mock-cart-drawer-1440.png`): opens from the right on add to cart, 440 px wide (100% on phones), 45% ink scrim. Header "CART (3 ITEMS)" and a close button. Green confirmation strip "Added Outrigger Caster Kit, qty 2". Line items: 64 px image, part number (mono 12 px), name, stock, qty stepper (36 px), line total. Free shipping meter: "Add $X for free ground shipping" or "You get free ground shipping. Your order is over $150." with a 6 px bar in `--ok`. Footer: subtotal, "Tax is added at checkout.", red "Check out" (lock icon), secondary "View cart", and one "Often bought with this" row.

**Cart page:** same line items in a table at full width with a 5-col order summary on the right (subtotal, shipping estimate, tax at checkout, total, Check out button, trust list).

**Checkout** (`shots/mock-checkout-1440.png`): one page, no account needed.
- Minimal header: logo, "Secure checkout" in `--ok` with a lock, phone. No nav, no search.
- Left (7 cols): numbered white panels: 1. Contact (email, opt-in checkbox); 2. Shipping (name, company optional, address, city/state/ZIP, then rate radio cards: free ground over $150, a paid faster option, free local delivery within 10 miles of Jersey Village for in-stock items); 3. Payment using the Stripe Payment Element (Card, Apple Pay, Google Pay, Bank/ACH tabs), "Card details go straight to Stripe. We never see or store your card number.", optional PO number, and a 56 px red "Pay $170.17" button.
- Right (5 cols), sticky: order summary with line items, discount code, subtotal, shipping, tax, total (24 px), trust list.
- Style the Payment Element with the Appearance API to match: `colorPrimary #D10812`, `colorText #14171C`, `colorDanger #B00610`, `fontFamily Inter`, `borderRadius 6px`, `spacingUnit 4px`, input border `#CDD2D8`.
- On the test site, the Pay button must not charge anything (Stripe test mode or no Stripe at all).

## 10. Phone rules (390 px)

- Gutter 16 px. No horizontal scroll on any page: check `document.documentElement.scrollWidth === 390` in the test script (the mockups pass this).
- Header as in section 4. The search field is always on the first screen.
- Hero: H1 40 px, the finder's Series and Model selects side by side, "Show parts" full width under them. The plate helper card is hidden.
- Model tiles 2 columns, popular parts 2 columns, EE band tiles in a scroll-snap row, trust bar 1 column.
- Product page: full-bleed gallery, title 32 px, price 32 px, sticky add-to-cart bar, compare table with `table-layout: fixed` at 13 px and buttons that wrap (the mock's last row stays inside 390).
- Cards: hide the "replaces" text and the Diagram badge on the image, max 2 fitment chips, old price on its own line.
- Every tap target is at least 44x44 px (quick add is 48x48 on phones).

## 11. Accessibility

- Text contrast is at least 4.5:1 everywhere; the pairs are in section 3.1. `--red-500` is never used for text under 24 px.
- Focus: `:focus-visible { outline: 2px solid #1B56B0; outline-offset: 2px; }` on every interactive element, never removed.
- Tap targets 44x44 px minimum; checkbox rows 44 px tall on touch.
- Stock states use a dot and a word, never colour alone.
- Search is a labelled `role="search"` form; the typeahead follows the ARIA combobox pattern.
- Cart drawer: focus moves into it on open, is trapped while open, returns to the button on close, Esc closes.
- Product images have alt text from the cleaned title. Decorative SVGs get `aria-hidden="true"`.
- Respect `prefers-reduced-motion`: no drawer slide, no hover lifts.

## 12. What to cut

- The navy header, the yellow OEM/Aftermarket pills and the Questrial/Archivo pairing.
- The "Details" button on every card. The card itself is the link.
- "Buy on energizedengines.com" as the main action. Once Stripe checkout is live, the main action is Add to cart. Until then, keep it as a secondary link only.
- The three equal service cards on home. Rentals and winch rebuilds become one slim row.
- Description excerpts on cards that repeat the title.
- The separate "Search Parts" page as a nav item. Search lives in the header; the results page still exists.
- All-caps raw Shopify titles as display text.
- "Prices may adjust occasionally due to supplier increases..." on every product page. Move it to the shipping and returns help page.

## 13. Test-site rules (must stay)

These are not optional and the build must keep them on every page:

1. **Red test banner** at the very top of every page, including checkout: white on `#9F0510`. Desktop copy: "Test site. Nothing here is for sale and no orders are taken. Shop at energizedengines.com" (link). Phone copy: "Test site. Order at energizedengines.com".
2. **`<meta name="robots" content="noindex, nofollow">`** in the head of every HTML file. This is the control that actually works, because `robots.txt` is ignored at a GitHub Pages subpath.
3. **`docs/robots.txt`** stays `User-agent: *` / `Disallow: /`.
4. **No authorized-dealer, official or partner claims for Sumner.** Never write "authorized dealer", "official Sumner parts", "Sumner partner" or similar, and never show the Sumner logo (including Shopify images that are just the logo). Use "Fits Sumner [model]", "Replacement for Sumner [part number]" or "Sumner OEM" for genuine Sumner parts. Footer legal line: "Sumner is a trademark of its owner. Sumner part numbers are shown for reference."
5. The return policy page keeps its draft notice until the owner approves it. The "30-day returns" copy in the trust bar and utility bar comes from that draft (30 days, unused parts, 20% restocking fee) and needs owner sign-off before launch.
6. No real checkout on the test site: the Pay button doesn't charge anything.

## 14. Copy rules

- Plain and human. No em dashes, no hype, no "elevate", "seamless", "unlock", "premium quality" or exclamation marks.
- Say what's true and specific: "Free ground shipping on orders over $150, Lower 48", not "Fast free shipping".
- Prices, counts and part numbers come from the catalog data. Anything placeholder must be marked as example data until the real value exists (ship-by cutoff, low-stock quantities, backorder lead times, weights, warranty).

## 15. Open items for the owner or the build agent

- **Stock quantities:** the Shopify export only has `available: true/false`. Low stock and backorder need real quantities or a manual flag per SKU.
- **Ship-by cutoff time** and the faster shipping options and rates.
- **"Popular parts" and "Often bought together"** need order history. Use the hand-picked lists until then.
- **Warranty** for EE brand vs Sumner parts.
- **Return policy** approval (draft today).
- **Photos:** 1,446 Sumner listings only have the Sumner logo placeholder and others only a line diagram. EE brand parts have real photos.
- **Diagram badges:** `notes/diagram-map.csv` has 346 rows covering 299 Sumner part numbers. The EE parts I checked aren't in it; map them through the Sumner part they replace.
