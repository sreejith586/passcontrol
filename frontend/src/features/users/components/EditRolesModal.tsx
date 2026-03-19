import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { addUserRole, listRoles, removeUserRole } from '../api';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';
import { getRoleMetadata } from '@/features/roles/role-metadata';
import type { UserForAssignment, UserRole } from '../api';

interface EditRolesModalProps {
  open: boolean;
  onClose: () => void;
  user: UserForAssignment | null;
  onSuccess: () => void;
}

export function EditRolesModal({
  open,
  onClose,
  user,
  onSuccess,
}: EditRolesModalProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: listRoles,
    enabled: open,
  });

  useEffect(() => {
    if (user?.roles) {
      setSelectedRoleIds(new Set(user.roles.map((r) => r.id)));
    } else {
      setSelectedRoleIds(new Set());
    }
  }, [user, open]);

  const mutation = useMutation({
    mutationFn: async ({
      userId,
      originalRoleIds,
      targetRoleIds,
    }: {
      userId: string;
      originalRoleIds: string[];
      targetRoleIds: string[];
    }) => {
      const toAdd = targetRoleIds.filter((id) => !originalRoleIds.includes(id));
      const toRemove = originalRoleIds.filter((id) => !targetRoleIds.includes(id));

      let addSucceeded = 0;
      let addFailed = 0;
      let removeSucceeded = 0;
      let removeFailed = 0;
      let lastError: Error | null = null;

      for (const roleId of toAdd) {
        try {
          await addUserRole(userId, roleId);
          addSucceeded++;
        } catch (err) {
          addFailed++;
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      for (const roleId of toRemove) {
        try {
          await removeUserRole(userId, roleId);
          removeSucceeded++;
        } catch (err) {
          removeFailed++;
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      const anySuccess = addSucceeded > 0 || removeSucceeded > 0;
      const anyFailure = addFailed > 0 || removeFailed > 0;

      if (!anySuccess && lastError) {
        throw lastError;
      }

      return {
        addSucceeded,
        addFailed,
        removeSucceeded,
        removeFailed,
        anySuccess,
        anyFailure,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

      if (!result.anyFailure) {
        toast.success('Roles updated');
      } else {
        toast.info('Roles partially updated. Some changes could not be applied.');
      }

      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update roles');
    },
  });

  function handleClose() {
    if (!mutation.isPending) {
      onClose();
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
    if (!user) return;

    const originalRoleIds = (user.roles ?? []).map((r: UserRole) => r.id);
    const targetRoleIds = Array.from(selectedRoleIds);

    if (
      originalRoleIds.length === targetRoleIds.length &&
      originalRoleIds.every((id) => targetRoleIds.includes(id)) &&
      targetRoleIds.every((id) => originalRoleIds.includes(id))
    ) {
      onClose();
      return;
    }

    mutation.mutate({
      userId: user.id,
      originalRoleIds,
      targetRoleIds,
    });
  }

  if (!user) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Edit roles">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm">
          <p className="font-medium text-foreground">{user.name}</p>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Roles
          </label>
          <p className="text-muted-foreground text-xs">
            Select the roles this user should have. Changes are applied when you
            save.
          </p>
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
            {loadingRoles ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Loading roles…
              </p>
            ) : (
              <ul className="space-y-1">
                {roles.map((r) => {
                  const meta = getRoleMetadata(r.key);
                  return (
                    <li key={r.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.has(r.id)}
                          onChange={() => toggleRole(r.id)}
                          disabled={mutation.isPending}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span className="font-medium">{meta.displayName}</span>
                        <span className="text-muted-foreground text-xs">
                          {meta.intendedUserType}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
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
            disabled={mutation.isPending || loadingRoles}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
