'use client';

import Link from 'next/link';
import { Settings, Sprout } from 'lucide-react';
import { SeasonBadge } from '@/entities/season';
import { getCurrentSeason } from '@/shared/lib/season';

export function Header() {
  const season = getCurrentSeason();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Sprout className="size-5 text-green-600" />
          <span>Plant Buddy</span>
        </Link>

        <div className="flex items-center gap-2">
          <SeasonBadge season={season} />
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors"
          >
            <Settings className="size-5" />
            <span className="sr-only">설정</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
