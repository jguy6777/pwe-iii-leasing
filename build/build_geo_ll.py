"""Tract shapefile -> Leaflet map JSON in latitude/longitude (NAD83, matches SONRIS to ~0 m).

NAD27 state-plane input is shifted with the NOAA NADCON grid (us_noaa_conus.tif must be in the
PROJ data dir). Optional shapefile fields: Unit, Unit_Tract, NOTE/Notes (PWE III Master Parcels).
GIS acres are never carried over.
usage: python3 build_geo_ll.py <shp-stem> <epsg> <data.json> <out.json>
"""
import json, sys
from collections import defaultdict
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import unary_union, transform

shp, epsg, data_path, out_path = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
tf = Transformer.from_crs(f'EPSG:{epsg}', 'EPSG:4269', always_xy=True)
sf = shapefile.Reader(shp, encoding='utf-8')
F = [f[0] for f in sf.fields[1:]]
ex = {r['id']: r['unit'] for r in json.load(open(data_path))}
R = 6  # decimals: ~0.1 m

def rings(g):
    """Polygon/MultiPolygon -> list of polygons, each a list of rings [[lat,lng],...]."""
    out = []
    for p in ([g] if g.geom_type == 'Polygon' else list(g.geoms)):
        out.append([[[round(y, R), round(x, R)] for x, y, *_ in ring.coords] for ring in [p.exterior, *p.interiors]])
    return out

def bbox(g):
    x0, y0, x1, y1 = g.bounds
    return [round(y0, R), round(x0, R), round(y1, R), round(x1, R)]

T = []; byU = defaultdict(list)
for sr in sf.iterShapeRecords():
    r = dict(zip(F, sr.record)); g = shape(sr.shape.__geo_interface__)
    g = (g if g.is_valid else g.buffer(0)).simplify(2, preserve_topology=True)
    if g.is_empty: continue
    tid = str(r['TractID']); u = ex.get(tid)
    su = (r.get('Unit') or '').strip() or None
    ut = str(r.get('Unit_Tract') or '')
    if su and su.isdigit() and ut and not ut.isdigit(): su, ut = ut, su  # fields swapped in the source (e.g. TX203-0540-028)
    note = (r.get('NOTE') or r.get('Notes') or '').strip().lstrip('!').strip() or None
    ll = transform(lambda x, y, z=None: tf.transform(x, y), g)
    lp = ll.representative_point()
    T.append({'id': tid, 'u': u, 'su': su, 'ut': ut, 'note': note,
              'c': rings(ll), 'l': [round(lp.y, R), round(lp.x, R)], 'b': bbox(ll)})
    gk = u if (u and u != 'OUTSIDE') else (('ctx:' + su) if su else None)
    if gk: byU[gk].append(g.buffer(1))
U = []
for k, gs in byU.items():
    g = unary_union(gs).buffer(-1).simplify(4)
    ll = transform(lambda x, y, z=None: tf.transform(x, y), g); lp = ll.representative_point()
    U.append({'u': k.replace('ctx:', ''), 'ctx': k.startswith('ctx:'), 'c': rings(ll), 'l': [round(lp.y, R), round(lp.x, R)], 'b': bbox(ll)})
allb = unary_union([transform(lambda x, y, z=None: tf.transform(x, y), shape(s.__geo_interface__)).envelope for s in sf.shapes()])
json.dump({'b': bbox(allb), 't': T, 'u': U}, open(out_path, 'w'), separators=(',', ':'))
miss = sorted({i for i in ex if i not in {t['id'] for t in T}})
print(out_path, len(T), 'tracts', len(U), 'groups', 'transform:', tf.description[:70], '| export tracts w/o shape:', len(miss))
