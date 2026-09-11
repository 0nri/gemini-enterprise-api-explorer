import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard surface for grouped content: white background, subtle border, soft shadow. */
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm p-6', className)}>
      {children}
    </div>
  );
}
