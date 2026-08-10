# Landing Hero Rework + Aurora Backgrounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the `/` landing hero into a 3-fase scroll cinematic (welcome → B3 center-stack reveal over featured-video BG → soft exit), delete the old FeaturedCard, and add a vendor Aurora (WebGL via `ogl`) animated orange-gold background to all non-hero sections.

**Architecture:** Hero becomes one sticky `h-[260vh]` container driven by `useScroll`: fase-1 welcome ("Welcome to StackCrate" + ChevronDown bounce), fase-2 featured-video BG fade-in + scrim + B3 center-stack (h1, subtitle, count-up stats, single "Explore Assets" CTA → `/explore`), fase-3 B3 exit bottom-to-top. Video source = featured asset `preview_url` (presigned R2) via the existing `useFeatured` hook. Aurora (reactbits, adapted to TSX) is vendored to `src/components/ui/aurora.tsx` with a `prefers-reduced-motion` static-gradient fallback, and wrapped behind the marquee + `#assets` sections. `ogl` is added as a runtime dependency.

**Tech Stack:** Next.js 16.3 (App Router, client `page.tsx`), Tailwind v4 (tokens in `globals.css` — `--primary` `#f97316`, `--accent` `#f97316`), framer-motion v13 (LazyMotion, use `m.*` + `useScroll`/`useTransform`/`useReducedMotion`), lucide-react (`ChevronDown`), ogl (WebGL helper, new dep), `useFeatured` hook (existing), `/api/stats` (existing), Vitest + happy-dom, eslint.

## Global Constraints

- **Repo layout:** git root is `D:/Progamming/Project dan SourceCode/WEBB`; the app lives in `Web-Kumpulan-Asset-Editor/web-asset-editor/`. All bash/npm/commit commands run with `workdir` = that app folder; git `add` paths are relative to the repo root and prefixed `Web-Kumpulan-Asset-Editor/web-asset-editor/`.
- **Package manager:** npm. Scripts: `npm run lint`, `npm run test` (= `vitest run`). No typecheck script — use `npx tsc --noEmit`.
- **framer-motion convention:** app wrapped in `<LazyMotion strict>`; import `{ m, useScroll, useTransform, useReducedMotion }` FROM `framer-motion`; use `m.*` components. Never import `motion`.
- **Reduced motion:** ALL animations gated by `useReducedMotion()` (hero fade/video/count-up static; Aurora → static gradient fallback, no WebGL mount).
- **WebGL safety:** Aurora `new Renderer(...)` wrapped in try/catch; on failure or unsupported, render the static-gradient fallback div. Never crash the page over a background effect.
- **Design tokens only** — no new hex colors in JSX. Aurora colorStops `["#F97316","#eb9253","#F97316"]` are BG-effect params (mirrors existing `--primary`), acceptable as the vendor component's string props.
- **All copy full English** — "Welcome to StackCrate", "Free Assets for Video Editors", "Browse hundreds of free audio and video clips. Download instantly. No sign-up required.", "Explore Assets", stats labels "assets" / "categories" / "No sign-up".
- **Single CTA** "Explore Assets" → `/explore` (Next `<Link>`). No "Semua kategori", no `#assets` CTA.
- **Icons:** lucide-react only (`ChevronDown` new here; `ChevronRight` may become unused — remove from import if so).
- **Repo hygiene:** stage ONLY files listed per task. Master has ~60 dirty files from other work — ignore them. Never `git add .`. Never commit `package-lock.json` stray changes outside the `ogl` install task.
- **Next.js 16 note:** follow `node_modules/next/dist/docs/`.

---

## File Structure

```
package.json                                       # MODIFY — add ogl dependency (npm install ogl)
src/components/ui/aurora.tsx                        # NEW — vendor Aurora (reactbits) adapted to TSX + reduced-motion fallback
src/components/ui/aurora.css                         # NEW — aurora-container + fallback gradient styles
src/components/layout/ScrollExpandHero.tsx          # REWRITE — 3-fase cinematic hero (welcome → B3 reveal over video BG → exit)
src/app/page.tsx                                    # MODIFY — wire new hero (featuredVideoUrl, welcome, B3), wrap marquee+grid with Aurora, delete FeaturedCard import/usage
src/components/assets/FeaturedCard.tsx              # DELETE — replaced by video BG in hero
```

---

### Task 1: Install `ogl` + vendor Aurora component

**Files:**
- Modify: `package.json` (+ `package-lock.json` via npm)
- Create: `src/components/ui/aurora.tsx`
- Create: `src/components/ui/aurora.css`

