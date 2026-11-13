# Generates the static mockups from real EE catalog rows (data/processed-products.json, Sep 28 2026 snapshot).
import html
I="img/"
BOLT='<svg viewBox="0 0 10 12"><path d="M6 0 0 7h4l-1 5 7-8H6l1-4z"/></svg>'
ICON={
 'search':'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 'cart':'<svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
 'plus':'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 'menu':'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
 'grid':'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>',
 'phone':'<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 0-2 2A16 16 0 0 1 3 6a2 2 0 0 0 2-2"/></svg>',
 'truck':'<svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
 'ret':'<svg viewBox="0 0 24 24"><path d="M4 10h11a5 5 0 0 1 0 10h-3"/><path d="m8 6-4 4 4 4"/></svg>',
 'lock':'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
 'doc':'<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/></svg>',
 'chev':'<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
 'down':'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
 'check':'<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
 'x':'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 'list':'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
 'pin':'<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
}
# real catalog rows (prices as listed on energizedengines.com in the Sep 28 2026 snapshot)
P={
 '1021':dict(pn='EE 1021',name='Outrigger Caster Kit for Series 2000 and 2100',price=69.60,oem='779002',oemp=112.00,img='outrigger-caster-kit-for-series-2000-and-0.jpg',fits=['2000','2100'],brand='ee'),
 '1017':dict(pn='EE 1017',name='Dolly Wheel, single, for Series 2000 and 2100',price=54.00,oem='779011',oemp=115.00,img='dolly-wheel-individual-for-series-2000-a-0.jpg',fits=['2000','2100'],brand='ee'),
 '1004':dict(pn='EE 1004',name='Load Line Cable for Roust-A-Bout 150, 180, 250',price=120.00,oem='780051',oemp=226.00,img='load-line-cable-eventer-or-2000-series-0.jpg',fits=['R-150','R-180','R-250'],brand='ee'),
 '1069':dict(pn='EE 1069',name='Mast Roller, remanufactured, Series 2000 and 2100',price=18.00,oem='783540',oemp=33.00,img='ee-reman-mast-roller-0.jpg',fits=['2000','2100'],brand='ee'),
 '2019':dict(pn='EE 2019',name='Pull Handle, old style 2 Ton Gantry',price=85.00,oem='785991',oemp=387.00,img='ee-2019-gantry-pull-handle-785991-old-st-0.jpg',fits=['Gantry'],brand='ee'),
 '1015':dict(pn='EE 1015',name='Mast Cover, plastic, top, Series 2100',price=42.00,oem='783919',oemp=68.00,img='mast-cover-plastic-top-2100-0.jpg',fits=['2100','2000'],brand='ee'),
 '2012':dict(pn='EE 2012',name='Mast Brace, right, Series 2000, 2100 and Eventer',price=39.00,oem='780820',oemp=62.00,img='aftermarket-mast-brace-right-2000-2100-2-0.jpg',fits=['2000','2100','Eventer'],brand='ee'),
 '1001':dict(pn='EE 1001',name='Load Line Cable, Series 2100',price=53.00,oem='783628',oemp=60.00,img='load-line-cable-2100-series-0.jpg',fits=['2112','2118','2124'],brand='ee'),
 '2010':dict(pn='EE 2010',name='4 in. Sheave for Roust-A-Bout',price=90.30,oem='780046',oemp=129.00,img='aftermarket-4in-sheave-ee-2010-roust-a-b-0.jpg',fits=['Roust-A-Bout'],brand='ee'),
 '1019':dict(pn='EE 1019',name='Dolly Wheel, single, for Series 2400',price=70.00,oem='779031',oemp=124.00,img='dolly-wheel-individual-for-series-2400-0.jpg',fits=['2400'],brand='ee'),
 '2020':dict(pn='EE 2020',name='Sound Array Bar for Eventer 20 and 25',price=500.00,oem='784060',oemp=660.00,img='aftermarket-sound-array-bar-eventer-20-2-1.jpg',fits=['Eventer 20','Eventer 25'],brand='ee'),
 's785991':dict(pn='785991',name='Pull Handle Assembly, 2 Ton Gantry',price=387.00,img='sumner-785991-pull-handle-assembly-gantr-0.jpg',fits=['Gantry'],brand='oem',man=True,ver=True),
 's783540':dict(pn='783540',name='Mast Roller',price=33.00,img='sumner-783540-mast-roller-4-0.jpg',fits=['2000'],brand='oem',man=True),
 's779002':dict(pn='779002',name='Caster, Stem with Spacer',price=112.00,img='sumner-779002-caster-stem-w-spacer-2-0.jpg',fits=['2000'],brand='oem',man=True),
}
def money(x): return f"${x:,.2f}"
def save(p): return round(100*(p['oemp']-p['price'])/p['oemp'])
def stock_html(st):
    return {'ok':'<span class="stock st-ok">In stock</span>','low':'<span class="stock st-low">Only 2 left</span>',
            'back':'<span class="stock st-back">Backorder<span class="l">, ships in 2 to 3 weeks</span></span>','out':'<span class="stock st-out">Out of stock</span>'}[st]
