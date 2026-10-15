# PWE Dashboard

Leased net acres for Pine Wave Energy Partners projects, built from each project's Mapper Export.
Live at https://pwe-dashboard.vercel.app (Vercel project `pwe-dashboard`, team segland); every push to `main` redeploys.

## Pages
| Path | What it is |
|---|---|
| `/` (`index.html`) | Landing page: one card per project with totals and a small tract map |
| `/pwe-iii/` | PWE III dashboard (Harrison County, TX) · unit acres tie to the Bowman survey plats in `pwe-iii/plats/` |
| `/pwe-iv/` | PWE IV dashboard (Black Lake · Natchitoches & Red River Parishes, LA) · no units or plats yet, tracts grouped by township-range |

Rules for both: status = `LEASING_STATUS`, acres = `NET_AC`, each owner interest counted once per tract, no GIS acres.

## Rebuilding (`build/`)
`build/` holds the template and scripts; Vercel does not publish it (`.vercelignore`).

- `v3/shell.html` + `v3/_*.js` – shared dashboard template
- `v3/_plats_pwe3.js`, `v3/_plats_pwe4.js` – per-project plat calls, plat images, notes, owner-name tag
- `build_data.py <export.xlsx> <out.json>` – Mapper Export → dashboard data
- `build_geo_pwe3.py` – PWE III Master Parcels shapefile → map shapes
- `build_geo_simple.py <shp-stem> <data.json> <out.json>` – PWE IV tract shapefile → map shapes
- `build_project.py <pwe3|pwe4> <out.html> --home` – one project page
- `build_landing.py <out.html>` – landing page

PWE IV data is grouped by `T{TOWNSHIP}-R{RANGE}` after `build_data.py` runs; switch to units once they're set.
