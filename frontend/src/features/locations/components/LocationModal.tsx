import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { createLocation, updateLocation } from '../api';
import { listBrands } from '@/features/brands/api';
import { queryKeys as brandQueryKeys } from '@/features/brands/query-keys';
import type { Location } from '../api';
import { queryKeys } from '../query-keys';
import { toast } from '@/shared/feedback/useToast';
import { TIMEZONES, getBrowserTimezone } from '@/lib/timezones';
import { TEMPERATURE_UNIT_OPTIONS } from '@/lib/temperature-units';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  location?: Location | null;
}

export function LocationModal({ open, onClose, location }: LocationModalProps) {
  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(getBrowserTimezone);
  const [temperatureUnit, setTemperatureUnit] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isEdit = !!location;

  const { data: brands = [] } = useQuery({
    queryKey: brandQueryKeys.list(),
    queryFn: listBrands,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setBrandId(location?.brandId ?? '');
      setName(location?.name ?? '');
      setTimezone(location?.timezone ?? getBrowserTimezone());
      setTemperatureUnit(location?.temperatureUnit ?? '');
      setError(null);
    }
  }, [open, location]);

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Location created');
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      brandId?: string;
      name?: string;
      timezone?: string;
      temperatureUnit?: 'F' | 'C' | null;
    }) => updateLocation(location!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Location updated');
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!brandId) {
      setError('Brand is required');
      return;
    }
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    if (!timezone.trim()) {
      setError('Timezone is required');
      return;
    }
    setError(null);
    const tempUnit = temperatureUnit === 'F' || temperatureUnit === 'C' ? temperatureUnit : null;
    if (isEdit) {
      updateMutation.mutate({
        brandId,
        name: trimmedName,
        timezone: timezone.trim(),
        temperatureUnit: tempUnit,
      });
    } else {
      createMutation.mutate({
        brandId,
        name: trimmedName,
        timezone: timezone.trim(),
        temperatureUnit: tempUnit ?? undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Location' : 'Create Location'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="location-brand"
            className="block text-sm font-medium text-foreground"
          >
            Brand
          </label>
          {brands.length === 0 && !isEdit && (
            <p className="text-sm text-amber-600">
              Create a brand first from the Brands page.
            </p>
          )}
          <select
            id="location-brand"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
            required
          >
            <option value="">Select a brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Downtown Branch"
        />
        <div className="space-y-1">
          <label
            htmlFor="location-timezone"
            className="block text-sm font-medium text-foreground"
          >
            Timezone
          </label>
          <select
            id="location-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
            required
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="location-temperature-unit"
            className="block text-sm font-medium text-foreground"
          >
            Temperature unit
          </label>
          <select
            id="location-temperature-unit"
            value={temperatureUnit}
            onChange={(e) => setTemperatureUnit(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <option value="">Use organization default</option>
            {TEMPERATURE_UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
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
