import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { ProgressProvider } from "@/lib/ProgressContext";
import { AuthProvider } from "@/lib/AuthContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import TopBar from "@/components/TopBar";
import SideNav from "@/components/SideNav";
import BottomNav from "@/components/BottomNav";
import AchievementToast from "@/components/AchievementToast";
import LevelUpToast from "@/components/LevelUpToast";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CopyProtect from "@/components/CopyProtect";
import AppSplash from "@/components/AppSplash";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "600", "700"],
  display: "swap",
});

const zenmaru = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  variable: "--font-zenmaru",
  weight: ["700", "800"],
  display: "swap",
  // next/font tidak punya data metrik font pengganti untuk "M PLUS Rounded 1c",
  // jadi matikan adjustFontFallback supaya tidak muncul warning/error saat build.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Nazlingo — Belajar Bahasa Asing dari Nol",
  description:
    "Belajar kosakata Bahasa Jepang & Inggris dari nol dengan cara baca, latihan berulang, dan level yang naik perlahan. Gaya belajar santai untuk pemula, bisa ganti-ganti bahasa kapan saja.",
  applicationName: "Nazlingo",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#274472",
};

// Script ini WAJIB jalan sebelum React sempat render apa pun (makanya ditaruh
// langsung sebagai inline <script> di <head>, bukan di useEffect komponen).
// Tujuannya: baca preferensi tema dari localStorage lalu langsung tempel class
// "dark" ke <html> SEBELUM browser sempat paint sekali pun. Kalau ini
// dipindah ke useEffect (kayak sebelumnya di ProgressContext), maka app akan
// selalu ke-render pakai tema terang dulu baru "loncat" ke gelap — itu
// penyebab kedipan mode terang→gelap yang dikeluhkan.
const themeInitScript = `(function(){try{var raw=localStorage.getItem("nazlingo_progress_v1")||localStorage.getItem("nihongo_progress_v1");var theme="light";if(raw){var p=JSON.parse(raw);if(p&&p.theme)theme=p.theme;}if(theme==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* suppressHydrationWarning tidak diperlukan di sini karena class "dark"
            ditempel di <html>, elemen yang tidak dikontrol className-nya oleh
            React lewat JSX (jadi tidak ada mismatch hydration). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${jakarta.variable} ${jetbrains.variable} ${zenmaru.variable} min-h-screen bg-washi font-body text-ink antialiased`}
      >
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(39,68,114,0.06), transparent 40%), radial-gradient(circle at 85% 25%, rgba(217,70,46,0.05), transparent 35%), radial-gradient(circle at 50% 90%, rgba(92,138,106,0.06), transparent 40%)",
          }}
        />
        <AuthProvider>
          <LanguageProvider>
            <ProgressProvider>
              <AppSplash />
              <ServiceWorkerRegister />
              <CopyProtect />
              <AchievementToast />
              <LevelUpToast />
              <TopBar />
              <div className="mx-auto flex max-w-5xl">
                <SideNav />
                <main className="min-h-[calc(100vh-65px)] flex-1">{children}</main>
              </div>
              <BottomNav />
            </ProgressProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
