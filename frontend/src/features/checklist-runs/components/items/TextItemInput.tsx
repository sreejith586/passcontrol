import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useState, useEffect } from 'react';
import { Input } from '@/shared/ui/Input';

interface TextItemInputProps {
  itemId: string;
  label: string;
  valueJson: Record<string, unknown> | null;
  disabled?: boolean;
  onUpdate: (itemId: string, data: { valueJson: Record<string, unknown> }) => void;
  isUpdating?: boolean;
}

export function TextItemInput({
  itemId,
  valueJson,
  disabled,
  onUpdate,
  isUpdating,
}: TextItemInputProps) {
  const value = (valueJson?.value as string) ?? '';
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const trimmed = (e.target.value ?? '').trim();
      const prev = String((valueJson?.value as string) ?? '').trim();
      if (trimmed !== prev) {
        onUpdate(itemId, { valueJson: { value: trimmed } });
      }
    },
    [itemId, valueJson?.value, onUpdate]
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
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled || isUpdating}
      placeholder="Enter value..."
      className="max-w-md"
    />
  );
}
