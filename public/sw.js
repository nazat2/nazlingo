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

const CACHE_VERSION = "v1";
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

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Diam saja kalau gagal pre-cache (mis. install pertama tanpa
        // internet sama sekali) — service worker tetap terpasang, cuma
        // cache awalnya kosong dan akan terisi seiring pemakaian.
      })
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
    event.respondWith(networkFirstForPages(request));
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