**Interfaces:**
- Consumes: `ogl` (`Renderer`, `Program`, `Mesh`, `Color`, `Triangle`), framer-motion `useReducedMotion`.
- Produces: `export function Aurora({ colorStops, amplitude, blend, speed, time }: AuroraProps)` — renders an animated WebGL canvas filling its parent; renders a static-gradient fallback div when `prefers-reduced-motion` or WebGL unsupported.

**Context:** The reactbits Aurora source (MIT) lives at `src/content/Backgrounds/Aurora/Aurora.jsx` + `Aurora.css` in `DavidHDev/react-bits`. It uses `ogl` for a full-screen shader (simplex-noise color ramp) with `colorStops`/`amplitude`/`blend` uniforms. We vendor it as TSX with a named export, default the colorStops to our warm palette, and add a `useReducedMotion` fallback (static CSS gradient using `--primary`/`--accent`) so the page never blocks on WebGL.

- [ ] **Step 1: Install ogl**

Run from `web-asset-editor/`:
```bash
npm install ogl
```
Verify `package.json` now lists `ogl` under `dependencies` and `package-lock.json` updated. Stage ONLY `package.json` and `package-lock.json` for this task's commit (these two are the install's legitimate artifacts — NOT stray).

- [ ] **Step 2: Create `aurora.css`**

Create `src/components/ui/aurora.css`:

```css
.aurora-container {
  width: 100%;
  height: 100%;
}

.aurora-fallback {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, var(--accent) 0%, transparent 50%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), color-mix(in srgb, var(--accent) 8%, transparent));
  opacity: 0.6;
}
```

- [ ] **Step 3: Create `aurora.tsx`**

Create `src/components/ui/aurora.tsx`. Adapt the reactbits `Aurora.jsx` source (JSX → TSX, named export, typed props, default warm colorStops, reduced-motion + try/catch fallback to `.aurora-fallback`):

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

import './aurora.css';

export interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  time?: number;
}

const DEFAULT_COLOR_STOPS = ['#F97316', '#eb9253', '#F97316'];

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

