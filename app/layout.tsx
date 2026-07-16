import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const anekDevanagari = Anek_Devanagari({
  variable: "--font-devanagari",
  weight: "800",
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: "Cherry",
  description: "An infinite table of books.",
};

/**
 * Lock the visual viewport on Safari / iOS: no pinch-zoom sideways pan,
 * edge-to-edge under the notch. Vertical document scroll (wheel / touch)
 * stays enabled — the table pans that way.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/**
 * RootLayout - Application shell that loads the brand fonts
 * (Archivo Black for Latin display type, Anek Devanagari for Hindi covers,
 * Archivo for body copy).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${anekDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
