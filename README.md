# Energized Engines v2 Preview Site

A static demonstration website showing an improved version of the [Energized Engines](https://energizedengines.com) Sumner lift parts catalog.

**⚠️ This is a preview/demo only, not the official store.**

## What This Demonstrates

This preview site addresses key issues identified in the September 2026 traffic and advertising analysis:

1. **Merged Duplicates**: 391 duplicate part numbers consolidated into single product entries
2. **Model Organization**: Parts grouped by Sumner lift model (2118, 2124, 2412, R-150, Eventer, etc.)
3. **Fast Search**: Client-side part number search with fuzzy matching
4. **Clean Data**: Extracted part numbers, identified model fitment, linked duplicate listings
5. **Honest Copy**: No fake "authorized" claims or self-reviews

## Site Statistics

- **Total raw products fetched**: 3,387
- **Unique products after deduplication**: 2,369
- **Duplicate part numbers merged**: 391
- **Sumner models identified**: 36
- **Data source**: Public JSON API at energizedengines.com/products.json

## Project Structure

```
.
├── docs/                    # Static site (GitHub Pages)
│   ├── index.html          # Home page
│   ├── models.html         # All models list
│   ├── search.html         # Part number search
│   ├── models/             # Individual model pages (36 pages)
│   ├── styles.css          # Styles
│   ├── script.js           # JavaScript
│   └── robots.txt          # Blocks all bots (noindex)
├── data/                   # Processed catalog data
│   ├── raw-products.json   # Fetched from live site
│   └── processed-products.json
├── notes/                  # Analysis
│   ├── duplicates.csv      # 391 duplicate part numbers
│   └── price-gaps.md       # Price comparison research
└── scripts/                # Build tooling
    ├── fetch-catalog.js    # Fetch from Shopify API
    ├── process-catalog.js  # Dedupe and extract models
    └── build-site.js       # Generate static HTML
```

## Building the Site

```bash
# 1. Fetch the catalog (read-only)
node scripts/fetch-catalog.js

# 2. Process and deduplicate
node scripts/process-catalog.js

# 3. Build static site
node scripts/build-site.js
```

The site is built to work under the `/energized-engines-v2/` base path for GitHub Pages at `https://sbezner.github.io/energized-engines-v2/`.

## Viewing Locally

Open `docs/index.html` in a browser. Note: the site uses the `/energized-engines-v2/` base path, so some links may not work when viewing the raw HTML files locally. For proper testing, serve from a local web server:

```bash
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000
```

Or use GitHub Pages after pushing.

## Key Features

### 1. Duplicate Detection

The analysis found 391 part numbers that appeared on multiple product pages. Examples:
- 783540 Mast Roller: 8 separate listings
- 783757 Winch Handle: 6 listings  
- 783620 Roller Shaft: 6 listings

This preview merges them into single products and links the duplicate URLs.

### 2. Model-Based Navigation

Parts are automatically grouped by model based on titles, descriptions, and tags:
- Series 2000 models (2000, 2010, 2015, 2018, 2020, etc.)
- Series 2100 models (2100, 2112, 2118, 2124)
- Series 2400 models (2400, 2412, 2416)
- Roust-A-Bout (R-100, R-150, R-180, R-250)
- Eventer (16, 20, 25)
- Gantry lifts
- Genie parts

### 3. Client-Side Search

Fast part number search with:
- Normalized matching (ignores spaces, dashes, case)
- Partial matches
- Results show model fitment and pricing
- No server required

## Research Notes

### Duplicates (notes/duplicates.csv)

Complete list of 391 duplicate part numbers with:
- Part number
- Count of duplicate listings
- Primary URL (most recently updated)
- All duplicate URLs

### Price Comparison (notes/price-gaps.md)

Analysis of Energized Engines pricing vs competitors:
- EE typically 15-25% above Toolup on common OEM parts
- Competitive on some items (e.g., 783540 at $33 vs competitors at $40+)
- House-brand parts offer significant savings (e.g., $85 vs $387 OEM)

## Technical Details

- **Static HTML/CSS/JS**: No framework, fast loading
- **Mobile responsive**: Works on all screen sizes  
- **SEO blocked**: `noindex,nofollow` meta tags + robots.txt
- **Preview banner**: Always-visible warning on every page
- **External links**: All product "View on Store" buttons link to live site

## Recommendations

Based on this analysis, the live store should:

1. **Merge duplicates**: Use 301 redirects to consolidate the 391 duplicate part numbers
2. **Add model collections**: Create collection pages for each major model
3. **Fix data quality**: Add UPCs, fix $0 products, correct discontinued items
4. **Improve descriptions**: Add fitment info and specs (sourced, not invented)
5. **Focus ads**: Run Shopping ads on house-brand and price-competitive parts only

See the full [traffic and advertising analysis](uploads/traffic-ads-analysis-2026-09-28.md) for details.

## Credits

Built as a demonstration per the [v2 brief](uploads/v2-brief.md). All product data fetched read-only from the public Shopify API. No modifications made to the live store.

## License

This preview site is for demonstration purposes only. Product data remains property of Energized Engines.
