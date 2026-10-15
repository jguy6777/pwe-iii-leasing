# PWE III Leasing Dashboard

Leased net acres by gas unit for Pine Wave Energy Partners III, built from the PWE III Mapper Export.
Acreage ties to the unit survey plats. Current data: Mapper Export 10/14/2026, parcel shapes Master_Parcels_261015.

## Files
- `index.html` – the dashboard (data, map shapes and logos are inside this file)
- `plats/` – survey plat images opened from the Units & plats tab
- `vercel.json` – static hosting settings (no build step)

## First deploy (one time)
```
cd "S:\SEG-DATA Management\Pine Wave Energy\PWE III\pwe-iii-leasing"
npx vercel --scope segland
npx vercel --prod --scope segland
```
Accept the defaults; name the project `pwe-iii-leasing`. There is no build command or framework.

## Updating
Replace `index.html` (and any changed plat in `plats/`), then run:
```
npx vercel --prod --scope segland
```

## Optional: deploy from GitHub
```
git init
git add .
git commit -m "PWE III leasing dashboard"
git branch -M main
git remote add origin https://github.com/jguy6777/pwe-iii-leasing.git
git push -u origin main
```
Then in Vercel, import the repo under segland. Every push to `main` redeploys.
