# Image Sizing Re-Test Report (After CSS Fix Attempt)

**Date:** November 13, 2026  
**Test:** Re-testing product image sizing at 320px and 390px after CSS fix  
**CSS Change Applied:** Changed from `width:100%; height:100%;` to `width:auto; height:auto;`  
**Result:** ❌ **FIX FAILED - All tests still failing**

---

## Summary

❌ **0 OF 6 TESTS PASSED (0% pass rate)**

The CSS fix did NOT resolve the overflow issue. Images still overflow their containers.

---

## Test Results - Exact Measurements

### Product 1: EE 1021 Outrigger Caster

**At 320px viewport:**
- Frame (`.gal-main`): **296px × 296px**
- Image (`img`): **246px × 328px**
- ❌ **FAIL**: Image height 328px > Frame height 296px
- **Overflow: 32px** (SAME AS BEFORE)

**At 390px viewport:**
- Frame (`.gal-main`): **358px × 358px**
- Image (`img`): **308px × 411px**
- ❌ **FAIL**: Image height 411px > Frame height 358px
- **Overflow: 53px** (SAME AS BEFORE)

### Product 2: Sumner 780271 Caster Assembly

**At 320px viewport:**
- ❌ **FAIL**: Image element not found (timeout)

**At 390px viewport:**
- ❌ **FAIL**: Image element not found (timeout)

### Product 3: Sumner 783540 Mast Roller

**At 320px viewport:**
- Frame (`.gal-main`): **296px × 296px**
- Image (`img`): **246px × 360px**
- ❌ **FAIL**: Image height 360px > Frame height 296px
- **Overflow: 64px**

**At 390px viewport:**
- Frame (`.gal-main`): **358px × 358px**
- Image (`img`): **308px × 451px**
- ❌ **FAIL**: Image height 451px > Frame height 358px
- **Overflow: 93px**

---

## CSS Change Comparison

### BEFORE (Original - Line 136):
```css
.gal-main img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 100%;
}
```

### AFTER (Current - Line 136):
```css
.gal-main img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
```

### Result:
**NO IMPROVEMENT** - The overflow measurements are identical before and after the CSS change.

---

## Why the Fix Failed

The issue is that `max-width: 100%` and `max-height: 100%` calculate the percentage relative to the **grid item's content area**, but the image is rendered in a way that doesn't respect these constraints correctly due to:

1. **Grid container behavior**: The `.gal-main` uses `display: grid; place-items: center;` which affects how percentage-based constraints are calculated
2. **Padding interference**: The 24px padding (`var(--s-6)`) creates a nested sizing context
3. **Object-fit limitations**: `object-fit: contain` maintains aspect ratio but doesn't prevent the element itself from exceeding bounds

The image is still rendering with dimensions that exceed the container's inner area (358px - 48px padding = 310px available space, but image renders at 308px × 411px).

---

## Required Fix

The problem requires a different approach. Options:

### Option 1: Remove padding on mobile (Simplest)
```css
@media (max-width:639px) {
  .gal-main {
    padding: var(--s-3); /* Reduce from 24px to 12px */
  }
}
```

### Option 2: Add explicit max-dimension constraints
```css
@media (max-width:639px) {
  .gal-main img {
    max-width: calc(100vw - 64px); /* viewport - gutters - padding */
    max-height: calc(100vw - 64px);
    width: auto;
    height: auto;
    object-fit: contain;
  }
}
```

### Option 3: Change container to flex with explicit dimensions (Recommended)
```css
.gal-main {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--s-6);
  position: relative;
  overflow: hidden;
}

.gal-main img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
```

Change from `display: grid; place-items: center;` to `display: flex; align-items: center; justify-content: center;` to improve percentage calculation behavior.

---

## Visual Evidence

**Screenshot:** `notes/verify-shots/verify-ee1021-image-390px-FIXED.png`

The "FIXED" screenshot shows the image STILL overflows the container frame, identical to the pre-fix screenshot. The CSS change had no effect.

---

## Conclusion

**Status:** ❌ **CSS FIX FAILED**

- 0 out of 6 tests passed
- All measurements identical to pre-fix state
- Current CSS approach (`width:auto; height:auto; max-width:100%; max-height:100%;`) does not constrain images within grid containers with padding
- A more substantial CSS refactor is needed (change to flexbox or add explicit dimension constraints)

**Recommendation:** Change the `.gal-main` container from `display: grid` to `display: flex` with center alignment, or reduce padding on mobile viewports.
