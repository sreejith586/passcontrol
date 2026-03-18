import { NoteRequiredModal } from '@/shared/ui/ActionModal/NoteRequiredModal';

interface ReopenModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  loading?: boolean;
  error?: string;
}

export function ReopenModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
}: ReopenModalProps) {
  return (
    <NoteRequiredModal
      open={open}
      onClose={onClose}
      title="Reopen alert"
      noteLabel="Reopen note (optional)"
      noteHint="Add a note explaining why the alert was reopened. Required by your organization's policy in some cases."
      confirmLabel="Reopen"
      onConfirm={onConfirm}
      loading={loading}
      error={error}
    />
  );
}
