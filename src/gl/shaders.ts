// All GLSL lives here. Coordinates: "doc" = CSS px in document space (y down),
// "px" = canvas device px (y down unless noted). Scene passes are lower-res.

const HEADER = /* glsl */ `#version 300 es
precision highp float;
`

export const QUAD_VS = /* glsl */ `#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`

// Pane quads are positioned from a pixel rect (y down).
export const PANE_VS = /* glsl */ `#version 300 es
precision highp float;
uniform vec4 uQuad;
uniform vec2 uRes;
out vec2 vPx;
void main(){
  vec2 c = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);
  vec2 px = uQuad.xy + c * uQuad.zw;
  vPx = px;
  vec2 ndc = px / uRes * 2. - 1.;
  gl_Position = vec4(ndc.x, -ndc.y, 0., 1.);
}`

export const SCENE_FS = HEADER + /* glsl */ `
in vec2 vUv; out vec4 o;
uniform vec2 uCss;
uniform float uDocTop, uDocLeft, uT, uVH;
uniform vec2 uE, uX, uIn;
uniform float uFan, uSpread, uI1, uI2, uHero, uPR;
uniform vec2 uC;
uniform vec4 uPool[8];
uniform vec3 uPoolC[8];
uniform vec3 uRay[5];
uniform float uRayG[5];
uniform sampler2D uTxt;
uniform float uTxtA, uTxtLod, uTxtSoft, uRowH, uWordsEnd;

float fld(vec2 q, float t){
  return sin(q.x * 1.3 + sin(q.y * 1.1 + t * .11) * 1.2)
       + sin(q.y * 1.7 - sin(q.x * .9 - t * .07) * 1.4)
       + .5 * sin((q.x + q.y) * 2.3 + t * .05);
}

float sdTri(vec2 p, float r){
  const float k = 1.7320508;
  p.x = abs(p.x) - r; p.y = p.y + r / k;
  if(p.x + k * p.y > 0.) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.;
  p.x -= clamp(p.x, -2. * r, 0.);
  return -length(p) * sign(p.y);
}

void main(){
  vec2 css = vec2(vUv.x, 1. - vUv.y) * uCss;
  vec2 P = vec2(css.x + uDocLeft, css.y + uDocTop);
  vec2 q = P / uVH;
  float t = uT;

  vec3 pool = vec3(0.); float L = 0.;
  for(int i = 0; i < 8; i++){
    vec2 d = (P - uPool[i].xy) / uPool[i].z;
    float e = exp(-dot(d, d)) * uPool[i].w;
    pool += uPoolC[i] * e; L += e;
  }

  // Interference fringes: fine lines that make refraction legible everywhere.
  float v = fld(q, t) * 3.4;
  float w = fwidth(v);
  float ln = 1. - smoothstep(0., 1.5, abs(fract(v) - .5) / max(w, 1e-4));

  vec3 c = vec3(.011, .013, .021);
  c += pool * (.5 + .22 * sin(v * .55));
  c += (pool * 1.5 + vec3(.022)) * ln * (.055 + L * .3);

  // The five rays keep falling down the page behind the glass. They give every
  // pane something to refract and tie the sections back to the prism.
  float river = smoothstep(uVH * .8, uVH * 1.45, P.y);
  if(river > .001){
    float ph = P.y / (uVH * 2.1);
    float cx = uCss.x * (.5 + .4 * sin(ph * 2.4 + .9));
    float dx = uCss.x * .4 * cos(ph * 2.4 + .9) * 2.4 / (uVH * 2.1);
    float cosA = 1. / sqrt(1. + dx * dx);
    for(int i = 0; i < 5; i++){
      float fi = float(i) - 2.;
      float gap = (uCss.x * .016 + 16.) * (1.3 + .7 * sin(ph * 3.1 + .4));
      float xi = cx + fi * gap + sin(P.y * .0024 + t * .16 + fi) * 14.;
      float dd = abs(css.x - xi) * cosA;
      float wave = .74 + .26 * sin(P.y * .0046 - t * .55 + fi * 1.4);
      float glow = exp(-dd * dd / 3.4) * .95 + exp(-dd * dd / 300.) * .24 + exp(-dd * dd / 9000.) * .085;
      c += uRay[i] * glow * wave * river * uRayG[i];
    }
  }

  vec3 lit = vec3(0.);
  if(uHero > .001){
    // Incident white beam.
    vec2 iv = P - uE;
    float is = -dot(iv, uIn);
    float cap = smoothstep(-uPR * .1, uPR * .22, is);
    if(cap > 0.){
      float id = abs(iv.x * uIn.y - iv.y * uIn.x);
      float reach = 1. - smoothstep(uI1 * uVH * 2.2 - uVH * .2, uI1 * uVH * 2.2, uVH * 2. - is);
      float core = exp(-id * id / 22.) * .5 + exp(-id * id / 160.) * .3 + exp(-id * id / 2600.) * .07;
      c += vec3(.96, .98, 1.) * core * reach * uHero * cap;
      lit += vec3(exp(-id * id / 3200.)) * reach * .34 * cap;
    }
    // Five dispersed rays.
    for(int i = 0; i < 5; i++){
      float a = uFan + (float(i) - 2.) * uSpread;
      vec2 d = vec2(cos(a), sin(a));
      vec2 rv = P - uX;
      float s = dot(rv, d);
      float cap = smoothstep(-uPR * .08, uPR * .18, s);
      if(cap > 0.){
        float dist = abs(rv.x * d.y - rv.y * d.x);
        float wd = 1.4 + s * .0065;
        float fall = exp(-s / (uVH * 1.25));
        float front = 1. - smoothstep(uI2 * uVH * 2.4 - uVH * .25, uI2 * uVH * 2.4, s);
        float shimmer = .86 + .14 * sin(s * .012 - t * 1.4 + float(i) * 1.9);
        float core = exp(-dist * dist / (wd * wd * 7.)) * .45;
        float halo = exp(-dist * dist / (wd * wd * 70.)) * .3;
        float bloom = exp(-dist * dist / (wd * wd * 900.)) * .07;
        c += uRay[i] * (core + halo + bloom) * fall * front * shimmer * uHero * cap;
        lit += uRay[i] * exp(-dist * dist / (wd * wd * 1800.)) * fall * front * cap;
      }
    }
    // Ghost prism: only its rim lands in the scene so the floor can mirror it.
    vec2 pc = P - uC;
    float pd = sdTri(vec2(pc.x, -pc.y), uPR * .866) - uPR * .06;
    c += vec3(.75, .8, .95) * exp(-abs(pd) / 2.4) * .55 * uHero * smoothstep(.0, .3, uI1);
    c += vec3(.5, .55, .75) * exp(-max(pd, 0.) / (uPR * .35)) * .05 * uHero * smoothstep(.0, .3, uI1);
  }

  // Greetings in many languages, visible only where light touches them.
  float rowH = uRowH;
  float yy = P.y / rowH;
  float r = floor(yy);
  float dir = mod(r, 2.) * 2. - 1.;
  float speed = .007 * (1. + mod(r * 1.7, 3.) * .35);
  float tv = (fract(yy) + mod(r, 6.)) / 6.;
  float tu = P.x / (rowH * 12.) + dir * t * speed + r * .37;
  // A small sampling radius keeps the multilingual letterforms legible.
  float lod = uTxtLod + uTxtSoft;
  vec2 bl = vec2(.00032, .0008) * pow(2., lod);
  float tx = 0.;
  for(int i = 0; i < 8; i++){
    float a = float(i) * .7854 + .39;
    tx += textureLod(uTxt, vec2(tu, tv) + vec2(cos(a), sin(a)) * bl, lod).r;
  }
  tx *= .125;
  float wordMask = uWordsEnd > 0. ? 1. - smoothstep(uWordsEnd - uVH * .6, uWordsEnd, P.y) : 1.;
  c += tx * uTxtA * wordMask * (vec3(.11, .125, .17) * uHero + vec3(.012, .014, .02) + lit * .34 * uHero + pool * .1);

  c = 1. - exp(-c * 1.32);
  o = vec4(c, 1.);
}`

