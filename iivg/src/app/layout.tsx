// src/app/layout.tsx
import "./globals.css";
import { Roboto_Mono, Roboto_Serif } from "next/font/google";
import localFont from "next/font/local";

// Subtitle: Roboto Mono Regular (400)
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-roboto-mono",
});

// Game titles: Roboto Serif Semibold (600)
// Note: Roboto Serif doesn't ship a “Condensed” face;
// if you truly need condensed, we can switch to another family.
// For now we’ll use Semibold 600.
const robotoSerif = Roboto_Serif({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-roboto-serif",
});

// Body: your custom font
const iivgBody = localFont({
  src: [{ path: "/fonts/NeueHaasGrotText-55Roman-Trial.otf", weight: "400", style: "normal" }],
  variable: "--font-iivg-body",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${robotoMono.variable} ${robotoSerif.variable} ${iivgBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
