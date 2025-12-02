# Bug: Missing Apple Touch Icon

**ID:** BUG_20251202_APPLE_TOUCH_ICON_MISSING
**Severity:** LOW (Cosmetic)
**Date Found:** 2025-12-02
**Found By:** Browser console during validation

## Description

iOS devices show error when trying to load apple-touch-icon.png for home screen bookmarks.

## Evidence

```
Error while trying to use the following icon from the Manifest:
http://localhost:3000/apple-touch-icon.png (Download error or resource isn't a valid image)
```

## Impact

- iOS users see default icon instead of app icon when adding to home screen
- Does not affect app functionality
- Cosmetic issue only

## Root Cause

No apple-touch-icon.png file exists in client/public/

## Fix

Create 180x180px PNG icon from favicon.svg:

```bash
# Using ImageMagick (if available)
convert client/public/favicon.svg -resize 180x180 client/public/apple-touch-icon.png

# OR use online converter
# OR create manually in design tool
```

Then rebuild to include in dist/public/

## Priority

LOW - Does not block deployment. Can be fixed post-launch.

## Status

OPEN - Documented for future fix
