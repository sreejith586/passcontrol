import { ActionModal } from './ActionModal';

interface ConfirmActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  variant?: 'primary' | 'danger';
}

export function ConfirmActionModal({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  variant = 'primary',
}: ConfirmActionModalProps) {
  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title={title}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      loading={loading}
      variant={variant}
    >
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </ActionModal>
  );
}
