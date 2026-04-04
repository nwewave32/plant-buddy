'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Leaf, Calendar } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const tabs = [
  { href: '/', label: '홈', icon: Home },
  { href: '/plants', label: '식물', icon: Leaf },
  { href: '/calendar', label: '캘린더', icon: Calendar },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors',
                active
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