def card(k,st='ok',flag=None):
    p=P[k]
    tl=(f'<span class="badge b-ee">{BOLT}EE brand</span>' if p['brand']=='ee' else '<span class="badge b-oem">Sumner OEM</span>')
    if p['brand']=='ee': tl+=f'<span class="badge b-save">Save {save(p)}%</span>'
    if p.get('man'): tl+='<span class="badge b-man">Diagram</span>'
    rep=f'<div class="pn">{p["pn"]}<span class="rep">{" &middot; replaces "+p["oem"] if p.get("oem") else ""}</span></div>'
    fits=''.join(f'<span class="chip sm">{f}</span>' for f in p['fits'][:3])
    was=f'<s>Sumner {money(p["oemp"])}</s>' if p.get('oemp') else ''
    qa=f'<button class="qa{" dis" if st=="out" else ""}" aria-label="Add to cart">{ICON["plus"]}</button>' if st!='out' else '<button class="btn btn-sec btn-sm" style="height:40px">Notify me</button>'
    return f'''<a class="card" href="product.html"><div class="im"><div class="tl">{tl}</div><img src="{I}{p['img']}" alt=""></div>
<div class="bd">{rep}<div class="nm">{html.escape(p['name'])}</div><div class="fits"><span class="muted-s">Fits</span>{fits}</div>
<div class="pr"><b>{money(p['price'])}</b>{was}</div><div class="ft">{stock_html(st)}{qa}</div></div></a>'''

def head(title,extra=''):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>{title} | Energized Engines (test)</title>
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="site.css"><link rel="stylesheet" href="pages.css">{extra}</head><body>'''
def banner():
    return '''<div class="test-banner d-only">Test site. Nothing here is for sale and no orders are taken. Shop at <a href="https://www.energizedengines.com">energizedengines.com</a></div>
<div class="test-banner m-only" style="justify-content:center">Test site. Order at&nbsp;<a href="https://www.energizedengines.com">energizedengines.com</a></div>'''
def util():
    return f'''<div class="util"><div class="wrap"><span>{ICON['truck'].replace('<svg','<svg class="ic"')}<b>Free ground shipping</b> on orders over $150, Lower 48</span>
<span>{ICON['pin'].replace('<svg','<svg class="ic"')}Free local delivery within 10 miles of Jersey Village, TX</span><span class="sp"></span>
<span>{ICON['ret'].replace('<svg','<svg class="ic"')}30-day returns on unused parts</span><span>{ICON['phone'].replace('<svg','<svg class="ic"')}Call or text <b>832-444-5426</b></span></div></div>'''
def search(q='',ta=False):
    t=''
    if ta: t='''<div class="ta"><div class="grp">Parts</div>
<div class="it on"><img src="img/outrigger-caster-kit-for-series-2000-and-0.jpg" alt=""><div><div class="t">Outrigger Caster Kit for Series 2000 and 2100</div><div class="pn">EE 1021 &middot; replaces <mark>7790</mark>02</div></div><div class="p">$69.60</div></div>
<div class="it"><img src="img/sumner-779002-caster-stem-w-spacer-2-0.jpg" alt=""><div><div class="t">Caster, Stem with Spacer (Sumner OEM)</div><div class="pn"><mark>7790</mark>02</div></div><div class="p">$112.00</div></div>
<div class="it"><img src="img/dolly-wheel-individual-for-series-2000-a-0.jpg" alt=""><div><div class="t">Dolly Wheel, single, for Series 2000 and 2100</div><div class="pn">EE 1017 &middot; replaces <mark>7790</mark>11</div></div><div class="p">$54.00</div></div>
<div class="it"><img src="img/dolly-wheel-individual-for-series-2400-0.jpg" alt=""><div><div class="t">Dolly Wheel, single, for Series 2400</div><div class="pn">EE 1019 &middot; replaces <mark>7790</mark>31</div></div><div class="p">$70.00</div></div>
<div class="grp">Lift models</div><div class="model"><span class="chip">Series 2000</span><span class="chip">Series 2100</span><span class="chip">Series 2400</span></div>
<div class="ta-foot">See all 14 results for "7790"</div></div>'''
    return f'''<div class="search"><form role="search"><input type="search" value="{q}" placeholder="Search part number, model or keyword" aria-label="Search part number, model or keyword"><button aria-label="Search">{ICON['search']}</button></form>{t}</div>'''
def header(q='',ta=False,cart=2):
    return f'''{banner()}{util()}<header class="hdr"><div class="wrap"><div class="row">
