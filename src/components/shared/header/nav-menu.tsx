'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '../../ui/navigation-menu';

const navItems = [
  { label: 'Ranking', href: '/ranking' },
  { label: 'Dá duo?', href: '/' },
  { label: 'Dados estatísticos', href: '/' },
];

export default function NavMenu() {
  const pathname = usePathname();

  return (
    <NavigationMenu aria-label="Navegação principal">
      <NavigationMenuList className="gap-4">
        {navItems.map((item) => {
          const isActive = item.href !== '/' && pathname === item.href;
          return (
            <NavigationMenuItem key={item.label}>
              <NavigationMenuLink
                asChild
                active={isActive}
                className={navigationMenuTriggerStyle()}
              >
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
