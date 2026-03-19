import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { addUser, listRoles } from '../api';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';

const INPUT_CLASS =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ open, onClose, onSuccess }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: listRoles,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: addUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('User added');
      onSuccess();
      setEmail('');
      setRoleId('');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add user');
    },
  });

  function handleClose() {
    setEmail('');
    setRoleId('');
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !roleId) return;
    mutation.mutate({ email: email.trim(), roleId });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add user">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
          disabled={mutation.isPending}
        />
        <div className="space-y-1">
          <label htmlFor="role" className="block text-sm font-medium text-foreground">
            Role
          </label>
          <select
            id="role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className={INPUT_CLASS}
            required
            disabled={mutation.isPending || loadingRoles}
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted-foreground text-xs">
          Login setup for newly added users will be enabled in a later phase.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!email.trim() || !roleId || mutation.isPending || loadingRoles}
          >
            {mutation.isPending ? 'Adding...' : 'Add user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
