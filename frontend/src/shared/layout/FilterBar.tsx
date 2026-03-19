import type React from 'react';
import { cn } from '@/lib/cn';

const INPUT_CLASS =
  'h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3',
        className
      )}
    >
      {children}
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  'aria-label'?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        onChange(e.target.value)
      }
      className={INPUT_CLASS}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <option key={o.value || '__all__'} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface FilterCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function FilterCheckbox({
  checked,
  onChange,
  label,
  id,
}: FilterCheckboxProps) {
  const inputId = id ?? `filter-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.checked)
        }
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}

interface FilterInputProps {
  type?: 'text' | 'date';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
}

export function FilterInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
}: FilterInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value)
      }
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={INPUT_CLASS}
    />
  );
}
