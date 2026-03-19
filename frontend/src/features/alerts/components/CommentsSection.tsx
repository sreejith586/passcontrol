import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AlertEventComment } from '../types';
import { addComment } from '../api';
import { formatDateTime } from '@/lib/date';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { Badge } from '@/shared/ui/Badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';
import { EmptyState } from '@/shared/layout/EmptyState';
import { cn } from '@/lib/cn';

const schema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(4000),
});

type FormData = z.infer<typeof schema>;

interface CommentsSectionProps {
  alertId: string;
  comments: AlertEventComment[];
}

const COMMENT_TYPE_LABELS: Record<string, string> = {
  COMMENT: 'Comment',
  RESOLUTION_NOTE: 'Resolution note',
  REOPEN_NOTE: 'Reopen note',
};

const SECTION_CLASS = 'rounded-lg border border-border bg-muted/30 p-4';

export function CommentsSection({ alertId, comments }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const addMutation = useMutation({
    mutationFn: (data: FormData) =>
      addComment(alertId, 'COMMENT', data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.comments(alertId) });
      reset();
      toast.success('Comment added');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add comment'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { body: '' },
  });

  return (
    <div className={cn(SECTION_CLASS, 'space-y-4')}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Comments</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Add comment'}
        </Button>
      </div>
      {expanded && (
        <form
          onSubmit={handleSubmit((data) => addMutation.mutate(data))}
          className="space-y-2"
        >
          <Textarea
            label="Comment"
            {...register('body')}
            error={errors.body?.message}
            rows={3}
          />
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Adding...' : 'Add comment'}
          </Button>
        </form>
      )}
      <ul className="space-y-4">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-md border border-border bg-background/50 p-4 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {COMMENT_TYPE_LABELS[c.type] ?? c.type}
              </Badge>
              {c.authorUserId && (
                <span className="text-muted-foreground">User</span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(c.createdAt)}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-foreground">{c.body}</p>
          </li>
        ))}
      </ul>
      {comments.length === 0 && !expanded && (
        <EmptyState
          title="No comments yet"
          description="Add a comment to document context or follow-up."
          className="p-6"
        />
      )}
    </div>
  );
}
