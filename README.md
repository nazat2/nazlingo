# 🎌 Nazlingo

Aplikasi web belajar **Bahasa Jepang dari nol**, bergaya Duolingo, dengan romaji di setiap kata,
latihan yang diulang-ulang sampai benar-benar hafal, dan level yang naik pelan-pelan.
Dibangun dengan **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Framer Motion**.

## ✨ Fitur

- **Peta pelajaran** ala Duolingo — 9 unit (termasuk Kanji Dasar), tiap unit berisi beberapa pelajaran, terkunci berurutan.
- **Romaji** tampil di setiap kata Jepang (bisa dimatikan di halaman Profil), lengkap dengan **contoh kalimat** untuk sebagian kosakata.
- **5 jenis latihan** yang bergantian: pilihan ganda JP→ID, pilihan ganda ID→JP, dengar & pilih (text‑to‑speech),
  ketik romaji, dan susun huruf jadi kata — supaya kosakata benar-benar "diulang-ulang sampai pasti".
- **Toleransi typo** saat mengetik romaji — typo 1-2 huruf tetap dianggap benar (pakai jarak Levenshtein), lengkap
  dengan catatan penulisan yang tepat, supaya latihan tidak terasa terlalu kaku.
- **Pengulangan berjarak (spaced repetition)** ala kartu Leitner: kata yang sering salah akan lebih sering muncul lagi di halaman **Ulangi**,
  dan dirangkum di kartu **"Perlu Dilatih Lagi"** pada Profil.
- **Sistem level/rank** — total XP diterjemahkan jadi gelar (Pemula → Pelajar → Menengah → Mahir → ... → Native-level),
  lengkap dengan animasi & confetti saat naik level.
- **Sistem nyawa (hearts), XP, gems, dan streak harian** dengan **pembeku streak (streak freeze)** — motivasi seperti Duolingo asli.
- **Misi harian** di beranda dan **11 pencapaian/badge** dengan notifikasi toast saat terbuka.
- **Toko permata** — tukar gems dengan pembeku streak atau isi ulang nyawa.
- **Efek suara** ringan (nada benar/salah/fanfare) memakai Web Audio API — tanpa file audio eksternal, bisa dimatikan di Profil.
- **Grafik XP 7 hari terakhir** di halaman Profil.
- **Mode gelap (dark mode)** penuh, tersimpan sebagai preferensi pengguna.
- **Halaman Huruf Kana** — chart Hiragana & Katakana lengkap dengan audio pengucapan.
- **Audio pengucapan Jepang** memakai Web Speech API browser (gratis, tanpa API key).
- **Login 1-klik dengan Google & sinkronisasi cloud (Firebase, gratis)** — progres (XP, streak, kata yang dipelajari)
  otomatis tersimpan ke akun Google pengguna lewat Firestore, jadi bisa lanjut belajar dari perangkat lain. Halaman
  Profil mengharuskan login dulu sebelum data ditampilkan. Kalau `.env.local` belum diisi, fitur ini otomatis
  nonaktif dan sisa aplikasi tetap berjalan normal pakai `localStorage` saja (lihat bagian **Setup Firebase** di bawah).
- **Progres tersimpan otomatis** di `localStorage` perangkat sebagai cache lokal (tetap bisa dipakai sebentar walau
  offline), lalu disinkronkan ke cloud begitu ada koneksi & pengguna sedang login.
- **PWA installable** (bisa "Add to Home Screen") dengan ikon lengkap (192/512/maskable/apple-touch) dan service worker
  minimal yang aman — tanpa risiko cache basi.
- **Halaman error & loading resmi Next.js** (`error.tsx`, `global-error.tsx`, `loading.tsx`) — kalau ada bug runtime,
  yang tampil layar ramah bergaya aplikasi, bukan layar error mentah.
- **UI/UX responsif** — dioptimalkan untuk mobile (nav bawah, satu kolom) dan desktop (sidebar, kartu profil dua kolom,
  badge level di header), skeleton loading, animasi halus, microinteraction, dan skema warna terinspirasi
  washi/torii/matcha yang otomatis menyesuaikan tema terang/gelap.

