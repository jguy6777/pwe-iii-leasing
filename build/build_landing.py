"""Build the PWE projects landing page (repo root index.html).

Each project card shows the same totals as that project's dashboard with no filters:
plat/tract acres, net acres, leased and unleased net acres, % leased, tracts, owners,
plus a small map of its units (or township groups) shaded by lease status.
usage: python3 build_landing.py <out.html>
"""
import json, re, sys
from html import escape

OUT = 'OUTSIDE'
PROJECTS = [
    dict(key='pwe-iii', code='PWE III', region='Harrison County, Texas', updated='Oct 14, 2026',
         data='pwe_1014.json', geo='geo_1015.json', plats='v3/_plats_pwe3.js', group='units', group1='unit',
         acres_label='Unit acres (plats)'),
    dict(key='pwe-iv', code='PWE IV', region='Natchitoches & Red River Parishes, Louisiana', updated='Oct 15, 2026',
         data='pwe4_1015.json', geo='geo4_1015.json', plats='v3/_plats_pwe4.js', group='townships', group1='township',
         acres_label='Tract acres', note='No units or survey plats yet · grouped by township-range'),
]

def offplat(plats_js):
    m = re.search(r"OFFPLAT=new Set\(\[([^\]]*)\]\)", open(plats_js).read())
    return set(re.findall(r"'([^']+)'", m.group(1))) if m else set()

def stats(p):
    D = json.load(open(p['data'])); off = offplat(p['plats'])
    rows = [r for r in D if (r['unit'] or OUT) != OUT]
    cnt = [r for r in rows if not r['dup']]
    net = sum(r['nac'] or 0 for r in cnt); leased = sum(r['nac'] or 0 for r in cnt if r['ls'] == 'LEASED')
    tac = {}
    for r in rows:
        if r['id'] not in off: tac[r['id']] = r['tac'] or 0
    groups = {}
    for r in cnt:
        g = groups.setdefault(r['unit'], [0, 0]); g[0] += r['nac'] or 0
        if r['ls'] == 'LEASED': g[1] += r['nac'] or 0
    return dict(net=net, leased=leased, unleased=net - leased, pct=leased / net if net else 0,
                acres=sum(tac.values()), tracts=len({r['id'] for r in rows}),
                owners=len({r['oid'] if r['oid'] is not None else r['owner'] for r in rows}),
                groups={k: (v[1] / v[0] if v[0] else 0) for k, v in groups.items()})

def minimap(p, gp):
    """Tracts shaded like the dashboard map (leased / partial / unleased), unit outlines on top."""
    G = json.load(open(p['geo'])); D = json.load(open(p['data']))
    tot, lea = {}, {}
    for r in D:
        if r['dup'] or (r['unit'] or OUT) == OUT: continue
        tot[r['id']] = tot.get(r['id'], 0) + (r['nac'] or 0)
        if r['ls'] == 'LEASED': lea[r['id']] = lea.get(r['id'], 0) + (r['nac'] or 0)
    us = [u for u in G['u'] if not u.get('ctx') and u['u'] in gp]
    ts = [t for t in G['t'] if t['id'] in tot]
    x0 = min(u['b'][0] for u in us); y0 = min(u['b'][1] for u in us)
    x1 = max(u['b'][2] for u in us); y1 = max(u['b'][3] for u in us)
    pad = max(x1 - x0, y1 - y0) * .04
    vb = f'{x0 - pad:.0f} {y0 - pad:.0f} {x1 - x0 + 2 * pad:.0f} {y1 - y0 + 2 * pad:.0f}'
    sw = max(x1 - x0, y1 - y0) / 400
    out = []
    for t in ts:
        q = lea.get(t['id'], 0) / tot[t['id']] if tot[t['id']] else 0
        fill = 'var(--leased)' if q >= .9999 else 'var(--unleased)' if q <= 1e-9 else f'url(#hatch-{p["key"]})'
        out.append(f'<path d="{t["d"]}" fill="{fill}"/>')
    lines = ''.join(f'<path d="{u["d"]}" fill="none" stroke="var(--panel)" stroke-width="{sw * 2.2:.0f}" stroke-linejoin="round"/>' for u in us)
    s = sw * 22
    return (f'<svg class="mini" viewBox="{vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of {p["code"]} tracts by lease status">'
            f'<defs><pattern id="hatch-{p["key"]}" patternUnits="userSpaceOnUse" width="{s:.0f}" height="{s:.0f}" patternTransform="rotate(45)">'
            f'<rect width="{s:.0f}" height="{s:.0f}" fill="var(--leased)"/><rect width="{s * .43:.0f}" height="{s:.0f}" fill="var(--unleased)"/></pattern></defs>'
            f'<g stroke="var(--panel)" stroke-width="{sw * .6:.0f}" stroke-linejoin="round">' + ''.join(out) + '</g>' + lines + '</svg>')

