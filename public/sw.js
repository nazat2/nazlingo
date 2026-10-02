// Service worker Nazlingo — versi caching sungguhan (sebelumnya sengaja
// TIDAK caching apa pun, cuma buat memenuhi syarat "bisa di-install").
//
// PENTING soal kenapa dibuat begini (baca sebelum ubah strategi cache-nya):
//
// 1. Aset statis Next.js di /_next/static/** SELALU punya nama file dengan
//    hash unik per build (mis. "app-3f9a1c.js"). Kalau isinya berubah pas
//    deploy baru, nama filenya juga otomatis berubah. Jadi aman di-cache
//    "cache-first" SELAMANYA — tidak akan pernah ada kasus "konten basi",
//    karena file lama (hash lama) tidak pernah dipakai lagi oleh HTML versi
//    baru, dan file baru (hash baru) otomatis kena network dulu lalu masuk
//    cache sebagai entri baru.
//
// 2. Untuk NAVIGASI (buka/reload sebuah halaman penuh — bukan pindah
//    halaman lewat klik Link di dalam app), dipakai strategi "network-first
//    lalu fallback ke cache milik URL itu sendiri". Artinya: kalau online,
//    SELALU ambil versi terbaru dari server dulu (jadi tidak akan pernah
//    "nyangkut" versi lama walau online) — cache-nya cuma dipakai kalau
//    fetch itu benar-benar gagal (mis. sedang tidak ada internet). Kalau
//    halaman itu belum PERNAH dibuka sebelumnya saat online (jadi belum ada
//    di cache) dan sedang offline, ditampilkan /offline.html — bukan error
//    bawaan browser yang bikin bingung.
//
// 3. SENGAJA TIDAK ikut mencampuri request lain yang dibuat React/Next.js
//    sendiri di balik layar buat pindah halaman tanpa reload (klik <Link>),
//    karena format respons request semacam itu (RSC payload) beda dari HTML
//    biasa walau URL-nya sama — kalau ikut di-cache dengan cara yang sama,
//    berisiko kepakai keliru dan bikin app error pas render. Jadi request
//    jenis ini dibiarkan lewat langsung ke jaringan seperti sebelumnya
//    (tetap ada fallback aman kalau gagal, supaya tidak muncul "Uncaught
//    (in promise)" di console). Konsekuensinya: kalau lagi BENAR-BENAR
//    offline lalu klik pindah halaman TANPA reload dulu, dan halaman
//    tujuannya belum pernah dibuka sebelumnya, klik itu tidak akan
//    berhasil pindah — tapi ini jauh lebih aman daripada app render error.
//
// 4. Request ke domain lain (mis. Firebase, foto profil Google) TIDAK ikut
//    ditangani sama sekali — dibiarkan lewat apa adanya, karena service
//    worker ini cuma tanggung jawab atas aset Nazlingo sendiri.
//
// Kalau nanti ada perubahan besar pada strategi cache ini, naikkan
// CACHE_VERSION di bawah supaya semua cache lama otomatis dibersihkan saat
// pengguna membuka app versi baru (lihat listener "activate").