### Belum termasuk (butuh infrastruktur server sungguhan)

Fitur seperti **leaderboard/liga multipemain** sengaja belum dibuat karena memerlukan backend tambahan di luar
cakupan saat ini. Login Google & sinkronisasi progres lintas perangkat **sudah tersedia** lewat Firebase (gratis,
lihat bagian **Setup Firebase** di bawah).

## 🗂️ Struktur Folder

```
nazlingo/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Layout utama (font next/font, providers, nav, PWA)
│   ├── globals.css             # Style global + Tailwind layers + variabel tema
│   ├── error.tsx                # Error boundary per halaman
│   ├── global-error.tsx         # Error boundary root (kalau layout sendiri crash)
│   ├── loading.tsx              # Loading fallback global
│   ├── favicon.ico
│   ├── page.tsx                 # Beranda — peta unit & pelajaran + misi harian
│   ├── not-found.tsx            # Halaman 404
│   ├── lesson/[unitId]/[lessonId]/page.tsx   # Mesin latihan per pelajaran
│   ├── review/page.tsx          # Latihan ulang (spaced repetition)
│   ├── hiragana/page.tsx        # Chart Hiragana & Katakana
│   ├── achievements/page.tsx    # Daftar pencapaian/badge
│   ├── shop/page.tsx            # Toko permata
│   └── profile/page.tsx         # Level, statistik, grafik XP, kata lemah & pengaturan
├── components/                  # Komponen UI reusable
│   ├── TopBar.tsx                # Header: logo, level, streak, gems, hearts
│   ├── SideNav.tsx / BottomNav.tsx  # Navigasi desktop / mobile
│   ├── LessonPath.tsx            # Peta node pelajaran per unit
│   ├── ExerciseCard.tsx          # Renderer semua tipe soal + toleransi typo + suara
│   ├── ExerciseHeader.tsx        # Progress bar + nyawa saat latihan
│   ├── FeedbackBanner.tsx        # Banner benar/salah
│   ├── LessonComplete.tsx        # Layar selesai + confetti + suara
│   ├── OutOfHearts.tsx           # Layar nyawa habis
│   ├── SpeakButton.tsx           # Tombol audio
│   ├── DailyQuest.tsx            # Widget misi harian di beranda
│   ├── AchievementToast.tsx      # Notifikasi pencapaian terbuka
│   ├── LevelUpToast.tsx          # Notifikasi naik level
│   ├── XpChart.tsx               # Grafik batang XP mingguan
│   ├── WeakWords.tsx             # Daftar kata yang perlu dilatih ulang
│   └── ServiceWorkerRegister.tsx  # Registrasi PWA service worker
├── data/
│   ├── curriculum.ts             # Semua unit, pelajaran, kosakata (mudah ditambah)
│   ├── hiragana.ts               # Data tabel Hiragana/Katakana
│   └── achievements.ts           # Definisi pencapaian/badge
├── lib/
│   ├── types.ts                  # Semua tipe TypeScript
│   ├── progress.ts                # Logic localStorage: XP, hearts, streak, tema, misi harian, toko
│   ├── exercises.ts               # Generator soal dari data kosakata
│   ├── levels.ts                  # Sistem level/rank berbasis XP
│   ├── levenshtein.ts             # Jarak edit untuk toleransi typo
│   ├── sound.ts                   # Efek suara (Web Audio API)
│   ├── tts.ts                     # Text-to-speech Bahasa Jepang
│   ├── cn.ts                      # Helper className
│   ├── firebase.ts                 # Inisialisasi Firebase app/Auth/Firestore (aman jika belum dikonfigurasi)
│   ├── AuthContext.tsx              # React Context: state login Google + signIn/signOut
│   └── ProgressContext.tsx        # React Context provider progres pengguna + sinkronisasi Firestore
├── components/
│   └── CopyProtect.tsx             # Blokir klik-kanan/copy/drag-select teks di seluruh halaman
├── public/
│   ├── manifest.json              # Manifest PWA
│   ├── icons/                     # Ikon PWA (192/512/maskable/apple-touch/favicon)
│   └── sw.js                      # Service worker minimal (tanpa caching berisiko)
├── firestore.rules                 # Security rules: user cuma bisa akses data progresnya sendiri
├── .env.local.example              # Template environment variable Firebase
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## ➕ Menambah kosakata / pelajaran baru

Semua konten belajar ada di **satu file**: `data/curriculum.ts`. Format penulisan kata sangat ringkas:

```ts
["ありがとう", "arigatou", "terima kasih"],
// [tulisan Jepang, romaji, arti Bahasa Indonesia, contoh_kalimat_jp?, arti_contoh?]
```

Tambahkan array `words` baru di dalam `lessons`, atau tambahkan `unit` baru di array `raw`. Tidak perlu mengubah
kode lain — halaman, latihan, dan progres otomatis menyesuaikan.

> **Catatan penting:** isi kolom romaji dengan **satu bacaan saja** (jangan pakai format `"yon / shi"`), karena
> romaji ini juga dipakai sebagai jawaban pada latihan ketik & susun kata. Kalau kata punya beberapa cara baca,
> taruh bacaan tambahan itu di kolom arti (`id_`), contoh: `"kanji: empat (4), juga dibaca 'shi'"`.

## 🖥️ Menjalankan di komputer lokal

Butuh [Node.js](https://nodejs.org) versi 18 ke atas.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

## 🚀 Deploy: GitHub → Vercel

### 1. Unggah ke GitHub

```bash
cd nazlingo
git init
git add .
git commit -m "Inisialisasi Nazlingo"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

