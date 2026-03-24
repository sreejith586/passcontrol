import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  FORM_CONTROL_HEIGHT,
  FORM_CONTROL_SURFACE,
  FORM_FIELD_DISABLED,
  FORM_FIELD_FOCUS,
  FORM_ERROR,
} from './form-field-tokens';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

/**
 * Password field with visibility toggle (for signup / auth flows).
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, id, autoComplete = 'new-password', ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-') ?? `pwd-${reactId}`;
    const [visible, setVisible] = useState(false);

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            className={cn(
              'flex w-full py-2 pl-3 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground',
              FORM_CONTROL_SURFACE,
              FORM_CONTROL_HEIGHT,
              FORM_FIELD_FOCUS,
              FORM_FIELD_DISABLED,
              error && 'border-destructive',
              className
            )}
            {...props}
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        {error && (
          <p className={FORM_ERROR} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
