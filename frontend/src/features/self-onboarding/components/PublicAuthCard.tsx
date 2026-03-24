import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PublicAuthCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Centered public auth surface (no app shell): matches Login / Set password layout tone.
 */
export function PublicAuthCard({ children, className }: PublicAuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div
        className={cn(
          'w-full max-w-lg rounded-lg border border-border bg-background p-8 shadow-sm',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