export function Aurora({
  colorStops = DEFAULT_COLOR_STOPS,
  amplitude = 1.8,
  blend = 0.95,
  speed = 1.0,
  time,
}: AuroraProps) {
  const reduceMotion = useReducedMotion();
  const propsRef = useRef({ colorStops, amplitude, blend, speed, time });
  propsRef.current = { colorStops, amplitude, blend, speed, time };
  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const ctn = ctnDom.current;
    if (!ctn) return;

    let renderer: InstanceType<typeof Renderer>;
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      });
    } catch {
      return; // fallback div remains
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';

    let program: Program;

    const resize = () => {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = [width, height];
      }
    };
    window.addEventListener('resize', resize);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete geometry.attributes.uv;
    }

    const colorStopsArray = colorStops.map((hex) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    let animateId = 0;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      const { time: timeProp = t * 0.01, speed: speedProp = 1.0 } = propsRef.current;
      program.uniforms.uTime.value = timeProp * speedProp * 0.1;
      program.uniforms.uAmplitude.value = propsRef.current.amplitude ?? 1.0;
      program.uniforms.uBlend.value = propsRef.current.blend ?? blend;
      const stops = propsRef.current.colorStops ?? colorStops;
      program.uniforms.uColorStops.value = stops.map((hex) => {
        const c = new Color(hex);
        return [c.r, c.g, c.b];
      });
      renderer.render({ scene: mesh });
    };
    animateId = requestAnimationFrame(update);

    resize();

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener('resize', resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, amplitude]);

  return (
    <div
      ref={ctnDom}
      className={reduceMotion ? 'aurora-fallback' : 'aurora-container'}
    />
  );
}
```

**Notes:**
- The shader strings (`VERT`/`FRAG`) are verbatim from reactbits; keep them unchanged.
- `speed`/`time` props match the original's `propsRef.current` reads; we expose them but default sensibly.
- The fallback `div` uses class `aurora-fallback` (static CSS gradient using tokens) when reduced-motion; otherwise `aurora-container` (WebGL canvas mounts into it).
- TypeScript: `ogl` ships types; if `InstanceType<typeof Renderer>` typing is awkward, annotate with the type `ogl` exports (e.g. `import type { Renderer as OglRenderer }` and use `OglRenderer`). Prefer whatever `npx tsc --noEmit` accepts cleanly.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` then `npm run lint`.
Expected: both pass. (If `ogl`'s types are incomplete and tsc errors on `Renderer`/`Program`/`Mesh` construction, cast via `as any` ONLY at the ogl import boundary — never inside component logic — and note it as a concern in the report.)

- [ ] **Step 5: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/package.json" "Web-Kumpulan-Asset-Editor/web-asset-editor/package-lock.json" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/ui/aurora.tsx" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/ui/aurora.css"
git commit -m "feat: vendor Aurora background component (ogl) with reduced-motion fallback"
```

---

## Task 2: Rewrite `ScrollExpandHero` — 3-fase cinematic

**Files:**
- Rewrite: `src/components/layout/ScrollExpandHero.tsx`

**Interfaces:**
- Consumes: `PublicStats | null` (from `@/lib/public-stats`), framer-motion `m`, `useScroll`, `useTransform`, `useReducedMotion`, lucide `ChevronDown`, Next `Link`.
- Produces: `export function ScrollExpandHero({ title, subtitle, stats, featuredVideoUrl, loading }: ScrollExpandHeroProps)` where:
  ```ts
  interface ScrollExpandHeroProps {
    title: string;
    subtitle: string;
    stats: PublicStats | null;
    featuredVideoUrl: string | null;
    loading: boolean;
  }
  ```

**Fase scroll map (over `h-[260vh]`, `useScroll` `offset: ['start start','end start']`):**
- Welcome: `0 → 0.25` — opacity 1→0, y 0→-30.
- Video BG: `0.2 → 0.5` — opacity 0→1.
- Scrim: present from 0.25, fades with video.
- B3 reveal: `0.35 → 0.7` — opacity 0→1, y 20→0.
- Stats count-up: trigger at B3 visible (~0.5).
- Exit: `0.75 → 1.0` — B3 opacity 1→0, y 0→-60 (bottom-to-top soft).

- [ ] **Step 1: Rewrite the component**

Replace `src/components/layout/ScrollExpandHero.tsx`:

```tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { m, useScroll, useTransform, useReducedMotion, useMotionValue, animate } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { PublicStats } from '@/lib/public-stats';

interface ScrollExpandHeroProps {
  title: string;
  subtitle: string;
  stats: PublicStats | null;
  featuredVideoUrl: string | null;
  loading: boolean;
}

export function ScrollExpandHero({ title, subtitle, stats, featuredVideoUrl, loading }: ScrollExpandHeroProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Fase 1 — welcome
  const welcomeOpacity = useTransform(scrollYProgress, [0, 0.2, 0.25], [1, 1, 0]);
  const welcomeY = useTransform(scrollYProgress, [0, 0.25], [0, -30]);

  // Fase 2 — video BG + B3 reveal
  const videoOpacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);
  const scrimOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0.35, 0.55, 0.75], [0, 1, 1]);
  const contentY = useTransform(scrollYProgress, [0.35, 0.55], [20, 0]);

  // Fase 3 — exit (bottom-to-top soft)
  const exitOpacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);
  const exitY = useTransform(scrollYProgress, [0.75, 1], [0, -60]);

  const heroOpacity = useTransform([contentOpacity, exitOpacity], (vals) => Math.min(vals[0], vals[1]));
  const heroY = useTransform([contentY, exitY], (vals) => vals[0] + vals[1]);

  // Count-up stats (gate reduced-motion)
  const total = useMotionValue(0);
  const cats = useMotionValue(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [displayCats, setDisplayCats] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayTotal(stats?.totalAssets ?? 0);
      setDisplayCats(stats?.totalCategories ?? 0);
      return;
    }
    const controlsT = animate(total, stats?.totalAssets ?? 0, {
      duration: 1.2,
      onUpdate: (v) => setDisplayTotal(Math.round(v)),
    });
    const controlsC = animate(cats, stats?.totalCategories ?? 0, {
      duration: 1.2,
      onUpdate: (v) => setDisplayCats(Math.round(v)),
    });
    return () => {
      controlsT.stop();
      controlsC.stop();
    };
  }, [stats, reduceMotion, total, cats]);

  return (
    <div ref={containerRef} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Fase 2: featured video BG */}
        {!loading && featuredVideoUrl ? (
          <m.video
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: videoOpacity }}
            src={featuredVideoUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <m.div
            className="absolute inset-0"
            style={{
              opacity: videoOpacity,
              background:
                'radial-gradient(circle at 25% 30%, #f9731620 0%, transparent 55%), radial-gradient(circle at 75% 70%, #f9731618 0%, transparent 55%), linear-gradient(135deg, #f9731600, #eb925308)',
            }}
          />
        )}

        {/* Scrim (Fase 2) */}
        <m.div
          className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/80"
          style={{ opacity: scrimOpacity }}
        />

        {/* Fase 1: welcome */}
        <m.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4"
          style={{ opacity: welcomeOpacity, y: welcomeY }}
        >
          <h1 className="font-display text-7xl md:text-8xl font-bold text-foreground text-center">
            Welcome to StackCrate
          </h1>
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-sm font-body">Scroll to explore</span>
            <m.div
              animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
              transition={reduceMotion ? undefined : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-6 h-6 text-primary" />
            </m.div>
          </div>
        </m.div>

        {/* Fase 2: B3 center-stack */}
        <m.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4 max-w-3xl mx-auto text-center"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground leading-tight">
            {title}
          </h1>
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl">
            {subtitle}
          </p>

          {stats && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="font-display text-2xl text-foreground">{displayTotal}</span>
              <span>assets</span>
              <span className="w-px h-4 bg-border" aria-hidden />
              <span className="font-display text-2xl text-foreground">{displayCats}</span>
              <span>categories</span>
              <span className="w-px h-4 bg-border" aria-hidden />
              <span>No sign-up</span>
            </div>
          )}

          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:brightness-110 transition"
          >
            Explore Assets
          </Link>
        </m.div>
      </div>
    </div>
  );
}
```

**Notes:**
- `useTransform([a, b], fn)` — framer supports array-input transforms to combine multiple motion values; verify the `vals` typing (number[]) compiles. If tsc complains, use two separate `useTransform` + a `useMotionTemplate`/`useTransform` chain instead, and note it in the report.
- `m.video` — framer-motion supports `m.video` (motion proxy over any element). If tsc rejects `m.video`, wrap in a plain `<video>` with a wrapping `<m.div style={{opacity}}>` controlling opacity, and note it.
- `animate` from framer-motion drives the count-up; `useMotionValue` + `onUpdate` → `setState`. Reduced-motion skips the animation (instant display).
- Welcome uses class `text-7xl md:text-8xl`; B3 title uses `text-5xl md:text-6xl` — different scales on purpose (welcome is a moment, B3 is the headline).
- The fallback gradient div (when `featuredVideoUrl` null/loading) uses rgba hex with alpha (`#f9731620`) inline — this is the ONE place a hex appears; it's a transparent gradient overlay mirroring `--primary`, acceptable for the dynamic-opacity background. If you prefer tokens, swap to `bg-primary/10`/`bg-accent/10` layered divs and note the substitution.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` then `npm run lint`.
Expected: both pass. Fix the `useTransform` array form / `m.video` typing per the notes if tsc complains; report what you changed.

