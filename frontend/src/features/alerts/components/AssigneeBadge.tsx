import { Badge } from '@/shared/ui/Badge';
import { cn } from '@/lib/cn';

interface AssigneeBadgeProps {
  assignedToUserId: string | null;
  assignedToUser?: { id: string; name: string } | null;
  className?: string;
}

export function AssigneeBadge({
  assignedToUserId,
  assignedToUser,
  className,
}: AssigneeBadgeProps) {
  const label = assignedToUserId
    ? assignedToUser?.name ?? 'Unknown user'
    : 'Unassigned';

  const variant = assignedToUserId ? 'default' : 'outline';

  return (
    <Badge
      variant={variant}
      className={cn(
        assignedToUserId && 'bg-muted/50 text-foreground',
        className
      )}
    >
      {label}
    </Badge>
  );
}
