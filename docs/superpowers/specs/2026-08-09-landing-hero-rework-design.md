# Design Spec — Landing Hero Rework + Aurora Backgrounds (StackCrate)

> Spec untuk rework hero halaman publik `/` (HS1) dari layout B3 editorial-split menjadi
> **3-fase scroll cinematic** (welcome → B3 center-stack reveal over video BG → soft exit),
> plus penambahan efek **Aurora** (reactbits, WebGL via `ogl`) sebagai background animasi
> oranye-gold pada semua section non-hero (`/`).

**Tanggal:** 2026-08-09 (rework, di atas landing redesign sebelumnya)

**Lingkup:**
- HS1 hero (`src/components/layout/ScrollExpandHero.tsx`) — rewrite total.
- `src/app/page.tsx` — wiring hero baru (featured video BG, welcome, B3 center-stack), fallback Aurora gradient.
- Komponen Aurora baru (vendor dari reactbits) + `npm i ogl`.
- Section non-hero (`marquee` + grid `#assets`) di `page.tsx` — tambah Aurora BG wrapper.
- FeaturedCard (lama) **dihapus** (video BG langsung di hero, bukan kartu).
- Tidak menyentuh: `/explore`, detail asset, admin (kecuali star toggle sudah ada), `/api/stats`, `useFeatured` (hook tetap, dipakai untuk video BG source).

---

## 1. Tujuan

1. Hero saat ini (B3 editorial-split) terasa "aneh": scroll `h-[300vh]` panjang tapi efek
   scroll cuma di 30% awal, sisanya zona mati. Ganti ke **3-fase scroll cinematic** yang
   memakai seluruh zona sticky.
2. Tambah nuansa "produk jadi" epik: fase welcome → reveal konten di atas video BG → soft exit.
3. Tambah **Aurora** (WebGL gradient bergerak oranye-gold) sebagai BG animasi di semua section
   non-hero, untuk konsistensi tema warm-playful.

## 2. Keputusan Desain Terkunci

- **Hero 3 fase, center-stack** (bukan 2-kolom lagi):
  1. **Welcome** — teks "Welcome to StackCrate" `font-display` besar + `ChevronDown` bounce. BG: gradient tipis (video belum muncul).
  2. **B3 reveal** — welcome fade-out, video BG fade-in full-bleed (featured asset, autoplay muted loop dari `preview_url` presigned R2) + scrim, lalu B3 center-stack fade-in: `h1`, `subtitle`, stats row (count-up dari 0), `1 CTA "Explore Assets"` → `/explore`.
  3. **Exit** — B3 fade-out **dari bawah ke atas** (soft) → marquee section muncul.
- **CTA tunggal** "Explore Assets" → `/explore`. Tidak ada "Semua kategori". Tidak ada CTA ke `#assets`.
- **Video BG source** = featured asset (`useFeatured` hook existing): fetch `/api/assets?featured=true&limit=1` → fallback newest → fetch `/api/assets/[id]` untuk `preview_url` (presigned, expire 1 jam). Video `<video autoPlay muted loop playsInline>` full-bleed.
- **Fallback** (featured kosong / migration `002` belum di-apply / video gagal) → **Aurora gradient oranye-gold animasi** (bukan error card).
- **Semua teks full English**: "Welcome to StackCrate", "Free Assets for Video Editors", "Browse hundreds of free audio and video clips. Download instantly. No sign-up required.", "Explore Assets", stats labels ("assets", "categories", "No sign-up").
- **Stats row** count-up dari 0 (framer-motion `animate` interpolate), gate `prefers-reduced-motion` → tampil langsung.
- **Aurora** vendor dari reactbits (`src/content/Backgrounds/Aurora/Aurora.jsx` + `.css`), adaptasi ke TSX + named export, props `{ colorStops: string[]; amplitude?: number; blend?: number; speed?: number; time?: number }`. colorStops `["#F97316","#eb9253","#F97316"]`, amplitude 1.8, blend 0.95. Dependency baru: `ogl`.
- **Aurora placement**: section **marquee** + section **grid `#assets`** (semua non-hero di `/`). Bukan di body global, hanya section landing.
- **Prefers-reduced-motion**: Aurora → fallback gradient statis (tidak render canvas); hero video → poster statis; count-up → langsung; marquee (sudah ada) tetap.
- **FeaturedCard.tsx (lama) dihapus** — video BG langsung di hero, bukan kartu.
- Hero height ~`h-[240vh]`–`h-[280vh]` (disesuaikan, hilangkan zona mati).

## 3. Layout & Fase Hero

Kontainer sticky `h-[260vh]` (tentative, tuning saat impl). `useScroll` `offset: ['start start', 'end start']` over container.

### Fase 1 — Welcome (scrollYProgress 0 → 0.25)
- Teks "Welcome to StackCrate" `font-display text-7xl/8xl` center, opacity 1.
- Subteks kecil "Scroll to explore" + `ChevronDown` bounce (framer-motion `animate={{ y: [0,8,0] }}` loop).
- BG: gradient tipis oranye-gold (CSS, belum video).
- Video BG: opacity 0 (belum muncul).