export const SCRIM_FS = HEADER + /* glsl */ `
out vec4 o;
uniform vec4 uC;
void main(){ o = uC; }`

export const DOWN_FS = HEADER + /* glsl */ `
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec2 h = uTexel;
  vec3 c = texture(uTex, vUv).rgb * 4.;
  c += texture(uTex, vUv + vec2(-h.x, -h.y)).rgb;
  c += texture(uTex, vUv + vec2( h.x, -h.y)).rgb;
  c += texture(uTex, vUv + vec2(-h.x,  h.y)).rgb;
  c += texture(uTex, vUv + vec2( h.x,  h.y)).rgb;
  o = vec4(c / 8., 1.);
}`

export const UP_FS = HEADER + /* glsl */ `
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec2 h = uTexel;
  vec3 c = texture(uTex, vUv + vec2(-h.x * 2., 0.)).rgb;
  c += texture(uTex, vUv + vec2(-h.x, h.y)).rgb * 2.;
  c += texture(uTex, vUv + vec2(0., h.y * 2.)).rgb;
  c += texture(uTex, vUv + vec2(h.x, h.y)).rgb * 2.;
  c += texture(uTex, vUv + vec2(h.x * 2., 0.)).rgb;
  c += texture(uTex, vUv + vec2(h.x, -h.y)).rgb * 2.;
  c += texture(uTex, vUv + vec2(0., -h.y * 2.)).rgb;
  c += texture(uTex, vUv + vec2(-h.x, -h.y)).rgb * 2.;
  o = vec4(c / 12., 1.);
}`