<button class="icon-btn m-only" aria-label="Menu">{ICON['menu']}</button>
<a class="logo" href="home.html"><img src="img/logo.png" alt="Energized Engines"></a>
<div class="d-only" style="flex:1;display:flex;justify-content:center">{search(q,ta)}</div><span class="sp m-only"></span>
<div class="hdr-actions"><div class="hdr-phone d-only">Questions? Call or text<b>832-444-5426</b></div>
<a class="icon-btn m-only" href="tel:+18324445426" aria-label="Call">{ICON['phone']}</a>
<a class="icon-btn cart-btn" href="#" aria-label="Cart, {cart} items">{ICON['cart']}<span class="count">{cart}</span></a></div></div>
<div class="m-only m-search">{search(q)}</div></div></header>
<nav class="nav d-only"><div class="wrap"><a class="primary" href="#">{ICON['grid']}Shop by lift model{ICON['down']}</a>
<a href="#">Series 2000</a><a href="#">Series 2100</a><a href="#">Series 2400</a><a href="#">Roust-A-Bout</a><a href="#">Eventer</a><a href="#">Gantry</a>
<span class="sp"></span><a href="#">Manuals and diagrams</a><a class="ee" href="#">EE brand parts</a></div></nav>'''
def footer(note):
    return f'''<footer class="foot"><div class="wrap"><div class="cols">
<div><img src="img/logo.png" alt="Energized Engines" style="height:40px;margin-bottom:16px"><p style="margin:0 0 12px;max-width:340px">Sumner lift parts, EE brand replacement parts, lift rentals and winch rebuilds. Jersey Village, TX.</p>
<p style="margin:0;color:#fff;font-weight:600">832-444-5426 &middot; Sales@EnergizedEngines.com</p></div>
<div><h4>Shop</h4><a>Shop by lift model</a><a>EE brand parts</a><a>Decals and labels</a><a>Load lines and cable</a><a>Wheels and casters</a></div>
<div><h4>Help</h4><a>Find your model number</a><a>Manuals and diagrams</a><a>Shipping</a><a>Returns</a><a>Contact us</a></div>
<div><h4>Services</h4><a>Lift rentals</a><a>Winch rebuilds</a><a>About us</a></div></div>
<div class="legal"><span>&copy; 2026 Energized Engines. Sumner is a trademark of its owner. Sumner part numbers are shown for reference.</span><span>Secure checkout by Stripe</span></div></div></footer>
<div class="mocknote">Mockup note: {note}</div></body></html>'''

# ---------------- HOME ----------------
PLATE='''<svg viewBox="0 0 320 180" class="plate" aria-hidden="true"><rect x="6" y="6" width="308" height="168" rx="10" fill="#E9ECEF" stroke="#9AA2AC" stroke-width="2"/>
<circle cx="24" cy="24" r="5" fill="#9AA2AC"/><circle cx="296" cy="24" r="5" fill="#9AA2AC"/><circle cx="24" cy="156" r="5" fill="#9AA2AC"/><circle cx="296" cy="156" r="5" fill="#9AA2AC"/>
<text x="40" y="58" font-family="Inter" font-size="13" font-weight="600" fill="#4A525D">MODEL NO.</text><rect x="40" y="66" width="240" height="34" rx="4" fill="#fff" stroke="#EA0917" stroke-width="2.5"/>
<text x="52" y="90" font-family="JetBrains Mono" font-size="18" font-weight="600" fill="#14171C">2118</text>
<text x="40" y="126" font-family="Inter" font-size="13" font-weight="600" fill="#4A525D">SERIAL NO.</text><rect x="40" y="134" width="240" height="28" rx="4" fill="#fff" stroke="#CDD2D8"/>
<text x="52" y="153" font-family="JetBrains Mono" font-size="14" fill="#6B737E">Have it ready</text></svg>'''
SERIES=[('Series 2000','2010 2015 2020 2025',246),('Series 2100','2112 2118 2124',207),('Series 2200','2208 2210',83),('Series 2300','All 2300 models',119),
        ('Series 2400','2412 2416',104),('Roust-A-Bout','R-100 R-150 R-180 R-250',183),('Eventer','16 20 25',209),('Gantry and hoists','2 Ton Gantry, GH2T',174)]
def home(ta=False):
    tiles=''.join(f'<a class="mtile" href="listing.html"><div><h3>{n}</h3><div class="mono models">{m}</div></div><div class="mt-f"><span class="num">{c} parts</span>{ICON["chev"]}</div></a>' for n,m,c in SERIES)
    pop=''.join(card(k,st) for k,st in [('1021','ok'),('1069','ok'),('1004','ok'),('2012','low'),('1017','ok'),('s785991','ok'),('1001','ok'),('2010','back')])
    cmp_=''
    for k in ['2019','1004','1017','1021']:
        p=P[k]
        cmp_+=f'''<a class="cmp" href="product.html"><img src="{I}{p['img']}" alt=""><div class="cmp-b"><div class="pn">{p['pn']} &middot; replaces Sumner {p['oem']}</div><div class="cmp-n">{p['name']}</div>
