import shapefile,json,sys
from shapely.geometry import shape
from shapely.ops import unary_union
from collections import defaultdict
sf=shapefile.Reader('/home/claude/shp1015/Master_Parcels_261015',encoding='utf-8'); F=[f[0] for f in sf.fields[1:]]
D=json.load(open(sys.argv[1])); ex={r['id']:r['unit'] for r in D}
bx=sf.bbox; X0,Y1=bx[0],bx[3]
tr=lambda x,y:(round(x-X0),round(Y1-y))
def path(g):
    out=[]
    for p in ([g] if g.geom_type=='Polygon' else list(g.geoms)):
        for ring in [p.exterior,*p.interiors]:
            out.append('M'+'L'.join(f'{a} {b}' for a,b in [tr(x,y) for x,y,*_ in ring.coords])+'Z')
    return ''.join(out)
T=[]; byU=defaultdict(list)
for sr in sf.iterShapeRecords():
    r=dict(zip(F,sr.record)); g=shape(sr.shape.__geo_interface__)
    g=(g if g.is_valid else g.buffer(0)).simplify(2,preserve_topology=True)
    if g.is_empty: continue
    u=ex.get(r['TractID']); su=(r['Unit'] or '').strip()
    lp=g.representative_point(); b=g.bounds
    T.append({'id':r['TractID'],'u':u,'su':su or None,'ut':str(r['Unit_Tract'] or ''),'note':r['NOTE'] or None,'d':path(g),'l':tr(lp.x,lp.y),'b':[*tr(b[0],b[3]),*tr(b[2],b[1])]})
    gk=u if (u and u!='OUTSIDE') else (('ctx:'+su) if su else None)
    if gk: byU[gk].append(g.buffer(1))
U=[]
for k,gs in byU.items():
    g=unary_union(gs).buffer(-1).simplify(4); lp=g.representative_point(); b=g.bounds
    U.append({'u':k.replace('ctx:',''),'ctx':k.startswith('ctx:'),'d':path(g),'l':tr(lp.x,lp.y),'b':[*tr(b[0],b[3]),*tr(b[2],b[1])]})
json.dump({'w':round(bx[2]-bx[0]),'h':round(bx[3]-bx[1]),'t':T,'u':U},open(sys.argv[2],'w'),separators=(',',':'))
print(len(T),'tracts',[(x['u'],x['ctx']) for x in U])
miss=sorted({i for i in ex if i not in {t['id'] for t in T}}); print('export tracts with no shape:',len(miss),miss)
