"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { messages, type Locale } from "@/app/messages";
export default function LegacyVariantLink({ lang, id }: { lang: Locale; id: string }) {
  const router = useRouter();
  useEffect(() => {
    const match = /^#variant-(\d+)$/.exec(window.location.hash);
    router.replace(match ? `/${lang}/products/${id}/variants/${match[1]}` : `/${lang}#katalog`);
  }, [lang, id, router]);
  return (
    <main className="catalog">
      <Link href={`/${lang}#katalog`}>{messages[lang].back}</Link>
    </main>
  );
}
