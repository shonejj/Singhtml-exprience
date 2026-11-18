
/* =====================================================================
   RENDERER — WebGL2 pixel pipeline
   shadow map → planar reflection → main MRT (color, normal+flags, depth)
   → post (edges, AO, SSR, bloom, rays, DOF, grade) → integer nearest blit
   ===================================================================== */
const F_HIDDEN = 1, F_OCC = 2, F_REFL = 4, F_GROUND = 8, F_FOLIAGE = 16, F_UNLIT = 32, F_WATER = 64, F_ECHO = 128;
const GLSL_COMMON = `
float sat(float x){ return clamp(x,0.,1.); }
float bayer(vec2 f){ ivec2 p = ivec2(f) & 3; int i = p.x + p.y*4;
  float b[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (b[i]+.5)/16.; }
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
`;
const VS_MAIN = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec4 aCol; layout(location=3) in vec4 aExt;
layout(location=4) in vec4 iR0; layout(location=5) in vec4 iR1; layout(location=6) in vec4 iR2; layout(location=7) in vec4 iCol; layout(location=8) in vec4 iExt;
uniform mat4 uVP; uniform mat4 uV; uniform int uInst; uniform vec4 uWind; uniform float uTime; uniform vec4 uPush[4]; uniform float uStep;
out vec3 vW; out vec3 vN; out vec4 vC; out vec4 vE; out float vVZ; out float vSolid;
void main(){
  vSolid = float(uInst);
  vec3 p = aPos; vec3 n = aNor; vec4 c = aCol; vec4 e = aExt;
  if(uInst==1){ vec4 hp = vec4(p,1.); p = vec3(dot(iR0,hp),dot(iR1,hp),dot(iR2,hp));
    vec3 nx=vec3(iR0.x,iR1.x,iR2.x), ny=vec3(iR0.y,iR1.y,iR2.y), nz=vec3(iR0.z,iR1.z,iR2.z);
    n = nx*n.x/max(dot(nx,nx),1e-8) + ny*n.y/max(dot(ny,ny),1e-8) + nz*n.z/max(dot(nz,nz),1e-8);
    c = vec4(iCol.rgb*aCol.rgb, iCol.a); e = iExt + aExt; }
  float sw = e.x;
  if(sw>0.){ float t = uStep>.5 ? floor(uTime*8.)/8. : uTime; float ws = uWind.z;
    float g = .6+.4*sin(t*1.1+p.x*.13+p.z*.11)*sin(t*.37+p.z*.05) + uWind.w;
    vec2 off = uWind.xy*ws*g*sw*.55 + vec2(sin(t*2.6+p.x*1.7+p.z), cos(t*2.2+p.z*1.5+p.x))*.07*sw*(.25+ws);
    for(int i=0;i<4;i++){ vec4 q=uPush[i]; if(q.w<=0.) continue; vec2 d=p.xz-q.xz; float l=length(d); float k=max(0.,1.-l/q.w)*step(abs(p.y-q.y),2.5); off += d/(l+.001)*k*sw*.8; }
    p.xz += off; p.y -= dot(off,off)*.3; }
  vW=p; vN=n; vC=c; vE=e; vec4 vp = uV*vec4(p,1.); vVZ = -vp.z;
  gl_Position = uVP*vec4(p,1.);
}`;
const FS_SHADOW = `#version 300 es
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; in vec4 vE; in float vVZ; in float vSolid; uniform uint uRev; out vec4 o;
void main(){ int fl = int(vE.y*255.+.5); if((fl&1)!=0){ uint g=uint(vE.z*255.+.5); if(((uRev>>g)&1u)==0u) discard; } if((fl&32)!=0 && vC.a>.9) discard; o=vec4(1); }`;
const FS_MAIN = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec4 vC; in vec4 vE; in float vVZ; in float vSolid;
uniform sampler2DShadow uSh; uniform mat4 uLVP; uniform float uShOn; uniform float uShTex; uniform int uShTaps;
uniform vec3 uSunDir, uSunCol, uSky, uGnd, uFogC, uCam; uniform vec4 uFog;
uniform vec4 uPL[16]; uniform int uNPL;
uniform vec4 uScan; uniform float uScanS; uniform vec4 uCut; uniform vec2 uRes;
uniform float uWet, uTime, uEcho, uBands; uniform uint uRev; uniform vec4 uClip; uniform vec3 uFlash; uniform float uLow; uniform float uFogOff;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oN;
${GLSL_COMMON}
float shadow(vec3 w, vec3 n){
  if(uShOn<.5) return 1.; vec4 lp = uLVP*vec4(w+n*.08,1.); vec3 s = lp.xyz/lp.w*.5+.5;
  if(s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.) return 1.;
  float b=.0012, t=uShTex, r;
  if(uShTaps>1){ r = texture(uSh,vec3(s.xy+vec2(-.7,-.7)*t,s.z-b))+texture(uSh,vec3(s.xy+vec2(.7,-.7)*t,s.z-b))+texture(uSh,vec3(s.xy+vec2(-.7,.7)*t,s.z-b))+texture(uSh,vec3(s.xy+vec2(.7,.7)*t,s.z-b)); r*=.25; }
  else r = texture(uSh,vec3(s.xy,s.z-b));
  vec2 e = min(s.xy,1.-s.xy); return mix(1., r, smoothstep(0.,.06,min(e.x,e.y)));
}
void main(){
  if(dot(vec4(vW,1.),uClip)<0.) discard;
  int fl = int(vE.y*255.+.5); float dth = bayer(gl_FragCoord.xy);
  if((fl&8)!=0 && !gl_FrontFacing) discard;
  vec3 base = vC.rgb; float em = vC.a; int ofl = 1; bool holo=false;
  if((fl&1)!=0){ uint g=uint(vE.z*255.+.5); bool rev=((uRev>>g)&1u)==1u;
    if(!rev){ float d=distance(vW,uScan.xyz); if(uScanS<=0.||d>uScan.w+1.) discard; if(dth>.55) discard; holo=true; } }
  if(((fl&2)!=0 || (fl&8)!=0) && uCut.z>0.){ vec2 sp=gl_FragCoord.xy/uRes; vec2 d=(sp-uCut.xy)*vec2(uRes.x/uRes.y,1.); float r=length(d)/uCut.z;
    if(vVZ<uCut.w-1.2){ float a=smoothstep(1.,.55,r); if(dth<a*.92) discard; } }
  vec3 n = normalize(vN); if(!gl_FrontFacing) n=-n;
  vec3 V = vW-uCam; float dist = length(V); vec3 vd = V/max(dist,1e-4);
  vec3 c;
  if((fl&32)!=0){ c = base*(1.+em); ofl = 16; }
  else {
    float ndl = dot(n,uSunDir); float sh = shadow(vW,n);
    float diff = (fl&16)!=0 ? (ndl*.45+.55)*sh : max(ndl,0.)*sh;
    vec3 amb = mix(uGnd, uSky, n.y*.5+.5) + uFlash;
    vec3 L = amb + uSunCol*diff;
    for(int i=0;i<8;i++){ if(i>=uNPL) break; vec4 pp=uPL[i*2]; vec4 pc=uPL[i*2+1]; vec3 ld=pp.xyz-vW; float d=length(ld); float at=max(0.,1.-d/pp.w); at*=at;
      float nl = (fl&16)!=0 ? .8 : max(dot(n,ld/max(d,1e-3)),0.)*.85+.15; L += pc.rgb*pc.a*at*nl; }
    float I = dot(L,vec3(.3,.5,.2)); float bands = uBands; float qd = vSolid>.5 ? .55 : dth*.95;
    float Iq = (floor(I*bands + qd)+.25)/bands; Iq = max(Iq, .04);
    L *= Iq/max(I,1e-3);
    c = base*L;
    float shade = sat(1.-Iq); c = mix(c, c*vec3(.72,.74,1.18)+vec3(.012,.0,.035), shade*.65);
    c += base*smoothstep(1.05,1.5,Iq)*vec3(.12,.08,0.);
    if((fl&8)!=0){ float wet = uWet*smoothstep(.6,.9,n.y); c *= 1.-.28*wet;
      float pud = smoothstep(.52,.62, vn(vW.xz*.22)+vn(vW.xz*.9)*.15)*wet; if(pud>.3){ ofl |= 2; c = mix(c, c*.55, pud); } ofl |= 8; ofl &= ~1; }
    if((fl&4)!=0) ofl |= 2;
    if(em>0.){ c = mix(c, base*1.5, em); if(em>.5) ofl |= 16; }
    if(uLow>0.){ c = mix(c, vec3(dot(c,vec3(.3,.5,.2))), uLow); }
  }
  if(holo){ c = mix(c, vec3(.3,.95,1.), .65); ofl |= 16; }
  if(uScanS>0.){ float d=distance(vW,uScan.xyz); float ring = smoothstep(1.6,0.,abs(d-uScan.w))*uScanS;
    float grid = (d<uScan.w) ? step(.94,fract(vW.x*1.))+step(.94,fract(vW.z*1.)) : 0.;
    c += vec3(.25,.85,1.)*(ring*.9 + min(grid,1.)*.08*uScanS*smoothstep(uScan.w,uScan.w-6.,d)); }
  if((fl&128)!=0 && uEcho>0.){ float band=floor(gl_FragCoord.y/2.); if(h21(vec2(band,floor(uTime*12.)))<uEcho*.45) discard; c=mix(c,vec3(.35,.95,1.)*(.6+.4*sin(band+uTime*9.)),uEcho*.75); }
  // atmospheric fog (height + distance + sun scattering)
  float fh = exp(-max(vW.y-uFog.y,0.)*uFog.z);
  float f = 1.-exp(-max(dist-uFogOff,0.)*uFog.x*(.35+.65*fh)); f = min(f,uFog.w);
  float sc = pow(max(dot(vd,uSunDir),0.),6.);
  vec3 fc = uFogC + uSunCol*sc*.3;
  f = floor(f*12.+(vSolid>.5 ? .5 : dth*.98))/12.;
  c = mix(c, fc, f);
  oC = vec4(c,1.); oN = vec4(n*.5+.5, float(ofl)/255.);
}`;
const VS_FULL = `#version 300 es
precision highp float; out vec2 vUV; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUV=p; gl_Position=vec4(p*2.-1.,1.,1.); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 vUV; uniform mat4 uIVP; uniform vec3 uCam, uSunDir, uSunCol, uSkyTop, uSkyHor, uFogC; uniform float uNight, uTime, uAur, uCloud, uPlanet;
uniform vec3 uPlanetDir; uniform vec3 uPlanetCol; uniform vec4 uClip;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oN;
${GLSL_COMMON}
void main(){
  vec4 a = uIVP*vec4(vUV*2.-1.,1.,1.); vec4 b = uIVP*vec4(vUV*2.-1.,-1.,1.); vec3 d = normalize(a.xyz/a.w - b.xyz/b.w);
  if(uClip.y>.5) d.y = abs(d.y);
  float dth = bayer(gl_FragCoord.xy);
  float e = d.y; float t = sat(e*1.6+.1); t = floor(t*10.+dth)/10.;
  vec3 c = mix(uSkyHor, uSkyTop, t);
  c = mix(uFogC, c, smoothstep(-.08,.18,e));
  // stars
  if(uNight>0.){ vec2 sp = vec2(atan(d.z,d.x)*80., d.y*120.); vec2 ci=floor(sp); float h=h21(ci); if(h>.985 && e>0.) c += vec3(.8,.85,1.)*uNight*(.5+.5*sin(uTime*2.+h*90.))*step(.3,fract(sp.x))*step(.3,fract(sp.y)); }
  // gas giant + ring
  if(uPlanet>0.){ vec3 pd=normalize(uPlanetDir); float pr = .26; float cosA = dot(d,pd);
    vec3 up = normalize(cross(pd, vec3(0,0,1))); vec3 rt = normalize(cross(up,pd));
    vec2 pl = vec2(dot(d,rt), dot(d,up));
    if(cosA>0. && length(pl)<pr){ float k = length(pl)/pr; float band = sin(pl.y*48.+sin(pl.x*9.)*2.)*.5+.5; band=floor(band*4.+dth)/4.;
      vec3 pc = uPlanetCol*(.55+.35*band); float lit = sat(dot(normalize(vec3(pl, sqrt(max(0.,1.-k*k))*pr)), normalize(vec3(.6,.4,.6)))); lit=floor(lit*5.+dth)/5.;
      c = mix(c, pc*(.25+lit), uPlanet); }
    vec2 rp = vec2(pl.x, pl.y*4.5 + pl.x*.9); float rr = length(rp); if(cosA>0. && rr>pr*1.25 && rr<pr*1.9 && !(length(pl)<pr && rp.y>0.)) { float rb = step(.5,fract(rr*40.)); c = mix(c, uPlanetCol*vec3(1.1,1.,.9)*(.5+.3*rb), .55*uPlanet); }
  }
  // sun
  float sd = dot(d,uSunDir); c += uSunCol*smoothstep(.9975,.998,sd)*1.4 + uSunCol*pow(max(sd,0.),40.)*.35;
  // clouds
  if(uCloud>0. && e>0.){ vec2 cp = d.xz/(e+.15)*1.6 + vec2(uTime*.01,0.); float cl = vn(cp)*.6+vn(cp*2.3)*.3+vn(cp*5.)*.1; cl = smoothstep(.55-uCloud*.25,.8,cl); cl = floor(cl*4.+dth)/4.;
    c = mix(c, mix(uSkyHor*1.1, uSunCol*.6+uSkyTop*.4, sat(sd)), cl*.7*smoothstep(0.,.2,e)); }
  // aurora / signal veil
  if(uAur>0. && e>0.){ float w = sin(d.x*6.+uTime*.3+sin(d.z*4.+uTime*.2)*2.); float band = smoothstep(.2,0.,abs(e-.35-w*.08)); c += vec3(.2,1.,.8)*band*uAur*(.5+.5*sin(d.z*30.+uTime));  }
  oC = vec4(c,1.); oN = vec4(.5,1.,.5, 4./255.);
}`;
const VS_WATER = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; uniform mat4 uVP; uniform mat4 uV; uniform float uH, uTime; out vec3 vW; out float vVZ;
void main(){ vec3 p = aPos; p.y = uH + sin(p.x*.6+uTime*1.3)*.03 + sin(p.z*.5+uTime)*.03; vW=p; vVZ = -(uV*vec4(p,1.)).z; gl_Position=uVP*vec4(p,1.); }`;
const FS_WATER = `#version 300 es
precision highp float; in vec3 vW; in float vVZ; uniform sampler2D uRefl; uniform float uReflOn; uniform vec2 uRes; uniform vec3 uCam, uSunDir, uSunCol, uSky, uFogC, uWaterC; uniform vec4 uFog;
uniform float uTime, uRain, uBands, uFogOff; uniform vec4 uRip[8]; uniform vec4 uPL[16]; uniform int uNPL; uniform vec4 uScan; uniform float uScanS;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oN;
${GLSL_COMMON}
void main(){
  float dth = bayer(gl_FragCoord.xy);
  vec2 p = vW.xz; vec2 g = vec2(cos(p.x*1.3+uTime*1.7+p.y*.4), sin(p.y*1.1+uTime*1.4-p.x*.3))*.05 + vec2(vn(p*.7+uTime*.3)-.5, vn(p*.7-uTime*.25+9.)-.5)*.12;
  float bright = 0.;
  // rain ripples
  if(uRain>0.){ vec2 cell = floor(p*1.2); vec2 f = fract(p*1.2)-.5; for(int i=0;i<2;i++){ vec2 cc=cell+vec2(i,0); float h=h21(cc); float ph=fract(uTime*(.8+h)+h*7.); vec2 o=vec2(h21(cc+3.),h21(cc+7.))-.5; float r=length(f-vec2(i,0)-o*.6); float ring=smoothstep(.06,0.,abs(r-ph*.45))*(1.-ph)*step(h,uRain); g += normalize(f-o*.6+.001)*ring*.25; bright+=ring*.3; } }
  for(int i=0;i<8;i++){ vec4 r=uRip[i]; if(r.w<=0.) continue; float age=uTime-r.z; if(age<0.||age>2.5) continue; float d=distance(p,r.xy); float rr=age*2.2; float ring=smoothstep(.25,0.,abs(d-rr))*(1.-age/2.5)*r.w; g += normalize(p-r.xy+.001)*ring*.4; bright+=ring*.4; }
  vec3 n = normalize(vec3(g.x,1.,g.y));
  vec3 V = vW-uCam; float dist=length(V); vec3 vd=V/dist;
  float fres = .25+.75*pow(1.-max(dot(-vd,n),0.),3.);
  vec3 refl;
  if(uReflOn>.5){ vec2 uv = gl_FragCoord.xy/uRes + n.xz*.035; refl = texture(uRefl,uv).rgb; } else refl = mix(uFogC,uSky,.5);
  vec3 L = uSky*.5 + uSunCol*max(dot(n,uSunDir),0.)*.5;
  for(int i=0;i<8;i++){ if(i>=uNPL) break; vec4 pp=uPL[i*2]; vec4 pc=uPL[i*2+1]; float d=distance(pp.xyz,vW); float at=max(0.,1.-d/pp.w); L+=pc.rgb*pc.a*at*at*.7; }
  vec3 c = mix(uWaterC*L, refl, fres*.85);
  float spec = pow(max(dot(reflect(vd,n),uSunDir),0.),60.); c += uSunCol*floor(spec*3.+dth)/3.*.8 + bright;
  float cau = vn(p*2.+uTime*.4)*vn(p*2.3-uTime*.3); c += uWaterC*step(.45,cau)*.15;
  if(uScanS>0.){ float d=distance(vW,uScan.xyz); c += vec3(.25,.85,1.)*smoothstep(1.6,0.,abs(d-uScan.w))*uScanS; }
  float fh = exp(-max(vW.y-uFog.y,0.)*uFog.z); float f = min(1.-exp(-max(dist-uFogOff,0.)*uFog.x*(.35+.65*fh)),uFog.w); f=floor(f*12.+dth*.98)/12.;
  c = mix(c, uFogC, f);
  oC = vec4(c,1.); oN = vec4(n*.5+.5, float(64+2)/255.);
}`;
const VS_PART = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; layout(location=2) in float aSize;
uniform mat4 uVP; uniform mat4 uV; uniform float uPx; out vec4 vC; out float vAdd; out float vZ; out vec3 vW;
void main(){ vec4 vp=uV*vec4(aPos,1.); vZ=-vp.z; vW=aPos; vC=aCol; vAdd = aSize<0.?1.:0.; float s=abs(aSize);
  gl_PointSize = clamp(s*uPx/max(vZ,.5), 1., 4.); gl_Position=uVP*vec4(aPos,1.); }`;