### Fase 2 — B3 reveal (scrollYProgress 0.25 → 0.75)
- Welcome: opacity 1→0 (fade-out), y naik sedikit.
- Video BG: opacity 0→1 (fade-in full-bleed), `object-cover`.
- Scrim: overlay gradient `from-background/80 via-background/40 to-background/80` (supaya teks kontras di atas video).
- B3 center-stack: opacity 0→1 (fade-in), y dari +20→0. Berisi:
  - `h1` "Free Assets for Video Editors" `font-display`.
  - `p` subtitle (muted).
  - Stats row (count-up): `{totalAssets} assets` · `{totalCategories} categories` · `No sign-up` — center, divider `w-px h-4 bg-border`.
  - CTA "Explore Assets" → `<Link href="/explore">` pill `bg-primary text-primary-foreground`.

### Fase 3 — Exit (scrollYProgress 0.75 → 1)
- B3: opacity 1→0 **dari bawah ke atas** (y: 0 → -60, clip-reveal effect via `clip-path` atau opacity+y). Soft.
- Video BG: opacity 1→0.5 (atau hold).
- Transisi ke marquee section (section di bawah sticky) — natural scroll-up.

## 4. Komponen & Data

### 4.1 `ScrollExpandHero.tsx` — rewrite total

Props:
```ts
interface ScrollExpandHeroProps {
  title: string;
  subtitle: string;
  stats: PublicStats | null;      // real DB numbers dari /api/stats
  featuredVideoUrl: string | null; // preview_url presigned dari useFeatured
  loading: boolean;                // featured/video loading
}
```

- Bagian internal: gradient tipis default (fase 1), `<video>` opacity-gated (fase 2), scrim, B3 center-stack (fase 2), welcome (fase 1).
- `useScroll` + `useTransform` per fase.
- `prefers-reduced-motion` via `useReducedMotion`: welcome static, video poster (jika ada), B3 langsung tampil (no fade), count-up skip.

### 4.2 `Aurora.tsx` (baru, vendor)

- Adaptasi `src/content/Backgrounds/Aurora/Aurora.jsx` reactbits → TSX.
- Named export: `export function Aurora({ colorStops, amplitude, blend, speed, time }: AuroraProps)`.
- Path: `src/components/ui/aurora.tsx` (+ import `.css` atau inline styles).
- Gate `useReducedMotion`: jika reduce → render `<div className="aurora-fallback" />` (gradient statis oranye-gold via CSS), tidak mount canvas/ogl.
- Props type:
  ```ts
  interface AuroraProps {
    colorStops?: string[];          // default ["#F97316","#eb9253","#F97316"]
    amplitude?: number;             // default 1.8
    blend?: number;                 // default 0.95
    speed?: number;                 // default 1.0
    time?: number;                  // default 0 (override)
  }
  ```

### 4.3 `page.tsx` — wiring

- `useFeatured` tetap (hook existing). Ambil `asset.preview_url` sebagai `featuredVideoUrl`.
- `useFeatured` return `{ asset: featured, isLoading, hasError, retry }` → pass `featuredVideoUrl={featured?.preview_url ?? null}` ke hero.
- Hapus import + pemakaian `FeaturedCard`.
- Hero: `<ScrollExpandHero title="Free Assets for Video Editors" subtitle="..." stats={statsFailed ? null : stats} featuredVideoUrl={...} loading={featuredLoading} />`.
- Section marquee + grid: bungkus dengan `<Aurora />` BG (absolute, `-z-10`, opacity rampa), content di atas.
- Stats state tetap (fetch `/api/stats`).

### 4.4 Hapus `FeaturedCard.tsx`

- `src/components/assets/FeaturedCard.tsx` dihapus (task hero rewrite).
- Konfirmasi: hanya dipakai di `page.tsx` (import + heroNode) + komentar di hero. Aman.

## 5. Data Flow & State

- `page.tsx` (client):
  - `categories` (existing), `assets`+`sort`+`activeCategory`+`loading`+`gridError`+`reloadKey` (existing Task 8).
  - `featured` dari `useFeatured` (existing) — dipakai untuk `featuredVideoUrl`.
  - `stats` + `statsFailed` dari `/api/stats` (existing).
- Hero menerima props; tidak fetch sendiri.
- Aurora stateless (canvas internal, useEffect cleanup).
- Fallback: `featuredVideoUrl === null` (loading/kosong/error) → hero tampilkan gradient tipis saja di fase 2 (tidak crash).

## 6. Error & Edge Cases

- `featuredVideoUrl` null (featured kosong / migration belum / video gagal fetch detail) → fase 2 BG = gradient tipis oranye-gold (Aurora static atau CSS gradient), B3 tetap tampil.
- `/api/stats` gagal → `stats=null` → stats row disembunyikan.
- `prefers-reduced-motion` → semua animasi static (video poster, count-up skip, Aurora fallback gradient).
- WebGL tidak support (device lama) → try/catch `new Renderer()` → fallback gradient statis (sama kayak reduced-motion).
- `ogl` import gagal / bundle error → fallback gradient (graceful, tidak crash page).

## 7. Testing

- **Unit (Vitest):** tidak ada logic pure baru yang testable (hero & Aurora visual). Skip unit test baru.
- **Verifikasi tooling:** `npx tsc --noEmit`, `npm run lint`, `npm run build` lulus.
- **Verifikasi manual (user):** `npm run dev` → landing 3 fase bekerja, video BG muncul (setelah migration + admin toggle), Aurora BG di section non-hero, reduced-motion fallback, fallback gradient saat featured kosong.

## 8. Non-Goals

- Tidak mengubah marquee content (teks), grid tabs/sort, admin, `/api/stats`, `useFeatured` logic.
- Tidak menambah Aurora ke halaman lain ( `/explore`, detail, dll) — hanya `/`.
- Tidak menambah efek 3D / R3F.
- Tidak mengubah design tokens (`globals.css`).