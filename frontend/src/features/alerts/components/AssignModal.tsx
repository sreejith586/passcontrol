import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/features/users/api';
import { queryKeys as usersQueryKeys } from '@/features/users/query-keys';
import type { UserForAssignment } from '@/features/users/api';
import { Spinner } from '@/shared/ui/Spinner';

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedToUserId: string) => void;
  loading?: boolean;
  error?: string;
  isReassign?: boolean;
}

export function AssignModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
  isReassign = false,
}: AssignModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading: loadingUsers } = useQuery({
    queryKey: usersQueryKeys.users.list({ page: 1, limit: 100 }),
    queryFn: () => listUsers({ page: 1, limit: 100 }),
    enabled: open,
  });

  const users = data?.items ?? [];
  const isEmpty = !loadingUsers && users.length === 0;

  function handleClose() {
    setSelectedId(null);
    onClose();
  }

  function handleConfirm() {
    if (selectedId) {
      onConfirm(selectedId);
      // Parent closes modal on mutation success
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={isReassign ? 'Reassign alert' : 'Assign alert'}>
      <div className="space-y-4">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : isEmpty ? (
          <p className="text-muted-foreground py-4 text-sm">
            No users available for assignment in this organization.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <ul className="divide-y divide-border">
              {users.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  selected={selectedId === user.id}
                  onSelect={() => setSelectedId(user.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedId || loading || isEmpty}
          >
            {loading ? 'Assigning...' : isReassign ? 'Reassign' : 'Assign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function UserListItem({
  user,
  selected,
  onSelect,
}: {
  user: UserForAssignment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
          selected ? 'bg-primary/10' : ''
        }`}
      >
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 ${
            selected ? 'border-primary bg-primary' : 'border-border'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{user.name}</div>
          <div className="text-muted-foreground truncate text-xs">{user.email}</div>
        </div>
      </button>
    </li>
  );
}