const CACHE_VERSION = "v4";
const STATIC_CACHE = `nazlingo-static-${CACHE_VERSION}`;
const PAGES_CACHE = `nazlingo-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Cuma pre-cache aset yang PASTI sama buat semua orang & tidak mengandung
// data personal — biar proses install service worker cepat & tidak gagal.
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// v2: sebelumnya halaman baru masuk PAGES_CACHE setelah pernah dibuka
// online sekali (lihat networkFirstForPages). Konsekuensinya: tab utama
// yang belum pernah diklik sama sekali akan kena /offline.html walau
// tab-nya sendiri sebenarnya statis & sama buat semua orang. Makanya
// tab-tab utama ini (bukan halaman dinamis seperti /lesson/[unitId], yang
// isinya beda-beda & tidak bisa ditebak di awal) langsung di-precache juga
// pas service worker pertama kali dipasang, supaya begitu app pernah
// dibuka online SEKALI SAJA (buat instal SW-nya), semua tab utama sudah
// langsung siap dipakai offline tanpa harus mengunjungi satu-satu dulu.
const PAGES_TO_PRECACHE = [
  "/",
  "/achievements",
  "/alphabet",
  "/hiragana",
  "/profile",
  "/review",
  "/shop",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(PRECACHE_URLS);
      } catch (err) {
        // Diam saja kalau gagal pre-cache (mis. install pertama tanpa
        // internet sama sekali) — service worker tetap terpasang, cuma
        // cache awalnya kosong dan akan terisi seiring pemakaian.
      }

      // Pre-cache halaman satu-satu (bukan addAll) supaya kalau salah satu
      // gagal (mis. jaringan lambat pas instal pertama), yang lain tetap
      // berhasil masuk cache — tidak semua-atau-tidak-sama-sekali.
      const pagesCache = await caches.open(PAGES_CACHE);
      await Promise.allSettled(
        PAGES_TO_PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res && res.ok) await pagesCache.put(url, res.clone());
          } catch (err) {
            // Lewati saja halaman ini, tidak mengganggu instalasi SW.
          }
        })
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Bersihkan cache dari versi lama supaya tidak menumpuk & tidak ada
      // risiko konten basi ketemu lagi di sesi berikutnya.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Dipakai oleh tombol "Siapkan offline" di halaman Profil. Beda dari
// precache otomatis pas install (yang jalan diam-diam), ini dipicu manual
// oleh pengguna lewat postMessage dari halaman, dan progressnya dilaporkan
// balik supaya bisa ditampilkan di UI (bukan "hitam kotak").
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "NAZLINGO_CACHE_URLS" || !Array.isArray(data.urls)) return;

  event.waitUntil(cacheUrlsWithProgress(data.urls, event.source));
});

async function cacheUrlsWithProgress(urls, client) {
  const cache = await caches.open(PAGES_CACHE);
  const total = urls.length;
  let done = 0;

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res && res.ok) await cache.put(url, res.clone());
    } catch (err) {
      // Lewati URL ini, lanjut ke berikutnya — satu URL gagal (mis. koneksi
      // putus di tengah) tidak boleh menggagalkan semua yang lain.
    }
    done += 1;
    if (client) {
      client.postMessage({ type: "NAZLINGO_CACHE_PROGRESS", done, total });
    }
  }

  if (client) {
    client.postMessage({ type: "NAZLINGO_CACHE_DONE", done, total });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Sama seperti sebelumnya: cukup tangani request GET saja.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jangan campuri request ke domain lain (Firebase, foto profil Google,
  // dll) — biarkan lewat apa adanya, di luar tanggung jawab SW ini.
  if (url.origin !== self.location.origin) return;

  // (1) Navigasi halaman penuh (buka URL baru / reload / kembali dari
  // background) → network-first dengan fallback ke cache halaman itu.
  if (request.mode === "navigate") {
    // Halaman lesson (/lesson/[unitId]/[lessonId]) dapat penanganan
    // khusus — lihat networkFirstForLesson di bawah untuk alasannya.
    if (url.pathname.startsWith("/lesson/")) {
      event.respondWith(networkFirstForLesson(request));
    } else {
      event.respondWith(networkFirstForPages(request));
    }
    return;
  }

  // (2) Aset statis Next.js yang sudah ber-hash unik → cache-first selamanya.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // (3) Gambar/ikon/aset publik & manifest → stale-while-revalidate (langsung
  // tampilkan versi cache kalau ada sambil diam-diam update di belakang,
  // supaya cepat tapi tetap ikut ter-update kalau ada perubahan).
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/manifest.json" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // (4) Sisanya (termasuk request internal Next.js buat perpindahan halaman
  // tanpa reload / RSC payload) → biarkan lewat ke jaringan seperti semula,
  // dengan fallback aman kalau gagal (lihat poin 3 di komentar atas file).
  event.respondWith(
    fetch(request).catch(
      () =>
        new Response("", {
          status: 408,
          statusText: "Network error",
        })
    )
  );
});

async function networkFirstForPages(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    const staticCache = await caches.open(STATIC_CACHE);
    const offline = await staticCache.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

// Halaman lesson (/lesson/[unitId]/[lessonId]) adalah komponen client
// ("use client") murni: kontennya (soal, kosakata, dst) sudah ikut ter-
// bundle di JS lewat data/curriculum.*.ts, dan dirender di browser
// berdasarkan URL asli (useParams) — bukan dari isi HTML yang di-serve
// server. Artinya shell HTML/JS untuk SATU lesson sama persis dengan
// lesson lain manapun (bahasa/unit/lesson apa pun).
//
// Konsekuensi baiknya: kalau offline & buka lesson yang belum pernah
// di-cache PERSIS di URL itu, kita tidak perlu langsung menyerah ke
// offline.html — cukup pakai shell dari lesson LAIN yang kebetulan
// sudah tersimpan (mis. dari tombol "Siapkan offline" di halaman
// Profil), dan tetap akan render benar karena kontennya dibaca dari URL
// asli di browser, bukan dari HTML yang dikembalikan di sini.
async function networkFirstForLesson(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cache = await caches.open(PAGES_CACHE);

    // 1) Coba URL lesson ini persis, kalau memang sudah pernah dibuka/di-cache.
    const exact = await cache.match(request);
    if (exact) return exact;

    // 2) Kalau belum, pakai shell dari lesson lain mana pun yang sudah
    // tersimpan (aman, lihat penjelasan di atas fungsi ini).
    const keys = await cache.keys();
    const lessonKey = keys.find((k) => new URL(k.url).pathname.startsWith("/lesson/"));
    if (lessonKey) {
      const genericShell = await cache.match(lessonKey);
      if (genericShell) return genericShell;
    }

    // 3) Belum ada satu pun lesson tersimpan sama sekali → fallback terakhir.
    const staticCache = await caches.open(STATIC_CACHE);
    const offline = await staticCache.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    return new Response("", { status: 408, statusText: "Network error" });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    })
    .catch(() => undefined);

  if (cached) {
    // Langsung balas dari cache biar cepat; update di belakang layar
    // berjalan sendiri lewat fetchPromise di atas (tidak perlu ditunggu).
    return cached;
  }

  const fresh = await fetchPromise;
  if (fresh) return fresh;

  return new Response("", { status: 408, statusText: "Network error" });
}