// Final background: scene plus a rippled mirror floor and dither.
export const BG_FS = HEADER + /* glsl */ `
in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uBlur;
uniform vec2 uCss;
uniform float uDocTop, uFloor, uFloorFade, uT, uHero, uDocLeft, uVH, uFan, uSpread, uI1, uI2, uPR;
uniform vec2 uE, uX, uIn;
uniform vec3 uRay[5];

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main(){
  vec3 c = texture(uScene, vUv).rgb;
  float docY = uDocTop + (1. - vUv.y) * uCss.y;
  float below = docY - uFloor;
  if(below > 0. && uHero > .001){
    float k = clamp(below / uFloorFade, 0., 1.);
    float wob = sin(below * .085 - uT * 1.5 + vUv.x * 7.) * .0021 + sin(below * .027 + vUv.x * 19. + uT * .8) * .003;
    float my = docY - below * 2.;
    vec2 m = vec2(vUv.x + wob * (.35 + k * 2.2), 1. - (my - uDocTop) / uCss.y);
    float edge = smoothstep(1., .96, m.y) * smoothstep(0., .04, m.y);
    vec3 sharp = texture(uScene, m).rgb;
    vec3 soft = texture(uBlur, m).rgb;
    vec3 r = mix(sharp, soft, smoothstep(.0, .75, k));
    float a = (1. - k) * (1. - k) * .62 * edge * uHero;
    c = c * (1. - a * .55) + r * a;
  }
  // Light filaments live here, at full canvas resolution, so they never stair-step.
  if(uHero > .001){
    vec2 P = vec2(vUv.x * uCss.x + uDocLeft, docY);
    vec2 iv = P - uE;
    float is = -dot(iv, uIn);
    float cap = smoothstep(-uPR * .1, uPR * .22, is);
    float id = abs(iv.x * uIn.y - iv.y * uIn.x);
    float reach = 1. - smoothstep(uI1 * uVH * 2.2 - uVH * .2, uI1 * uVH * 2.2, uVH * 2. - is);
    c += vec3(.96, .98, 1.) * exp(-id * id / 1.7) * .95 * cap * reach * uHero;
    for(int i = 0; i < 5; i++){
      float a = uFan + (float(i) - 2.) * uSpread;
      vec2 d = vec2(cos(a), sin(a));
      vec2 rv = P - uX;
      float s = dot(rv, d);
      float rc = smoothstep(-uPR * .08, uPR * .18, s);
      if(rc > 0.){
        float dist = abs(rv.x * d.y - rv.y * d.x);
        float wd = .95 + s * .0028;
        float front = 1. - smoothstep(uI2 * uVH * 2.4 - uVH * .25, uI2 * uVH * 2.4, s);
        c += uRay[i] * exp(-dist * dist / (wd * wd)) * exp(-s / (uVH * 1.25)) * front * rc * uHero;
      }
    }
  }
  float line = exp(-below * below / 1.6) * uHero * smoothstep(.02, .55, vUv.x) * smoothstep(1., .8, vUv.x);
  c += vec3(.5, .55, .7) * line * .2;
  c += (hash(gl_FragCoord.xy * .013 + fract(uT)) - .5) * (1.6 / 255.);
  o = vec4(c, 1.);
}`