fmt = lambda n, d=0: f'{n:,.{d}f}'
cards = []
for p in PROJECTS:
    s = stats(p)
    note = f'<p class="pnote">{escape(p["note"])}</p>' if p.get('note') else ''
    cards.append(f'''
    <a class="card" href="{p['key']}/">
      <div class="ctop">
        <div><div class="upd">Mapper export · {p['updated']}</div><h2>{p['code']}</h2><div class="reg">{escape(p['region'])}</div></div>
        <div class="big"><b>{s['pct'] * 100:.1f}%</b><span>of net acres leased</span></div>
      </div>
      <div class="bar" role="img" aria-label="{s['pct'] * 100:.1f}% leased"><i style="width:{s['pct'] * 100:.3f}%"></i></div>
      <div class="cbody">
        {minimap(p, s['groups'])}
        <dl>
          <div><dt>{p['acres_label']}</dt><dd>{fmt(s['acres'], 3)}<small>ac</small></dd></div>
          <div><dt>Net acres</dt><dd>{fmt(s['net'], 2)}<small>ac</small></dd></div>
          <div><dt><i class="sw" style="background:var(--leased)"></i>Leased</dt><dd>{fmt(s['leased'], 2)}<small>ac</small></dd></div>
          <div><dt><i class="sw" style="background:var(--unleased)"></i>Unleased</dt><dd>{fmt(s['unleased'], 2)}<small>ac</small></dd></div>
          <div><dt>Tracts</dt><dd>{fmt(s['tracts'])}</dd></div>
          <div><dt>{p['group'].capitalize()}</dt><dd>{fmt(len(s['groups']))}</dd></div>
        </dl>
      </div>
      {note}
      <span class="open">Open {p['code']} dashboard <span aria-hidden="true">→</span></span>
    </a>''')