<div class="cmp-p"><div><span>EE brand</span><b class="num">{money(p['price'])}</b></div><div><span>Sumner part</span><s class="num">{money(p['oemp'])}</s></div><span class="badge b-save big">Save {save(p)}%</span></div></div></a>'''
    mans=[('Series 2000 Lift Assembly Exploded Diagram','2010, 2015, 2020, 2025'),('Series 2100 Lift Assembly Exploded Diagram','2112, 2118, 2124'),('Series 2200 Lift Assembly Exploded Diagram','2208, 2210'),('2 Ton Gantry Assembly Exploded Diagram','Gantry')]
    manl=''.join(f'<a class="man" href="#">{ICON["doc"]}<div><b>{t}</b><span>Fits {m} &middot; PDF</span></div>{ICON["chev"]}</a>' for t,m in mans)
    return head('Sumner lift parts')+header('7790' if ta else '',ta)+f'''
<main>
<section class="hero"><div class="wrap hero-g">
<div class="hero-l"><div class="eyebrow">Sumner lift parts &middot; OEM and EE brand</div><h1>Find parts for your lift</h1>
<p class="lede">Pick your Sumner series and model to see every part that fits it, or search by part number.</p>
<div class="finder"><div class="f-row">
<label class="sel"><span>Series</span><div class="selbox">Series 2100{ICON['down']}</div></label>
<label class="sel"><span>Model</span><div class="selbox">2118{ICON['down']}</div></label>
<button class="btn btn-pri f-go">Show parts for 2118</button></div>
<div class="f-or"><span>or</span></div>
<div class="f-pn"><label class="sel" style="flex:1"><span>Part number</span><div class="selbox inp"><span class="mono" style="color:#6B737E">e.g. 779002</span></div></label><button class="btn btn-dark f-go2">Search</button></div></div>
<div class="hero-stats"><div><b class="num">2,369</b><span>parts listed</span></div><div><b class="num">36</b><span>Sumner models</span></div><div><b class="num">123</b><span>EE brand parts</span></div></div></div>
<div class="hero-r"><div class="plate-card"><div class="eyebrow" style="color:var(--ink-2)">Not sure of your model?</div><h3 style="margin:6px 0 4px">It's on the plate on the mast</h3>
<p>The model number is stamped on the ID plate near the base of the mast. Have the serial number too if you call us.</p>{PLATE}
<a class="link" href="#" style="font-weight:600;font-size:14px">Where to find the plate on each series</a></div></div></div></section>

<section class="sec"><div class="wrap"><div class="sec-h"><div><h2>Shop by lift model</h2><p>Every part we list, sorted by the Sumner lift it fits.</p></div><a href="#">All 36 models</a></div>
<div class="mgrid">{tiles}</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-h"><div><h2>Popular parts</h2><p>Wear parts people reorder most: rollers, casters, load lines and braces.</p></div><a href="#">See all parts</a></div>
<div class="grid-cards">{pop}</div></div></section>

<section class="eeband"><div class="wrap"><div class="sec-h"><div><div class="eyebrow" style="color:var(--on-dark-2)">EE brand</div><h2>Our own replacement parts, priced below the Sumner part</h2>
<p>Aftermarket and remanufactured parts that replace a Sumner part number. Every product page shows both side by side.</p></div><a href="#" style="color:#fff">Shop all 123 EE brand parts</a></div>
<div class="cmpgrid">{cmp_}</div></div></section>

<section class="trust"><div class="wrap tgrid">
<div>{ICON['truck']}<div><b>Free ground shipping over $150</b><span>Lower 48. Free local delivery within 10 miles of Jersey Village, TX.</span></div></div>
<div>{ICON['ret']}<div><b>30-day returns</b><span>Unused parts in the original packaging.</span></div></div>
<div>{ICON['phone']}<div><b>Talk to a parts person</b><span>Call or text 832-444-5426 with your model and serial.</span></div></div>
<div>{ICON['lock']}<div><b>Secure checkout</b><span>Card payments handled by Stripe. We never see your card number.</span></div></div></div></section>

