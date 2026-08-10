# Design Spec — Admin Dashboard UI/UX Redesign (StackCrate)

> Spec untuk perbaikan UI/UX halaman Admin Dashboard (`/admin`) pada project StackCrate
> (Next.js 16 + Tailwind v4 + shadcn/ui + framer-motion, tema warm-playful).

**Tanggal:** 2026-08-09

**Lingkup:** Halaman `/admin` saja. Semua fitur existing (upload, kategori, manajemen asset)
dipertahankan dan tidak dipindah ke halaman baru. Tambahan: endpoint agregasi
`GET /api/admin/stats` + perbaikan bug hitungan `download_count`.

---

## 1. Tujuan

1. Dashboard admin yang tadinya halaman datar (judul + card bertumpuk) menjadi halaman
   yang informatif dengan **baris KPI (statistik) di atas** tanpa menghapus fungsionalitas
   yang sudah benar.
2. Menjaga identitas visual warm-playful StackCrate: Knewave (display), Mystery Quest
   (section heading), Kranky (body), palette warm dark/cream, accent oranye `#f97316`,
   gold `#fbbf24`.
3. Memperbaiki bug: `download_count` tidak pernah bertambah karena RPC
   `increment_download_count` tidak ada di database.
4. Menyediakan sumber data server-side yang akurat agar statistik KPI tidak salah
   (GET /api/assets dibatasi limit 100 -> tidak bisa diandalkan untuk agregasi).

## 2. Layout Halaman

Struktur tetap satu halaman bertumpuk (`max-w-7xl mx-auto px-4 py-8 space-y-8`),
dengan urutan baru:

1. **Header halaman** — judul Knewave `text-3xl` ("Admin Dashboard") + subtitle
   penjelas (Kranky, muted) di bawahnya.
2. **Row KPI cards** — grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
3. **Upload form card** — dipertahankan (fungsi & state tidak berubah).
4. **Kelola Kategori card** — dipertahankan (CategoryManager tidak berubah).
5. **Kelola Asset** — list + filter dipertahankan (AdminAssetTable tidak berubah,
   hanya styling status chip yang dirapikan).

### KPI Cards (4 kartu)

| Card | Metrik | Sumber data | Icon (lucide-react) |
|------|--------|-------------|----------------------|
| Total Asset | `totalAssets` + breakdown published/draft di sublabel | `/api/admin/stats` | `Package` / `Boxes` |
| Total Views | `totalViews` (sum `view_count`) | `/api/admin/stats` | `Eye` |
| Total Downloads | `totalDownloads` (sum `download_count`) | `/api/admin/stats` | `Download` |
| Total Favorit | `totalFavorites` (count table `favorites`) + `totalCategories` di sublabel | `/api/admin/stats` | `Heart` |

Detail visual:
- Card besar `rounded-xl border border-border bg-card` + shadow warm (tinted, bukan pure black).
- Nilai pakai fon Knewave `text-3xl`/`text-4xl`.
- Icon dalam lingkaran kecil berlatar warna aksen per-fungsi (oranye `--primary`, gold `--ring`/secondary, dst) — satu keluarga aksen, konsisten.
- Hover: `scale-[1.02]` + shadow grow + `transition` (konsisten dengan katalog asset).
- Angka KPI: **count-up animation** ringan via framer-motion (durasi ~600ms, sekali jalan, hanya saat elemen masuk viewport) — di-gate `prefers-reduced-motion`.
- Loading: skeleton `shimmer-warm` (utilitas sudah ada) dengan bentuk yang menyerupai kartu final.

**Catatan:** `download_count` baru akurat setelah bug diperbaiki. Jika bug belum fixed, dashboard menampilkan `0` sampai data riil terakumulasi — angka tidak di-fake.

## 3. Visual Language

- Pertahankan semua design token yang sudah ada di `globals.css` (`--background`, `--card`, `--border`, `--primary`, `--muted-foreground`, dll). **TIDAK ada warna hardcode baru** di JSX (ganti warna hardcode ke token semantic).
- Tipografi: judul halaman `font-display`/Knewave; angka KPI `font-heading`; subtitle/label `text-sm text-muted-foreground`
- Card radius: `rounded-xl` (tetap konsisten).
- Status chip published/draft: replace `bg-green-100 text-green-700 border-green-300` dan `bg-amber-100 text-amber-700 border-amber-300` (yang tidak terlihat baik di dark mode) dengan token/utility semantic yang readable di dark & light. Karena tema utama dark warm, pilih warna status yang kontras pada dark (`--primary` untuk published, gold untuk draft) — atau utility baru `status-published`/`status-draft` yang diatur di CSS.
- Micro-interaction: hover lift KPI, count-up, skeleton shimmer. Tidak ada bounce/elastic easing default.

## 4. Data & API

### 4.1 Endpoint baru: `GET /api/admin/stats`

- Auth: **admin-only** via `requireAdmin()` (pattern yang sama dengan route admin lain).
- Implementasi: `src/app/api/admin/stats/route.ts`.
- Query Supabase service-role client:
  - `assets`: count total + filter `status` (`published`, `draft`).
  - `assets`: sum `download_count` dan sum `view_count` (aggregate).
  - `categories`: count total.
  - `favorites`: count total.
