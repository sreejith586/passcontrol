import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/features/users/api';
import { queryKeys as usersQueryKeys } from '@/features/users/query-keys';
import { Spinner } from '@/shared/ui/Spinner';

const UNASSIGNED_ID = '__unassigned__' as const;

interface RunAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedToUserId: string | null) => void;
  loading?: boolean;
  error?: string;
  currentAssignedToUserId: string | null;
}

export function RunAssignmentModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
  currentAssignedToUserId,
}: RunAssignmentModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading: loadingUsers } = useQuery({
    queryKey: usersQueryKeys.users.list({ page: 1, limit: 100 }),
    queryFn: () => listUsers({ page: 1, limit: 100 }),
    enabled: open,
  });

  const users = data?.items ?? [];

  function handleClose() {
    setSelectedId(null);
    onClose();
  }

  function handleConfirm() {
    if (selectedId === UNASSIGNED_ID) {
      onConfirm(null);
    } else if (selectedId) {
      onConfirm(selectedId);
    }
  }

  const canConfirm = selectedId !== null && (selectedId === UNASSIGNED_ID || selectedId.length > 0);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={currentAssignedToUserId ? 'Reassign run' : 'Assign run'}
    >
      <div className="space-y-4">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <ul className="divide-y divide-border">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedId(UNASSIGNED_ID)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                    selectedId === UNASSIGNED_ID ? 'bg-primary/10' : ''
                  }`}
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      selectedId === UNASSIGNED_ID
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-500">Unassigned</div>
                    <div className="text-muted-foreground text-xs">
                      Clear assignment
                    </div>
                  </div>
                </button>
              </li>
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                      selectedId === user.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        selectedId === user.id
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canConfirm || loading || loadingUsers}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