<section class="sec"><div class="wrap man-g"><div><div class="eyebrow">Manuals and diagrams</div><h2 style="margin:6px 0 10px">Find the part on the exploded diagram</h2>
<p style="color:var(--ink-2);margin:0 0 20px;max-width:460px">We link 13 Sumner manuals and exploded diagrams by series. Parts we have matched to a diagram show a Diagram badge with the page number.</p>
<a class="btn btn-sec" href="#">Browse manuals and diagrams</a></div><div class="manl">{manl}</div></div></section>

<section class="svc"><div class="wrap svc-g"><div><b>Lift rentals</b><span>Sumner 2118, 2124, 2412 and 2416. Daily, weekly or monthly.</span><a class="link" href="#">Ask about rentals</a></div>
<div><b>Winch rebuilds</b><span>Send us your Sumner winch and we rebuild it.</span><a class="link" href="#">Ask about a rebuild</a></div></div></section>
</main>'''+footer('Products, prices, Sumner part numbers and catalog counts are real EE catalog data (Sep 28, 2026 snapshot). "Popular" ranking, the "Only 2 left" and backorder states, and the typeahead result count are example data. Return copy follows the draft policy, which still needs owner sign-off.')

# ---------------- PRODUCT ----------------
def product(cart=False):
    p=P['1021']
    rel=''.join(card(k) for k in ['1017','1069','1015','2012'])
    drawer=''
    if cart:
        drawer=f'''<div class="scrim"></div><aside class="drawer" aria-label="Cart"><div class="dr-h"><h3>Cart (3 items)</h3><button class="icon-btn" aria-label="Close">{ICON['x']}</button></div>
<div class="dr-added">{ICON['check']}Added Outrigger Caster Kit, qty 2</div>
<div class="dr-items">
<div class="li"><img src="img/outrigger-caster-kit-for-series-2000-and-0.jpg" alt=""><div><div class="pn">EE 1021</div><div class="li-n">Outrigger Caster Kit for Series 2000 and 2100</div><span class="stock st-ok">In stock</span><div class="qty sm"><button>&minus;</button><span>2</span><button>+</button></div></div><b class="num">$139.20</b></div>
<div class="li"><img src="img/ee-reman-mast-roller-0.jpg" alt=""><div><div class="pn">EE 1069</div><div class="li-n">Mast Roller, remanufactured, Series 2000 and 2100</div><span class="stock st-ok">In stock</span><div class="qty sm"><button>&minus;</button><span>1</span><button>+</button></div></div><b class="num">$18.00</b></div></div>
<div class="ship-meter"><div class="sm-t"><b>You get free ground shipping.</b> Your order is over $150.</div><div class="bar"><i style="width:100%"></i></div></div>
<div class="dr-f"><div class="tot"><span>Subtotal</span><b class="num">$157.20</b></div><div class="muted-s" style="margin-bottom:12px">Tax is added at checkout.</div>
<a class="btn btn-pri btn-block" href="checkout.html">{ICON['lock']}Check out</a><a class="btn btn-sec btn-block" style="margin-top:8px" href="#">View cart</a>
<div class="dr-also"><div class="eyebrow">Often bought with this</div><div class="li mini"><img src="img/dolly-wheel-individual-for-series-2000-a-0.jpg" alt=""><div><div class="li-n">Dolly Wheel, Series 2000 and 2100</div><b class="num">$54.00</b></div><button class="btn btn-sec btn-sm">Add</button></div></div></div></aside>'''
    models=[('Series 2000',['2010','2015','2020','2025']),('Series 2100',['2112','2118','2124'])]
    fitrows=''.join(f'<div class="fit-r"><b>{s}</b><div>'+''.join(f'<span class="chip">Fits Sumner {m}</span>' for m in ms)+'</div></div>' for s,ms in models)
    return head('Outrigger Caster Kit EE 1021').replace('<body>','<body class="pdp-page">')+header(cart=3 if cart else 2)+f'''
