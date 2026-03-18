import { NoteRequiredModal } from '@/shared/ui/ActionModal/NoteRequiredModal';

interface ResolveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  loading?: boolean;
  error?: string;
}

export function ResolveModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
}: ResolveModalProps) {
  return (
    <NoteRequiredModal
      open={open}
      onClose={onClose}
      title="Resolve alert"
      noteLabel="Resolution note (optional)"
      noteHint="Add a note explaining how the alert was resolved. Required by your organization's policy in some cases."
      confirmLabel="Resolve"
      onConfirm={onConfirm}
      loading={loading}
      error={error}
    />
  );
}