const FS_PART = `#version 300 es
precision highp float; in vec4 vC; in float vAdd; in float vZ; in vec3 vW; uniform vec3 uFogC, uCam; uniform vec4 uFog; uniform float uFogOff; out vec4 o;
${GLSL_COMMON}
void main(){ float dth=bayer(gl_FragCoord.xy); if(vC.a<dth*.95) discard; float dist=max(distance(vW,uCam)-uFogOff,0.); float f=min(1.-exp(-dist*uFog.x),uFog.w)*.85;
  vec3 c = mix(vC.rgb, uFogC, f*(1.-vAdd*.6)); o = vAdd>.5 ? vec4(c*(1.-f*.5),0.) : vec4(c,1.); }`;
const FS_POST = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uCol, uNrm, uDep; uniform mat4 uIP, uP, uV; uniform vec2 uRes; uniform float uTime;
uniform float uEdges, uAO, uSSR, uBloom, uRays, uDof, uFocus, uFocusR, uGrain, uChroma, uSig, uHurt, uFade, uVig, uContrast, uSatu, uQuant, uExpo, uRefl;
uniform vec3 uLift, uGain, uFadeC, uSunCol, uSky; uniform vec2 uSunUV; uniform float uSunVis;
out vec4 o;
${GLSL_COMMON}
vec3 vpos(vec2 uv){ float d = texture(uDep,uv).r; vec4 p = uIP*vec4(uv*2.-1., d*2.-1., 1.); return p.xyz/p.w; }
float lz(vec2 uv){ return -vpos(uv).z; }
void main(){
  vec2 px = 1./uRes; vec2 uv = vUV; float t=uTime; float dth = bayer(gl_FragCoord.xy);
  if(uSig>0.){ float ln = floor(uv.y*uRes.y/2.); float j = h21(vec2(ln, floor(t*20.))); uv.x += (j-.5)*uSig*.04*step(1.-uSig*.6, h21(vec2(ln*.1,floor(t*8.)))); }
  vec3 c = texture(uCol,uv).rgb;
  if(uChroma>0.){ c.r = texture(uCol,uv+vec2(px.x*uChroma,0.)).r; c.b = texture(uCol,uv-vec2(px.x*uChroma,0.)).b; }
  vec4 nf = texture(uNrm,uv); int fl = int(nf.a*255.+.5); vec3 n = nf.xyz*2.-1.;
  float dRaw = texture(uDep,uv).r; bool sky = dRaw>=.99999 || (fl&4)!=0;
  float z = sky ? 1e4 : lz(uv);
  if(!sky && uEdges>0.){
    float zl=lz(uv-vec2(px.x,0.)), zr=lz(uv+vec2(px.x,0.)), zu=lz(uv+vec2(0.,px.y)), zd=lz(uv-vec2(0.,px.y));
    float far = max(max(zl,zr),max(zu,zd)) - z; float rel = far/max(z,.5);
    vec3 nl = texture(uNrm,uv-vec2(px.x,0.)).xyz*2.-1., nu = texture(uNrm,uv+vec2(0.,px.y)).xyz*2.-1.;
    float crease = 1.-min(dot(n,nl),dot(n,nu));
    if(rel>.07 && (fl&8)==0 && (fl&64)==0) c *= vec3(.5,.48,.62);
    else if((fl&8)==0 && ((zl-z)/max(z,.5)<-.07 || (zu-z)/max(z,.5)<-.07)) c = mix(c, c*1.18+vec3(.05,.035,0.), .5*uEdges);
    else if(crease>.5 && (fl&8)==0) c = c*1.1+vec3(.02,.015,0.);
  }
  if(!sky && uAO>0.){ float occ=0.; float r = clamp(5./z*3.,1.,4.);
    for(int i=0;i<8;i++){ float a=float(i)*.785+dth*.6; vec2 o2 = vec2(cos(a),sin(a))*r*px*(1.+float(i&1)); float zz=lz(uv+o2); float dd=z-zz; occ += step(.12,dd)*step(dd,2.5); }
    occ/=8.; occ = floor(occ*4.+dth)/4.; c *= 1.-occ*.45*uAO; }
  if(!sky && uSSR>0. && (fl&2)!=0 && (fl&64)==0){
    vec3 P = vpos(uv); vec3 N = normalize(mat3(uV)*n); vec3 R = normalize(reflect(normalize(P),N));
    vec3 hit = uSky*.6; float found=0.; float st = .35; vec3 Q = P;
    for(int i=0;i<20;i++){ Q += R*st; st*=1.18; vec4 cp = uP*vec4(Q,1.); vec2 suv = cp.xy/cp.w*.5+.5; if(suv.x<0.||suv.x>1.||suv.y<0.||suv.y>1.) break;
      float sz = lz(suv); if(-Q.z>sz+.05 && -Q.z<sz+1.5){ hit = texture(uCol,suv).rgb; found=1.; break; } }
    float fres = .35+.65*pow(1.-max(dot(-normalize(P),N),0.),2.);
    c = mix(c, hit, fres*.55*uSSR*((fl&8)!=0?.85:.6));
  }
  if(uBloom>0.){ vec3 b=vec3(0.); for(int i=0;i<12;i++){ float a=float(i)*.5236; float r= (i<6)?2.:4.5; vec2 o2=vec2(cos(a),sin(a))*r*px; vec3 s=texture(uCol,uv+o2).rgb; int f2=int(texture(uNrm,uv+o2).a*255.+.5);
      float l=dot(s,vec3(.3,.5,.2)); b += s*(((f2&16)!=0)?1.:smoothstep(.85,1.2,l)); } c += b/12.*uBloom*.9; }
  if(uRays>0. && uSunVis>0.){ vec2 dir = (uSunUV-uv); float acc=0.; for(int i=0;i<12;i++){ vec2 s = uv + dir*(float(i)+dth)/12.*.6; if(s.x<0.||s.x>1.||s.y<0.||s.y>1.) continue; acc += texture(uDep,s).r>=.99999?1.:0.; }
    acc/=12.; c += uSunCol*acc*uRays*.22*uSunVis*smoothstep(1.2,0.,length(dir*vec2(uRes.x/uRes.y,1.))); }
  if(uDof>0.){ float coc = sat(abs(min(z,200.)-uFocus)/uFocusR)*uDof; if(coc>.05){ vec3 s=c; for(int i=0;i<8;i++){ float a=float(i)*.785; s+=texture(uCol,uv+vec2(cos(a),sin(a))*coc*2.5*px).rgb; } c=mix(c,s/9.,min(coc*1.5,1.)); } }
  c *= uExpo; c = (c-.5)*uContrast+.5; float L = dot(c,vec3(.3,.5,.2)); c = mix(vec3(L),c,uSatu);
  c = c*uGain + uLift*(1.-c);
  vec2 q = vUV-.5; float vg = 1.-dot(q,q)*uVig; c *= vg;
  if(uHurt>0.){ c = mix(c, vec3(.6,.03,.03), uHurt*smoothstep(.15,.7,length(q))); }
  if(uSig>0.){ float sl = step(.5,fract(gl_FragCoord.y*.5)); c *= 1.-uSig*.18*sl; c += (h21(gl_FragCoord.xy+t)-.5)*uSig*.25; }
  c += (h21(floor(gl_FragCoord.xy)+fract(t*7.3)*100.)-.5)*uGrain*.06;
  c = mix(c, uFadeC, uFade);
  if(uQuant>0.){ c = floor(c*uQuant + dth*.9)/uQuant; }
  o = vec4(c,1.);
}`;

const R = {
  gl: null, W: 320, H: 180, scale: 1, progs: {}, chunks: [], inst: {}, time: 0,
  init(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return false;
    this.gl = gl; this.canvas = canvas;
    this.progs.main = this.prog(VS_MAIN, FS_MAIN); this.progs.shadow = this.prog(VS_MAIN, FS_SHADOW);
    this.progs.sky = this.prog(VS_FULL, FS_SKY); this.progs.water = this.prog(VS_WATER, FS_WATER);
    this.progs.part = this.prog(VS_PART, FS_PART); this.progs.post = this.prog(VS_FULL, FS_POST);
    for (const k in this.progs) if (!this.progs[k]) return false;
    this.emptyVAO = gl.createVertexArray();
    { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 1, 1, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, new Uint32Array([0xffffffff]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); this.dummyDepth = t; }
    // instanced primitive meshes
    this.meshes = {};
    const mk = (name, b) => { const m = this.upload(b, true); m.cap = 0; m.n = 0; m.mat = null; m.ce = null; m.ibuf = gl.createBuffer(); m.ebuf = gl.createBuffer(); this.attachInst(m); this.meshes[name] = m; };
    let b = new MeshBuilder(); b.box(0, 0, 0, 1, 1, 1, [1, 1, 1], { vary: 0 }); mk('cube', b);
    b = new MeshBuilder(); b.ico(0, 0, 0, .5, 1, [1, 1, 1], { vary: 0 }); mk('ico', b);
    b = new MeshBuilder(); b.cyl(0, -.5, 0, .5, 1, 8, [1, 1, 1], { vary: 0 }); mk('cyl', b);
    b = new MeshBuilder(); b.cyl(0, -.5, 0, .5, 1, 6, [1, 1, 1], { vary: 0, rTop: 0 }); mk('cone', b);
    b = new MeshBuilder(); b.ico(0, 0, 0, .5, 0, [1, 1, 1], { vary: 0 }); mk('oct', b);
    // particle buffers
    this.pbuf = gl.createBuffer(); this.pvao = gl.createVertexArray(); gl.bindVertexArray(this.pvao); gl.bindBuffer(gl.ARRAY_BUFFER, this.pbuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 20, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16); gl.bindVertexArray(null);
    this.lbuf = gl.createBuffer(); this.lvao = gl.createVertexArray(); gl.bindVertexArray(this.lvao); gl.bindBuffer(gl.ARRAY_BUFFER, this.lbuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 20, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16); gl.bindVertexArray(null);
    // water grid
    const wv = []; const N = 48, S = 200 / N; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x0 = -100 + i * S, z0 = -100 + j * S, x1 = x0 + S, z1 = z0 + S; wv.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z0, x1, 0, z1, x0, 0, z1); }
    this.wvao = gl.createVertexArray(); gl.bindVertexArray(this.wvao); const wb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, wb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.bindVertexArray(null); this.wcount = wv.length / 3;
    this.mats = { v: M4.create(), p: M4.create(), vp: M4.create(), ivp: M4.create(), ip: M4.create(), lvp: M4.create(), rv: M4.create(), rvp: M4.create(), rivp: M4.create(), tmp: M4.create() };
    this.applyQuality(); this.resize();
    addEventListener('resize', () => this.resize());
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; UI.toast('Graphics context lost — restoring…'); });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    this.detectTier();
    return true;
  },
  detectTier() {
    const gl = this.gl; let renderer = '';
    try { const dbg = gl.getExtension('WEBGL_debug_renderer_info'); if (dbg) renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ''; } catch (e) { }
    this.gpuName = renderer; const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
    const weak = /SwiftShader|llvmpipe|Mali-[GT]?[0-7]\d|Adreno \(TM\) [3-5]|PowerVR|Intel.*(HD|UHD) Graphics [2-6]/i.test(renderer);
    const strong = /RTX|Radeon RX|Apple M[2-9]|GeForce GTX 1[06-9]/i.test(renderer);
    this.autoTier = weak ? 'low' : mobile ? 'medium' : strong ? 'ultra' : 'high';
    this.isMobile = mobile;
  },
  q() { const s = Settings.v; const tier = s.quality === 'auto' ? (this.autoTier || 'high') : s.quality; const base = QUALITY[tier] || QUALITY.high; return s.quality === 'custom' ? s : Object.assign({}, s, base, s.pixelH ? { pixelH: s.pixelH } : {}); },
  applyQuality() {
    if (!this.gl) return; const q = this.q(); this.Q = q; this.dynScale = this.dynScale || 1;
    this.shSize = [0, 1024, 2048, 2048][q.shadows]; this.makeShadow(); this.resize();
  },
  resize() {
    if (!this.gl) return; const dpr = Math.min(devicePixelRatio || 1, 2), c = this.canvas;
    const cw = Math.max(1, Math.round(innerWidth * dpr)), ch = Math.max(1, Math.round(innerHeight * dpr)); c.width = cw; c.height = ch;
    const q = this.Q || QUALITY.high; const target = (q.pixelH || 240) * (this.dynScale || 1);
    this.scale = Math.max(1, Math.round(ch / target)); this.W = Math.ceil(cw / this.scale); this.H = Math.ceil(ch / this.scale);
    this.makeTargets();
    $('rot').style.display = (this.isMobile && innerHeight > innerWidth && !window.__rotDismissed) ? 'flex' : 'none';
  },
  tex(w, h, ifmt, fmt, type, filter) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; },
  makeTargets() {
    const gl = this.gl, W = this.W, H = this.H; const del = o => o && (o.fb && gl.deleteFramebuffer(o.fb), (o.ts || []).forEach(t => gl.deleteTexture(t)), o.rb && gl.deleteRenderbuffer(o.rb));
    del(this.main); del(this.post); del(this.refl);
    const c0 = this.tex(W, H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST), c1 = this.tex(W, H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST), d = this.tex(W, H, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
    let fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, c0, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, c1, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, d, 0);
    this.main = { fb, ts: [c0, c1, d], c0, c1, d };
    const p0 = this.tex(W, H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST); fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, p0, 0);
    this.post = { fb, ts: [p0], c0: p0 };
    const q = this.Q || {}; const rs = q.reflections >= 2 ? 1 : .5; const RW = Math.max(16, Math.round(W * rs)), RH = Math.max(16, Math.round(H * rs));
    const r0 = this.tex(RW, RH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR), r1 = this.tex(RW, RH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST); const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, RW, RH);
    fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, r0, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, r1, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    this.refl = { fb, ts: [r0, r1], rb, c0: r0, w: RW, h: RH };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  makeShadow() {
    const gl = this.gl; if (this.shadow) { gl.deleteFramebuffer(this.shadow.fb); gl.deleteTexture(this.shadow.t); this.shadow = null; }
    if (!this.shSize) return; const S = this.shSize, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, S, S, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.shadow = { fb, t, S };
  },
  prog(vs, fs) {
    const gl = this.gl; const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(o)); this.err = gl.getShaderInfoLog(o); return null; } return o; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null;
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); this.err = gl.getProgramInfoLog(p); return null; }
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  },
  // upload a MeshBuilder → VAO
  upload(b, keep) {
    const gl = this.gl; if (!b.n) return null; const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(b.buf, 0, b.n * 24), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, 24, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 24, 16); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 24, 20);
    gl.bindVertexArray(null); return { vao, buf, count: b.n, min: b.min.slice(), max: b.max.slice() };
  },
  attachInst(m) {
    const gl = this.gl; gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, m.ibuf);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(4 + i); gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(4 + i, 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, m.ebuf); gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 4, gl.UNSIGNED_BYTE, true, 8, 0); gl.vertexAttribDivisor(7, 1);
    gl.enableVertexAttribArray(8); gl.vertexAttribPointer(8, 4, gl.UNSIGNED_BYTE, true, 8, 4); gl.vertexAttribDivisor(8, 1); gl.bindVertexArray(null);
  },
  freeChunks() { const gl = this.gl; for (const c of this.chunks) { if (c.main) { gl.deleteVertexArray(c.main.vao); gl.deleteBuffer(c.main.buf); } if (c.det) { gl.deleteVertexArray(c.det.vao); gl.deleteBuffer(c.det.buf); } } this.chunks = []; },
  /* ---- per-frame instance submission ---- */
  beginInst() { for (const k in this.meshes) this.meshes[k].n = 0; },
  _m: new Float32Array(12),
  inst(mesh, m34, r, g, b, em = 0, flags = 0, sway = 0, rev = 0) {
    const M = this.meshes[mesh]; if (M.n >= M.cap) { const nc = Math.max(256, M.cap * 2); const nm = new Float32Array(nc * 12), ne = new Uint8Array(nc * 8); if (M.mat) { nm.set(M.mat); ne.set(M.ce); } M.mat = nm; M.ce = ne; M.cap = nc; }
    const i = M.n++; M.mat.set(m34, i * 12); const e = M.ce, o = i * 8;
    e[o] = r * 255; e[o + 1] = g * 255; e[o + 2] = b * 255; e[o + 3] = em * 255; e[o + 4] = sway * 255; e[o + 5] = flags; e[o + 6] = rev; e[o + 7] = 0;
  },
  // convenience: axis box at center with yaw
  box(x, y, z, sx, sy, sz, ry, col, em = 0, flags = 0) { A34.trs(this._m, x, y, z, ry, 0, 0, sx, sy, sz); this.inst('cube', this._m, col[0], col[1], col[2], em, flags); },
  flushInst() { const gl = this.gl; for (const k in this.meshes) { const M = this.meshes[k]; if (!M.n) continue; gl.bindBuffer(gl.ARRAY_BUFFER, M.ibuf); gl.bufferData(gl.ARRAY_BUFFER, M.mat.subarray(0, M.n * 12), gl.STREAM_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, M.ebuf); gl.bufferData(gl.ARRAY_BUFFER, M.ce.subarray(0, M.n * 8), gl.STREAM_DRAW); } },
  /* ---- frustum ---- */
  planes(m) { const p = []; const r = (a, b, c, d) => { const l = Math.hypot(a, b, c); p.push([a / l, b / l, c / l, d / l]); };
    r(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]); r(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]); r(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
    r(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]); r(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]); r(m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]); return p; },
  visible(pl, mn, mx) { for (const p of pl) { const x = p[0] > 0 ? mx[0] : mn[0], y = p[1] > 0 ? mx[1] : mn[1], z = p[2] > 0 ? mx[2] : mn[2]; if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) return false; } return true; },
  /* ---- draw geometry set with a program ---- */
  drawGeo(P, vp, camPos, detailDist, planes) {
    const gl = this.gl; gl.uniform1i(P.u.uInst, 0); gl.vertexAttrib4f(7, 1, 1, 1, 0); let drawn = 0;
    const dd2 = detailDist * detailDist;
    for (const c of this.chunks) {
      if (planes && !this.visible(planes, c.min, c.max)) continue;
      if (c.main) { gl.bindVertexArray(c.main.vao); gl.drawArrays(gl.TRIANGLES, 0, c.main.count); drawn++; }
      if (c.det) { const cx = (c.min[0] + c.max[0]) / 2, cz = (c.min[2] + c.max[2]) / 2; if (dist2(cx, cz, camPos[0], camPos[2]) < dd2) { gl.bindVertexArray(c.det.vao); gl.drawArrays(gl.TRIANGLES, 0, c.det.count); } }
    }
    gl.uniform1i(P.u.uInst, 1);
    for (const k in this.meshes) { const M = this.meshes[k]; if (!M.n) continue; gl.bindVertexArray(M.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, M.count, M.n); }
    gl.bindVertexArray(null); return drawn;
  },
  setCommon(P, F, vp, v) {
    const gl = this.gl, u = P.u;
    gl.uniformMatrix4fv(u.uVP, false, vp); if (u.uV) gl.uniformMatrix4fv(u.uV, false, v);
    if (u.uWind) gl.uniform4fv(u.uWind, F.wind); if (u.uTime) gl.uniform1f(u.uTime, F.time); if (u.uPush) gl.uniform4fv(u.uPush, F.push); if (u.uStep) gl.uniform1f(u.uStep, Settings.v.steppedWind && !Settings.v.reducedMotion ? 1 : 0);
    if (u.uRev) gl.uniform1ui(u.uRev, F.revealed >>> 0);
  },
  /* ===== main render ===== */
  render(F) {
    const gl = this.gl, Q = this.Q, m = this.mats; if (this.lost) return;
    this.time = F.time;
    // camera matrices
    const asp = this.W / this.H;
    if (F.cam.ortho) { const s = F.cam.ortho; M4.ortho(m.p, -s * asp, s * asp, -s, s, F.cam.near ?? -200, 400); } else M4.persp(m.p, F.cam.fov, asp, .15, F.cam.far || 400);
    if (F.cam.blendP) { for (let i = 0; i < 16; i++) m.p[i] = lerp(F.cam.blendP[i], m.p[i], F.cam.blendT); }
    this.lastP = m.p.slice();
    M4.look(m.v, F.cam.eye, F.cam.at, [0, 1, 0]); M4.mul(m.vp, m.p, m.v); M4.inv(m.ivp, m.vp); M4.inv(m.ip, m.p);
    this.vp = m.vp; this.view = m.v; this.proj = m.p;
    const planes = this.planes(m.vp);
    this.flushInst();
    const detailDist = [28, 45, 70, 110][Q.drawDist] || 60;
    // ---- shadow pass ----
    const shOn = !!(this.shadow && Q.shadows > 0);
    if (shOn) {
      const ext = [22, 28, 36, 44][Q.shadows], sd = F.sunDir, c = F.cam.at;
      const texel = ext * 2 / this.shadow.S;
      const eye = [c[0] + sd[0] * 80, c[1] + sd[1] * 80, c[2] + sd[2] * 80];
      M4.look(m.tmp, eye, c, Math.abs(sd[1]) > .99 ? [0, 0, 1] : [0, 1, 0]);
      // snap to texels to avoid shimmering
      const cx = m.tmp[12], cy = m.tmp[13]; m.tmp[12] = Math.round(cx / texel) * texel; m.tmp[13] = Math.round(cy / texel) * texel;
      const lp = M4.ortho(M4.create(), -ext, ext, -ext, ext, 1, 200); M4.mul(m.lvp, lp, m.tmp);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadow.fb); gl.viewport(0, 0, this.shadow.S, this.shadow.S); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.CULL_FACE); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2);
      const P = this.progs.shadow; gl.useProgram(P.p); this.setCommon(P, F, m.lvp, m.tmp);
      this.drawGeo(P, m.lvp, F.cam.at, detailDist * .6, this.planes(m.lvp)); gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    // ---- reflection pass ----
    const reflOn = F.water && Q.reflections > 0;
    if (reflOn) {
      const h = F.water.h, e = F.cam.eye, a = F.cam.at;
      const S = M4.create(); S[5] = -1; S[13] = 2 * h; M4.mul(m.rv, m.v, S); M4.mul(m.rvp, m.p, m.rv); M4.inv(m.rivp, m.rvp); gl.frontFace(gl.CW);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.refl.fb); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.viewport(0, 0, this.refl.w, this.refl.h);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this.drawSky(F, m.rivp, [0, 1, 0, 0]);
      const P = this.progs.main; gl.useProgram(P.p); this.setCommon(P, F, m.rvp, m.rv); this.setLighting(P, F, shOn, m.lvp, this.refl.w, this.refl.h, [0, 1, 0, -h + .02], true);
      gl.uniform1f(P.u.uEcho, F.echo); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
      this.drawGeo(P, m.rvp, F.cam.at, detailDist * .5, this.planes(m.rvp)); gl.frontFace(gl.CCW);
    }
    // ---- main pass ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.main.fb); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawSky(F, m.ivp, [0, 0, 0, 0]);
    const P = this.progs.main; gl.useProgram(P.p); this.setCommon(P, F, m.vp, m.v); this.setLighting(P, F, shOn, m.lvp, this.W, this.H, [0, 0, 0, 1], false);
    gl.uniform1f(P.u.uEcho, 0); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    this.stats = { chunks: this.drawGeo(P, m.vp, F.cam.eye, detailDist, planes) };
    // water
    if (F.water) {
      const W = this.progs.water; gl.useProgram(W.p); const u = W.u;
      gl.uniformMatrix4fv(u.uVP, false, m.vp); gl.uniformMatrix4fv(u.uV, false, m.v); gl.uniform1f(u.uH, F.water.h); gl.uniform1f(u.uTime, F.time);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.refl.c0); gl.uniform1i(u.uRefl, 1); gl.uniform1f(u.uReflOn, reflOn ? 1 : 0); gl.uniform2f(u.uRes, this.W, this.H);
      gl.uniform3fv(u.uCam, F.cam.eye); gl.uniform3fv(u.uSunDir, F.sunDir); gl.uniform3fv(u.uSunCol, F.sunCol); gl.uniform3fv(u.uSky, F.sky); gl.uniform3fv(u.uFogC, F.fogCol); gl.uniform3fv(u.uWaterC, F.water.col);
      gl.uniform4fv(u.uFog, F.fog); gl.uniform1f(u.uFogOff, F.fogOff || 0); gl.uniform1f(u.uRain, F.rain); gl.uniform4fv(u.uRip, F.ripples); gl.uniform4fv(u.uPL, F.lights); gl.uniform1i(u.uNPL, F.nLights); gl.uniform4fv(u.uScan, F.scan); gl.uniform1f(u.uScanS, F.scanS);
      gl.bindVertexArray(this.wvao); gl.drawArrays(gl.TRIANGLES, 0, this.wcount); gl.bindVertexArray(null);
    }
    // particles + lines (color only, premultiplied)
    if (F.partN || F.lineN) {
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const Pp = this.progs.part; gl.useProgram(Pp.p); gl.uniformMatrix4fv(Pp.u.uVP, false, m.vp); gl.uniformMatrix4fv(Pp.u.uV, false, m.v); gl.uniform1f(Pp.u.uPx, this.H * .9);
      gl.uniform3fv(Pp.u.uFogC, F.fogCol); gl.uniform3fv(Pp.u.uCam, F.cam.eye); gl.uniform4fv(Pp.u.uFog, F.fog); gl.uniform1f(Pp.u.uFogOff, F.fogOff || 0);
      if (F.partN) { gl.bindVertexArray(this.pvao); gl.bindBuffer(gl.ARRAY_BUFFER, this.pbuf); gl.bufferData(gl.ARRAY_BUFFER, F.partData.subarray(0, F.partN * 5), gl.STREAM_DRAW); gl.drawArrays(gl.POINTS, 0, F.partN); }
      if (F.lineN) { gl.bindVertexArray(this.lvao); gl.bindBuffer(gl.ARRAY_BUFFER, this.lbuf); gl.bufferData(gl.ARRAY_BUFFER, F.lineData.subarray(0, F.lineN * 5), gl.STREAM_DRAW); gl.drawArrays(gl.LINES, 0, F.lineN); }
      gl.bindVertexArray(null); gl.disable(gl.BLEND); gl.depthMask(true);
    }
    // ---- post ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post.fb); gl.drawBuffers([gl.COLOR_ATTACHMENT0]); gl.viewport(0, 0, this.W, this.H); gl.disable(gl.DEPTH_TEST);
    const Po = this.progs.post, u = Po.u; gl.useProgram(Po.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.main.c0); gl.uniform1i(u.uCol, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.main.c1); gl.uniform1i(u.uNrm, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.main.d); gl.uniform1i(u.uDep, 2);
    gl.uniformMatrix4fv(u.uIP, false, m.ip); gl.uniformMatrix4fv(u.uP, false, m.p); gl.uniformMatrix4fv(u.uV, false, m.v); gl.uniform2f(u.uRes, this.W, this.H); gl.uniform1f(u.uTime, F.time);
    const pf = F.post, s = Settings.v;
    gl.uniform1f(u.uEdges, s.edges ? 1 : 0); gl.uniform1f(u.uAO, Q.ssao ? 1 : 0); gl.uniform1f(u.uSSR, Q.reflections >= 2 ? 1 : Q.reflections === 1 ? .6 : 0); gl.uniform1f(u.uBloom, Q.post >= 1 ? pf.bloom : 0);
    // sun screen position for light shafts
    const sp = M4.xform(m.vp, F.cam.eye[0] + F.sunDir[0] * 300, F.cam.eye[1] + F.sunDir[1] * 300, F.cam.eye[2] + F.sunDir[2] * 300);
    gl.uniform2f(u.uSunUV, sp[0] * .5 + .5, sp[1] * .5 + .5); gl.uniform1f(u.uSunVis, sp[3] > 0 ? 1 : 0); gl.uniform1f(u.uRays, Q.post >= 2 ? pf.rays : 0);
    gl.uniform1f(u.uDof, Q.post >= 1 ? pf.dof : 0); gl.uniform1f(u.uFocus, pf.focus); gl.uniform1f(u.uFocusR, pf.focusR);
    gl.uniform1f(u.uGrain, s.grain * (Q.post ? 1 : .5)); gl.uniform1f(u.uChroma, s.chroma ? pf.chroma : 0); gl.uniform1f(u.uSig, s.reducedMotion ? pf.sig * .3 : pf.sig);
    gl.uniform1f(u.uHurt, pf.hurt); gl.uniform1f(u.uFade, pf.fade); gl.uniform3fv(u.uFadeC, pf.fadeCol); gl.uniform1f(u.uVig, pf.vig);
    gl.uniform1f(u.uContrast, pf.contrast); gl.uniform1f(u.uSatu, pf.satu); gl.uniform1f(u.uExpo, pf.expo); gl.uniform3fv(u.uLift, pf.lift); gl.uniform3fv(u.uGain, pf.gain);
    gl.uniform1f(u.uQuant, Q.post >= 1 ? 40 : 0); gl.uniform3fv(u.uSunCol, F.sunCol); gl.uniform3fv(u.uSky, F.sky);
    gl.bindVertexArray(this.emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // ---- integer upscale blit ----
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.post.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    const ch = this.canvas.height, cw = this.canvas.width, ox = Math.floor((cw - this.W * this.scale) / 2), oy = Math.floor((ch - this.H * this.scale) / 2);
    gl.blitFramebuffer(0, 0, this.W, this.H, ox, oy, ox + this.W * this.scale, oy + this.H * this.scale, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  drawSky(F, ivp, clip) {
    const gl = this.gl, P = this.progs.sky, u = P.u; gl.useProgram(P.p); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.uniformMatrix4fv(u.uIVP, false, ivp); gl.uniform3fv(u.uCam, F.cam.eye); gl.uniform3fv(u.uSunDir, F.sunDir); gl.uniform3fv(u.uSunCol, F.sunCol);
    gl.uniform3fv(u.uSkyTop, F.skyTop); gl.uniform3fv(u.uSkyHor, F.skyHor); gl.uniform3fv(u.uFogC, F.fogCol); gl.uniform1f(u.uNight, F.night); gl.uniform1f(u.uTime, F.time);
    gl.uniform1f(u.uAur, F.aurora); gl.uniform1f(u.uCloud, F.cloud); gl.uniform1f(u.uPlanet, F.planet); gl.uniform3fv(u.uPlanetDir, F.planetDir); gl.uniform3fv(u.uPlanetCol, F.planetCol); gl.uniform4fv(u.uClip, clip[0] ? [0, 1, 0, 0] : [0, 0, 0, 0]);
    gl.bindVertexArray(this.emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  },
  setLighting(P, F, shOn, lvp, w, h, clip, isRefl) {
    const gl = this.gl, u = P.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shOn ? this.shadow.t : this.dummyDepth); gl.uniform1i(u.uSh, 0);
    if (shOn) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadow.t); gl.uniform1i(u.uSh, 0); gl.uniformMatrix4fv(u.uLVP, false, lvp); gl.uniform1f(u.uShTex, 1 / this.shadow.S); gl.uniform1i(u.uShTaps, this.Q.shadows >= 2 ? 4 : 1); }
    gl.uniform1f(u.uShOn, shOn ? 1 : 0);
    gl.uniform3fv(u.uSunDir, F.sunDir); gl.uniform3fv(u.uSunCol, F.sunCol); gl.uniform3fv(u.uSky, F.sky); gl.uniform3fv(u.uGnd, F.gnd); gl.uniform3fv(u.uFogC, F.fogCol); gl.uniform3fv(u.uCam, isRefl ? [F.cam.eye[0], 2 * F.water.h - F.cam.eye[1], F.cam.eye[2]] : F.cam.eye);
    gl.uniform4fv(u.uFog, F.fog); gl.uniform1f(u.uFogOff, F.fogOff || 0); gl.uniform4fv(u.uPL, F.lights); gl.uniform1i(u.uNPL, this.Q.lighting === 0 ? Math.min(F.nLights, 3) : F.nLights);
    gl.uniform4fv(u.uScan, F.scan); gl.uniform1f(u.uScanS, F.scanS); gl.uniform4fv(u.uCut, isRefl ? [0, 0, 0, 0] : F.cut); gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uWet, F.wet); gl.uniform1f(u.uBands, F.bands || 5); gl.uniform4fv(u.uClip, clip); gl.uniform3fv(u.uFlash, F.flash); gl.uniform1f(u.uLow, F.desat || 0);
  },
  // project world point to CSS pixels
  toScreen(x, y, z) { const p = M4.xform(this.vp, x, y, z); if (p[3] <= 0) return null; return [(p[0] * .5 + .5) * innerWidth, (1 - (p[1] * .5 + .5)) * innerHeight, p[3], Math.abs(p[0]) < 1.1 && Math.abs(p[1]) < 1.1]; },
};

/* =====================================================================
   MESH BUILDER — faceted low-poly geometry with per-vertex color/flags
   ===================================================================== */
class MeshBuilder {
  constructor(cap = 4096) { this.cap = cap; this.buf = new ArrayBuffer(cap * 24); this.f = new Float32Array(this.buf); this.b = new Int8Array(this.buf); this.u = new Uint8Array(this.buf); this.n = 0; this.min = [1e9, 1e9, 1e9]; this.max = [-1e9, -1e9, -1e9]; this.T = null; this.rng = RNG(7); }
  grow() { const nc = this.cap * 2, nb = new ArrayBuffer(nc * 24); new Uint8Array(nb).set(this.u); this.buf = nb; this.f = new Float32Array(nb); this.b = new Int8Array(nb); this.u = new Uint8Array(nb); this.cap = nc; }
  v(x, y, z, nx, ny, nz, c, em, sw, fl, rv) {
    if (this.n >= this.cap) this.grow(); const i = this.n++, o = i * 6; this.f[o] = x; this.f[o + 1] = y; this.f[o + 2] = z;
    const bo = (o + 3) * 4; this.b[bo] = nx * 127; this.b[bo + 1] = ny * 127; this.b[bo + 2] = nz * 127;
    const co = (o + 4) * 4; this.u[co] = clamp(c[0], 0, 1) * 255; this.u[co + 1] = clamp(c[1], 0, 1) * 255; this.u[co + 2] = clamp(c[2], 0, 1) * 255; this.u[co + 3] = em * 255;
    const eo = (o + 5) * 4; this.u[eo] = clamp(sw, 0, 1) * 255; this.u[eo + 1] = fl; this.u[eo + 2] = rv; this.u[eo + 3] = 0;
    if (x < this.min[0]) this.min[0] = x; if (y < this.min[1]) this.min[1] = y; if (z < this.min[2]) this.min[2] = z; if (x > this.max[0]) this.max[0] = x; if (y > this.max[1]) this.max[1] = y; if (z > this.max[2]) this.max[2] = z;
  }
  tri(a, b, c, col, o = {}) {
    if (this.T) { a = A34.pt(this.T, a[0], a[1], a[2]); b = A34.pt(this.T, b[0], b[1], b[2]); c = A34.pt(this.T, c[0], c[1], c[2]); }
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const em = o.em || 0, fl = o.flags || 0, rv = o.rev || 0, sw = o.sw;
    const s0 = sw ? (typeof sw === 'number' ? sw : sw(a)) : 0, s1 = sw ? (typeof sw === 'number' ? sw : sw(b)) : 0, s2 = sw ? (typeof sw === 'number' ? sw : sw(c)) : 0;
    this.v(a[0], a[1], a[2], nx, ny, nz, col, em, s0, fl, rv); this.v(b[0], b[1], b[2], nx, ny, nz, col, em, s1, fl, rv); this.v(c[0], c[1], c[2], nx, ny, nz, col, em, s2, fl, rv);
  }
  quad(a, b, c, d, col, o) { this.tri(a, b, c, col, o); this.tri(a, c, d, col, o); }
  vary(col, o, k = 1) { const v = (o && o.vary != null ? o.vary : .08) * k; if (!v) return col; const r = (this.rng() - .5) * v * 2; return [col[0] * (1 + r) + (this.rng() - .5) * v * .3, col[1] * (1 + r), col[2] * (1 + r) + (this.rng() - .5) * v * .3]; }
  withT(m, fn) { const prev = this.T; this.T = prev ? A34.mul(new Float32Array(12), prev, m) : m; fn(); this.T = prev; }
  box(cx, cy, cz, sx, sy, sz, col, o = {}) {
    const ry = o.ry || 0, rx = o.rx || 0, rz = o.rz || 0;
    const m = A34.trs(new Float32Array(12), cx, cy, cz, ry, rx, rz, sx, sy, sz);
    this.withT(m, () => {
      const h = .5, P = [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]];
      const top = o.top || col, side = o.side || col;
      const faces = [[4, 5, 6, 7, side, 1], [1, 0, 3, 2, side, .85], [5, 1, 2, 6, side, .95], [0, 4, 7, 3, side, .9], [7, 6, 2, 3, top, 1.08], [0, 1, 5, 4, side, .6]];
      for (const f of faces) { if (o.noBottom && f[5] === .6) continue; const c = this.vary(f[4], o); this.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]], c, o); }
    });
  }
  cyl(x, y, z, r, h, n, col, o = {}) {
    const rt = o.rTop != null ? o.rTop : r, a0 = o.a0 || 0;
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * TAU, b = a0 + (i + 1) / n * TAU;
      const p0 = [x + Math.cos(a) * r, y, z + Math.sin(a) * r], p1 = [x + Math.cos(b) * r, y, z + Math.sin(b) * r];
      const q0 = [x + Math.cos(a) * rt + (o.lean ? o.lean[0] * h : 0), y + h, z + Math.sin(a) * rt + (o.lean ? o.lean[1] * h : 0)], q1 = [x + Math.cos(b) * rt + (o.lean ? o.lean[0] * h : 0), y + h, z + Math.sin(b) * rt + (o.lean ? o.lean[1] * h : 0)];
      const c = this.vary(col, o);
      if (rt > 0) this.quad(p0, q0, q1, p1, c, o); else this.tri(p0, q0, p1, c, o);
      if (!o.noCap && rt > 0) this.tri([x + (o.lean ? o.lean[0] * h : 0), y + h, z + (o.lean ? o.lean[1] * h : 0)], q1, q0, o.top || c, o);
    }
  }
  ico(x, y, z, r, sub, col, o = {}) {
    const t = (1 + Math.sqrt(5)) / 2; let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; });
    let Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    if (sub === 0) { V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; Fc = [[2, 4, 0], [2, 1, 4], [2, 5, 1], [2, 0, 5], [3, 0, 4], [3, 4, 1], [3, 1, 5], [3, 5, 0]]; }
    for (let s = 1; s < sub; s++) { const nf = [], cache = {}; const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache[k] != null) return cache[k]; const p = [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2]; const l = Math.hypot(...p); V.push([p[0] / l, p[1] / l, p[2] / l]); return cache[k] = V.length - 1; };
      for (const [a, b, c] of Fc) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } Fc = nf; }
    const sx = o.sx || 1, sy = o.sy || 1, sz = o.sz || 1, j = o.jitter || 0, rng = o.rng || this.rng;
    const P = V.map(v => { const k = 1 + (j ? (rng() - .5) * j : 0); return [x + v[0] * r * sx * k, y + v[1] * r * sy * k, z + v[2] * r * sz * k]; });
    if (o.flatBottom != null) for (const p of P) if (p[1] < y + o.flatBottom) p[1] = y + o.flatBottom;
    for (const [a, b, c] of Fc) { const cc = o.colorFn ? o.colorFn(P[a], P[b], P[c]) : col; this.tri(P[a], P[c], P[b], this.vary(cc, o), o); }
  }
  // grass blade / leaf card (double-sided via shader)
  blade(x, y, z, h, w, ang, lean, col, o) { const dx = Math.cos(ang) * w, dz = Math.sin(ang) * w, lx = Math.cos(ang + 1.57) * lean, lz = Math.sin(ang + 1.57) * lean;
    this.tri([x - dx, y, z - dz], [x + dx, y, z + dz], [x + lx, y + h, z + lz], col, o); }
}
