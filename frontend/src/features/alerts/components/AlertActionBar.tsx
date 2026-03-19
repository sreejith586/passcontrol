import { useState } from 'react';
import type { AlertEvent } from '../types';
import { Button } from '@/shared/ui/Button';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { ResolveModal } from './ResolveModal';
import { ReopenModal } from './ReopenModal';
import { AssignModal } from './AssignModal';
import { toast } from '@/shared/feedback/useToast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
  reopenAlert,
  unassignAlert,
} from '../api';
import { queryKeys } from '../query-keys';
import { ApiError } from '@/core/api/errors';

interface AlertActionBarProps {
  alert: AlertEvent;
}

export function AlertActionBar({ alert }: AlertActionBarProps) {
  const queryClient = useQueryClient();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.detail(alert.id) });
    queryClient.invalidateQueries({ queryKey: ['alerts', 'list'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.activities(alert.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.comments(alert.id) });
  };

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeAlert(alert.id),
    onSuccess: () => {
      invalidate();
      toast.success('Alert acknowledged');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to acknowledge'),
  });

  const resolveMutation = useMutation({
    mutationFn: (note: string) => resolveAlert(alert.id, note || undefined),
    onSuccess: () => {
      setResolveOpen(false);
      setResolveError(null);
      invalidate();
      toast.success('Alert resolved');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to resolve';
      if (msg.toLowerCase().includes('note') || msg.toLowerCase().includes('required')) {
        setResolveError(msg);
      } else {
        toast.error(msg);
      }
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (note: string) => reopenAlert(alert.id, note || undefined),
    onSuccess: () => {
      setReopenOpen(false);
      setReopenError(null);
      invalidate();
      toast.success('Alert reopened');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to reopen';
      if (msg.toLowerCase().includes('note') || msg.toLowerCase().includes('required')) {
        setReopenError(msg);
      } else {
        toast.error(msg);
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToUserId: string) => assignAlert(alert.id, assignedToUserId),
    onSuccess: () => {
      setAssignOpen(false);
      setAssignError(null);
      invalidate();
      toast.success('Alert assigned');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to assign';
      setAssignError(msg);
      toast.error(msg);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () => unassignAlert(alert.id),
    onSuccess: () => {
      invalidate();
      toast.success('Alert unassigned');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to unassign'),
  });

  const canAcknowledge = alert.status === 'OPEN';
  const canResolve = alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED';
  const canReopen = alert.status === 'RESOLVED';
  const canAssign = alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED';

  return (
    <div className="flex flex-wrap gap-2">
      <PermissionGate permission="alert.acknowledge">
        <Button
          variant="primary"
          size="sm"
          onClick={() => acknowledgeMutation.mutate()}
          disabled={!canAcknowledge || acknowledgeMutation.isPending}
        >
          {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
        </Button>
      </PermissionGate>
      <PermissionGate permission="alert.resolve">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setResolveOpen(true)}
          disabled={!canResolve}
        >
          Resolve
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setReopenOpen(true)}
          disabled={!canReopen}
        >
          Reopen
        </Button>
      </PermissionGate>
      <PermissionGate permission="alert.assign">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAssignOpen(true)}
          disabled={!canAssign || assignMutation.isPending}
        >
          {alert.assignedToUserId ? 'Reassign' : 'Assign'}
        </Button>
        {alert.assignedToUserId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => unassignMutation.mutate()}
            disabled={!canAssign || unassignMutation.isPending}
          >
            Unassign
          </Button>
        )}
      </PermissionGate>

      <ResolveModal
        open={resolveOpen}
        onClose={() => {
          setResolveOpen(false);
          setResolveError(null);
        }}
        onConfirm={(note) => resolveMutation.mutate(note)}
        loading={resolveMutation.isPending}
        error={resolveError ?? undefined}
      />
      <ReopenModal
        open={reopenOpen}
        onClose={() => {
          setReopenOpen(false);
          setReopenError(null);
        }}
        onConfirm={(note) => reopenMutation.mutate(note)}
        loading={reopenMutation.isPending}
        error={reopenError ?? undefined}
      />
      <AssignModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setAssignError(null);
        }}
        onConfirm={(userId) => assignMutation.mutate(userId)}
        loading={assignMutation.isPending}
        error={assignError ?? undefined}
        isReassign={!!alert.assignedToUserId}
      />
    </div>
  );
}
