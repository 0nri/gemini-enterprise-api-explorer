import { cn } from '@/lib/cn';

export type BadgeVariant = 'blue' | 'purple' | 'teal' | 'green' | 'gray' | 'amber' | 'red';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  teal: 'bg-teal-100 text-teal-800',
  green: 'bg-green-100 text-green-800',
  gray: 'bg-gray-100 text-gray-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/** Small rounded label for API version tags, status tags, and similar metadata. */
export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-normal px-2 py-1 rounded whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
