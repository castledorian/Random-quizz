# Génère les affiches de quiz (SVG, style pâte à modeler 3D) : python3 scripts/generate-covers.py public/images/covers
import os, math, sys
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
def hx(c): c=c.lstrip('#'); return [int(c[i:i+2],16) for i in (0,2,4)]
def mix(a,b,t): A,B=hx(a),hx(b); return '#%02x%02x%02x'%tuple(round(A[i]+(B[i]-A[i])*t) for i in range(3))

class Art:
    def __init__(s): s.defs=[]; s.n=0; s.cache={}
    def clay(s, c, light=.5, dark=.5):
        k=(c,light,dark)
        if k in s.cache: return s.cache[k]
        s.n+=1; i=f"c{s.n}"
        s.defs.append(f'<radialGradient id="{i}" cx=".38" cy=".3" r=".85" fx=".3" fy=".22"><stop offset="0" stop-color="{mix(c,"#ffffff",light)}"/><stop offset=".5" stop-color="{c}"/><stop offset="1" stop-color="{mix(c,"#0b0614",dark)}"/></radialGradient>')
        s.cache[k]=f"url(#{i})"; return s.cache[k]

def star4(r): q=r*.2; return f"M0,{-r} Q{q},{-q} {r},0 Q{q},{q} 0,{r} Q{-q},{q} {-r},0 Q{-q},{-q} 0,{-r}Z"
def star5(R,r):
    pts=[]
    for k in range(10):
        a=-math.pi/2+k*math.pi/5; rr=R if k%2==0 else r
        pts.append(f"{rr*math.cos(a):.1f},{rr*math.sin(a):.1f}")
    return "M"+" L".join(pts)+"Z"