<main class="wrap pdp">
<nav class="crumbs"><a href="#">Home</a>{ICON['chev']}<a href="#">Series 2000</a>{ICON['chev']}<a href="#">Wheels and casters</a>{ICON['chev']}<span>EE 1021</span></nav>
<div class="pdp-g">
<div class="gal"><div class="thumbs"><button class="on"><img src="img/outrigger-caster-kit-for-series-2000-and-0.jpg" alt=""></button><button><img src="img/sumner-779002-caster-stem-w-spacer-2-0.jpg" alt=""></button></div>
<div class="gal-main"><img src="img/outrigger-caster-kit-for-series-2000-and-0.jpg" alt="EE 1021 outrigger caster kit, two casters"><span class="gal-c">1 / 2</span></div></div>
<div class="buy">
<div class="buy-tags"><span class="badge b-ee">{BOLT}EE brand</span><span class="badge b-man">{ICON['doc'].replace('<svg','<svg style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2"')}Diagram: Series 2000, p. 1</span></div>
<h1 class="pdp-t">Outrigger Caster Kit for Series 2000 and 2100</h1>
<div class="pdp-pn"><span>Part number</span><b class="mono">EE 1021</b><span class="sep"></span><span>Replacement for Sumner</span><b class="mono">779002</b></div>
<div class="pdp-price"><b class="num">$69.60</b><div class="pp-cmp"><span>Sumner 779002 is <s class="num">$112.00</s></span><span class="badge b-save">You save $42.40 (38%)</span></div></div>
<div class="stockbox"><div><span class="stock st-ok">In stock</span> <span class="muted-s">Ships from Jersey Village, TX</span></div>
<div class="shipby">Order in the next <b>3 hr 12 min</b> and it ships <b>Friday, Nov 13</b></div></div>
<div class="atc"><div class="qty"><button aria-label="Less">&minus;</button><span class="num">1</span><button aria-label="More">+</button></div><button class="btn btn-pri" style="flex:1">{ICON['cart'].replace('<svg','<svg style="width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2"')}Add to cart</button></div>
<div class="help">{ICON['phone']}<div><b>Not sure it fits?</b> Call or text 832-444-5426 with your model and serial number. We check before it ships.</div></div>
<div class="fitbox"><div class="fb-h"><h3>Fits these models</h3><span class="fit-flag">Fitment not yet verified</span></div>
{fitrows}<p class="muted-s" style="margin:10px 0 0">Models come from the product listing and have not been checked against the Sumner manual yet. Check your model and serial number before ordering.</p></div>
<ul class="mini-trust"><li>{ICON['truck']}Free ground shipping over $150</li><li>{ICON['ret']}30-day returns on unused parts</li><li>{ICON['lock']}Secure checkout by Stripe</li></ul>
</div></div>

<section class="pdp-sec"><h2>EE brand or Sumner OEM</h2><p class="muted-s" style="margin:4px 0 16px">Both parts are listed in our store. Pick the one that suits the job.</p>
<table class="cmpt"><thead><tr><th></th><th class="sel-col"><span class="badge b-ee">{BOLT}EE brand</span><div class="mono">EE 1021</div><div>Outrigger Caster Kit</div></th><th><span class="badge b-oem">Sumner OEM</span><div class="mono">779002</div><div>Caster, Stem with Spacer</div></th></tr></thead>
<tbody><tr><td>Price</td><td class="sel-col"><b class="num">$69.60</b> <span class="badge b-save">Save 38%</span></td><td class="num">$112.00</td></tr>
<tr><td>Availability</td><td class="sel-col"><span class="stock st-ok">In stock</span></td><td><span class="stock st-ok">In stock</span></td></tr>
<tr><td>What's in the box</td><td class="sel-col">Caster plus mounting kit</td><td>Caster with stem and spacer</td></tr>
<tr><td>Fits</td><td class="sel-col">Series 2000 and 2100</td><td>Series 2000</td></tr>
<tr><td>Exploded diagram</td><td class="sel-col">Same position as 779002</td><td><a class="link" href="#">Series 2000 diagram, p. 1</a></td></tr>
<tr><td>Warranty</td><td class="sel-col muted-s">Ask us</td><td class="muted-s">Ask us</td></tr>
<tr><td></td><td class="sel-col"><button class="btn btn-pri btn-sm">Add EE 1021</button></td><td><button class="btn btn-sec btn-sm">View Sumner 779002</button></td></tr></tbody></table></section>

<section class="pdp-sec two"><div><h2>Details</h2><p>Outrigger caster for Sumner Series 2000 and 2100 lifts, sold with a mounting kit. An aftermarket replacement for Sumner part 779002.</p>
<a class="manrow" href="#">{ICON['doc']}<div><b>Series 2000 Lift Assembly Exploded Diagram</b><span>Sumner PDF &middot; caster shown on page 1</span></div>{ICON['chev']}</a></div>
<div><h2>Specs</h2><table class="specs"><tr><td>Part number</td><td class="mono">EE 1021</td></tr><tr><td>Replaces</td><td class="mono">Sumner 779002</td></tr><tr><td>Brand</td><td>Energized Engines (EE brand)</td></tr><tr><td>Category</td><td>Wheels and casters</td></tr><tr><td>Ships from</td><td>Jersey Village, TX</td></tr><tr><td>Weight</td><td>3.2 lb <span class="ex">example</span></td></tr></table></div></section>

