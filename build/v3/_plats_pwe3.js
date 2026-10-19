// ---------- reference: survey plats ----------
// Called acreage per unit from the Bowman survey plats. Tracts not on a unit's plat are left out of its unit acres.
const PLATCALL={'CANNON GU':719.57,'DAVIS GU':658.357,'FENTON GU':670.647,'HUNT GU':686.91,'JENNIFER STEWART GU':712.503,'LOFTIS GU':640.00,'RESCH GU':641.94,'SUMMERS GU':772.598,'ZIMM GU':146.193};
const OFFPLAT=new Set(['TX203-0075-011']);
// Lease documents shown by the View lease buttons (pwe-iii/leases/<contract no>.pdf): recorded lease pages only.
// Check requests, W-9s, purchase notices and title papers are removed and SSNs blacked out before a file is added here.
const LEASEDOCS={
  'CAN-001':{src:'leases/CAN-001.pdf',sub:'Recorded lease · Vol 3193, Pg 146 · 2 pages'},
  'CAN-002':{url:'https://filecloud.segland.com/url/haxd6gzrcenduuan',src:'leases/CAN-002.pdf',sub:'Recorded lease · Vol 753, Pg 205 · 2 pages'},
  'CAN-003':{src:'leases/CAN-003.pdf',sub:'Recorded lease · Vol 753, Pg 211 · 3 pages'},
  'CAN-004':{src:'leases/CAN-004.pdf',sub:'Recorded lease · Vol 783, Pg 457 · 2 pages'},
  'CAN-005':{src:'leases/CAN-005.pdf',sub:'Recorded lease · Vol 2877, Pg 324 · 2 pages'},
  'CAN-006':{src:'leases/CAN-006.pdf',sub:'Recorded lease + ratification (3193/145) + amended ratification (3267/217) · Vol 2883, Pg 308 · 4 pages'},
  'CAN-007':{src:'leases/CAN-007.pdf',sub:'Recorded lease · Vol 3193, Pg 155 · 2 pages'},
  'CAN-008':{src:'leases/CAN-008.pdf',sub:'Recorded lease · Vol 3193, Pg 157 · 2 pages'},
  'CAN-009':{src:'leases/CAN-009.pdf',sub:'Recorded lease · Vol 3193, Pg 143 · 2 pages'},
  'CAN-010':{src:'leases/CAN-010.pdf',sub:'Recorded lease · Vol 3193, Pg 148 · 2 pages'},
  'CAN-011':{src:'leases/CAN-011.pdf',sub:'Recorded lease · Vol 3193, Pg 150 · 2 pages'},
  'CAN-012':{src:'leases/CAN-012.pdf',sub:'Recorded lease · Vol 3193, Pg 153 · 2 pages'},
  'CAN-013':{src:'leases/CAN-013.pdf',sub:'Recorded lease · Vol 3193, Pg 159 · 3 pages'},
  'CAN-014':{src:'leases/CAN-014.pdf',sub:'Recorded lease · Vol 3193, Pg 162 · 3 pages'},
  'CAN-016':{src:'leases/CAN-016.pdf',sub:'Recorded lease · Vol 3267, Pg 219 · 2 pages'},
  'CAN-017':{src:'leases/CAN-017.pdf',sub:'Recorded lease · Vol 3319, Pg 85 · 2 pages'},
  'CAN-018':{src:'leases/CAN-018.pdf',sub:'Recorded lease · Vol 3347, Pg 236 · 2 pages'},
  'CAN-019':{src:'leases/CAN-019.pdf',sub:'Recorded lease · Vol 3513, Pg 116 · 2 pages'},
  'CAN-021':{src:'leases/CAN-021.pdf',sub:'Recorded lease · Vol 3560, Pg 133 · 5 pages'},
  'CAN-022':{src:'leases/CAN-022.pdf',sub:'Recorded lease · Vol 3849, Pg 115 · 2 pages'},
  'CAN-024':{src:'leases/CAN-024.pdf',sub:'Recorded lease · Vol 3936, Pg 148 · 3 pages'},
  'CAN-025':{src:'leases/CAN-025.pdf',sub:'Recorded lease · Vol 3936, Pg 154 · 3 pages'},
  'CAN-027':{src:'leases/CAN-027.pdf',sub:'Recorded lease + memorandum · Inst 2025-000010836 · 8 pages'},
  'CAN-028':{src:'leases/CAN-028.pdf',sub:'Recorded lease + memorandum · Inst 2025-000006993 · 9 pages'},
  'CAN-029':{src:'leases/CAN-029.pdf',sub:'Recorded lease + memorandum · Inst 2025-000006983 · 8 pages'}
};
// contract numbers that should have a lease file; the ones without a file yet say so
const LEASETEST=/^CAN-/;
const PLATDOCS={
  'CANNON GU':{src:'plats/cannon_deep_unit_plat.png',short:'Prelim 5/13/26',title:'Cannon Deep Unit · Survey plat',sub:'Bowman · Job 381963 · Preliminary 5/13/2026 · Rev 0 · called 719.57 acres'},
  'DAVIS GU':{src:'plats/davis_deep_unit_plat.png',short:'Rev 4/1/26',title:'Davis Deep Unit · Survey plat',sub:'Bowman · Job 381489 · dated 2/10/2026 · revised 4/1/2026 · called 658.357 acres'},
  'FENTON GU':{src:'plats/fenton_gu_plat.png',short:'Prelim 7/25/25',title:'Fenton Gas Unit · Survey plat',sub:'Bowman · Job 381489 · Preliminary 7/25/2025 · called 670.647 acres'},
  'HUNT GU':{src:'plats/hunt_gu_plat.png',short:'Prelim 7/8/25',title:'Hunt Gas Unit · Survey plat',sub:'Bowman · Job 381490 · Preliminary 7/8/2025 · called 686.91 acres'},
  'JENNIFER STEWART GU':{src:'plats/jennifer_stewart_deep_unit_plat.png',short:'Prelim 5/12/26',title:'Jennifer Stewart Deep Unit · Survey plat',sub:'Bowman · Job 381961 · Preliminary 5/12/2026 · Rev 0 · called 712.503 acres'},
  'LOFTIS GU':{src:'plats/loftis_gu_plat.png',short:'Prelim 2/13/26',title:'Loftis Unit · Survey plat',sub:'Bowman · Job 381897 · Preliminary 2/13/2026 · Rev 0 · called 640.00 acres'},
  'RESCH GU':{src:'plats/resch_deep_unit_plat.png',short:'Prelim 6/4/26',title:'Resch Deep Unit · Survey plat',sub:'Bowman · Job 381962 · Preliminary 6/4/2026 · Rev 0 · called 641.940 acres'},
  'ZIMM GU':{src:'plats/zimm_gu_plat.png',short:'2/11/26',title:'Zimm Unit · Survey plat',sub:'Bowman · Job 381489 · dated 2/11/2026 · 1" = 500\' · called 146.193 acres'},
  'SUMMERS GU':{src:'plats/summers_deep_unit_plat.png',short:'Prelim 10/6/26',title:'Summers Deep Unit · Survey plat',sub:'Bowman · Job 382091 · Preliminary 10/6/2026 · Rev 0 · called 772.578 acres (correction to 772.598 pending)'}};
const PLATNOTE={};
// project notes shown under Notes on the Overview
const PNOTES=['Unit acres follow the Bowman survey plats. TX203-0075-011 (31.25 ac) is assigned to Jennifer Stewart GU in the export but is not on its plat, so it is left out of that unit\'s acres.'];
const PTAG=/\s*-\s*PWE\s*III\s*$/i;
// Texas abstract (survey) boundaries: RRC Original Texas Land Survey layer, loaded live on the plat map
const ABS_SRC='https://gis.rrc.texas.gov/server/rest/services/rrc_public/RRC_Public_Viewer_Srvs/MapServer/24';
