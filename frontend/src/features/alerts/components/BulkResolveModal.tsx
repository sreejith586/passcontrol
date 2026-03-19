import { NoteRequiredModal } from '@/shared/ui/ActionModal/NoteRequiredModal';

interface BulkResolveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  loading?: boolean;
  error?: string;
  eligibleCount: number;
}

export function BulkResolveModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
  eligibleCount,
}: BulkResolveModalProps) {
  return (
    <NoteRequiredModal
      open={open}
      onClose={onClose}
      title="Bulk resolve alerts"
      noteLabel="Resolution note (optional)"
      noteHint={`Resolving ${eligibleCount} alert(s). Add a note if required by your organization's policy.`}
      confirmLabel="Resolve"
      onConfirm={onConfirm}
      loading={loading}
      error={error}
    />
  );
}
