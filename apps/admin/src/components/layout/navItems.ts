import { IconCamera, IconDisc, IconDots, IconHome, IconPencil, IconReceipt, IconSettings, IconUsers, type Icon } from "@tabler/icons-react";

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  /** Główna akcja: duży przycisk aparatu na środku dolnego menu. */
  primary?: boolean;
  /** Ścieżki, przy których pozycja jest aktywna, poza `href` (np. „Więcej” obejmuje szkice i ustawienia). */
  matches?: string[];
};

/** Menu boczne (tablet i desktop): wszystkie sekcje panelu. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Pulpit", icon: IconHome },
  { href: "/zamowienia", label: "Zamówienia", icon: IconReceipt },
  { href: "/produkty", label: "Produkty", icon: IconDisc },
  { href: "/dodaj", label: "Dodaj płytę", icon: IconCamera, primary: true },
  { href: "/uzytkownicy", label: "Użytkownicy", icon: IconUsers },
  { href: "/szkice", label: "Szkice", icon: IconPencil },
  { href: "/ustawienia", label: "Ustawienia", icon: IconSettings },
];

/** Dolne menu na telefonie: pięć miejsc, aparat na środku. Szkice i ustawienia są pod „Więcej”. */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/zamowienia", label: "Kupno", icon: IconReceipt },
  { href: "/produkty", label: "Produkty", icon: IconDisc },
  { href: "/dodaj", label: "Dodaj płytę", icon: IconCamera, primary: true },
  { href: "/uzytkownicy", label: "Użytkownicy", icon: IconUsers },
  { href: "/wiecej", label: "Więcej", icon: IconDots, matches: ["/szkice", "/ustawienia"] },
];

export const isActive = (pathname: string, item: Pick<NavItem, "href" | "matches">) => {
  const paths = [item.href, ...(item.matches ?? [])];
  return paths.some((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
};
