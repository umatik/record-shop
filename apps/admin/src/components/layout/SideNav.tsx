"use client";

import { Badge, NavLink } from "@mantine/core";
import Link from "next/link";
import { useProductCount } from "@/hooks/useProducts";
import { isActive, NAV_ITEMS } from "./navItems";

type SideNavProps = {
  pathname: string;
};

/** Menu boczne od szerokości tabletu; przy szkicach licznik niedokończonych płyt. */
const SideNav = ({ pathname }: SideNavProps) => {
  const { data: draftCount } = useProductCount("draft");

  return (
    <ul className="plain-list">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <NavLink
            component={Link}
            href={href}
            label={label}
            active={isActive(pathname, href)}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            leftSection={<Icon size={20} aria-hidden="true" />}
            rightSection={
              href === "/szkice" && draftCount ? (
                <Badge size="sm" color="yellow" variant="light" aria-label={`${draftCount} do dokończenia`}>
                  {draftCount}
                </Badge>
              ) : null
            }
          />
        </li>
      ))}
    </ul>
  );
};

export default SideNav;
