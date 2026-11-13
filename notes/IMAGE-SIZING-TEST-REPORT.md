# Image Sizing Test Report

**Date:** November 13, 2026  
**Test:** Product image sizing at 320px and 390px viewports  
**Method:** Playwright automated measurements with Chromium

---

## Summary

❌ **2 of 6 TESTS FAILED**

The EE 1021 Outrigger Caster product has images that overflow their container frames at both mobile viewports.

---

## Test Results

### All 6 Measurements (3 products × 2 widths)

| Product | Viewport | Frame Height | Image Height | Result |
|---------|----------|--------------|--------------|--------|
| EE 1021 Outrigger Caster | 320px | **296px** | **328px** | ❌ **FAIL** (overflow: 32px) |
| EE 779070 Lower Pulley Kit | 320px | 296px | 158px | ✅ PASS |
| Sumner 784717 Base Assembly | 320px | 296px | 228px | ✅ PASS |
| EE 1021 Outrigger Caster | 390px | **358px** | **411px** | ❌ **FAIL** (overflow: 53px) |
| EE 779070 Lower Pulley Kit | 390px | 358px | 198px | ✅ PASS |
| Sumner 784717 Base Assembly | 390px | 358px | 285px | ✅ PASS |

**Pass Rate:** 4/6 (66.7%)

---

## Detailed Measurements

### 1. EE 1021 Outrigger Caster (FAILS)

**Product:** `/products/outrigger-caster-kit-for-series-2000-and-2100.html`

#### At 320px viewport:
- **Frame (.gal-main):** 296px × 296px
- **Image (img):** 246px × **328px**
- ❌ **Image height 328px > Frame height 296px**
- **Overflow:** 32px

#### At 390px viewport:
- **Frame (.gal-main):** 358px × 358px
- **Image (img):** 308px × **411px**
- ❌ **Image height 411px > Frame height 358px**
- **Overflow:** 53px
- **Screenshot:** `notes/verify-shots/verify-ee1021-image-390px.png`

**Issue:** The product image has a portrait (tall) aspect ratio. The image is overflowing the bottom of the square container despite CSS rules `max-height:100%` and `object-fit:contain`.

---

### 2. EE 779070 Lower Pulley Kit (PASSES)

**Product:** `/products/779070-lower-pulley-mounting-kit-2000-2100-2500.html`

#### At 320px viewport:
- **Frame (.gal-main):** 296px × 296px
- **Image (img):** 246px × 158px
- ✅ Image height 158px ≤ Frame height 296px

#### At 390px viewport:
- **Frame (.gal-main):** 358px × 358px
- **Image (img):** 308px × 198px
- ✅ Image height 198px ≤ Frame height 358px

**Status:** PASS - Image fits within frame at both viewports.

---

### 3. Sumner 784717 Base Assembly (PASSES)

**Product:** `/products/sumner-784717-base-assembly-2416-lift.html`

#### At 320px viewport:
- **Frame (.gal-main):** 296px × 296px
- **Image (img):** 246px × 228px
- ✅ Image height 228px ≤ Frame height 296px

#### At 390px viewport:
- **Frame (.gal-main):** 358px × 358px
- **Image (img):** 308px × 285px
- ✅ Image height 285px ≤ Frame height 358px

**Status:** PASS - Image fits within frame at both viewports.

---

## Root Cause Analysis

### Current CSS Implementation

**File:** `docs/pages.css`

```css
.gal-main {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  aspect-ratio: 1/1;
  display: grid;
  place-items: center;
  padding: var(--s-6);  /* 24px padding */
  position: relative;
  overflow: hidden;
}

.gal-main img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 100%;
}

@media (max-width:639px) {
  .gal-main img {
    max-width: 100%!important;
    max-height: 100%!important;
    width: auto!important;
    height: auto!important;
    object-fit: contain!important;
  }
  .gal-main {
    aspect-ratio: 1/1;
  }
}
```

### The Problem

1. **Container dimensions at 390px:**
   - Viewport: 390px width
   - Gutters: 16px × 2 = 32px
   - Container width: 390 - 32 = 358px
   - Container height: 358px (aspect-ratio: 1/1)
   - **Padding:** 24px on all sides
   - **Available space for image:** 358 - 48 = 310px × 310px

2. **Image rendering:**
   - Despite `max-height: 100%` and `object-fit: contain`
   - The image is rendering at 308px × 411px
   - This exceeds the 358px container height by 53px
   - The overflow is visible in the screenshot

3. **Why the CSS isn't working:**
   - The `height: 100%` on the base `.gal-main img` rule (line 136) is conflicting with the media query overrides
   - The percentage-based sizing on a flex/grid container may be calculating incorrectly
   - The `place-items: center` may be affecting the image sizing calculation

---

## Recommended Fix

Replace the current mobile image CSS with explicit max dimensions:

```css
@media (max-width:639px) {
  .gal-main img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  .gal-main {
    aspect-ratio: 1/1;
  }
}
```

The base rule should also be updated to remove the `height: 100%`:

```css
.gal-main img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
```

This will ensure images scale proportionally to fit within the available space without overflowing.

---

## Visual Evidence

**Screenshot:** `notes/verify-shots/verify-ee1021-image-390px.png`

The screenshot clearly shows the EE 1021 Outrigger Caster image overflowing the bottom of the white container frame at 390px viewport. The casters extend beyond the visible container bounds.

---

## Conclusion

**Status:** ❌ **TESTS FAILED**

- 2 out of 6 tests failed (EE 1021 at both 320px and 390px)
- The issue is specific to images with tall (portrait) aspect ratios
- The current CSS rules are not properly constraining image height
- A CSS fix is needed to ensure all images fit within their 1:1 aspect ratio containers

**Impact:** Products with tall product photos will have visual overflow issues on mobile devices, negatively affecting the user experience and design consistency.
