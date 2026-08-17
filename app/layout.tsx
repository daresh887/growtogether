import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Sans, Courier_Prime } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Ledger design system: one quiet grotesque for UI…
const grotesk = Instrument_Sans({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// …and one typewriter face, reserved exclusively for contract text.
const typewriter = Courier_Prime({
  variable: "--font-typewriter",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lockinbuddy.com"),
  title: "LockIn Buddy",
  description:
    "Sign a contract to reach your goal. Post proof of your progress every day. If you stop, your name and face are published here and on our X for everyone to see.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${grotesk.variable} ${typewriter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
