"""Convert a tract shapefile with a TractID field into the dashboard's map JSON.

Used for projects whose shapefile has no Unit / Unit_Tract fields (e.g. PWE IV Black Lake).
Groups come from the export's `unit` value for each tract. GIS acres are never carried over.
usage: python3 build_geo_simple.py <shapefile-stem> <data.json> <out.json>
"""
import json, sys
from collections import defaultdict
import shapefile
from shapely.geometry import shape
from shapely.ops import unary_union

shp, data_path, out_path = sys.argv[1:4]
sf = shapefile.Reader(shp, encoding='utf-8')
F = [f[0] for f in sf.fields[1:]]
D = json.load(open(data_path))
ex = {r['id']: r['unit'] for r in D}
bx = sf.bbox; X0, Y1 = bx[0], bx[3]
tr = lambda x, y: (round(x - X0), round(Y1 - y))

def path(g):
    out = []
    for p in ([g] if g.geom_type == 'Polygon' else list(g.geoms)):
        for ring in [p.exterior, *p.interiors]:
            out.append('M' + 'L'.join(f'{a} {b}' for a, b in [tr(x, y) for x, y, *_ in ring.coords]) + 'Z')
    return ''.join(out)

T = []; byU = defaultdict(list)
for sr in sf.iterShapeRecords():
    r = dict(zip(F, sr.record)); g = shape(sr.shape.__geo_interface__)
    g = (g if g.is_valid else g.buffer(0)).simplify(4, preserve_topology=True)
    if g.is_empty: continue
    tid = str(r['TractID']); u = ex.get(tid)
    note = (r.get('Notes') or '').strip().lstrip('!').strip() or None
    lp = g.representative_point(); b = g.bounds
    T.append({'id': tid, 'u': u, 'su': None, 'ut': '', 'note': note, 'd': path(g), 'l': tr(lp.x, lp.y), 'b': [*tr(b[0], b[3]), *tr(b[2], b[1])]})
    if u: byU[u].append(g.buffer(2))
U = []
for k, gs in byU.items():
    g = unary_union(gs).buffer(-2).simplify(8); lp = g.representative_point(); b = g.bounds
    U.append({'u': k, 'ctx': False, 'd': path(g), 'l': tr(lp.x, lp.y), 'b': [*tr(b[0], b[3]), *tr(b[2], b[1])]})
json.dump({'w': round(bx[2] - bx[0]), 'h': round(bx[3] - bx[1]), 't': T, 'u': U}, open(out_path, 'w'), separators=(',', ':'))
miss = sorted({i for i in ex if i not in {t['id'] for t in T}})
print(len(T), 'tract shapes,', len(U), 'groups; export tracts with no shape:', len(miss), miss[:10])