<section class="pdp-sec"><div class="sec-h"><div><h2>Often bought together</h2></div><a href="#">More Series 2000 parts</a></div><div class="grid-cards">{rel}</div></section>
</main>
<div class="sticky-atc m-only"><div><b class="num">$69.60</b><span class="stock st-ok">In stock</span></div><button class="btn btn-pri">Add to cart</button></div>
{drawer}'''+footer('EE 1021, Sumner 779002, both prices, photos and fitment text are real EE catalog data (Sep 28, 2026 snapshot). The ship-by cutoff, weight, Diagram badge and diagram page are example data (779002 is not in the diagram map yet). The second photo is the real Sumner 779002 listing image.')

# ---------------- LISTING ----------------
def listing():
    cards=''.join(card(k,st) for k,st in [('1021','ok'),('1069','ok'),('s783540','ok'),('2012','low'),('1017','ok'),('1015','back'),('s779002','ok'),('1001','out')])
    def fg(t,opts,open_=True):
        o=''.join(f'<label class="opt"><span class="cb{" on" if on else ""}">{ICON["check"] if on else ""}</span>{n}<span class="c num">{c}</span></label>' for n,c,on in opts)
        return f'<div class="fg"><div class="fg-h">{t}{ICON["down"]}</div>{o}</div>'
    side=fg('Model',[('2010',10,False),('2015',9,False),('2020',9,False),('2025',91,False)])+fg('Brand',[('EE brand',38,False),('Sumner OEM',234,False)])+fg('Availability',[('In stock',272,True)])+fg('Category',[('Wheels and casters',24,False),('Rollers and sheaves',18,False),('Load lines and cable',12,False),('Decals and labels',41,False),('Braces and hardware',33,False)])+fg('Has diagram',[('Matched to a diagram page',96,False)])
    return head('Series 2000 parts')+header()+f'''
<main class="wrap plp"><nav class="crumbs"><a href="#">Home</a>{ICON['chev']}<a href="#">Shop by lift model</a>{ICON['chev']}<span>Series 2000</span></nav>
<div class="plp-h"><div><h1>Series 2000 parts</h1><p>Parts for Sumner 2010, 2015, 2020 and 2025 lifts. <a class="link" href="#">Series 2000 exploded diagram (PDF)</a></p></div></div>
<div class="plp-g"><aside class="filters">{side}</aside><div>
<div class="toolbar"><div class="applied"><span class="num"><b>272</b> parts</span><span class="chip on">In stock {ICON['x']}</span><a class="link" href="#" style="font-size:14px">Clear all</a></div>
<div class="tb-r"><label class="sortb">Sort<div class="selbox sm">Best match{ICON['down']}</div></label><div class="seg"><button class="on" aria-label="Grid">{ICON['grid']}</button><button aria-label="List">{ICON['list']}</button></div></div></div>
<div class="grid-cards g3">{cards}</div>
<div class="pager"><button class="btn btn-sec btn-sm">Show 24 more</button><span class="muted-s">Showing 8 of 272</span></div>
<h3 style="margin:40px 0 12px">List view</h3>
<div class="lrows">
<div class="lrow"><img src="img/outrigger-caster-kit-for-series-2000-and-0.jpg" alt=""><div class="lr-m"><div class="pn">EE 1021 &middot; replaces 779002</div><b>Outrigger Caster Kit for Series 2000 and 2100</b><div class="fits"><span class="chip sm">2000</span><span class="chip sm">2100</span><span class="badge b-ee">{BOLT}EE brand</span></div></div><span class="stock st-ok">In stock</span><b class="num lr-p">$69.60</b><div class="qty sm"><button>&minus;</button><span>1</span><button>+</button></div><button class="btn btn-pri btn-sm">Add</button></div>
<div class="lrow"><img src="img/sumner-783540-mast-roller-4-0.jpg" alt=""><div class="lr-m"><div class="pn">783540</div><b>Mast Roller</b><div class="fits"><span class="chip sm">2000</span><span class="badge b-oem">Sumner OEM</span><span class="badge b-man">Diagram</span></div></div><span class="stock st-ok">In stock</span><b class="num lr-p">$33.00</b><div class="qty sm"><button>&minus;</button><span>1</span><button>+</button></div><button class="btn btn-pri btn-sm">Add</button></div>
<div class="lrow"><img src="img/load-line-cable-2100-series-0.jpg" alt=""><div class="lr-m"><div class="pn">EE 1001 &middot; replaces 783628</div><b>Load Line Cable, Series 2100</b><div class="fits"><span class="chip sm">2112</span><span class="chip sm">2118</span><span class="badge b-ee">{BOLT}EE brand</span></div></div><span class="stock st-out">Out of stock</span><b class="num lr-p">$53.00</b><span></span><button class="btn btn-sec btn-sm">Notify me</button></div>
</div></div></div></main>'''+footer('Parts, prices and part numbers are real EE catalog data. Model counts for 2010, 2015, 2020 and 2025 are real; brand, category and diagram counts, and the Only 2 left, backorder and out of stock states are example data.')

# ---------------- CHECKOUT ----------------
def checkout():
    return head('Checkout')+banner()+f'''<header class="hdr co-h"><div class="wrap"><div class="row"><a class="logo" href="home.html"><img src="img/logo.png" alt="Energized Engines"></a><span style="flex:1"></span><span class="co-sec">{ICON['lock']}Secure checkout</span><span class="hdr-phone d-only">Help? <b style="display:inline">832-444-5426</b></span></div></div></header>
