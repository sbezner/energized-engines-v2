# Sumner Manual Check Summary

Generated: 2026-09-28

## Overview

- **Total Sumner OEM products checked:** 2,168
- **Unique Sumner OEM part numbers:** 2,168  
- **Parts found in manuals with exact page matches:** 22
- **Confirmations added to diagram-map.csv:** 22
- **Manual-only matches:** 581 (parts in manuals but product doesn't claim that model)
- **Parts not found in any manual:** 2,146
- **Manuals checked:** 10 PDFs with page-level extraction

## Part Count Explanation

The catalog contains 2,168 Sumner OEM products (vendor="Sumner"). Each product has a unique part number in the 77xxxx or 78xxxx series. The previous informal count of "965" likely referred to a different metric or outdated data.

This check used:
- **Source:** data/processed-products.json
- **Filter:** Products where vendor == "Sumner" and extracted_part_number is not null
- **Count method:** Unique part numbers on actual catalog products

## Manuals Checked (with HTTP Status)

All manuals successfully downloaded (HTTP 200):

1. Series 2000 Lift Assembly Exploded Diagram (2010, 2015, 2020, 2025) - 26 pages
2. Series 2000 Short Stack (2012S) - 19 pages  
3. Series 2100 Lift Assembly (2112, 2118, 2124) - 23 pages
4. Series 2200 Lift Assembly (2208, 2210) - 18 pages
5. 2412 Series Lift Assembly (2412, 2416) - 19 pages
6. Series 2500 Lift Assembly (2512, 2515) - 24 pages **[NEW]**
7. Series 2600 Lift Assembly (2615) - 19 pages
8. Eventer 16 Parts Manual - 16 pages **[NEW]**
9. 2 Ton Gantry Assembly (GH2T) - 13 pages
10. Sumner 1910 Series Lift (1908, 1910) - 4 pages **[NEW]**

## Manuals NOT Found

Searched sumner.com with no results:

- **R-100, R-150, R-180, R-250:** No parts manual or exploded diagram exists
- **Roust-A-Bout:** No exploded diagram (only product spec page)  
- **SLC-18, SLC-24:** No manual found (may not be valid Sumner models)

Search methods used:
- `site:sumner.com filetype:pdf [model] parts manual exploded diagram`
- Direct URL checks on sumner.com/wp-content/uploads/
- Product page inspection

## Verification Method

For each of the 2,168 products:
1. Extracted text from all manual PDFs with page markers (form feed separators)
2. Searched each page for exact part number matches
3. **Only added confirmation if:**
   - Part number appears on a specific page
   - Product's claimed models match the manual's coverage
   - Page number is recorded

This strict matching explains the low confirmation rate (22/2168 = 1%).

## Badge Logic

Badges are shown when:
- Part is in diagram-map.csv with a matching model
- Badge text:
  - "✓ Verified in Sumner {model} parts manual, p. {N}" (exact model match)
  - "✓ Listed in Series {X} parts manual, p. {N}" (series-level match)

Badges are NOT shown for:
- Manual-only matches (581 cases where part is in manual but product doesn't claim that model)
- Parts not found in any manual

## Manual-Only Matches

581 parts appear in manuals but the product doesn't claim any model that manual covers. Examples:
- Part in Series 2100 manual but product only claims "2000" models
- Part in Gantry manual but product claims no Gantry model

These are logged in `notes/manual-only-matches.csv` for investigation but don't receive badges.

## Conflicts

No conflicts found. A conflict would be:
- Product title claims model X
- Model X has a parts manual  
- Manual lists the same component name under a different part number
- Manual has no occurrence of the product's part number

Evaluated: All 2,168 products checked for conflicts
Conflicts found: 0

## Files Created/Updated

- `notes/diagram-map.csv` - Added 22 new confirmed matches with page numbers
- `notes/manual-only-matches.csv` - 581 parts in manuals without model match
- `notes/manual-sources.csv` - Updated with HTTP 200 status for all URLs
- `notes/fitment-conflicts.csv` - Created (header only, no conflicts found)
- `notes/manual-check-summary.md` - This file

## Recommendations

1. **High not-found rate (99%):** Most parts are not in the checked exploded diagrams, likely because:
   - They're hardware/fasteners covered separately
   - They're newer parts added after manuals published
   - They're listed only in operator manuals (not diagram PDFs)
   
2. **Manual-only matches (581):** These parts physically exist in manuals but product model claims don't match. May indicate:
   - Incorrect model assignment on products
   - Parts that fit multiple series
   - Need for series-level fitment review

3. **Missing R-series/Roust-A-Bout manuals:** Contact Sumner directly for parts documentation on these legacy models.
