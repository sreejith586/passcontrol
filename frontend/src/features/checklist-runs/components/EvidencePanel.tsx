import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRunItemById, deleteAttachment } from '../api';
import { queryKeys } from '../query-keys';
import type { RunItemAttachment } from '../types';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/layout/EmptyState';
import { formatDateTime } from '@/lib/date';
import { toast } from '@/shared/feedback/useToast';
import { ApiError } from '@/core/api/errors';

interface EvidencePanelProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemLabel: string;
  runId: string;
  canDelete: boolean;
}

function AttachmentRow({
  attachment,
  canDelete,
  onDelete,
  isDeleting,
}: {
  attachment: RunItemAttachment;
  canDelete: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const fileName = attachment.fileName ?? 'Unknown file';
  const mimeType = attachment.mimeType ?? '—';

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {mimeType} · {formatDateTime(attachment.createdAt)}
        </p>
      </div>
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isDeleting}
          onClick={() => onDelete(attachment.id)}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      )}
    </div>
  );
}

export function EvidencePanel({
  open,
  onClose,
  itemId,
  itemLabel,
  runId,
  canDelete,
}: EvidencePanelProps) {
  const queryClient = useQueryClient();

  const itemQuery = useQuery({
    queryKey: queryKeys.runItemDetail(itemId),
    queryFn: () => getRunItemById(itemId),
    enabled: open && !!itemId,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onMutate: (attachmentId) => setDeletingId(attachmentId),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runItemDetail(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(runId) });
      toast.success('Attachment removed');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete attachment');
    },
  });

  const attachments = itemQuery.data?.attachments ?? [];
  const isLoading = itemQuery.isLoading;
  const isError = itemQuery.isError;

  return (
    <Modal open={open} onClose={onClose} title={`Evidence: ${itemLabel}`}>
      <div className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            {itemQuery.error instanceof Error
              ? itemQuery.error.message
              : 'Failed to load evidence'}
          </p>
        )}
        {!isLoading && !isError && attachments.length === 0 && (
          <EmptyState
            title="No evidence attached"
            description="There are no files attached to this item."
          />
        )}
        {!isLoading && !isError && attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((a) => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                canDelete={canDelete}
                onDelete={(id) => deleteMutation.mutate(id)}
                isDeleting={deletingId === a.id}
              />
            ))}
          </div>
        )}
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          File upload is not available in the current environment. Evidence can be
          attached through other means when configured.
        </p>
      </div>
    </Modal>
  );
}
