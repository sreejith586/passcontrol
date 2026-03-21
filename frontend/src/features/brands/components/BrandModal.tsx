import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { createBrand, updateBrand } from '../api';
import type { Brand } from '../api';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';

interface BrandModalProps {
  open: boolean;
  onClose: () => void;
  brand?: Brand | null;
}

export function BrandModal({ open, onClose, brand }: BrandModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isEdit = !!brand;

  useEffect(() => {
    if (open) {
      setName(brand?.name ?? '');
      setError(null);
    }
  }, [open, brand]);

  const createMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Brand created');
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create brand');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string }) =>
      updateBrand(brand!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Brand updated');
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to update brand');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setError(null);
    if (isEdit) {
      updateMutation.mutate({ name: trimmed });
    } else {
      createMutation.mutate({ name: trimmed });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Brand' : 'Create Brand'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. PassControl Kitchen"
          error={error ?? undefined}
          autoFocus
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
