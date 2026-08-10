# Design Spec — Landing Page Redesign (StackCrate)

> Spec untuk re-design visual halaman publik `/` (landing) pada project StackCrate
> (Next.js 16 + Tailwind v4 + shadcn/ui + framer-motion, tema warm-playful).

**Tanggal:** 2026-08-09

**Lingkup:** Halaman `/` (`src/app/page.tsx`) saja. `/explore`, detail asset, login,
admin, dan halaman lain **tidak disentuh**. Semua fitur existing landing
(hero scroll-expand, marquee, category nav, grid) dipertahankan namun di-polish ulang.

---

## 1. Tujuan

1. Landing yang tadinya terlihat generik menjadi landing yang terlihat seperti **produk jadi**:
   hangat, playful, dan langsung mengutarakan value prop — katalog asset gratis untuk video editors.
2. Hero di-rebuild total (editorial split) agar tidak template, tetapi tetap mempertahankan
   animasi scroll-expand (300vh sticky) yang sudah ada.
3. Social proof memakai **angka real dari DB** (bukan hardcoded) via endpoint publik baru `/api/stats`.
4. Grid asset memiliki **tab sortir** (Terbaru / Terpopuler / A-Z) selain filter kategori.
5. Marquee teks menjadi **auto-loop kontinu** (saat ini diam dan hanya ikut kecepatan scroll).
6. Admin dapat **menandai asset "featured"** yang tampil sebagai kartu besar di hero landing.

## 2. Keputusan Desain Terkunci

- Tone visual tetap warm-playful: font display/body, orange `#f97316`, gold `#fbbf24`, cream.
- Hero tetap **scroll-expand** (sticky 300vh) — animasi per-scroll dipertahankan.
- Layout hero = **editorial split (varian B3)**: narasi di kiri, kartu **featured besar** di kanan.
- Kartu featured menampilkan **video** (autoplay muted loop) untuk video, atau **thumbnail + tombol play** untuk audio.
- Social-proof hero = angka real (total asset + total kategori) + "No sign-up".
- Grid `#assets`: tab sortir **Terbaru / Terpopuler / A–Z** (bisa dikombinasikan dengan filter kategori).
- Marquee: `PREMIUM QUALITY ● 100% FREE ● READY TO USE ● CREATE NOW ● AUDIO & VIDEO ● DOWNLOAD INSTANT ●` — auto-loop kontinu.

## 3. Layout Halaman

Urutan baru di `/` (perluasan struktur existing):

1. **ScrollExpandHero (B3)** — kontainer 300vh sticky; isi: grid 2 kolom.
   - **Kiri (narasi):**
     - Kicker small-caps: `★ 100% GRATIS. SELAMANYA.` (warna primary).
     - Headline `font-display` besar (5xl–9xl): "Free audio & video, forever." dengan kata aksen (highlight). (Copy final di-final-kan saat implementasi — kopi yang sudah ada di UI menggunakan bahasa Inggris, konsisten dengan marquee/existing UI.)
     - Paragraf deskripsi (font-body, muted), contoh: "Browse ratusan clip audio dan video siap pakai. Download instantly. No sign-up required."
     - Baris social proof: angka real dari `/api/stats` — `{totalAssets} asset` · `{totalCategories} kategori` · "Tanpa sign-up" (count-up animation).
     - CTA utama `Jelajahi Katalog` (scroll ke `#assets`) + secondary link "Semua kategori".
   - **Kanan: FeaturedCard** (detail di 4.5) — kartu besar preview asset.
   - Animasi scroll existing tetap: judul fade/y, subtitle loop — disesuaikan dengan layout baru (narasi di kiri tetap fade; kartu kanan ikut scroll-out halus).
2. **Marquee** — `ScrollVelocityText` dimodifikasi menjadi **auto-loop** (lihat 4.6).
3. **Grid #assets** — section existing:
   - `CategoryNav` (existing) di atas.
   - Baris judul + **tab sortir** (Terbaru / Terpopuler / A–Z) + link "View All".
   - Grid skeleton / empty state / `AssetGrid`.

## 4. Komponen & Data

### 4.1 Endpoint baru: `GET /api/stats` (publik)

- Auth: **publik**, tanpa login.
- Implementasi: `src/app/api/stats/route.ts`.
- Query Supabase service-role:
  - `assets`: count dengan filter `status='published'` → `totalAssets`.
  - `categories`: count (semua) → `totalCategories`.
- Response mengikuti envelope `success(...)` / `err(...)` di `lib/api-response`.
- Response shape:
  ```json
  { "data": { "totalAssets": 1200, "totalCategories": 8 }, "error": null }
  ```
- Dipakai oleh baris social-proof hero (kiri) dengan count-up animation.

### 4.2 Kolom `is_featured` + migration `002_assets_is_featured.sql`

- `ALTER TABLE assets ADD COLUMN is_featured boolean NOT NULL DEFAULT false;`
- File: `supabase/migrations/002_assets_is_featured.sql`.
- **Catatan [MANUAL]:** seperti `001_increment_download_count.sql`, file hanya dibuat di repo — user apply manual di Supabase SQL Editor.
- `GET /api/assets` dukung filter baru `featured=true` → `.eq('is_featured', true)` (tetap harus `status='published'`).
- `assetUpdateSchema` (zod) tambah `is_featured: z.boolean().optional()` supaya admin bisa toggle lewat `PATCH /api/assets/[id]`.

### 4.3 `GET /api/assets` tambahan: `sort=title`

- Sort baru: `sort=title` → `.order('title', { ascending: true })`.
- Sort existing tetap berfungsi: `newest` (default), `oldest`, `downloads`, `views`.
- Filter kategori (`category=slug|uuid`) dan `limit`/`page` tidak berubah.

