import { SelfSignupForm } from './components/SelfSignupForm';

export function OrganizationSignupPage() {
  return (
    <SelfSignupForm
      signupMode="STANDARD"
      title="Create your organization"
      subtitle="Set up a dedicated workspace for your team and operational compliance workflows. You’ll verify your email before inviting others."
      submitLabel="Create organization"
    />
  );
}
