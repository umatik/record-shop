import "@mantine/core/styles.css";
import "../globals.css";

import type { Metadata, Viewport } from "next";

import { CartProvider } from "@/components/CartPreview";
import { Providers } from "../providers";

import { isLocale, locales, messages } from "../messages";
import { notFound } from "next/navigation";
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}
export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return {
    title: messages[lang].title,
    icons: { icon: "/logo.png" },
    robots: { index: false, follow: false },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} data-mantine-color-scheme="light">
      <head>
        <meta name="darkreader-lock" />
        <script
          dangerouslySetInnerHTML={{
            __html: `addEventListener('keydown',function(e){if(e.key==='Tab')document.documentElement.classList.add('kbd')});addEventListener('pointerdown',function(){document.documentElement.classList.remove('kbd')});`,
          }}
        />
      </head>
      <body>
        <Providers><CartProvider lang={lang}>{children}</CartProvider></Providers>
      </body>
    </html>
  );
}
