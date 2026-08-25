# Product Requirements Document - StackCrate

## 1. Inti Produk

### 1.1 Nama Project
**StackCrate**

### 1.2 Masalah
Editor video (content creator, editor konten) harus mencari asset editor video dari berbagai sumber satu per satu (Pexels, Coverr, Freesound, dll). Tidak ada platform publik terpusat yang mengelompokkan asset editor video berdasarkan kategori yang relevan.

### 1.3 Solusi
**StackCrate** adalah web aggregator publik untuk asset editor video. Admin (developer) upload dan kategorikan asset. Publik login dengan Google, browse, search, preview, dan download asset.

### 1.4 Target Pengguna
- **Admin:** Developer (single user) yang mengelola katalog asset
- **Public User:** Editor video, content creator yang mencari asset gratis untuk project mereka

### 1.5 Nilai Utama
- Katalog asset editor video terpusat dan terkategori
- Preview langsung di browser (play audio/video)
- Download gratis setelah login Google
- Dark mode, responsif, search cepat
- Admin upload dengan drag and drop

### 1.6 Asset Type (v1)
- Audio: WAV, MP3 (sound effect, music, ambient)
- Video: MP4, WEBM (intro, outro, transitions, overlay video)
- Image/overlay PNG tidak termasuk v1

### 1.7 License
Tidak ada sistem lisensi baku untuk v1. Hanya ada field deskripsi teks bebas untuk catatan tambahan.

### 1.8 Rate Limit
- 10 downloads per IP per jam
- Return 429 dengan pesan "Terlalu banyak download. Tunggu beberapa saat."

## 2. Budget dan Constraint

### Budget
- Rp 0/bulan untuk v0 dan v1 (semua free tier: Vercel, Supabase, Cloudflare R2)
- Estimasi v2: mungkin upgrade storage saat traffic naik

### Constraint Teknis
- Hanya admin yang bisa upload asset
- Admin login dengan email/password (bukan Google OAuth)
- Public user login dengan Google OAuth saja
- Maks 200 MB per file upload
- Database: Supabase Postgres free tier (500MB)
- Storage: Cloudflare R2 free tier (10GB)
- Public user wajib login untuk download
- Tidak ada fitur berbayar / premium tier
- Tidak ada user-generated content (publik hanya browse/download)

### Timeline
- Fleksibel, mengikuti roadmap v0 -> v1 -> v2
- Tidak ada deadline tetap

## 3. Fitur dan Fungsi

### 3.1 Browse dan Search (Public)
- Katalog asset dengan grid card (thumbnail, judul, kategori, durasi, type)
- Search berdasarkan judul, tag, atau deskripsi (Postgres full-text search)
- Filter by kategori
- Sort: newest, most downloaded, most popular
- Pagination / infinite scroll

### 3.2 Asset Detail Page
- Preview media player (audio/video)
- Info lengkap: judul, deskripsi, kategori, tag, ukuran file, durasi, type, tanggal upload
- Tombol download (butuh login)
- Tombol favorite (butuh login)
- Related assets grid

### 3.3 Download (Authenticated User)
- Rate limit: 10 downloads/IP/hour
- Redirect ke R2 presigned URL setelah rate limit check
- Log download untuk tracking dan rate limit

### 3.4 Favorites (Authenticated User)
- Simpan asset favorit ke library pribadi
- CRUD favorites: tambah, hapus, list
- Persisted di database (bukan localStorage)

### 3.5 Admin: Upload Asset
- Form: judul, deskripsi, kategori, tag, file (drag and drop)
- Upload langsung browser ke R2 via presigned URL
- Setelah upload: asset tersimpan dan bisa langsung di-browse

### 3.6 Admin: Manage Asset
- Edit metadata asset (judul, deskripsi, kategori, tag)
- Hapus asset
- List semua asset dengan table view

### 3.7 Admin: Login
- Email plus password login (bukan Google OAuth)
- Session via Supabase Auth
- Admin check: role = admin di database

### 3.8 Public: Login
- Google OAuth via Supabase Auth
- Session persistent
- Setelah login: akses download dan favorites

### 3.9 UI/UX
- Dark mode default, light mode toggle
- Responsive (desktop, tablet, mobile)
- Shimmer loading skeleton
- Subtle hover effects (scale 1.02 plus shadow)
- Transisi halaman: fade in 150ms
- Error handling untuk semua state

## 4. Struktur Halaman

### Daftar Halaman
1. Home / Katalog - `/` - Public
2. Category Filter - `/category/[slug]` - Public
3. Search Results - `/search` - Public
4. Asset Detail - `/asset/[slug]` - Public (download butuh auth)
5. Login - `/login` - Public (2 tab: Google / Admin)
6. Favorites - `/favorites` - Authenticated
7. Admin Dashboard - `/admin` - Admin
8. Upload Asset - `/admin/upload` - Admin
9. Manage Asset - `/admin/manage` - Admin