Ganti `USERNAME/NAMA-REPO` dengan repository GitHub kamu (buat dulu repo kosong di github.com jika belum ada).

### 2. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub kamu.
2. Klik **Add New → Project**.
3. Pilih repository yang baru saja kamu push.
4. Vercel akan otomatis mendeteksi ini sebagai project **Next.js** — biarkan semua pengaturan default
   (*Build Command*: `next build`, *Output Directory*: otomatis).
5. Klik **Deploy**. Tunggu 1–2 menit.
6. Selesai! Kamu akan mendapat URL publik seperti `https://nama-repo.vercel.app`.

Setiap kali kamu `git push` ke branch `main`, Vercel otomatis build & deploy ulang (CI/CD otomatis) — tidak perlu langkah manual lagi.

### Environment variable (opsional, untuk aktifkan login & cloud sync)

Aplikasi ini **jalan tanpa environment variable sama sekali** (progres cuma di `localStorage`, tanpa login).
Kalau kamu mau aktifkan **login Google + sinkronisasi cloud** (lihat bagian **Setup Firebase** di bawah), tambahkan
environment variable `NEXT_PUBLIC_FIREBASE_*` di **Vercel → Project Settings → Environment Variables**
(nilainya sama seperti isi `.env.local` di komputer lokal), lalu redeploy.

## 🔥 Setup Firebase (login Google & cloud sync) — gratis, tanpa kartu kredit

