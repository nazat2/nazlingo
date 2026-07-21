"use client";

import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth, GoogleAuthProvider as GoogleAuthProviderType } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

// Semua nilai ini diambil dari .env.local (lihat .env.local.example).
// Aman ditaruh di kode sisi client (NEXT_PUBLIC_*) — ini bukan rahasia,
// keamanan sebenarnya diatur lewat Firestore Security Rules (firestore.rules).
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Kalau .env.local belum diisi (mis. baru clone/extract project ini),
// jangan sampai seluruh app Next.js crash. Fitur login & cloud-sync
// otomatis nonaktif, sisanya (belajar offline pakai localStorage) tetap
// jalan seperti biasa.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

// --- Lazy loading ---
// Sebelumnya modul firebase/app, firebase/auth, dan firebase/firestore
// di-import statis di sini, artinya SELALU ikut ter-bundle & dijalankan di
// SETIAP halaman (lewat AuthContext/ProgressContext yang dipasang di root
// layout) — padahal baru benar-benar dipakai kalau pengguna buka halaman
// Profil atau login. Ini salah satu penyebab utama loading awal terasa
// berat, apalagi di koneksi lambat.
//
// Sekarang modulnya baru di-`import()` (dynamic import) saat pertama kali
// dibutuhkan, jadi webpack/Next.js memecahnya jadi file JS terpisah yang
// tidak ikut menghambat render pertama halaman. Hasilnya sama persis,
// hanya WAKTU pemuatannya yang berubah — dan setiap promise di-cache
// (module-level), jadi permintaan berikutnya instan, tidak fetch ulang.

let appPromise: Promise<FirebaseApp | null> | null = null;
let authPromise: Promise<Auth | null> | null = null;
let dbPromise: Promise<Firestore | null> | null = null;
let providerPromise: Promise<GoogleAuthProviderType | null> | null = null;

async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured) return null;
  if (!appPromise) {
    appPromise = import("firebase/app").then(({ initializeApp, getApps, getApp }) =>
      getApps().length ? getApp() : initializeApp(firebaseConfig)
    );
  }
  return appPromise;
}

/** Ambil instance Firebase Auth, memuat SDK-nya kalau belum pernah dipakai. */
export async function getFirebaseAuth(): Promise<Auth | null> {
  if (!isFirebaseConfigured) return null;
  if (!authPromise) {
    authPromise = (async () => {
      const app = await getFirebaseApp();
      if (!app) return null;
      const { getAuth } = await import("firebase/auth");
      return getAuth(app);
    })();
  }
  return authPromise;
}

/** Ambil instance Firestore, memuat SDK-nya kalau belum pernah dipakai. */
export async function getFirebaseDb(): Promise<Firestore | null> {
  if (!isFirebaseConfigured) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await getFirebaseApp();
      if (!app) return null;
      const { getFirestore } = await import("firebase/firestore");
      return getFirestore(app);
    })();
  }
  return dbPromise;
}

/** Ambil provider login Google (dengan "pilih akun" selalu aktif), lazy juga. */
export async function getGoogleProvider(): Promise<GoogleAuthProviderType | null> {
  if (!isFirebaseConfigured) return null;
  if (!providerPromise) {
    providerPromise = (async () => {
      const { GoogleAuthProvider } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      // Selalu tampilkan pemilih akun Google (bukan auto-login ke akun
      // terakhir), supaya pengguna bisa pilih akun Gmail mana pun yang mau.
      provider.setCustomParameters({ prompt: "select_account" });
      return provider;
    })();
  }
  return providerPromise;
}