shell = open('v3/shell.html').read()
tokens = shell[shell.index(':root{'):shell.index('*{box-sizing:border-box}')]
logo = open('v3/_logo.txt').read(); seg = open('v3/_seglogo.txt').read()
latest = 'October 15, 2026'
_q = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M8 5.5v13l10.5-6.5z"/></svg>'
tourbtns = f'<a class="tgo" href="{PROJECTS[0]["key"]}/?tour">{_q}Take the tour</a>'  # one tour for every project; it runs on the first project's page
html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PWE Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap">
<style>
{tokens}
*{{box-sizing:border-box}}
html{{background:var(--bg)}}
body{{margin:0;background:var(--bg);color:var(--text-hi);font:14px/1.45 var(--f-b);font-variant-numeric:tabular-nums}}
:focus-visible{{outline:2px solid var(--wave);outline-offset:3px}}
.wrap{{max-width:1240px;margin:0 auto;padding:24px 24px 48px}}
.head{{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:22px}}
.brand{{display:flex;align-items:center;gap:18px;flex-wrap:wrap;min-width:0}}
.logo{{height:62px;width:auto;max-width:100%;border-radius:10px;background:#fff;padding:4px 8px;border:1px solid var(--border-soft)}}
.upd{{font:500 10.5px var(--f-m);letter-spacing:.02em;color:var(--text-mid);margin-bottom:4px}}
h1{{margin:0;font:600 22px/1.2 var(--f-d);letter-spacing:-.01em;color:var(--pine-ink)}}
.sub{{font-size:13px;color:var(--text-mid);margin-top:3px}}
.hside{{display:flex;align-items:flex-end;gap:12px}}
.hcol{{display:grid;justify-items:end;gap:8px}}
.seglogo{{width:28px;height:28px;display:block;opacity:.95}}
.datepill{{border:1px solid var(--border);background:var(--panel);border-radius:12px;padding:9px 16px;font:600 15px var(--f-d);white-space:nowrap}}
.tbtn{{border:1px solid var(--border);background:var(--panel);color:var(--text-mid);border-radius:12px;padding:9px 14px;font:600 15px var(--f-d);line-height:normal;cursor:pointer}}
.datepill{{line-height:normal}}
.tbtn:hover{{color:var(--text-hi);background:var(--panel-2)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:20px}}
.card{{display:flex;flex-direction:column;gap:16px;background:var(--panel);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);padding:22px 22px 18px;color:inherit;text-decoration:none;transition:border-color .15s,transform .15s}}
.card:hover{{border-color:var(--wave);transform:translateY(-1px)}}
.ctop{{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}}
.card h2{{margin:0;font:600 26px/1.15 var(--f-d);letter-spacing:-.01em;color:var(--pine-ink)}}
.reg{{font-size:13px;color:var(--text-mid);margin-top:2px}}
.big{{text-align:right}}
.big b{{display:block;font:700 30px/1 var(--f-m);color:var(--leased)}}
.big span{{font-size:11.5px;color:var(--text-lo)}}
.bar{{height:10px;border-radius:999px;background:var(--unleased);overflow:hidden}}
.bar i{{display:block;height:100%;background:var(--leased);border-right:2px solid var(--panel)}}
.cbody{{display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr);gap:20px;align-items:center}}
.mini{{width:100%;height:190px;display:block;background:var(--panel-2);border:1px solid var(--border-soft);border-radius:12px}}
dl{{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}}
dt{{font-size:11.5px;color:var(--text-lo);display:flex;align-items:center;gap:6px}}
dd{{margin:2px 0 0;font:600 16px var(--f-m);color:var(--text-hi)}}
dd small{{font:500 11px var(--f-b);color:var(--text-lo);margin-left:3px}}
.sw{{width:9px;height:9px;border-radius:2px;display:inline-block}}
.pnote{{margin:0;font-size:12px;color:var(--text-lo)}}
.open{{margin-top:auto;align-self:flex-start;font:600 13px var(--f-b);color:var(--nav-on-fg);background:var(--nav-on);border-radius:10px;padding:9px 14px}}
.tourband{{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px 20px;background:var(--panel);border:1px solid var(--border);border-left:4px solid var(--wave);border-radius:14px;padding:14px 18px;margin-bottom:20px;box-shadow:var(--shadow)}}
.tourband b{{display:block;font:600 16px var(--f-d);color:var(--pine-ink)}}
.tourband p{{margin:2px 0 0;font-size:13px;color:var(--text-mid)}}
.tacts{{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}}
.tgo{{display:inline-flex;align-items:center;gap:8px;font:600 13px var(--f-b);color:var(--nav-on-fg);background:var(--nav-on);border-radius:10px;padding:9px 14px;text-decoration:none}}
.tgo.alt{{background:var(--panel);color:var(--pine-ink);border:1px solid var(--border)}}
.tgo:hover{{filter:brightness(1.08)}}
.tgo svg{{width:16px;height:16px}}
.foot{{margin-top:26px;text-align:center;font:500 11px var(--f-m);color:var(--text-lo)}}
@media (max-width:900px){{.tourband{{grid-template-columns:1fr}}}}
@media (max-width:560px){{.wrap{{padding:16px 16px 40px}}.cbody{{grid-template-columns:1fr}}.mini{{height:170px}}.ctop{{flex-direction:column}}.big{{text-align:left}}.datepill{{display:none}}}}
</style></head>
<body>
<div class="wrap">
  <header class="head">
    <div class="brand"><img class="logo" src="{logo}" alt="Pine Wave Energy Partners">
      <div><div class="upd">Leased net acres by project</div><h1>PWE Dashboard</h1><div class="sub">Pine Wave Energy Partners · pick a project to open its dashboard</div></div></div>
    <div class="hside"><button class="tbtn" type="button" id="theme">Dark</button>
      <div class="hcol"><img class="seglogo" src="{seg}" alt="Schoeffler Energy Group" title="Prepared by Schoeffler Energy Group"><div class="datepill">{latest}</div></div></div>
  </header>
  <section class="tourband" aria-label="Guided tour">
    <div><b>New to the dashboard?</b><p>Take a two-minute guided tour. It walks you through each view, the map and the records, right on the live dashboard, and the same steps work on every PWE project.</p></div>
    <div class="tacts">{tourbtns}</div>
  </section>
  <main class="grid">{''.join(cards)}
  </main>
  <p class="foot">status = LEASING_STATUS · acres = NET_AC · each owner interest counted once per tract</p>
</div>
<script>
(function(){{ const root=document.documentElement, mq=matchMedia('(prefers-color-scheme: dark)'), b=document.getElementById('theme');
  const cur=()=>root.getAttribute('data-theme')||(mq.matches?'dark':'light'), lab=()=>{{ b.textContent=cur()==='dark'?'Light':'Dark'; }};
  try{{ const s=localStorage.getItem('pwe-theme'); if(s==='light'||s==='dark') root.setAttribute('data-theme',s); }}catch(e){{}}
  lab(); mq.addEventListener&&mq.addEventListener('change',lab);
  b.onclick=()=>{{ const n=cur()==='light'?'dark':'light'; root.setAttribute('data-theme',n); try{{ localStorage.setItem('pwe-theme',n); }}catch(e){{}} lab(); }}; }})();
</script>
</body></html>
'''
open(sys.argv[1], 'w').write(html)
print(sys.argv[1], f'{len(html):,} bytes')
for p in PROJECTS:
    s = stats(p); print(p['code'], {k: (round(v, 3) if isinstance(v, float) else v) for k, v in s.items() if k != 'groups'})
