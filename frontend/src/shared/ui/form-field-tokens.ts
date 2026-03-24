/**
 * Shared form control styling — keep Input, Textarea, PasswordInput, NativeSelect,
 * and FilterBar filter fields visually aligned without duplicating long class strings.
 */
export const FORM_FIELD_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

export const FORM_FIELD_DISABLED =
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Standard text field surface — explicit white so it never tracks a mismatched `background` token. */
export const FORM_CONTROL_SURFACE =
  'rounded-md border border-border bg-white';

/** Default height for full form fields (matches Input). */
export const FORM_CONTROL_HEIGHT = 'h-10 min-h-[2.5rem]';

/** Compact height for toolbars / filter rows (matches filter NativeSelect). */
export const FILTER_CONTROL_HEIGHT = 'h-9 min-h-[2.25rem]';

export const FORM_HELPER = 'text-sm text-muted-foreground';

export const FORM_ERROR = 'text-sm text-destructive';
