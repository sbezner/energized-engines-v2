# Sumner Manual Verification Summary

## Overview
Complete verification of Sumner OEM parts against official parts manuals and exploded diagrams.

## Products Checked
- **Total Sumner products processed**: 2,168 (all Sumner OEM part numbers in catalog)
- **Unique part numbers**: 2,168
- **Products found in any manual**: 302 unique parts
- **Total confirmations recorded**: 350 (some parts found in multiple manuals)

## Badge Distribution (from built site grep)
- **Verified (Exact Model Match)**: 156 badges on 132 product pages
  - Product claims specific model (e.g. "2015", "GH2T", "EVENTER 16")
  - Part number found in that model's official parts manual
- **Listed in Series**: 15 badges on 15 product pages
  - Product claims series designation (e.g. "2000", "2100")
  - Part number found in that series' parts manual
- **Listed in Sumner (Factual/No Model Claim)**: 194 badges on 170 product pages
  - Product title claims NO model
  - Part number found in official Sumner parts manual
  - Badge format: "✓ Listed in Sumner \<manual title\>, p. N"
- **Total product pages with at least one badge**: 302

## Other Findings
- **Manual-only matches**: 253 entries
  - Part found in a manual but product claims a DIFFERENT model family
  - Recorded in `notes/manual-only-matches.csv` for review
- **Not in claimed manual**: 69 entries
  - Product claims a model family with a manual
  - Part number NOT found in that family's manual
  - No specific component conflict identified
  - Recorded in `notes/not-in-claimed-manual.csv`
- **Fitment conflicts**: 0
  - No cases where manual shows same component under different part number
- **Not found anywhere**: 1,866 parts (2,168 - 302 found)

## Manuals Used
1. Series 2000 Lift Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf
   - Covers: 2010, 2015, 2020, 2025

2. Series 2000 Short Stack Lift Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf
   - Covers: 2012S

3. Series 2100 Lift Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf
   - Covers: 2112, 2118, 2124 (including G versions)

4. Series 2200 Lift Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf
   - Covers: 2208, 2210

5. 2412 Series Lift Assembly
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf
   - Covers: 2412, 2416 (including G versions)

6. Series 2500 Lift Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/2010_Series2500Lift_diagrams.pdf
   - Covers: 2512, 2515

7. Series 2600 Lift Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf
   - Covers: 2615

8. Eventer 16 Parts Manual
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_16_Parts_Manual_10_11.pdf
   - Covers: EVENTER 16

9. 2 Ton Gantry Assembly Exploded Diagram
   - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf
   - Covers: GH2T, Gantry

10. Sumner 1910 Series Lift Exploded Diagram
    - URL: https://sumner.com/wp-content/uploads/sites/14/2025/07/Sumner-1910-Series-Lift-Exploded-Diagram.pdf
    - Covers: 1908, 1910

## Model Family Normalization
To ensure accurate matching, the following model normalization rules were applied:

- **Gantry family**: Gantry, 2 Ton Gantry, GH2T, and all GH2T size variants
- **Series 2000**: 2000, 2010, 2015, 2020, 2025 (excludes 2012S)
- **Series 2000 Short Stack**: 2012S only
- **Series 2100**: 2100, 2112, 2118, 2124, 2112G, 2118G, 2124G
- **Series 2200**: 2200, 2208, 2210
- **Series 2400**: 2400, 2412, 2416, 2412G, 2416G
- **Series 2500**: 2500, 2512, 2515
- **Series 2600**: 2600, 2615
- **Series 1900/1910**: 1900, 1908, 1910
- **Eventer**: EVENTER 16, EVENTER 20, EVENTER 25 (normalized by removing spaces)

## Methodology
1. Extracted all Sumner OEM parts from catalog
2. Downloaded official parts manuals from sumner.com
3. Converted PDFs to text with `pdftotext -layout`
4. Applied model family normalization rules
5. Matched part numbers against manual text with page tracking
6. Categorized matches as exact, series-level, or factual (no model claim)
7. Logged cross-family matches and missing parts for review
8. Updated site generator to display badges on product pages, model pages, and search results

## Manual Source Tracking
All manual URLs attempted are logged in `notes/manual-sources.csv` with HTTP status codes and coverage notes.

## Files Generated
- `notes/diagram-map.csv`: All confirmations with page numbers and URLs
- `notes/manual-only-matches.csv`: Cross-family matches requiring review
- `notes/not-in-claimed-manual.csv`: Parts not found in their claimed family's manual
- `notes/fitment-conflicts.csv`: Component conflicts (none found)
- `notes/manual-sources.csv`: Manual source tracking

## Verification
Badge counts verified with:
```bash
cd docs/products
grep -oh "✓ Verified in Sumner [^<]*" *.html | wc -l  # 156
grep -oh "✓ Listed in Series [^<]*" *.html | wc -l    # 15
grep -oh "✓ Listed in Sumner [^<]*" *.html | wc -l    # 194
grep -l "fitment-flag--verified" *.html | wc -l       # 302 pages
```
