'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Início', href: '/' },
  { label: 'Ranking', href: '/ranking' },
  { label: 'Como jogar a matchup?', href: '/matchups' },
];

export default function NavMenu() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal">
      <ul className="flex items-center gap-4 whitespace-nowrap">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'text-sm transition-colors hover:text-foreground',
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