const GLASS_COMMON = /* glsl */ `
in vec2 vPx; out vec4 o;
uniform vec2 uRes;
uniform vec4 uRect;          // centre xy, half size xy (px)
uniform float uRadius, uBevel, uDepth, uFrost, uDim, uAlpha, uPx, uHover, uShadow;
uniform vec4 uTint;
uniform vec2 uLight;
uniform vec3 uPtr;           // xy px, z strength
uniform vec4 uRip;           // xy px, z age, w amp
uniform float uT;
uniform sampler2D uScene, uBlur;
uniform float uRot;

float sdRBox(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.) + length(max(q, 0.)) - r;
}
float sdTri(vec2 p, float r){
  const float k = 1.7320508;
  p.x = abs(p.x) - r; p.y = p.y + r / k;
  if(p.x + k * p.y > 0.) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.;
  p.x -= clamp(p.x, -2. * r, 0.);
  return -length(p) * sign(p.y);
}
vec3 iri(float a){ return .5 + .5 * cos(6.2831 * (a + vec3(0., .33, .67))); }
`

const GLASS_MAIN = /* glsl */ `
void main(){
  vec2 p = vPx - uRect.xy;
  vec2 g; float d;
  shape(p, d, g);

  float aa = 1.1 * uPx;
  float cover = 1. - smoothstep(-aa, aa, d);

  // Soft contact shadow and a little transmitted colour outside the pane.
  vec2 sp = p - vec2(0., 14. * uPx);
  vec2 sg; float sd; shape(sp, sd, sg);
  float sw = 34. * uPx;
  float sh = exp(-max(sd, 0.) * max(sd, 0.) / (2. * sw * sw)) * .46 * uShadow;

  if(cover <= .001){
    o = vec4(0., 0., 0., sh * uAlpha);
    return;
  }

  float inside = max(-d, 0.);
  float tt = clamp(inside / uBevel, 0., 1.);
  float u = 1. - tt;
  float h = sqrt(max(1. - u * u, .0));
  float slope = u / max(h, .16);
  vec2 tilt = g * slope * uDepth;

  // Pointer bulge: the surface swells toward a finger or cursor.
  vec2 dp = vPx - uPtr.xy;
  float pr = 150. * uPx;
  float bump = exp(-dot(dp, dp) / (pr * pr)) * uPtr.z;
  tilt += dp / pr * bump * .55;

  // Tap ripple travelling outward.
  if(uRip.w > .001){
    vec2 rd = vPx - uRip.xy;
    float rl = length(rd) + 1e-3;
    float front = uRip.z * 620. * uPx;
    float wave = sin((rl - front) * .055 / uPx) * exp(-pow((rl - front) / (70. * uPx), 2.));
    tilt += rd / rl * wave * uRip.w * .55;
  }

  vec3 n = normalize(vec3(tilt, 1.));
  vec3 rf = refract(vec3(0., 0., -1.), n, 1. / 1.48);
  vec2 off = rf.xy / max(-rf.z, .25) * uBevel * 2.6;

  vec2 uv = vec2(vPx.x, uRes.y - vPx.y) / uRes;
  vec2 o2 = vec2(off.x, -off.y) / uRes;
  float disp = .07 + u * .2;
  vec3 sharp = vec3(
    texture(uScene, uv + o2 * (1. + disp)).r,
    texture(uScene, uv + o2).g,
    texture(uScene, uv + o2 * (1. - disp)).b
  );
  vec3 soft = texture(uBlur, uv + o2).rgb;
  float frost = mix(uFrost, 0., smoothstep(.0, .55, u));
  vec3 c = mix(sharp, soft, frost);

  float lum = dot(c, vec3(.3, .59, .11));
  c = mix(vec3(lum), c, 1.32);
  c = c / (1. + lum * uDim * 1.2);
  c = c * (1. - uDim * .5);
  c = mix(c, uTint.rgb, uTint.a);
  c += vec3(.008, .009, .012) * (1. + uHover);

  // Light in the pane's plane.
  vec2 toL = uLight - vPx;
  float lDist = length(toL) + 1e-3;
  vec2 ld = toL / lDist;
  vec3 L3 = normalize(vec3(toL / (640. * uPx), 1.));
  vec3 H = normalize(L3 + vec3(0., 0., 1.));

  float rimW = 1.35 * uPx;
  float rim = exp(-inside * inside / (rimW * rimW));
  float facing = dot(g, ld);
  float a1 = pow(max(facing, 0.), 2.2);
  float a2 = pow(max(-facing, 0.), 3.2);
  float rimL = .16 + a1 * 1.1 + a2 * .55;

  float spec = pow(max(dot(n, H), 0.), 150.) * smoothstep(.25, .9, u);
  float wide = pow(max(dot(n, H), 0.), 16.) * smoothstep(.2, 1., u) * .08;
  float fres = pow(1. - n.z, 2.6);

  // Environment reflection: look outward along the surface normal.
  vec2 envUv = uv + vec2(g.x, -g.y) * (uBevel * 3.4 + 60. * uPx) / uRes;
  vec3 env = texture(uBlur, clamp(envUv, .001, .999)).rgb;
  c += env * fres * 1.6;

  float ang = atan(g.y, g.x) / 6.2831;
  vec3 iris = iri(ang * 1.5 + uT * .018 + dot(p, vec2(.0006, .0009)) / uPx);
  c += iris * pow(u, 4.) * .035;
  c += (vec3(1.) * .82 + iris * .26) * rim * rimL;
  c += vec3(1.) * spec * 1.15;
  c += vec3(.92, .95, 1.) * wide;
  // Caustic pooling on the side away from the light.
  c += iris * pow(u, 2.6) * a2 * .1;

  // Slow diagonal sheen, driven by where the light sits.
  float band = dot(p / max(uRect.z, uRect.w), vec2(.7071)) * .5 - (ld.x + ld.y) * .22;
  c += vec3(1.) * exp(-band * band / .012) * .022 * (1. + uHover);

  float a = cover;
  vec3 pm = c * a;
  float alpha = a + (1. - a) * sh;
  o = vec4(pm, alpha) * uAlpha;
}`