<main class="wrap co-g"><div class="co-l">
<div class="co-step"><h3>1. Contact</h3><div class="fld"><label>Email</label><div class="inp">jordan@example.com</div></div><label class="opt"><span class="cb on">{ICON['check']}</span>Email me order and tracking updates</label></div>
<div class="co-step"><h3>2. Shipping</h3><div class="two-f"><div class="fld"><label>First name</label><div class="inp">Jordan</div></div><div class="fld"><label>Last name</label><div class="inp">Example</div></div></div>
<div class="fld"><label>Company (optional)</label><div class="inp ph">Company name</div></div><div class="fld"><label>Address</label><div class="inp">100 Example St</div></div>
<div class="three-f"><div class="fld"><label>City</label><div class="inp">Houston</div></div><div class="fld"><label>State</label><div class="inp">TX</div></div><div class="fld"><label>ZIP</label><div class="inp">77000</div></div></div>
<div class="rates"><label class="rate on"><span class="rd on"></span><div><b>Free ground shipping</b><span>3 to 5 business days</span></div><b>$0.00</b></label><label class="rate"><span class="rd"></span><div><b>2-day</b><span>Ships Friday, Nov 13</span></div><b class="num">$24.00</b></label><label class="rate"><span class="rd"></span><div><b>Free local delivery</b><span>In-stock items, within 10 miles of Jersey Village, TX</span></div><b>$0.00</b></label></div></div>
<div class="co-step"><h3>3. Payment</h3><div class="stripe"><div class="tabs"><span class="on">Card</span><span>Apple Pay</span><span>Google Pay</span><span>Bank (ACH)</span></div>
<div class="fld"><label>Card number</label><div class="inp mono">1234 1234 1234 1234</div></div><div class="two-f"><div class="fld"><label>Expiry</label><div class="inp ph">MM / YY</div></div><div class="fld"><label>CVC</label><div class="inp ph">CVC</div></div></div>
<div class="muted-s">{ICON['lock'].replace('<svg','<svg style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;vertical-align:-1px"')} Card details go straight to Stripe. We never see or store your card number.</div></div>
<div class="fld" style="margin-top:16px"><label>PO number (optional)</label><div class="inp ph">For your records</div></div>
<button class="btn btn-pri btn-block" style="height:56px;font-size:18px;margin-top:8px">Pay $170.17</button>
<p class="muted-s" style="text-align:center">Test site. This button does not charge anything.</p></div></div>
<aside class="co-r"><h3>Order summary</h3>
<div class="li"><img src="img/outrigger-caster-kit-for-series-2000-and-0.jpg" alt=""><div><div class="pn">EE 1021</div><div class="li-n">Outrigger Caster Kit for Series 2000 and 2100</div><span class="muted-s">Qty 2</span></div><b class="num">$139.20</b></div>
<div class="li"><img src="img/ee-reman-mast-roller-0.jpg" alt=""><div><div class="pn">EE 1069</div><div class="li-n">Mast Roller, remanufactured</div><span class="muted-s">Qty 1</span></div><b class="num">$18.00</b></div>
<div class="promo"><div class="inp ph" style="flex:1">Discount code</div><button class="btn btn-sec btn-sm">Apply</button></div>
<div class="sum"><div><span>Subtotal</span><span class="num">$157.20</span></div><div><span>Shipping</span><span>Free</span></div><div><span>Tax (example 8.25%)</span><span class="num">$12.97</span></div><div class="gt"><span>Total</span><b class="num">$170.17</b></div></div>
<ul class="mini-trust"><li>{ICON['truck']}Ships from Jersey Village, TX</li><li>{ICON['ret']}30-day returns on unused parts</li><li>{ICON['phone']}Questions? 832-444-5426</li></ul></aside></main>
<div class="mocknote">Mockup note: line items and prices are real EE catalog data. Customer details, 2-day rate, tax rate and totals are example data. Payment fields show the Stripe Payment Element layout.</div></body></html>'''

import sys
open('home.html','w').write(home())
open('home-typeahead.html','w').write(home(ta=True))
open('product.html','w').write(product())
open('product-cart.html','w').write(product(cart=True))
open('listing.html','w').write(listing())
open('checkout.html','w').write(checkout())
print('built')