1. Buka [console.firebase.google.com](https://console.firebase.google.com), login pakai akun Google, klik
   **Add project** → beri nama bebas (mis. "nazlingo") → lanjutkan sampai selesai (Google Analytics boleh dimatikan,
   tidak perlu untuk fitur ini). Ini **paket Spark (gratis)**, tidak akan minta kartu kredit.
2. Di sidebar project, klik ikon **`</>`  (Web)** untuk mendaftarkan "web app" baru. Beri nickname bebas, **tidak**
   perlu centang Firebase Hosting. Setelah didaftarkan, Firebase akan menampilkan objek `firebaseConfig` — salin
   nilai-nilainya.
3. Buat file baru bernama **`.env.local`** di root project (salin dari `.env.local.example`), lalu isi dengan nilai
   dari langkah 2:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nazlingo-xxxxx.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=nazlingo-xxxxx
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nazlingo-xxxxx.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```
4. Di sidebar Firebase Console, buka **Build → Authentication → Get started**. Di tab **Sign-in method**, aktifkan
   provider **Google** (tinggal toggle on, pilih email support kamu, Save).
5. Masih di sidebar, buka **Build → Firestore Database → Create database**. Pilih lokasi server terdekat (mis.
   `asia-southeast2` / Jakarta), mulai dengan mode **production**.
6. Terapkan aturan keamanan supaya setiap pengguna cuma bisa akses datanya sendiri: buka tab **Rules** di Firestore,
   hapus isinya, lalu tempel isi file **`firestore.rules`** (sudah disediakan di project ini), klik **Publish**.
7. Jalankan `npm install` lagi (menambahkan SDK Firebase yang baru ditambahkan ke `package.json`), lalu
   `npm run dev` — coba klik **Masuk dengan Google** di halaman Profil.
8. Untuk versi yang sudah di-deploy ke Vercel, tambahkan environment variable yang sama di
   **Vercel → Project Settings → Environment Variables**, lalu redeploy.

> Kuota gratis (paket Spark) untuk Firestore: 1GB penyimpanan, 50.000 baca & 20.000 tulis per hari, dan
> Authentication gratis sampai 50.000 pengguna aktif/bulan — lebih dari cukup untuk aplikasi ini.

### Kalau kamu sudah pernah deploy versi lama ("Nihongo, untukmu")

Progres pengguna lama otomatis dipindahkan ke penyimpanan baru saat mereka membuka Nazlingo pertama kali
(lihat `LEGACY_KEY` migration di `lib/progress.ts`) — tidak ada data yang hilang akibat rebranding ini.

## 🎨 Desain

- **Palet warna**: krem washi (`#FBF6EC` terang / `#12141A` gelap) sebagai latar, indigo Jepang tradisional (`#274472`),
  merah torii (`#D9462E`), sakura (`#F4A6B7`), emas (`#E0A33C`), dan hijau matcha (`#5C8A6A`) sebagai aksen warna unit.
  Semua warna netral (latar, kartu, teks) memakai CSS variable sehingga otomatis berganti saat mode gelap diaktifkan.
- **Tipografi**: dimuat lewat `next/font` (tanpa render-blocking) — *M PLUS Rounded 1c* untuk judul (mendukung karakter
  Jepang dengan gaya bulat ramah), *Plus Jakarta Sans* untuk teks isi, *JetBrains Mono* untuk romaji supaya mudah
  dibaca dan terasa seperti "cara baca teknis".
- **Motion & suara**: node pelajaran muncul bertahap saat discroll, kartu jawaban benar “pop” dan yang salah “shake”,
  layar selesai pelajaran memicu confetti + fanfare, naik level memicu animasi + confetti — dibuat secukupnya agar
  terasa hidup tanpa berlebihan, dan semuanya bisa dimatikan lewat toggle "Efek suara" di Profil.
- **Mobile vs Desktop**: navigasi bawah pada mobile berubah jadi sidebar tetap di desktop; kartu profil, grafik XP,
  dan daftar kata lemah tersusun satu kolom di mobile lalu otomatis jadi dua kolom berdampingan di layar ≥768px;
  badge level tampil di header hanya pada desktop supaya header mobile tetap ringkas.

## 📚 Cakupan materi (untuk pemula total)

9 unit dari nol: **Salam Dasar → Angka & Waktu → Keluarga → Makanan & Minuman → Tempat & Arah →
Sifat & Perasaan → Kata Kerja Harian → Percakapan Sehari-hari → Kanji Dasar**, plus halaman terpisah untuk menghafal
**Hiragana** dan **Katakana**. Cocok untuk yang benar-benar belum tahu kosakata maupun cara bacanya sama sekali.

Selamat belajar — 頑張って (ganbatte, semangat)! 🍡
