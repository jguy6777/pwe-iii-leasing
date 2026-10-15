// ---------- reference: survey plats ----------
// PWE IV (Black Lake) has no units or survey plats yet. Tracts are grouped by township-range,
// and acreage is the export's tract acres. Add PLATCALL / PLATDOCS here once units are platted.
const PLATCALL={};
const OFFPLAT=new Set();
const PLATDOCS={};
const PLATNOTE={};
// project notes shown under Notes on the Overview
const PNOTES=['No gas units or survey plats are set for PWE IV yet, so tracts are grouped by township-range and acreage is the tract acreage from the Mapper export.'];
const PTAG=/\s*-\s*PWE\s*IV\s*$/i;
