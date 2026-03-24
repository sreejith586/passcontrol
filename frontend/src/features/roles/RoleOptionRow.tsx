import { getRoleMetadata } from './role-metadata';

interface RoleOptionRowProps {
  roleKey: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: () => void;
}

/**
 * Checkbox row for invite / edit-roles: display name, description, capability hints.
 */
export function RoleOptionRow({
  roleKey,
  checked,
  disabled,
  onCheckedChange,
}: RoleOptionRowProps) {
  const meta = getRoleMetadata(roleKey);

  return (
    <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-2 text-sm hover:bg-muted/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onCheckedChange}
        disabled={disabled}
        className="mt-1 h-4 w-4 shrink-0 rounded border-border"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">{meta.displayName}</span>
          {meta.scopeLabel === 'Platform' && (
            <span className="text-xs text-muted-foreground">({meta.scopeLabel})</span>
          )}
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{meta.description}</p>
        <p className="text-xs leading-snug text-muted-foreground">
          {meta.capabilityHints.map((h, i) => (
            <span key={`${i}-${h}`}>
              {i > 0 && <span className="text-border"> · </span>}
              {h}
            </span>
          ))}
        </p>
      </div>
    </label>
  );
}
