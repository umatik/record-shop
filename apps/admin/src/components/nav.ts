import { IconCamera, IconDisc, IconHome, IconPencil, IconReceipt, IconSettings } from "@tabler/icons-react";

export const navItems = [
  { href: "/", label: "Pulpit", icon: IconHome },
  { href: "/produkty", label: "Produkty", icon: IconDisc },
  { href: "/dodaj", label: "Dodaj płytę", icon: IconCamera, primary: true },
  { href: "/szkice", label: "Szkice", icon: IconPencil },
  { href: "/ustawienia", label: "Ustawienia", icon: IconSettings },
] as const;

/** Pozycje widoczne w menu, ale jeszcze niedostępne. */
export const upcomingItems = [{ label: "Zamówienia", icon: IconReceipt }] as const;

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);
