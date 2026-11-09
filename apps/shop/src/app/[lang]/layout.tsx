import "@mantine/core/styles.css";
import "../globals.css";

import type { Metadata, Viewport } from "next";

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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