- [ ] **Step 3: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/layout/ScrollExpandHero.tsx"
git commit -m "feat: 3-fase cinematic hero (welcome → B3 over video → soft exit)"
```

---

## Task 3: Wire `page.tsx` (new hero + Aurora sections) + delete FeaturedCard

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/assets/FeaturedCard.tsx`

**Interfaces:**
- Consumes: new `ScrollExpandHero` props (`featuredVideoUrl`, `loading`, `stats`), `Aurora` from `@/components/ui/aurora`, existing `useFeatured` ({ asset, isLoading, hasError, retry }).
- Produces: landing `/` renders the new hero + wraps marquee and `#assets` sections with Aurora BG.

- [ ] **Step 1: Update imports in `page.tsx`**

- Remove `import { FeaturedCard } from '@/components/assets/FeaturedCard';`.
- Add `import { Aurora } from '@/components/ui/aurora';`.
- The `ScrollExpandHero` import stays (dynamic import unchanged).
- If `ChevronRight` from lucide is no longer used after removing the View All link (the View All `<Link href={viewAllHref}>` with `ChevronRight` is in the grid heading row — **keep the View All link and ChevronRight**; we only removed "Semua kategori"/`#assets` CTAs in the HERO, not the grid's View All). Do not remove `ChevronRight`.

- [ ] **Step 2: Pass new props to hero**

Replace the current `<ScrollExpandHero title=... subtitle=... stats={statsFailed ? null : stats} heroNode={<FeaturedCard ... />} />` with:

```tsx
<ScrollExpandHero
  title="Free Assets for Video Editors"
  subtitle="Browse hundreds of free audio and video clips. Download instantly. No sign-up required."
  stats={statsFailed ? null : stats}
  featuredVideoUrl={featured?.preview_url ?? null}
  loading={featuredLoading}
/>
```

(Where `featured`, `featuredLoading` come from the existing `useFeatured()` destructure: `const { asset: featured, isLoading: featuredLoading, hasError: featuredError, retry: featuredRetry } = useFeatured();`. `featuredError`/`featuredRetry` may become unused in `page.tsx` after this change — if eslint flags them, remove them from the destructure and note it. Keep them only if still used.)

- [ ] **Step 3: Wrap marquee + grid sections with Aurora**

Wrap the marquee `<div className="border-y border-border/50">...<ScrollVelocityText .../></div>` and the `<section id="assets" ...>...</section>` each in a relative container with an absolute Aurora BG behind (`-z-10`, opacity), so the animated orange-gold shows behind section content but content stays readable. Pattern:

```tsx
<div className="relative">
  <div className="absolute inset-0 -z-10 opacity-60 overflow-hidden" aria-hidden>
    <Aurora />
  </div>
  {/* existing section content */}
</div>
```

Apply to BOTH the marquee wrapper and the `#assets` section. Keep the existing content, classes, and structure of both sections intact — only add the Aurora wrapper around each. Do NOT put Aurora inside the hero (`ScrollExpandHero` already has its own BG logic).

Place `<Aurora />` only in these two non-hero sections. Do not add Aurora to any other page or component.

- [ ] **Step 4: Delete FeaturedCard**

```bash
rm "src/components/assets/FeaturedCard.tsx"
```
Verify no remaining import of `FeaturedCard` anywhere: `grep -r "FeaturedCard" src/` should return nothing. (Confirmed earlier: only `page.tsx` + a comment in `ScrollExpandHero` — the hero is rewritten in Task 2 so its comment is gone.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` then `npm run lint` then `npm run test`.
Expected: all pass. `npm run test` is the existing 23-test suite — must remain green (no test file references FeaturedCard).

- [ ] **Step 6: Commit**

```bash
git add "Web-Kumpulan-Asset-Editor/web-asset-editor/src/app/page.tsx" "Web-Kumpulan-Asset-Editor/web-asset-editor/src/components/assets/FeaturedCard.tsx"
git commit -m "feat: wire cinematic hero + Aurora section backgrounds; delete FeaturedCard"
```

(Note: `git add` on a deleted file records the deletion — that's what we want. Stage exactly these two paths.)

---

## Task 4: Final verification + manual steps

**Files:** none new.

- [ ] **Step 1: Full verification run**

From `web-asset-editor/`:
1. `npm run test` — expect 23/23 pass.
2. `npx tsc --noEmit` — clean.
3. `npm run lint` — 0 errors (5 pre-existing `<img>` warnings unchanged).
4. `npm run build` — exit 0; `/` static, `/api/stats` route present.

- [ ] **Step 2: Manual checklist for user**

Tell the user:
1. (If not already done) Apply `supabase/migrations/002_assets_is_featured.sql` in Supabase SQL Editor and toggle a featured asset in `/admin`.
2. `npm run dev` → `/`:
   - Fase 1 welcome ("Welcome to StackCrate" + bouncing chevron) shows first.
   - Scroll → welcome fades, featured video fades in full-bleed behind B3, B3 center-stack reveals (h1, subtitle, stats counting up, "Explore Assets" → `/explore`).
   - Scroll further → B3 fades bottom-to-top, marquee section appears.
   - Aurora animated orange-gold visible behind marquee + grid.
3. Toggle `prefers-reduced-motion` (DevTools > Rendering) → welcome static, video poster, no count-up, Aurora static gradient.
4. With no featured asset / `002` not applied → hero fase-2 shows gradient fallback (no crash).

- [ ] **Step 4: Final commit (only if anything changed)**

If verification surfaced nothing new to commit, skip. Otherwise stage only this task's files.

---

## Self-Review Notes

- Spec coverage: 3-fase hero (welcome/B3/exit), video BG featured, single CTA `/explore`, count-up, reduced-motion, Aurora vendor + sections, FeaturedCard delete — mapped to tasks 1-4. ✅
- Type consistency: `ScrollExpandHeroProps` (Task 2) matches `page.tsx` wiring (Task 3 — `featuredVideoUrl`/`loading`/`stats`); `AuroraProps` (Task 1) defaults match `page.tsx` usage (no explicit props passed, uses defaults). ✅
- Edge cases: WebGL unsupported / `prefers-reduced-motion` / featured empty / migration not applied — all gated to static fallbacks. ✅
- No new unit tests (visual logic); tooling (tsc/lint/test/build) is the verification. ✅