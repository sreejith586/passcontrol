import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { NativeSelect } from '@/shared/ui/NativeSelect';
import { createZone, updateZone } from '../api';
import { listLocations } from '@/features/locations/api';
import { queryKeys as locationQueryKeys } from '@/features/locations/query-keys';
import type { Zone } from '../api';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';

interface ZoneModalProps {
  open: boolean;
  onClose: () => void;
  zone?: Zone | null;
}

export function ZoneModal({ open, onClose, zone }: ZoneModalProps) {
  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isEdit = !!zone;

  const { data: locations = [] } = useQuery({
    queryKey: locationQueryKeys.list(),
    queryFn: () => listLocations(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setLocationId(zone?.locationId ?? '');
      setName(zone?.name ?? '');
      setError(null);
    }
  }, [open, zone]);

  const createMutation = useMutation({
    mutationFn: createZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Zone created');
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create zone');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { locationId?: string; name?: string }) =>
      updateZone(zone!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Zone updated');
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to update zone');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!locationId) {
      setError('Location is required');
      return;
    }
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    setError(null);
    if (isEdit) {
      updateMutation.mutate({
        locationId,
        name: trimmedName,
      });
    } else {
      createMutation.mutate({
        locationId,
        name: trimmedName,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Zone' : 'Create Zone'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="zone-location"
            className="block text-sm font-medium text-foreground"
          >
            Location
          </label>
          {locations.length === 0 && !isEdit && (
            <p className="text-sm text-amber-600">
              Create a location first from the Locations page.
            </p>
          )}
          <NativeSelect
            id="zone-location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="">Select a location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.brand?.name ? `(${loc.brand.name})` : ''}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Prep, Cold Storage"
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
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
