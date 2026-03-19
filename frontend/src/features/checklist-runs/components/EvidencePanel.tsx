import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRunItemById, deleteAttachment, uploadEvidence } from '../api';
import { queryKeys } from '../query-keys';
import type { RunItemAttachment } from '../types';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/layout/EmptyState';
import { formatDateTime } from '@/lib/date';
import { toast } from '@/shared/feedback/useToast';
import { ApiError } from '@/core/api/errors';
import { getBlob } from '@/core/api/client';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const VIEWABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 50;

interface EvidencePanelProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemLabel: string;
  runId: string;
  canDelete: boolean;
  canUpload: boolean;
}

function AttachmentRow({
  attachment,
  canDelete,
  canView,
  onDelete,
  onView,
  isDeleting,
  isViewing,
}: {
  attachment: RunItemAttachment;
  canDelete: boolean;
  canView: boolean;
  onDelete: (id: string) => void;
  onView: (fileId: string) => void;
  isDeleting: boolean;
  isViewing: boolean;
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
      <div className="flex shrink-0 items-center gap-2">
        {canView && (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10 hover:text-primary"
            disabled={isViewing}
            onClick={() => onView(attachment.fileId)}
          >
            {isViewing ? (
              <>
                <Spinner size="sm" className="mr-1 h-3 w-3" />
                Opening...
              </>
            ) : (
              'View'
            )}
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isDeleting}
            onClick={() => onDelete(attachment.id)}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>
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
  canUpload,
}: EvidencePanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemQuery = useQuery({
    queryKey: queryKeys.runItemDetail(itemId),
    queryFn: () => getRunItemById(itemId),
    enabled: open && !!itemId,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleView(fileId: string) {
    setViewingFileId(fileId);
    try {
      const blob = await getBlob(`/files/${fileId}/content`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to open file');
    } finally {
      setViewingFileId(null);
    }
  }

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

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadEvidence(itemId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runItemDetail(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(runId) });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Evidence uploaded');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const allowed = ACCEPTED_TYPES.split(',').includes(file.type);
    if (!allowed) {
      toast.error('Unsupported file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }
    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }

  const attachments = itemQuery.data?.attachments ?? [];
  const isLoading = itemQuery.isLoading;
  const isError = itemQuery.isError;
  const isUploading = uploadMutation.isPending;

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
                canView={
                  !!a.mimeType && VIEWABLE_IMAGE_TYPES.includes(a.mimeType)
                }
                onDelete={(id) => deleteMutation.mutate(id)}
                onView={handleView}
                isDeleting={deletingId === a.id}
                isViewing={viewingFileId === a.fileId}
              />
            ))}
          </div>
        )}
        {canUpload && (
          <div className="border-t border-border pt-3 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="hidden"
              aria-hidden
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Choose file
              </Button>
              {selectedFile && (
                <>
                  <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                    {selectedFile.name}
                  </span>
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Spinner size="sm" className="mr-1.5 h-3.5 w-3.5" />
                        Uploading...
                      </>
                    ) : (
                      'Upload evidence'
                    )}
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF. Max {MAX_SIZE_MB} MB.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