### Wireframe: Home
```
StackCrate        [Search] [Login]
Kategori: [All] [Audio] [Video] [...]
Sort: [Newest] [Popular] [Most Downloaded]
Grid:
[Card] [Card] [Card] [Card]
[Card] [Card] [Card] [Card]
[Load More]
```

### Wireframe: Asset Detail
```
StackCrate    [Search] [User Avatar]
Preview Player           | Title
[Play] 00:00 / 02:14    | Description
                        | Category: Audio
                        | Tags: sfx bgm
[Download]              | File Size: 5MB
[Favorite]              | Type: Audio
                        | Date: 2026-08-08
Related Assets Grid
```

### Wireframe: Admin Upload
```
StackCrate Admin           [User Menu]
[Upload Asset]
Title:       [_______________]
Category:    [Audio / Video v]
Tags:        [tag1] [tag2] [+]
Description: [____________________]

File: [Drag and Drop or Click]

[Cancel]              [Upload Asset]
```

### Wireframe: Login Page
```
StackCrate
[Google OAuth]   [Admin Login]
(Google tab)        | (Admin tab)
[Sign in with Google]  | Email: _____
                       | Password: ____
                       | [Login as Admin]
```

## 5. Alur User

### Alur Public (tanpa login)
1. Buka `/`
2. Browse/katalog atau search
3. Klik asset -> detail page
4. Preview media player
5. (Tanpa download)

### Alur Download
1. Buka `/login` -> Google OAuth
2. Kembali ke asset detail
3. Klik Download -> rate limit check
4. Redirect ke R2 -> download selesai
5. Download log tercatat

### Alur Upload (Admin)
1. Login sebagai admin di `/login` (email/password)
2. Buka `/admin/upload`
3. Isi form metadata
4. Drag and drop file
5. Submit -> upload ke R2 via presigned URL
6. Redirect ke asset detail

### Alur Favorite
1. Login Google OAuth - belum
2. Buka asset detail
3. Klik Add to Favorites
4. Bisa cek di `/favorites`

### Error States
- URL tidak valid / asset tidak ditemukan -> "Asset tidak ditemukan"
- Download gagal -> "Gagal mengunduh. Coba lagi."
- Rate limit terlampaui -> "Terlalu banyak download. Tunggu beberapa saat."
- Upload gagal -> "Gagal upload. Pastikan file tidak lebih dari 200MB."
- File type tidak didukung -> "Format file tidak didukung. Gunakan MP4, WEBM, WAV, atau MP3."
- Admin access denied -> "Akses ditolak. Hanya admin yang bisa mengakses halaman ini."

## 6. Design dan Tema

### Mood & Vibe (Warm & Playful)
- **Hangat dan ramah** - earth tone palette, font rounded/soft, animasi playful tapi tidak berlebihan
- **Aksesibel untuk Gen Z dan editor konten** - warna hangat, typography ekspresif, micro-interactions yang detail
- **Aksen warna** untuk status: hijau (success), oranye (warning), merah (error)

### Palette (Warm & Playful)
**Dark mode (default):**
- Background: #1a1410 (warm dark brown, bukan pure black)
- Card: #2a201a (warm dark)
- Border: #3d2f25 (warm brown border)
- Accent: #f97316 (oranye hangat - primary)
- Accent secondary: #fbbf24 (kuning gold, untuk highlight)
- Text primary: #fafaf9 (warm white)
- Text secondary: #a8a29e (warm gray)

**Light mode:**
- Background: #fffbeb (warm cream)
- Card: #fef3c7 (light warm yellow)
- Border: #f5deb3 (warm beige)
- Accent: #ea580c (oranye tua)
- Accent secondary: #d97706 (gold tua)
- Text primary: #292524 (warm dark)
- Text secondary: #78716c (warm gray)

### Typography (Ekspresif & Personal)
- **Font utama (headline):** Knewave - brush-style font untuk judul besar & branding
- **Font sekunder (judul section):** Mystery Quest - playful display font untuk heading medium
- **Font body (penjelas):** Kranky - rounded handwritten font untuk body text, terasa personal & friendly
- **Font fallback:** system-ui, sans-serif
- **Font size:**
  - Display (page title): 48-64px, Knewave
  - Heading (section): 32-40px, Mystery Quest
  - Subheading: 24-28px, Mystery Quest
  - Body: 16-18px, Kranky, line-height 1.6
  - Caption: 14px, Kranky
- **Letter spacing:** Display: -0.02em, Body: 0