### 4.4 Tipe & komponen yang diubah

| File | Perubahan |
|------|-----------|
| `src/lib/types/asset.ts` | Tambah `is_featured: boolean` ke interface `Asset`. |
| `src/lib/types/schemas.ts` | Tambah `is_featured` ke `assetUpdateSchema`. |
| `src/app/api/assets/route.ts` | Tambah `sort=title` dan filter `featured`. |
| `src/app/api/assets/[id]/route.ts` | Tidak perlu diubah (PATCH sudah generic melalui schema). |
| `src/components/layout/ScrollExpandHero.tsx` | Rebuild ke B3: ambil props `featuredAsset`, `stats`, CTA scroll; narasi kiri + FeaturedCard kanan; pertahankan animasi scroll. |
| `src/app/page.tsx` | Fetch `/api/stats` + featured asset; state `sort` (`newest`/`downloads`/`title`); skeleton untuk kartu featured & grid; state error + retry. |
| `src/components/assets/FeaturedCard.tsx` | **Baru** — kartu featured hero (video autoplay / audio play). |
| `src/components/assets/SortTabs.tsx` | **Baru** — tab sortir Terbaru/Terpopuler/A-Z (modular, reusable). |
| `src/components/admin/AdminAssetTable.tsx` | Tambah toggle **Featured** (ikon `Star`) per baris → `PATCH /api/assets/[id] {is_featured}`; highlight saat aktif. |

### 4.5 FeaturedCard (kartu hero kanan)

- Data: fetch `featured=true&limit=1` (atau fallback `sort=newest&limit=1`); pilih pertama.
- Sumber video/audio playable: list endpoint (`GET /api/assets`) **tidak** menyertakan `preview_url` presigned. Untuk kartu featured, setelah memilih asset dari list, client fetch `GET /api/assets/[id]` untuk mendapatkan `preview_url` (presigned, expire 1 jam) dan `thumbnail_url` final.
- Video: `<video autoPlay muted loop playsInline>` memakai `preview_url`; fallback ke `thumbnail_url` statis jika `preview_url` gagal di-generate.
- Audio: thumbnail besar (`thumbnail_url`, fallback `logo-audio.png`) + tombol play besar → arahkan ke `/assets/[id]`.
- Kartu: `rounded-2xl border overflow-hidden`, gradient overlay, badge card (`Featured` / `Populer`), judul + kategori.
- Klik kartu → `/assets/[id]`.
- Loading: skeleton `shimmer-warm`. Error: fallback card statis (CTA).

### 4.6 ScrollVelocityText → auto-loop

- Ganti `useTransform(scrollYProgress)` (horizontal berdasar scroll akademik) dengan **auto-loop marquee**:
  - Duplikasi konten (2–3 salinan) agar loop seamless.
  - Animate dengan framer-motion `animate={{ x: [-translateX, 0] }}` loop infinite, durasi proporsional panjang teks.
  - Gunakan `m` dari framer-motion (konvensi LazyMotion strict di project ini).
- Props `texts` + `separator` tetap; tambah prop opsional `duration`/`speed`.
- Gate `prefers-reduced-motion`: marquee berhenti (statis) bila user request reduce-motion.

## 5. Alur Data & State

- `page.tsx` (client) memegang state:
  - `categories` → dari `/api/categories`.
  - `assets` + `sort` + `activeCategory` + `loading` → dari `/api/assets` (param sort+category+limit=10).
  - `featured` → dari `/api/assets?featured=true&limit=1`, fallback newest.
  - `stats` → dari `/api/stats`; `statsError` untuk state error.
- Semua fetch memakai pattern existing `queueMicrotask` + `ignore` (anti-race).
- Stats & featured di-fetch sekali saat mount; grid refetch saat kombinasikan sortir/kategori berubah.
- Marquee murni render statis di server / auto-animasi klien; tidak butuh fetch.

## 6. Error & Edge Cases

- `/api/stats` gagal → hero tetap tampil; baris social-proof disembunyikan (fallback: teks ringkas tanpa angka).
- `featured=true` kosong (belum ada yang di-feature) → gunakan asset terbaru (`sort=newest&limit=1`).
- Featured card gagal fetch → fallback kartu statis (header + CTA `Jelajahi Katalog`).
- Grid gagal fetch → set state error → tampil pesan + tombol **Coba lagi** (retry); empty state existing (`No assets found`) tetap.
- Migration `002` belum dijalankan → query `is_featured` akan error (500): FE menanganinya graceful (featured = fallback, tanpa crash).

## 7. Testing

- **Unit tests (Vitest)** — tambah/ubah mengikuti pola `tests/unit/*.test.ts`:
  - `assetUpdateSchema` menerima `is_featured` (zod parse success).
  - Helper pagination/sort-builder untuk `/api/assets` jika diekstrak sebagai util murni.
  - `sort=title` dipetakan ke klausa order yang benar (jika logic diekstrak).
- UI tidak di-auto-test; diverifikasi manual + tooling:
  - `npm run lint` dan `npx tsc --noEmit` wajib lulus.
  - `npm run build` lulus setelah perubahan route/utils.
- **Verifikasi manual (user):** setelah migration `002` dijalankan — landing menampilkan kartu featured, tab sortir bekerja, marquee auto-loop, social-proof angka benar.

## 8. Non-Goals

- Tidak mengubah `/explore`, detail asset, favorit, auth, admin page lain.
- Tidak menambah auth baru, upload, atau manajemen asset baru.
- Tidak mengubah schema kategori/data lain.
- Tidak menambah efek runtime berat: semua animasi di-gate `prefers-reduced-motion`.