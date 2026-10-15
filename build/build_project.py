"""Build one project's dashboard page from the shared v3 template.

usage: python3 build_project.py <pwe3|pwe4> <out.html> [--home] [--standalone]
  --home        add the "All PWE projects" link (deployed site only)
  --standalone  embed survey plat images as data URIs (single-file copy)
"""
import base64, re, sys

PROJECTS = {
    'pwe3': dict(
        CODE='PWE III', REGION='Harrison County, Texas',
        DATE_S='Oct 14, 2026', DATE_L='October 14, 2026',
        ACRESRC='unit acres = Bowman survey plats',
        plats='v3/_plats_pwe3.js', data='pwe_1014.json', geo='geo_1015.json',
        words=[]),
    'pwe4': dict(
        CODE='PWE IV', REGION='Natchitoches &amp; Red River Parishes, Louisiana',
        DATE_S='Oct 15, 2026', DATE_L='October 15, 2026',
        ACRESRC='tract acres = Mapper export (no survey plats yet)',
        plats='v3/_plats_pwe4.js', data='pwe4_1015.json', geo='geo4_1015.json',
        # no gas units yet: tracts are grouped by township-range, and acreage is tract acres
        words=[
            ('Units &amp; plats', 'Townships &amp; map'),
            ('aria-label="Unit"></select>', 'aria-label="Township"></select>'),
            ('<h2>Net acres by unit</h2>', '<h2>Net acres by township</h2>'),
            ('click a unit to filter', 'click a township to filter'),
            ('<h2>Unit map</h2>', '<h2>Tract map</h2>'),
            ('click a unit to open its plat', 'click a township to open it'),
            ('aria-label="Map of PWE IV units"', 'aria-label="Map of PWE IV tracts"'),
            ('<h2>Units</h2>', '<h2>Townships</h2>'),
            ('Plat acres vs net acres · click a unit to open it with its plat', 'Tract acres vs net acres · click a township to open it'),
            ('<h2>Plat map</h2>', '<h2>Tract map</h2>'),
            ('aria-label="Unit plat map"', 'aria-label="Tract map"'),
            ('aria-label="Fit to unit"', 'aria-label="Fit to township"'),
            ('Unit acres (plats)', 'Tract acres'),
            ("' gas units'", "' townships'"),
            ("'% of plat acres'", "'% of tract acres'"),
            ('No units match the filters.', 'No townships match the filters.'),
            ("'All units'", "'All townships'"),
            (' plat acres</div>', ' tract acres</div>'),
            ('click to open on the plat', 'click to open on the map'),
            ("add('unit','Unit',", "add('unit','Township',"),
            ("l:'Unit'", "l:'Township'"),
            ("'Plat acres'", "'Tract acres'"),
            ('Units total', 'Townships total'),
            ("'Tracts outside the gas units'", "'Tracts outside the townships'"),
            (" units · pick one from the list or the map", " townships · pick one from the list or the map"),
            ("Unit acres · plat", "Tract acres"),
            ('Show on plat map', 'Show on map'),
            ('aria-label="Previous unit"', 'aria-label="Previous township"'),
            ('aria-label="Next unit"', 'aria-label="Next township"'),
        ]),
}

key, out = sys.argv[1], sys.argv[2]
home, standalone = '--home' in sys.argv, '--standalone' in sys.argv
P = PROJECTS[key]
t = open('v3/shell.html').read()
for k in ['prep', 'board', 'goal', 'notes', 'rest']:
    t = t.replace(f'/*__{k.upper()}__*/', open(f'v3/_{k}.js').read())
t = t.replace('/*__PLATS__*/', open(P['plats']).read())
for k in ['CODE', 'REGION', 'DATE_S', 'DATE_L', 'ACRESRC']:
    t = t.replace(f'%%{k}%%', P[k])
t = t.replace('%%HOME%%', '<a class="homelink" href="../">← All PWE projects</a>' if home else '')
for a, b in P['words']:
    n = t.count(a)
    assert n >= 1, f'{key}: wording not found: {a!r}'
    t = t.replace(a, b)
t = (t.replace('/*__LOGO__*/', open('v3/_logo.txt').read())
      .replace('/*__SEGLOGO__*/', open('v3/_seglogo.txt').read())
      .replace('/*__DATA__*/[]', open(P['data']).read())
      .replace('/*__GEO__*/{}', open(P['geo']).read()))
if standalone:
    for f in sorted(set(re.findall(r'plats/[\w\-]+\.png', t))):
        t = t.replace(f, 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode())
if not t.lstrip().lower().startswith('<!doctype'):
    t = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" '
         'content="width=device-width,initial-scale=1"></head><body>\n' + t + '\n</body></html>\n')
open(out, 'w').write(t)
left = sorted(set(re.findall(r'%%[A-Z_]+%%|/\*__[A-Z]+__\*/', t)))
print(key, out, f'{len(t):,} bytes', 'unfilled:', left)