### Library
- **Tailwind CSS** - styling
- **shadcn/ui** - komponen UI reusable
- **Lucide React** - icon library
- **React Player** - audio/video preview
- **Framer Motion** - animasi utama (WAJIB untuk mood interaktif)
- **tailwindcss-animate** - animasi Tailwind built-in
- **react-intersection-observer** - scroll trigger untuk animasi
- **canvas-confetti** - efek confetti saat download success

### Responsivitas
- Desktop: 3-4 kolom grid
- Tablet: 2 kolom
- Mobile: 1 kolom, navigasi hamburger

### Motion (Wah tapi tidak berlebihan)

**1. Page Entry (semua halaman)**
- Fade in + slide up dari 16px (300ms, ease-out)
- Header navbar: slide down dari atas (200ms, ease-out)
- Footer: slide up saat scroll masuk viewport

**2. Hero Section (Home)**
- Teks headline: per kata stagger fade + slight rotate (Framer Motion stagger)
- Subtitle: fade in 100ms setelah headline
- CTA button: bounce-in dengan spring (scale 0.8 -> 1.05 -> 1)
- Asset cards grid: stagger fade-in (per card delay 50ms)

**3. Scroll Animations**
- Asset cards: saat masuk viewport, stagger fade + lift (8px)
- Section heading: fade in dari kiri (12px translate)
- Parallax halus untuk hero background (max 0.3 speed, tidak berlebihan)
- Scroll progress indicator tipis di top (accent color)

**4. Hover & Click States**
- Card: scale 1.03 + shadow grow + slight rotate (1deg) - transisi 200ms
- Button: scale 0.97 on press, bounce back on release (spring)
- Icon favorite: heart-burst animation saat click (partikel keluar)
- Category chips: bounce vertical (3px) on hover

**5. Loading States**
- Shimmer gradient warm (oranye-pink-gold) instead of generic gray
- Skeleton dengan rounded corners
- Loading spinner: rotating dots atau ping-pong

**6. Micro-interactions**
- Search bar: expand on focus (lebar + border color)
- Filter dropdown: smooth height transition
- Tag input: chip slide in saat enter
- Toast notification: slide from top-right + auto-dismiss

**7. Special Page Transitions**
- Click asset card: smooth transition ke detail (shared element, opsional)
- Login submit: button morph ke loading spinner
- Download success: confetti burst (ringan, canvas-confetti)

**Performance constraints:**
- Animasi hanya triggered saat element masuk viewport (lazy)
- Framer Motion gunakan LazyMotion + domAnimation features
- Tidak ada animasi saat user prefers-reduced-motion (accessibility)

## 7. Spesifikasi Teknis

### Arsitektur
Next.js (App Router) monorepo structure. Frontend dan API berada dalam satu project.

### Struktur Folder
```
web-asset-editor/
|-- src/
|   |-- app/
|   |   |-- (public)/
|   |   |   |-- page.tsx
|   |   |   |-- asset/[slug]/
|   |   |   |-- search/
|   |   |   |-- category/[slug]/
|   |   |-- (admin)/
|   |   |   |-- admin/page.tsx
|   |   |   |-- admin/asset/[id]/edit
|   |   |   |-- admin/upload/page.tsx
|   |   |-- api/
|   |   |   |-- assets/route.ts
|   |   |   |-- upload/presign/route.ts
|   |   |   |-- download/[id]/route.ts
|   |   |   |-- favorites/route.ts
|   |   |   |-- categories/route.ts
|   |   |-- login/page.tsx
|   |   |-- layout.tsx
|   |-- components/
|   |   |-- ui/
|   |   |-- asset/
|   |   |-- layout/
|   |   |-- admin/
|   |-- lib/
|   |   |-- supabase/
|   |   |-- r2/
|   |   |-- search.ts
|   |   |-- rate-limit.ts
|   |-- hooks/
|   |-- types/
|-- public/
|-- supabase/
|   |-- migrations/
|   |-- seed/
|-- package.json
```

### Database Schema
```
asset (
  id uuid PK,
  title text,
  description text,
  type 'audio' | 'video',
  category_id uuid FK,
  tags text[],
  file_url text,
  file_size bigint,
  duration interval,
  created_at timestamptz,
  created_by uuid FK (admin),
  downloads_count int DEFAULT 0,
  favorites_count int DEFAULT 0
)

category (
  id uuid PK,
  name text UNIQUE,
  slug text UNIQUE,
  icon text
)

favorite (
  id uuid PK,
  user_id uuid FK,
  asset_id uuid FK,
  created_at timestamptz,
  UNIQUE(user_id, asset_id)
)

download_log (
  id uuid PK,
  user_id uuid FK,
  asset_id uuid FK,
  ip_hash text,
  downloaded_at timestamptz
)
```

