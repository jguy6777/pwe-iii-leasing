# PWE Dashboard

Leased net acres for Pine Wave Energy Partners projects, built from each project's Mapper Export.
Live at https://pwe-dashboard.vercel.app (Vercel project `pwe-dashboard`, team segland); every push to `main` redeploys.

## Pages
| Path | What it is |
|---|---|
| `/` (`index.html`) | Landing page: one card per project with totals and a small tract map |
| `/pwe-iii/` | PWE III dashboard (Harrison County, TX) · unit acres tie to the Bowman survey plats in `pwe-iii/plats/` |
| `/pwe-iv/` | PWE IV dashboard (Black Lake · Natchitoches & Red River Parishes, LA) · no units or plats yet, tracts grouped by township-range |

There is one guided tour for every project (`build/v3/_tour.js`): the same steps and wording run on each dashboard's **Tour** button or `?tour` in the URL, and the landing page has a single **Take the tour** button (opens it on PWE III). The wording names both groupings (PWE III units with plats, PWE IV townships), and `build_project.py` adds the tour after PWE IV's word swaps so they don't change it. **Play with voice** plays recorded narration from `/tour/NN.mp3` at the site root (Kokoro-82M neural voice `af_heart`), shared by both pages, and advances on its own; if a clip can't load it falls back to the browser's speech voice. After changing tour wording, refresh `build/tour_scripts.json` from `TOUR.spoken(k)` on either page and re-record with `build/build_tour_audio.py build/tour_scripts.json <model.onnx> <voices.npz> .` (model: npm `kokoro-q8-shards`, voices: npm `kokoro-js`).

**View lease**: a record's side panel and the tract panel (Units & plats) open the recorded lease for its contract number in the document viewer, with an **Open PDF** link. Lease files live in `pwe-iii/leases/<contract no>.pdf` and are listed in `LEASEDOCS` in `build/v3/_plats_pwe3.js` (Cannon unit so far: 25 of 28 contracts; CAN-030, CAN-031 and CAN-032 have no file yet). Each file is the recorded lease pages only (plus memorandum or ratifications where recorded with it): check requests, W-9s, lease purchase notices, data sheets and title papers are removed, and any SSN on the lease is blacked out before it is added. The site is public, so anyone with the link can open these.

Records → **Export to Excel** downloads the rows shown as an Excel table (ExcelJS, served from `lib/` and loaded on click).

Maps use Leaflet (bundled in each page) on Esri aerial imagery or Esri streets / dark gray (no API key).

Rules for both: status = `LEASING_STATUS`, acres = `NET_AC`, each owner interest counted once per tract, no GIS acres.

## Rebuilding (`build/`)
`build/` holds the template and scripts; Vercel does not publish it (`.vercelignore`).

- `v3/shell.html` + `v3/_*.js` – shared dashboard template
- `v3/_plats_pwe3.js`, `v3/_plats_pwe4.js` – per-project plat calls, plat images, notes, owner-name tag
- `build_data.py <export.xlsx> <out.json>` – Mapper Export → dashboard data
- `build_geo_pwe3.py` – PWE III Master Parcels shapefile → map shapes
- `build_geo_simple.py <shp-stem> <data.json> <out.json>` – PWE IV tract shapefile → landing-page thumbnail shapes
- `build_geo_ll.py <shp-stem> <epsg> <data.json> <out.json>` – tract shapefile → Leaflet map shapes in lat/long (NAD27 shifted with NOAA NADCON `us_noaa_conus.tif`; PWE III EPSG 32038, PWE IV EPSG 26781)
- `strll4.json` – PWE IV section-township-range grid from SONRIS (DNRSvc/COMMON layers 3, 6, 7), pulled 10/15/2026
- `build_rec.py <reference.xlsx> <current_export.xlsx> <data.json> <out.json>` – Records/export columns: the reference Mapper export (PWEIII 03.24.26) supplies only the column set and order; values come from the current export (contract no. first; columns a project's export lacks are left out)
- `build_project.py <pwe3|pwe4> <out.html> --home` – one project page
- `build_landing.py <out.html>` – landing page

PWE IV data is grouped by `T{TOWNSHIP}-R{RANGE}` after `build_data.py` runs; switch to units once they're set.
