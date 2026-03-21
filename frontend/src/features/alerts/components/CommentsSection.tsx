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
import { Card } from '@/shared/ui/Card';

const schema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(4000),
});

type FormData = z.infer<typeof schema>;

type CommentCreateType = 'COMMENT' | 'RESOLUTION_NOTE';

interface CommentsSectionProps {
  alertId: string;
  comments: AlertEventComment[];
}

const COMMENT_TYPE_LABELS: Record<string, string> = {
  COMMENT: 'Comment',
  RESOLUTION_NOTE: 'Resolution note',
  REOPEN_NOTE: 'Reopen note',
};

const CREATE_TYPE_OPTIONS: { value: CommentCreateType; label: string }[] = [
  { value: 'COMMENT', label: 'Comment' },
  { value: 'RESOLUTION_NOTE', label: 'Resolution note' },
];

function CommentTypeBadge({ type }: { type: string }) {
  const label = COMMENT_TYPE_LABELS[type] ?? type;
  const isClosureNote = type === 'RESOLUTION_NOTE' || type === 'REOPEN_NOTE';
  return (
    <Badge
      variant={isClosureNote ? 'default' : 'outline'}
      className="text-xs"
    >
      {label}
    </Badge>
  );
}

export function CommentsSection({ alertId, comments }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [createType, setCreateType] = useState<CommentCreateType>('COMMENT');

  const addMutation = useMutation({
    mutationFn: ({
      data,
      type,
    }: {
      data: FormData;
      type: CommentCreateType;
    }) => addComment(alertId, type, data.body),
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.comments(alertId) });
      reset();
      toast.success(type === 'RESOLUTION_NOTE' ? 'Resolution note added' : 'Comment added');
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
    <Card variant="soft" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Comments</h3>
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
          onSubmit={handleSubmit((data) => addMutation.mutate({ data, type: createType }))}
          className="space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value as CommentCreateType)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              aria-label="Comment type"
            >
              {CREATE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label={createType === 'RESOLUTION_NOTE' ? 'Resolution note' : 'Comment'}
            {...register('body')}
            error={errors.body?.message}
            rows={3}
          />
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Adding...' : createType === 'RESOLUTION_NOTE' ? 'Add resolution note' : 'Add comment'}
          </Button>
        </form>
      )}
      <ul className="space-y-4">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <CommentTypeBadge type={c.type} />
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
    </Card>
  );
}
