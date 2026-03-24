import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { addUser, listRoles } from '../api';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';
import { RoleOptionRow } from '@/features/roles/RoleOptionRow';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ open, onClose, onSuccess }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: listRoles,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async ({
      email: e,
      roleIds,
    }: {
      email: string;
      roleIds: string[];
    }) => {
      let succeeded = 0;
      let failed = 0;
      let lastError: Error | null = null;
      let lastSetupToken: string | undefined;

      for (const roleId of roleIds) {
        try {
          const res = await addUser({ email: e, roleId });
          if (res.setupToken) lastSetupToken = res.setupToken;
          succeeded++;
        } catch (err) {
          failed++;
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (succeeded === 0 && lastError) {
        throw lastError;
      }

      return {
        succeeded,
        failed,
        total: roleIds.length,
        setupToken: lastSetupToken,
      };
    },
    onSuccess: (result, { roleIds }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

      if (result.setupToken) {
        const url = `${window.location.origin}/set-password?token=${encodeURIComponent(result.setupToken)}`;
        setSetupLink(url);
      } else {
        if (result.failed === 0) {
          toast.success(
            roleIds.length > 1
              ? `User added with ${roleIds.length} roles`
              : 'User added'
          );
        } else {
          toast.info(
            'User added, but some roles could not be assigned'
          );
        }
        onSuccess();
        setEmail('');
        setSelectedRoleIds(new Set());
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add user');
    },
  });

  function handleClose() {
    setEmail('');
    setSelectedRoleIds(new Set());
    setSetupLink(null);
    onClose();
  }

  async function copySetupLink() {
    if (!setupLink) return;
    try {
      await navigator.clipboard.writeText(setupLink);
      toast.success('Setup link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const roleIds = Array.from(selectedRoleIds);
    if (!email.trim() || roleIds.length === 0) return;
    mutation.mutate({ email: email.trim(), roleIds });
  }

  const hasSelection = selectedRoleIds.size > 0;

  if (setupLink) {
    return (
      <Modal open={open} onClose={handleClose} title="User added">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This user needs to set a password before they can sign in. Share this
            link with them. The link expires in 7 days.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={setupLink}
              className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
            />
            <Button type="button" variant="secondary" onClick={copySetupLink}>
              Copy link
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
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
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Roles
          </label>
          <p className="text-muted-foreground text-xs">
            Select one or more roles. User receives the combined permissions of
            all selected roles. If the user already exists in this organization,
            selected roles will be added to that user.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
            {loadingRoles ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Loading roles…
              </p>
            ) : (
              <ul className="space-y-1">
                {roles.map((r) => (
                  <li key={r.id}>
                    <RoleOptionRow
                      roleKey={r.key}
                      checked={selectedRoleIds.has(r.id)}
                      onCheckedChange={() => toggleRole(r.id)}
                      disabled={mutation.isPending}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          New users will receive a setup link to create their password. Share the
          link with them after adding.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              !email.trim() || !hasSelection || mutation.isPending || loadingRoles
            }
          >
            {mutation.isPending ? 'Adding...' : 'Add user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