HL=lambda x,y,rx,ry,o=.45: f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{o}" filter="url(#blur)"/>'

# ───────── sujets (centrés sur 0,0, ±280) ─────────
def pop(a):
    s=f'<path d="M-230,-40 C-230,-125 -150,-140 -80,-130 L80,-130 C150,-140 230,-125 230,-40 L252,110 C264,195 178,225 138,160 L95,95 L-95,95 L-138,160 C-178,225 -264,195 -252,110Z" fill="{a.clay("#a98bf0")}"/>'
    s+=HL(-120,-95,90,26,.4)
    d=a.clay("#5b3fb0")
    s+=f'<rect x="-168" y="-62" width="110" height="38" rx="12" fill="{d}"/><rect x="-132" y="-98" width="38" height="110" rx="12" fill="{d}"/>'
    for (x,y,c) in [(125,-88,"#f27aa5"),(172,-43,"#f2c14e"),(125,2,"#5b7cf0"),(78,-43,"#5dcab2")]:
        s+=f'<circle cx="{x}" cy="{y}" r="24" fill="{a.clay(c)}"/>'+HL(x-7,y-9,8,5,.7)
    s+=f'<circle cx="-55" cy="40" r="30" fill="{d}"/><circle cx="55" cy="40" r="30" fill="{d}"/>'
    s+=f'<path d="{star5(70,32)}" transform="translate(185,-195) rotate(14)" fill="{a.clay("#f27aa5")}"/>'
    return s
def world(a):
    ring=a.clay("#9be07a",.45,.4)
    s=f'<g transform="rotate(-18)"><ellipse rx="335" ry="92" fill="none" stroke="{ring}" stroke-width="34"/></g>'
    s+=f'<circle r="230" fill="{a.clay("#3fa7c9",.45,.55)}"/>'
    s+='<clipPath id="gc"><circle r="230"/></clipPath>'
    g=a.clay("#6fd08a",.4,.45)
    s+=f'<g clip-path="url(#gc)" fill="{g}"><ellipse cx="-80" cy="-90" rx="110" ry="70" transform="rotate(-20 -80 -90)"/><ellipse cx="-20" cy="40" rx="60" ry="95" transform="rotate(25 -20 40)"/><ellipse cx="140" cy="-40" rx="75" ry="55"/><ellipse cx="110" cy="150" rx="70" ry="40"/></g>'
    s+=HL(-90,-130,80,45,.35)
    s+=f'<g transform="rotate(-18)"><path d="M-335,0 A335,92 0 0 0 335,0" fill="none" stroke="{ring}" stroke-width="34" stroke-linecap="round"/></g>'
    w=a.clay("#f4f1fb",.4,.35)
    s+=f'<g transform="translate(250,-210) rotate(-25)"><ellipse rx="78" ry="22" fill="{w}"/><path d="M-10,-6 L-50,-70 L-25,-70 L30,-6Z M-10,6 L-50,70 L-25,70 L30,6Z" fill="{a.clay("#c6f36b")}"/><path d="M-70,-4 L-90,-38 L-76,-38 L-55,-4Z" fill="{a.clay("#c6f36b")}"/></g>'
    return s
def food(a):
    s=f'<g transform="rotate(-12)"><ellipse cy="32" rx="255" ry="172" fill="{a.clay("#b8742f",.3,.5)}"/><ellipse rx="255" ry="172" fill="{a.clay("#eaa95e",.45,.4)}"/>'
    s+=f'<ellipse rx="215" ry="142" fill="{a.clay("#d9472b",.35,.45)}"/>'
    ch=a.clay("#f6cf5a",.5,.35)
    for (x,y,rx,ry) in [(-90,-40,90,55),(60,-60,85,50),(10,50,110,55),(-120,60,60,40),(140,40,60,45)]:
        s+=f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{ch}"/>'
    pe=a.clay("#b8321f",.35,.45)
    for (x,y) in [(-120,-50),(40,-90),(120,10),(-30,40),(-140,60),(70,85)]:
        s+=f'<ellipse cx="{x}" cy="{y}" rx="34" ry="24" fill="{pe}"/>'+HL(x-8,y-7,12,5,.45)
    ba=a.clay("#4fae4a",.4,.45)
    for (x,y,r) in [(-40,-60,30),(100,-20,-40),(-80,10,60)]:
        s+=f'<ellipse cx="{x}" cy="{y}" rx="26" ry="12" transform="rotate({r} {x} {y})" fill="{ba}"/>'
    s+=HL(-120,-110,110,30,.25)+'</g>'
    s+=f'<circle cx="240" cy="150" r="64" fill="{a.clay("#e23b3b")}"/>'+HL(220,128,20,12,.6)+f'<path d="{star5(28,10)}" transform="translate(242,92)" fill="{a.clay("#4fae4a")}"/>'
    return s
def cinema(a):
    s=f'<g transform="rotate(-6)"><rect x="-210" y="-60" width="400" height="270" rx="30" fill="{a.clay("#3b3150",.35,.5)}"/>'
    s+=f'<rect x="-170" y="0" width="320" height="34" rx="12" fill="{a.clay("#5a4d74")}"/><rect x="-170" y="60" width="220" height="34" rx="12" fill="{a.clay("#5a4d74")}"/><rect x="-170" y="120" width="270" height="34" rx="12" fill="{a.clay("#5a4d74")}"/>'
    s+='<clipPath id="cb"><rect x="-210" y="-150" width="400" height="74" rx="20"/></clipPath>'
    s+=f'<g transform="rotate(-14 -210 -76)"><rect x="-210" y="-150" width="400" height="74" rx="20" fill="{a.clay("#f4f1fb",.3,.3)}"/><g clip-path="url(#cb)" fill="{a.clay("#2b2438")}">'+''.join(f'<path d="M{x},-150 l50,0 l-40,74 l-50,0Z"/>' for x in range(-190,200,100))+'</g></g></g>'
    r=a.clay("#e0556e")
    s+=f'<g transform="translate(225,140)"><circle r="115" fill="{r}"/>'+''.join(f'<circle cx="{62*math.cos(k*math.pi*2/5-math.pi/2):.0f}" cy="{62*math.sin(k*math.pi*2/5-math.pi/2):.0f}" r="26" fill="{a.clay("#5a1f33",.3,.4)}"/>' for k in range(5))+f'<circle r="18" fill="{a.clay("#f2c14e")}"/>'+HL(-40,-60,40,18,.4)+'</g>'
    return s
def note(a,x,y,c,sc=1):
    k=a.clay(c)
    return f'<g transform="translate({x},{y}) scale({sc}) rotate(-12)"><rect x="18" y="-120" width="20" height="130" rx="8" fill="{k}"/><path d="M28,-120 C80,-110 90,-70 70,-40 C80,-75 60,-90 28,-88Z" fill="{k}"/><ellipse cx="0" cy="10" rx="40" ry="30" transform="rotate(-20)" fill="{k}"/></g>'
def music(a):
    b=a.clay("#5b7cf0",.45,.5)
    s=f'<path d="M-185,60 C-195,-190 195,-190 185,60" fill="none" stroke="{b}" stroke-width="48" stroke-linecap="round"/>'
    for x in (-255,145):
        s+=f'<rect x="{x}" y="10" width="110" height="180" rx="52" fill="{a.clay("#7b95f5")}"/><rect x="{x+(70 if x<0 else 0)}" y="40" width="40" height="120" rx="18" fill="{a.clay("#2c2d6b",.3,.4)}"/>'+HL(x+35,50,20,40,.35)
    s+=note(a,-250,-150,"#c6f36b")+note(a,260,-190,"#f27aa5",.8)
    return s
def sport(a):
    s=f'<g transform="translate(-110,70)"><circle r="175" fill="{a.clay("#f2f0f6",.5,.45)}"/><clipPath id="bl"><circle r="175"/></clipPath><g clip-path="url(#bl)" fill="{a.clay("#2b2438",.3,.4)}">'
    def pent(cx,cy,r,rot): return "M"+" L".join(f"{cx+r*math.cos(rot+k*2*math.pi/5):.0f},{cy+r*math.sin(rot+k*2*math.pi/5):.0f}" for k in range(5))+"Z"
    s+=f'<path d="{pent(0,0,55,-math.pi/2)}"/>'
    for k in range(5):
        ang=-math.pi/2+k*2*math.pi/5+math.pi/5
        s+=f'<path d="{pent(150*math.cos(ang),150*math.sin(ang),55,ang)}"/>'
    s+='</g>'+HL(-60,-90,60,35,.45)+'</g>'
    g=a.clay("#f2c14e",.5,.5)
    s+=f'<g transform="translate(200,-20)"><ellipse cx="-110" cy="-80" rx="45" ry="60" fill="none" stroke="{g}" stroke-width="22"/><ellipse cx="110" cy="-80" rx="45" ry="60" fill="none" stroke="{g}" stroke-width="22"/><path d="M-110,-160 L110,-160 C110,-10 60,50 0,50 C-60,50 -110,-10 -110,-160Z" fill="{g}"/><rect x="-22" y="40" width="44" height="80" rx="10" fill="{g}"/><rect x="-85" y="110" width="170" height="50" rx="16" fill="{a.clay("#8a5a2b",.3,.5)}"/>'+HL(-50,-120,25,50,.4)+'</g>'
    return s
def science(a):
    s=f'<path d="M-48,-240 L48,-240 L48,-90 L195,150 Q210,200 160,200 L-160,200 Q-210,200 -195,150 L-48,-90Z" fill="{a.clay("#cfeefa",.4,.35)}" opacity=".55"/>'
    s+='<clipPath id="lq"><path d="M-48,-240 L48,-240 L48,-90 L195,150 Q210,200 160,200 L-160,200 Q-210,200 -195,150 L-48,-90Z"/></clipPath>'
    s+=f'<g clip-path="url(#lq)"><rect x="-260" y="40" width="520" height="200" fill="{a.clay("#7be07a",.45,.45)}"/>'+''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#ffffff" opacity=".55"/>' for x,y,r in [(-40,90,16),(30,130,10),(70,80,12),(-90,150,9)])+'</g>'
    s+=f'<rect x="-62" y="-262" width="124" height="34" rx="14" fill="{a.clay("#e8f6fb",.3,.35)}"/>'+HL(-60,-40,22,90,.35)
    for x,y,r in [(10,-300,18),(-30,-340,12),(25,-375,8)]: s+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{a.clay("#7be07a")}"/>'
    m=a.clay("#37b6d9")
    s+=f'<g transform="translate(250,-120)"><path d="M0,0 L-70,-80 M0,0 L80,-50 M0,0 L20,90" stroke="#cfeefa" stroke-width="12" stroke-linecap="round"/><circle r="42" fill="{a.clay("#f27aa5")}"/><circle cx="-70" cy="-80" r="28" fill="{m}"/><circle cx="80" cy="-50" r="26" fill="{m}"/><circle cx="20" cy="90" r="30" fill="{m}"/></g>'
    return s
def history(a):
    c=a.clay("#ead7b0",.45,.45)
    s=f'<g transform="translate(-60,0)"><rect x="-150" y="190" width="300" height="50" rx="14" fill="{c}"/><rect x="-120" y="-170" width="240" height="360" rx="12" fill="{c}"/>'
    s+=''.join(f'<rect x="{x}" y="-150" width="18" height="320" rx="9" fill="{a.clay("#b89a68",.3,.4)}" opacity=".7"/>' for x in range(-95,100,48))
    s+=f'<rect x="-170" y="-230" width="340" height="70" rx="18" fill="{c}"/><circle cx="-160" cy="-195" r="38" fill="{c}"/><circle cx="160" cy="-195" r="38" fill="{c}"/>'+HL(-80,-210,60,12,.45)+'</g>'
    p=a.clay("#f3e2b8",.45,.4)
    s+=f'<g transform="translate(230,150) rotate(-18)"><rect x="-120" y="-55" width="240" height="110" rx="10" fill="{p}"/><circle cx="-120" cy="0" r="58" fill="{a.clay("#d9bf86")}"/><circle cx="120" cy="0" r="58" fill="{a.clay("#d9bf86")}"/><circle cx="-120" cy="0" r="22" fill="{a.clay("#9c7a45")}"/><rect x="-10" y="-58" width="20" height="116" fill="{a.clay("#c0392b")}"/></g>'
    return s
def nature(a):
    s=f'<g transform="translate(-60,-20) rotate(22)"><path d="M0,-270 C175,-175 195,95 0,230 C-195,95 -175,-175 0,-270Z" fill="{a.clay("#6cc65a",.45,.5)}"/><path d="M0,-230 L0,280" stroke="{a.clay("#3f8a36")}" stroke-width="14" stroke-linecap="round"/>'
    s+=''.join(f'<path d="M0,{y} L{d*90},{y-70}" stroke="#3f8a36" stroke-width="8" stroke-linecap="round" opacity=".8"/>' for y in (-120,-20,80) for d in (-1,1))+HL(-70,-120,40,80,.3)+'</g>'
    s+=f'<g transform="translate(230,140)"><rect x="-34" y="-20" width="68" height="120" rx="28" fill="{a.clay("#f3e7d3",.4,.4)}"/><path d="M-130,0 C-130,-130 130,-130 130,0Z" fill="{a.clay("#e5533f")}"/>'+''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{a.clay("#fff4e8",.3,.3)}"/>' for x,y,r in [(-60,-40,16),(10,-75,13),(70,-30,15),(-15,-25,10)])+'</g>'
    return s
def animals(a):
    o=a.clay("#f08a3c",.45,.5)
    s=f'<path d="M-205,-50 L-160,-255 L-45,-135 L45,-135 L160,-255 L205,-50 C205,95 85,175 0,195 C-85,175 -205,95 -205,-50Z" fill="{o}"/>'
    s+=f'<path d="M-150,-220 L-80,-150 L-135,-120Z M150,-220 L80,-150 L135,-120Z" fill="{a.clay("#5a2a14",.3,.4)}"/>'
    s+=f'<path d="M-200,-10 C-120,10 -60,60 0,70 C60,60 120,10 200,-10 C190,100 85,175 0,195 C-85,175 -190,100 -200,-10Z" fill="{a.clay("#fff4e8",.3,.35)}"/>'
    for x in (-85,85): s+=f'<ellipse cx="{x}" cy="-40" rx="24" ry="30" fill="{a.clay("#2b2438",.25,.4)}"/><circle cx="{x-8}" cy="-50" r="8" fill="#fff"/>'
    s+=f'<ellipse cx="0" cy="110" rx="36" ry="26" fill="{a.clay("#2b2438",.3,.4)}"/>'+HL(-90,-160,50,30,.3)
    return s
def party(a):
    s=''
    for (x,y,c,r) in [(-180,-60,"#f27aa5",-10),(20,-150,"#c6f36b",4),(190,-50,"#5b7cf0",12)]:
        s+=f'<path d="M{x},{y+115} C{x-30},{y+190} {x+40},{y+230} {x+10},{y+300}" stroke="#e8def5" stroke-width="5" fill="none" opacity=".7"/>'
        s+=f'<g transform="rotate({r} {x} {y})"><ellipse cx="{x}" cy="{y}" rx="95" ry="115" fill="{a.clay(c)}"/><path d="M{x-14},{y+125} L{x+14},{y+125} L{x},{y+108}Z" fill="{a.clay(c)}"/>'+HL(x-35,y-50,22,38,.55)+'</g>'
    d=a.clay("#cfc8e6",.5,.55)
    s+=f'<g transform="translate(-30,190)"><circle r="95" fill="{d}"/><clipPath id="db"><circle r="95"/></clipPath><g clip-path="url(#db)" stroke="#5a4d74" stroke-width="3" opacity=".6">'+''.join(f'<line x1="-100" y1="{y}" x2="100" y2="{y}"/>' for y in range(-90,100,24))+''.join(f'<line x1="{x}" y1="-100" x2="{x}" y2="100"/>' for x in range(-90,100,24))+'</g>'+HL(-30,-35,28,16,.8)+'</g>'
    for (x,y,c,r) in [(-280,120,"#f2c14e",20),(270,170,"#f27aa5",-30),(110,220,"#c6f36b",45),(-250,-220,"#5dcab2",-15),(280,-230,"#f2c14e",30)]:
        s+=f'<rect x="{x}" y="{y}" width="34" height="16" rx="5" transform="rotate({r} {x} {y})" fill="{a.clay(c)}"/>'
    return s
def heart(sc): return f"M0,{80*sc} C{-150*sc},{-20*sc} {-230*sc},{-120*sc} {-150*sc},{-200*sc} C{-90*sc},{-260*sc} {-20*sc},{-220*sc} 0,{-170*sc} C{20*sc},{-220*sc} {90*sc},{-260*sc} {150*sc},{-200*sc} C{230*sc},{-120*sc} {150*sc},{-20*sc} 0,{80*sc}Z"
def friends(a):
    s=f'<path d="{heart(.8)}" transform="translate(-150,-30) rotate(-14)" fill="{a.clay("#c39af0")}"/>'
    s+=f'<path d="{heart(1.15)}" transform="translate(30,110) rotate(8)" fill="{a.clay("#f27aa5",.5,.5)}"/>'+HL(-80,-90,50,28,.45)
    b=a.clay("#f4f1fb",.35,.35)
    s+=f'<g transform="translate(220,-200)"><rect x="-110" y="-70" width="220" height="140" rx="60" fill="{b}"/><path d="M-50,60 L-80,120 L10,65Z" fill="{b}"/>'+''.join(f'<circle cx="{x}" cy="0" r="18" fill="{a.clay("#9a63e8")}"/>' for x in (-55,0,55))+'</g>'
    return s
def travel(a):
    bl=a.clay("#56a8f5",.45,.5)
    s=f'<g transform="rotate(-6)"><path d="M-70,-130 L-70,-180 Q-70,-205 -45,-205 L45,-205 Q70,-205 70,-180 L70,-130" fill="none" stroke="{a.clay("#2c4f80")}" stroke-width="26" stroke-linecap="round"/><rect x="-175" y="-135" width="350" height="285" rx="44" fill="{bl}"/>'
    s+=''.join(f'<rect x="{x}" y="-135" width="34" height="285" rx="10" fill="{a.clay("#f2c14e")}"/>' for x in (-100,66))+HL(-110,-100,50,22,.4)
    s+=''.join(f'<circle cx="{x}" cy="168" r="22" fill="{a.clay("#2b2438")}"/>' for x in (-120,120))+'</g>'
    w=a.clay("#f4f1fb",.35,.35)
    s+=f'<g transform="translate(-240,-210)" fill="{w}"><circle cx="-40" cy="10" r="45"/><circle cx="20" cy="-15" r="60"/><circle cx="80" cy="15" r="40"/><rect x="-85" y="10" width="205" height="45" rx="22"/></g>'
    s+=f'<g transform="translate(250,-150) rotate(-20)"><path d="M-110,10 L110,-60 L-20,60 Z" fill="{w}"/><path d="M-20,60 L110,-60 L10,100Z" fill="{a.clay("#cfc8e6",.3,.4)}"/></g>'
    return s
def tech(a):
    s=f'<rect x="-225" y="-235" width="450" height="295" rx="30" fill="{a.clay("#2b2f5a",.35,.5)}"/><rect x="-195" y="-205" width="390" height="235" rx="16" fill="{a.clay("#6f7bf7",.45,.55)}"/>'
    s+=f'<rect x="-160" y="-170" width="160" height="22" rx="10" fill="{a.clay("#c6f36b")}"/><rect x="-160" y="-130" width="250" height="18" rx="9" fill="#ffffff" opacity=".45"/><rect x="-160" y="-100" width="200" height="18" rx="9" fill="#ffffff" opacity=".35"/>'
    s+=f'<path d="M-265,60 L265,60 L310,112 Q312,135 288,135 L-288,135 Q-312,135 -310,112Z" fill="{a.clay("#cfd1ee",.45,.5)}"/>'+HL(-120,80,90,10,.5)
    s+=f'<g transform="translate(245,175) rotate(12)"><rect x="-62" y="-62" width="124" height="124" rx="20" fill="{a.clay("#2b2438",.3,.45)}"/>'+''.join(f'<rect x="{-50+k*30}" y="-86" width="12" height="26" rx="5" fill="{a.clay("#c6f36b")}"/><rect x="{-50+k*30}" y="60" width="12" height="26" rx="5" fill="{a.clay("#c6f36b")}"/>' for k in range(4))+f'<rect x="-28" y="-28" width="56" height="56" rx="10" fill="{a.clay("#6f7bf7")}"/></g>'
    return s
def art(a):
    s=f'<g transform="rotate(-10)"><path d="M-235,0 C-235,-165 -60,-225 85,-195 C235,-165 275,-30 205,40 C150,92 80,40 40,92 C0,142 60,205 -30,205 C-175,205 -235,120 -235,0Z" fill="{a.clay("#f0d9a8",.45,.45)}"/>'
    s+=f'<circle cx="-60" cy="120" r="36" fill="{a.clay("#2a1d3d",.2,.3)}"/>'
    for (x,y,c) in [(-150,-40,"#e5533f"),(-80,-130,"#f2c14e"),(30,-145,"#c6f36b"),(130,-90,"#5b7cf0"),(150,10,"#f27aa5"),(-150,60,"#9a63e8")]:
        s+=f'<circle cx="{x}" cy="{y}" r="36" fill="{a.clay(c)}"/>'+HL(x-10,y-12,12,7,.6)
    s+='</g>'
    s+=f'<g transform="translate(200,90) rotate(40)"><rect x="-18" y="-40" width="36" height="250" rx="16" fill="{a.clay("#a0612e")}"/><rect x="-22" y="-90" width="44" height="60" rx="8" fill="{a.clay("#cfd1ee")}"/><path d="M-22,-90 C-22,-150 0,-190 0,-200 C0,-190 22,-150 22,-90Z" fill="{a.clay("#f27aa5")}"/></g>'
    return s
def mystery(a):
    s=f'<path d="M-150,170 L150,170 L200,250 Q205,270 180,270 L-180,270 Q-205,270 -200,250Z" fill="{a.clay("#c9a063",.45,.5)}"/>'
    s+=f'<circle cy="-20" r="205" fill="{a.clay("#9a63e8",.45,.55)}"/><circle cx="40" cy="20" r="150" fill="{a.clay("#c6f36b",.4,.6)}" opacity=".18" filter="url(#blur)"/>'
    s+=f'<text x="0" y="60" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="250" fill="{a.clay("#f6f0ff",.6,.25)}" filter="url(#sh)">?</text>'
    s+=HL(-80,-130,70,40,.5)+HL(110,90,20,12,.35)
    return s

COVERS = [
 ("pop-culture","#7f55e0",pop,"#c6f36b"),("world","#2f8f8a",world,"#c6f36b"),("food","#e07a3a",food,"#f2c14e"),
 ("cinema","#c94461",cinema,"#f2c14e"),("music","#4a63d6",music,"#c6f36b"),("sport","#3aa865",sport,"#f2c14e"),
 ("science","#2a9cc4",science,"#c6f36b"),("history","#b48a4c",history,"#f2c14e"),("nature","#4fa646",nature,"#c6f36b"),
 ("animals","#d97a35",animals,"#c6f36b"),("party","#b24fc4",party,"#c6f36b"),("friends","#d45a8c",friends,"#c6f36b"),
 ("travel","#3f86d4",travel,"#c6f36b"),("tech","#5562d9",tech,"#c6f36b"),("art","#d19a32",art,"#f27aa5"),("mystery","#7a46c9",mystery,"#c6f36b"),
]
CX,CY=940,600
for i,(name,col,fn,acc) in enumerate(COVERS):
    a=Art()
    subj=fn(a)
    deco=''
    for (x,y,r,c) in [(330+((i*97)%120),210+((i*53)%60),22,acc),(1430,170+((i*41)%80),30,mix(col,"#ffffff",.35)),(1460,800,16,acc),(560,780,14,mix(col,"#ffffff",.5))]:
        deco+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{a.clay(c)}" filter="url(#sh)"/>'
    deco+=f'<path d="{star4(34)}" transform="translate({1330},{300+(i*37)%90})" fill="{a.clay(acc,.4,.3)}" filter="url(#sh)"/>'
    deco+=f'<path d="{star4(20)}" transform="translate({690},{170+(i*29)%70})" fill="{a.clay(acc,.4,.3)}"/>'
    bg1=mix(col,"#0e0b17",.45); bg2=mix(col,"#0b0912",.82)
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="bg" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
<radialGradient id="glow" cx="{CX/1600:.3f}" cy="{CY/1000:.3f}" r=".45"><stop offset="0" stop-color="{mix(col,"#ffffff",.15)}" stop-opacity=".55"/><stop offset="1" stop-color="{col}" stop-opacity="0"/></radialGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="20" flood-color="#06030c" flood-opacity=".55"/></filter>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="floor"><feGaussianBlur stdDeviation="28"/></filter>
{''.join(a.defs)}</defs>
<rect width="1600" height="1000" fill="url(#bg)"/><rect width="1600" height="1000" fill="url(#glow)"/>
<circle cx="1380" cy="120" r="260" fill="{mix(col,"#ffffff",.2)}" opacity=".08"/><circle cx="180" cy="930" r="220" fill="{mix(col,"#ffffff",.2)}" opacity=".07"/>
<ellipse cx="{CX}" cy="{CY+300}" rx="360" ry="50" fill="#05030a" opacity=".55" filter="url(#floor)"/>
{deco}
<g transform="translate({CX},{CY}) scale(1.28)" filter="url(#sh)">{subj}</g>
</svg>'''
    open(f"{OUT}/{name}.svg","w").write(svg)
print("ok",len(COVERS))
