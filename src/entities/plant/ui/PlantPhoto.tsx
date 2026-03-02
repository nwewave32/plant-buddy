import Image from 'next/image';
import { Sprout } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface PlantPhotoProps {
  photoUrl: string | null;
  plantName: string;
  className?: string;
}

export function PlantPhoto({ photoUrl, plantName, className }: PlantPhotoProps) {
  if (photoUrl) {
    return (
      <div className={cn('relative overflow-hidden rounded-md', className)}>
        <Image
          src={photoUrl}
          alt={plantName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-muted',
        className,
      )}
    >
      <Sprout className="size-8 text-muted-foreground" />
    </div>
  );
}
