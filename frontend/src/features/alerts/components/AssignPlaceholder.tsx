import { Button } from '@/shared/ui/Button';

/**
 * Placeholder for Assign action. User list API (GET /users or /organization-members)
 * does not exist. Assign is disabled until backend provides it.
 * Integration point: replace with AssignModal + listUsersForAssignment() when API exists.
 */
export function AssignPlaceholder() {
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled
      title="Assign requires a user list API (GET /users). Coming soon."
    >
      Assign (coming soon)
    </Button>
  );
}
