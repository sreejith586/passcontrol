import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useState, useEffect } from 'react';
import { Input } from '@/shared/ui/Input';

interface TemperatureItemInputProps {
  itemId: string;
  label: string;
  valueJson: Record<string, unknown> | null;
  configSnapshotJson: Record<string, unknown> | null;
  /** Resolved regional temperature unit when item config does not specify */
  temperatureUnitFallback?: string;
  disabled?: boolean;
  onUpdate: (itemId: string, data: { valueJson: Record<string, unknown> }) => void;
  isUpdating?: boolean;
}

export function TemperatureItemInput({
  itemId,
  valueJson,
  configSnapshotJson,
  temperatureUnitFallback = 'F',
  disabled,
  onUpdate,
  isUpdating,
}: TemperatureItemInputProps) {
  const configUnit = configSnapshotJson?.unit as string | undefined;
  const unit = configUnit ?? (temperatureUnitFallback === 'C' ? '°C' : '°F');
  const rawValue = valueJson?.value;
  const initialValue = typeof rawValue === 'number' ? String(rawValue) : '';
  const [localValue, setLocalValue] = useState(initialValue);
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const trimmed = (e.target.value ?? '').trim();
      if (trimmed === '') return;
      const num = parseFloat(trimmed);
      if (Number.isNaN(num)) return;
      const serverNum =
        typeof rawValue === 'number'
          ? rawValue
          : parseFloat(String(rawValue ?? ''));
      if (!Number.isNaN(serverNum) && num === serverNum) return;
      onUpdate(itemId, { valueJson: { value: num, unit } });
    },
    [itemId, rawValue, unit, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
      }
    },
    []
  );

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.1"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled || isUpdating}
        placeholder={`Enter temperature (${unit})`}
        className="max-w-[140px]"
      />
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
  );
}