export const GLASS_RECT_FS = HEADER + GLASS_COMMON + /* glsl */ `
void shape(vec2 p, out float d, out vec2 g){
  vec2 b = uRect.zw;
  float r = min(uRadius, min(b.x, b.y));
  d = sdRBox(p, b, r);
  // Normals come from a softer box so the bevel has no crease at inner corners.
  float rr = max(r, min(uBevel * 1.25, min(b.x, b.y)));
  vec2 q = abs(p) - b + rr;
  vec2 s = vec2(p.x < 0. ? -1. : 1., p.y < 0. ? -1. : 1.);
  if(q.x > 0. && q.y > 0.) g = s * normalize(q);
  else g = q.x > q.y ? vec2(s.x, 0.) : vec2(0., s.y);
}
` + GLASS_MAIN

export const GLASS_TRI_FS = HEADER + GLASS_COMMON + /* glsl */ `
float tri(vec2 p){
  float c = cos(uRot), s = sin(uRot);
  vec2 r = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  float R = uRect.z;
  return sdTri(vec2(r.x, -r.y), R * .866) - uRadius;
}
void shape(vec2 p, out float d, out vec2 g){
  d = tri(p);
  float e = 1.2 * uPx;
  g = normalize(vec2(tri(p + vec2(e, 0.)) - tri(p - vec2(e, 0.)), tri(p + vec2(0., e)) - tri(p - vec2(0., e))) + 1e-5);
}
` + GLASS_MAIN
