import "@mantine/core/styles.css";
import "./globals.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Figtree } from "next/font/google";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

const figtree = Figtree({ subsets: ["latin", "latin-ext"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "RasBass · panel",
  icons: { icon: "/logo.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={figtree.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
