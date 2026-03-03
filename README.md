# HI | Connect (v2) — CSV-driven Digital Business Card

## What this is
A fresh-start build that:
- Loads employees from `employees.csv`
- Desktop: search + open, Download Contact (.vcf), Share (native share when possible + QR modal fallback)
- Mobile: QR code in the circle, green bar (call/email/website), bottom transparent bar (Share / Employees / Add)

## The Shopify URL the QR uses
`https://highlightindustries.net/pages/connect-v2`

## Add employee photos
In `employees.csv`, set the `photo` column to a filename inside `/assets`, e.g.:
`jessica.jpg`

If empty or missing, it falls back to `assets/building.jpg`.

## Deploy
### GitHub Pages
Upload these files to a repo root and enable Pages. The card should work at:
`https://YOURNAME.github.io/YOURREPO/`

### Shopify (clients only see Shopify URL)
Embed your GitHub Pages URL in Shopify using an iframe (like your previous working setup).

## Notes
- Share uses the browser's Web Share API when available (AirDrop/text/email).
- QR images come from QuickChart. If you ever want fully-offline QR generation, tell me and I’ll swap in an embedded QR library.
