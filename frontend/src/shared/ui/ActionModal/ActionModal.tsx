import { Modal } from '../Modal';
import { Button } from '../Button';

interface ActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  variant?: 'primary' | 'danger';
}

export function ActionModal({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  loading = false,
  variant = 'primary',
}: ActionModalProps) {
  async function handleConfirm() {
    await onConfirm();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {children}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
