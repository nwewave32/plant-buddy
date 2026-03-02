import { cn } from '@/shared/lib/utils';

const SIZE_CLASSES = {
  sm: 'size-6 text-xs',
  md: 'size-8 text-sm',
  lg: 'size-10 text-base',
} as const;

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ name, size = 'md', className }: UserAvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {name.charAt(0)}
    </div>
  );
}