### API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/assets | Public | List assets (paginated, filter, search, sort) |
| GET | /api/assets/:id | Public | Single asset detail |
| POST | /api/upload/presign | Admin | Generate presigned URL for R2 upload |
| POST | /api/assets | Admin | Create asset metadata |
| PATCH | /api/assets/:id | Admin | Edit asset metadata |
| DELETE | /api/assets/:id | Admin | Delete asset |
| POST | /api/download/:id | Auth | Rate-limited download redirect |
| GET | /api/favorites | Auth | List user favorites |
| POST | /api/favorites/:assetId | Auth | Add favorite |
| DELETE | /api/favorites/:assetId | Auth | Remove favorite |
| GET | /api/categories | Public | List categories |

### Data Flow
1. Browse: GET /api/assets?search=&category=&sort= -> return asset list
2. Search: Full-text search via Postgres tsvector
3. Upload: Admin form -> POST /api/upload/presign -> browser upload to R2 -> POST /api/assets -> done
4. Download: POST /api/download/:id -> rate limit check -> redirect R2 presigned URL
5. Favorite: POST /api/favorites/:assetId -> DB insert -> update favorites_count

### Upload Flow (Detail)
1. Admin isi form metadata plus select file
2. Frontend panggil POST /api/upload/presign -> backend generate presigned URL untuk R2
3. Frontend POST file ke R2 langsung (bukan via backend)
4. Backend create asset record plus update file_url, file_size, duration
5. Redirect ke asset detail page

### Auth dan Roles
- Public user: Google OAuth via Supabase Auth
- Admin: Email plus password, role = admin di database (diatur manual)
- Admin routes: protected middleware check role = admin
- Session: Supabase session, persisten

### Rate Limiting
- 10 downloads per IP per hour
- Query: SELECT COUNT(*) FROM download_log WHERE ip_hash = ? AND downloaded_at > NOW() - INTERVAL '1 hour'
- Return 429 dengan pesan "Terlalu banyak download. Tunggu beberapa saat."
- IP hash: SHA256 dari client IP (anonymous, tidak disimpan plain IP)

### Storage
- Cloudflare R2
- Presigned URL: expires 5 menit
- File path structure: assets/{type}/{uuid}-{timestamp}.{ext}

### Deployment
- Frontend dan API: Vercel (free tier, integrasi Next.js native)
- DB dan Auth: Supabase Cloud (free tier)
- Storage: Cloudflare R2 (free tier: 10GB, 1M requests/bulan)
- Domain: stackcrate.vercel.app untuk v1

### Testing
- Unit: Vitest untuk utility (rate-limit, search, validation)
- Integration: Vitest untuk API routes (upload presign, download rate limit)
- E2E: Playwright untuk flow kritikal (browse -> download -> upload admin)
- Visual: Impeccable untuk review UI/UX

## 8. Struktur Project dan Environment

### Environment
- Local: development di localhost, .env.local
- Staging: Vercel preview branch
- Production: Vercel production deployment

### Credential dan Environment Variable
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

- .env.local dan .env.production tidak di-commit ke repo

### Struktur Project
```
web-asset-editor/
|-- src/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |-- hooks/
|   |-- types/
|-- public/
|-- supabase/
|   |-- migrations/
|   |-- seed/
|-- .env.local
|-- .env.example
|-- .gitignore
|-- package.json
|-- README.md
```

### GitHub Repo
- Repository terpisah untuk project ini
- Wajib: README.md, .gitignore, .env.example tanpa nilai secret
- Branch: main (production), dev (staging)

## 9. Roadmap

### v0 - Development Lokal
- Semua fitur core berjalan di localhost
- Supabase local + R2 local (atau mock)
- Tidak ada database server public
- Admin login manual (hardcode credential di .env.local)
- Tujuan: validasi semua fitur sebelum naik ke staging

### v1 - Deploy Staging
- App naik ke Vercel + Supabase Cloud + R2
- Admin login dengan email/password
- Public user login Google OAuth
- Semua fitur working di server publik
- Domain: stackcrate.vercel.app

### v2 - Production (opsional)
- Custom domain
- Monitoring dan analytics
- User-generated content (user bisa upload, tapi dengan approval flow)
- Rating dan review asset
- Export playlist / download bundle

## 10. Out of Scope (v1)
- User-generated content (publik tidak bisa upload)
- Rating dan review
- Playlist / download bundle
- Advanced search (faceted, filter by duration, etc)
- Mobile app
- Multi-language / i18n
- Admin moderation queue
- Email notification

> Tambahan dikit: 
-- untuk jadi admin
update public.profiles
set role = 'admin'
where email = 'email-kamu@contoh.com';

-- Semua akun + rolenya
select email, role from public.profiles order by role, email;

-- Khusus admin saja
select email from public.profiles where role = 'admin';

--Menurunkan kasta
update public.profiles
set role = 'user'
where email = 'email-kamu@contoh.com';

--Hapus
delete from auth.users where email = 'email-kamu@contoh.com';