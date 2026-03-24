import { SelfSignupForm } from './components/SelfSignupForm';

export function DemoSignupPage() {
  return (
    <SelfSignupForm
      signupMode="DEMO"
      title="Try PassControl"
      subtitle="Create a demo workspace to explore the platform, run sample checklists, and see how PassControl fits your operations."
      submitLabel="Create demo workspace"
    />
  );
}
