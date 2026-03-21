import { useQuery } from '@tanstack/react-query';
import { listBrands } from '@/features/brands/api';
import { listLocations } from '@/features/locations/api';
import { listZones } from '@/features/zones/api';
import { queryKeys as brandQueryKeys } from '@/features/brands/query-keys';
import { queryKeys as locationQueryKeys } from '@/features/locations/query-keys';
import { queryKeys as zoneQueryKeys } from '@/features/zones/query-keys';

export interface ScopeValue {
  brandId: string;
  locationId: string;
  zoneId: string;
}

interface ScopeSelectorsProps {
  brandId: string;
  locationId: string;
  zoneId: string;
  onChange: (scope: ScopeValue) => void;
  disabled?: boolean;
}

const EMPTY = '';

export function ScopeSelectors({
  brandId,
  locationId,
  zoneId,
  onChange,
  disabled = false,
}: ScopeSelectorsProps) {
  const { data: brands = [] } = useQuery({
    queryKey: brandQueryKeys.list(),
    queryFn: listBrands,
  });

  const { data: locations = [] } = useQuery({
    queryKey: locationQueryKeys.list(),
    queryFn: () => listLocations(),
  });

  const { data: zones = [] } = useQuery({
    queryKey: zoneQueryKeys.list(),
    queryFn: () => listZones(),
  });

  const filteredLocations = brandId
    ? locations.filter((l) => l.brandId === brandId)
    : [];
  const filteredZones = locationId
    ? zones.filter((z) => z.locationId === locationId)
    : [];

  const handleBrandChange = (v: string) => {
    const newBrandId = v || EMPTY;
    let newLocationId = locationId;
    let newZoneId = zoneId;
    if (newBrandId && locationId) {
      const loc = locations.find((l) => l.id === locationId);
      if (!loc || loc.brandId !== newBrandId) {
        newLocationId = EMPTY;
        newZoneId = EMPTY;
      }
    } else if (!newBrandId) {
      newLocationId = EMPTY;
      newZoneId = EMPTY;
    }
    if (newLocationId && newZoneId) {
      const zone = zones.find((z) => z.id === newZoneId);
      if (!zone || zone.locationId !== newLocationId) newZoneId = EMPTY;
    }
    onChange({ brandId: newBrandId, locationId: newLocationId, zoneId: newZoneId });
  };

  const handleLocationChange = (v: string) => {
    const newLocationId = v || EMPTY;
    let newZoneId = zoneId;
    if (newLocationId && zoneId) {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone || zone.locationId !== newLocationId) newZoneId = EMPTY;
    } else if (!newLocationId) {
      newZoneId = EMPTY;
    }
    onChange({ brandId, locationId: newLocationId, zoneId: newZoneId });
  };

  const handleZoneChange = (v: string) => {
    onChange({ brandId, locationId, zoneId: v || EMPTY });
  };

  const locationDisabled = !brandId || disabled;
  const zoneDisabled = !locationId || disabled;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Leave blank to make this available organization-wide.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="scope-brand"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Brand (optional)
          </label>
          <select
            id="scope-brand"
            value={brandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <option value="">None</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="scope-location"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Location (optional)
          </label>
          <select
            id="scope-location"
            value={locationId}
            onChange={(e) => handleLocationChange(e.target.value)}
            disabled={locationDisabled}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <option value="">None</option>
            {filteredLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {brandId && filteredLocations.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No locations for this brand</p>
          )}
        </div>

        <div>
          <label
            htmlFor="scope-zone"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Zone (optional)
          </label>
          <select
            id="scope-zone"
            value={zoneId}
            onChange={(e) => handleZoneChange(e.target.value)}
            disabled={zoneDisabled}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <option value="">None</option>
            {filteredZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          {locationId && filteredZones.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No zones for this location</p>
          )}
        </div>
      </div>
    </div>
  );
}
