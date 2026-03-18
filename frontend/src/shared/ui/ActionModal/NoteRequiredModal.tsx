import { useState } from 'react';
import { ActionModal } from './ActionModal';
import { Textarea } from '../Textarea';

interface NoteRequiredModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  noteLabel: string;
  noteHint?: string;
  confirmLabel: string;
  onConfirm: (note: string) => void | Promise<void>;
  loading?: boolean;
  error?: string;
}

export function NoteRequiredModal({
  open,
  onClose,
  title,
  noteLabel,
  noteHint,
  confirmLabel,
  onConfirm,
  loading = false,
  error,
}: NoteRequiredModalProps) {
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = error ?? localError;

  return (
    <ActionModal
      open={open}
      onClose={() => {
        setNote('');
        setLocalError(null);
        onClose();
      }}
      title={title}
      confirmLabel={confirmLabel}
      onConfirm={async () => {
        setLocalError(null);
        await onConfirm(note.trim());
      }}
      loading={loading}
    >
      <div className="space-y-2">
        <Textarea
          label={noteLabel}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={displayError ?? undefined}
          placeholder={noteHint}
          rows={3}
        />
      </div>
    </ActionModal>
  );
}
