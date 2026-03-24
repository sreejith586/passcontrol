import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import {
  FORM_CONTROL_SURFACE,
  FORM_FIELD_DISABLED,
  FORM_FIELD_FOCUS,
  FORM_ERROR,
} from './form-field-tokens';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'flex min-h-[80px] w-full px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground',
            FORM_CONTROL_SURFACE,
            FORM_FIELD_FOCUS,
            FORM_FIELD_DISABLED,
            error && 'border-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <p className={FORM_ERROR} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
