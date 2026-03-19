import { Button } from '@/shared/ui/Button';

interface BooleanItemInputProps {
  itemId: string;
  label: string;
  result: string | null;
  disabled?: boolean;
  onUpdate: (itemId: string, data: { result: string }) => void;
  isUpdating?: boolean;
}

export function BooleanItemInput({
  itemId,
  result,
  disabled,
  onUpdate,
  isUpdating,
}: BooleanItemInputProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={result === 'PASS' ? 'primary' : 'secondary'}
        size="sm"
        disabled={disabled || isUpdating}
        onClick={() => onUpdate(itemId, { result: 'PASS' })}
      >
        Pass
      </Button>
      <Button
        type="button"
        variant={result === 'FAIL' ? 'danger' : 'secondary'}
        size="sm"
        disabled={disabled || isUpdating}
        onClick={() => onUpdate(itemId, { result: 'FAIL' })}
      >
        Fail
      </Button>
    </div>
  );
}
