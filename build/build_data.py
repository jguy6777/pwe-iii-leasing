import openpyxl,json,datetime,sys
from collections import defaultdict
src,out=sys.argv[1],sys.argv[2]
ws=openpyxl.load_workbook(src,data_only=True,read_only=True).worksheets[0]
rows=list(ws.iter_rows(values_only=True)); H=rows[0]; D=[dict(zip(H,r)) for r in rows[1:] if any(r)]
def dt(v): return v.strftime('%Y-%m-%d') if isinstance(v,(datetime.date,datetime.datetime)) else (v or None)
def num(v):
    try: return None if v is None or v=='' else float(v)
    except: return None
def les(v): return str(v).strip().rstrip('.').strip() if v else None
g=defaultdict(list)
for i,d in enumerate(D): g[(d['TR_NUM'],d['ASSOCIATEID'])].append(i)
cnt=[0.0]*len(D); dupf=[0]*len(D)
for k,ix in g.items():
    lead=next((i for i in ix if D[i]['LEASING_STATUS']=='LEASED'),ix[0])
    for i in ix:
        if i==lead: cnt[i]=num(D[i]['NET_AC']) or 0
        elif len(ix)>1: dupf[i]=1
# Same owner can hold separate interests in one tract under different leases (e.g. Freda Gail Nix, Summers tract 12).
# If dropping repeats leaves the tract under 100% and keeping them all lands at <=100%, keep them all.
bt=defaultdict(list)
for i,d in enumerate(D): bt[d['TR_NUM']].append(i)
for t,ix in bt.items():
    kept=sum(num(D[i]['MIN_INT']) or 0 for i in ix if not dupf[i]); full=sum(num(D[i]['MIN_INT']) or 0 for i in ix)
    if any(dupf[i] for i in ix) and kept<0.999 and full<=1.001:
        for i in ix:
            if dupf[i]: dupf[i]=0; cnt[i]=num(D[i]['NET_AC']) or 0
O=[]
for i,d in enumerate(D):
    O.append({'id':d['TR_NUM'],'unit':d['CLIENT_UNIT'] or 'OUTSIDE','abs':d['ABSTRACT'],'cty':d['TRACT_COUNTY'],'tac':num(d['TRACT_ACRES']),'int':num(d['MIN_INT']),
      'nac':num(d['NET_AC']),'cac':cnt[i],'dup':dupf[i],'oid':d['ASSOCIATEID'],'owner':d['MINERAL_OWNER'] or '(No owner name)','addr':(d['ADDRESS'] or '').strip(' ,') or None,
      'phone':d['PHONE_NO'],'held':d['HELD_BY'],'title':d['TITLE_STATUS'],'ls':d['LEASING_STATUS'] or 'UNLEASED','sym':d['SYMBOL'],
      'lessor':d['LESSOR'],'lessee':les(d['CURRENT_LESSEE']),'lno':d['BRK_LSE_NO'],'vp':d['VOL_PAGE'],'form':(d['LEASE_FORM'] if d['LEASE_FORM'] not in (0,'0') else None),
      'eff':dt(d['EFFECTIVE_DATE']),'exp':dt(d['EXPIRATION_DATE']),'lgac':num(d['LSE_GROSS_AC']),'lnac':num(d['LSE_NET_AC']),
      'bonus':num(d['BONUS_PER_AC']),'roy':num(d['ROYALTY']),'term':d['TERM']})
json.dump(O,open(out,'w'),separators=(',',':'))
print(len(O),'rows', sum(dupf),'repeat rows')
