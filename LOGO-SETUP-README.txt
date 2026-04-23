# Logo Setup Instructions

## What to Do

The system looks for a Chapel Hill Denham logo at: `/public/chd-logo.png`

### Option 1: If You Have the Logo File
1. Copy your Chapel Hill Denham logo file
2. Paste it to: `C:\dev\chd-research-portal\public\chd-logo.png`
3. Name it exactly: `chd-logo.png` (PNG format works best)
4. Restart your app or rebuild with `npm run build`

### Option 2: If PDFs Should Work Without Logo (Already Functional)
The system is already configured to work WITHOUT a logo:
- If logo file is not found, PDF generates without the header logo
- All other branding (colors, fonts, page numbers) still work perfectly
- The PDF will still look professional

## Current Status
✅ PDF download button is functional
✅ App builds and runs without logo (graceful fallback)
✅ When you add the logo, it will automatically appear in PDFs

## Test It Now
1. Try downloading a report PDF
2. It will work fine - you'll just see the company name without the image logo at the top
3. Later, when you place the logo file, it will automatically appear

## Logo Specifications (If Adding)
- Format: PNG or JPG
- Size: ~200x200px (will be scaled to 20mm in PDF)
- File size: < 500KB
- Aspect ratio: Square or rectangular

That's it! Everything else is ready to go.
