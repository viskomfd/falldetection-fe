import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Rumi — Sistem Deteksi Jatuh & Monitoring CCTV",
  description:
    "Pantau live grid multi-kamera CCTV, terima notifikasi insiden jatuh real-time, dan akses riwayat bukti video forensik.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${jakarta.variable} font-sans antialiased`}>
      <body className="min-h-screen bg-[#d8eee7] text-[#143229]">
        {children}
      </body>
    </html>
  );
}