- Response envelope mengikuti `lib/api-response` (`success({...})` / `err(...)`).
- Response shape:

```ts
interface AdminStats {
  totalAssets: number;
  publishedAssets: number;
  draftAssets: number;
  totalViews: number;
  totalDownloads: number;
  totalFavorites: number;
  totalCategories: number;
}
```

- Error apa pun -> `err(..., 500)`, console.error dengan rasa seperti route lain.

### 4.2 Fix bug `download_count`

**Root cause:** `src/lib/rate-limit.ts` — `logDownload` memanggil
`client.rpc('increment_download_count', ...)` dengan `.maybeSingle()`. Fungsi RPC
`increment_download_count` **tidak ada** di `supabase/migrations/000_initial_schema.sql`
(meta: hanya ada `handle_new_user`, `asset_search_vector`, `is_admin`, `touch_updated_at`).
Akibatnya RPC gagal diam-diam dan `download_count` tidak pernah bertambah.

**Fix:**
1. Migration baru `supabase/migrations/001_increment_download_count.sql`:

```sql
-- Bump download_count on an asset.
create or replace function public.increment_download_count(p_asset_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.assets
  set download_count = download_count + 1,
      updated_at = now()
  where id = p_asset_id;
$$;
```

   (Sesuaikan grant/permissions bila pattern RLS mengharuskan — periksa migration 000
   untuk konvensi).

2. Perbaiki `logDownload` di `src/lib/rate-limit.ts` — jangan telan error:
   - pisah log insert & bump counter;
   - untuk RPC: tanpa `.maybeSingle()`, cek `{ error }` dari hasil rpc.
   - Jika rpc error: `console.error('[rate-limit] increment_download_count failed:', error.message)` dan download tetap dilanjutkan (jangan block user download untuk counter internal), tapi error ditampilkan di konsol.
3. Sinkronisasi: cek apakah migration 000 perlu step manual untuk DB cloud (ikuti konvensi repo).

### 4.3 Tanpa ubah endpoint existing

`GET /api/assets`, `POST /api/assets`, `PATCH/DELETE`, `GET /api/categories` dsb.
TIDAK diubah. KPI diambil dari `/api/admin/stats` yang baru, bukan dari `/api/assets`.

## 5. Komponen Dashboard Baru

`admin page` dirapikan tanpa memecah logika. Pecah hanya bagian UI baru:

- `src/components/admin/StatsCards.tsx` — presentational component:
  - props: `{ stats: AdminStats | null; loading: boolean }` (atau Skeleton saat loading)
  - render 4 KPI cards + `shimmer-warm` skeleton saat `loading`.
  - count-up via framer-motion `useInView` + `animate()` — guard `prefers-reduced-motion`.
- `src/components/admin/AdminStatsGrid.tsx` (opsional, wrapper) — seperti `StatsCards`, hindari gegabah; mulai minimal (1 komponen)
- `src/app/admin/page.tsx` —
  - fetch `stats` via `useEffect` ke `/api/admin/stats`; state `stats` + `loadingStats`.
  - render `<StatsCards stats={stats} loading={loadingStats} />` di bawah header.
  - section yang ada (upload/kategori/kelola) tetap dalam susunan sama.
- `src/lib/types/` — tambah interface `AdminStats` di file type yang sesuai.

## 6. Error Handling & Empty States

- Jika `/api/admin/stats` gagal: jangan rusak halaman. Tampilkan card ternary dengan message
  singkat + tombol "Coba lagi" (refetch). Tidak menghalangi fitur di bawah.
- Skeleton kartu saat pertama load (shimmer-warm).
- Statistik nilai `0` ditampilkan apa adanya (normal saat belum ada data/migrasi).

## 7. Testing

- **Unit (Vitest):**
  - `tests/unit/rate-limit.test.ts` — mock `supabase.from().rpc()`; pastikan `logDownload`:
    - memanggil log insert,
    - memanggil rpc `increment_download_count`,
    - jika rpc error, log error & download tetap lanjut (tidak throw).
- **Integration/route:** jika pattern ada, test GET /api/admin/stats dengan mock client
  return shape `AdminStats`; hapus jika jenis test yang ada tidak cocok.
- **Manual / manual step:** migration baru harus dijalankan oleh user (`[MANUAL]`)
  ke DB Supabase (ikuti konvensi step manual di repo ini — lihat docs plans).
- **Impeccable detect:** jalankan `npx impeccable detect src/` + audit dashboard
  di akhir (verifikasi final).
- **Lint & typecheck:** setelah implement selesai, jalankan `npm run lint` dan `npm run typecheck`
  (sesuai script project), pastikan lulus.

## 8. Out of Scope

- Sidebar admin / layout baru.
- Halaman `/admin/upload`, `/admin/manage`, `/admin/categories` terpisah.
- Chart/grafik tren.
- Top asset lists / recent activity.
- Perubahan fungsi upload, kategori, table asset selain kosmetik status chip.
- Refactor file lain di luar yang tercantum.

## User Confirmation (checkpoint)

- [x] Scope: dashboard saja (statistik)
- [x] Layout: tetap satu halaman, stats di atas
- [x] Visual: warm-playful yang sudah ada
- [x] Data: endpoint /api/admin/stats + fix download_count