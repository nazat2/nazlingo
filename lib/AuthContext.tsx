"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User } from "firebase/auth";
import {
  getFirebaseAuth,
  getGoogleProvider,
  isFirebaseConfigured,
} from "@/lib/firebase";

type Ctx = {
  user: User | null;
  authReady: boolean;
  authEnabled: boolean;
  signingIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Firebase belum dikonfigurasi (.env.local kosong) — anggap saja auth
      // "siap" tanpa user, supaya halaman lain tidak nyangkut di skeleton.
      const auth = await getFirebaseAuth();
      if (!auth) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      const { onAuthStateChanged, getRedirectResult } = await import("firebase/auth");
      if (cancelled) return;

      // Tangani hasil login yang datang lewat redirect (fallback ketika
      // popup diblokir browser — cukup umum terjadi di browser mobile).
      getRedirectResult(auth).catch(() => {
        // Diam saja: kalau bukan hasil redirect, ini memang akan selalu "gagal" dengan null
      });

      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      });
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = await getFirebaseAuth();
    const googleProvider = await getGoogleProvider();
    if (!auth || !googleProvider) return;
    setSigningIn(true);
    try {
      const { signInWithPopup, signInWithRedirect } = await import("firebase/auth");
      try {
        // Popup: pengalaman 1-klik terbaik di desktop & kebanyakan browser mobile —
        // muncul jendela pemilih akun Google, pilih salah satu, langsung masuk.
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        // Kalau popup diblokir/tidak didukung di browser ini, coba lagi lewat
        // redirect (pengguna diarahkan ke halaman login Google, lalu kembali).
        if (
          code === "auth/popup-blocked" ||
          code === "auth/operation-not-supported-in-this-environment"
        ) {
          try {
            await signInWithRedirect(auth, googleProvider);
          } catch {
            // Diam saja — pengguna bisa coba tekan tombol lagi
          }
        }
        // auth/popup-closed-by-user / auth/cancelled-popup-request: pengguna
        // sendiri yang menutup popup-nya, tidak perlu ditangani sebagai error.
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = await getFirebaseAuth();
    if (!auth) return;
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        authReady,
        authEnabled: isFirebaseConfigured,
        signingIn,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
