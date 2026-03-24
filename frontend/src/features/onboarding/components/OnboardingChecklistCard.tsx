import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';
import type { FirstRunStatusResponse } from '../api';

export function deriveFirstRunStepsComplete(data: FirstRunStatusResponse) {
  return {
    hasTemplate: data.templateCount > 0,
    hasSchedule: data.scheduleCount > 0,
    hasInvite: data.orgMemberCount > 1,
    hasRun: data.checklistRunCount > 0,
  };
}

export function isFirstRunFullyComplete(data: FirstRunStatusResponse): boolean {
  const s = deriveFirstRunStepsComplete(data);
  return s.hasTemplate && s.hasSchedule && s.hasInvite && s.hasRun;
}

interface OnboardingChecklistCardProps {
  status: FirstRunStatusResponse;
}

const steps = [
  {
    key: 'template',
    label: 'Create your first checklist template',
    href: '/checklist-templates',
    complete: (d: FirstRunStatusResponse) => d.templateCount > 0,
  },
  {
    key: 'schedule',
    label: 'Set up your first schedule',
    href: '/checklist-schedules',
    complete: (d: FirstRunStatusResponse) => d.scheduleCount > 0,
  },
  {
    key: 'invite',
    label: 'Invite your team',
    href: '/settings/users',
    complete: (d: FirstRunStatusResponse) => d.orgMemberCount > 1,
  },
  {
    key: 'run',
    label: 'Complete your first checklist run',
    href: '/checklist-runs',
    complete: (d: FirstRunStatusResponse) => d.checklistRunCount > 0,
  },
] as const;

export function OnboardingChecklistCard({ status }: OnboardingChecklistCardProps) {
  const navigate = useNavigate();
  const emailVerified = status.emailVerifiedAt != null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200/80 bg-gradient-to-b from-sky-50/90 to-background px-5 py-4 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Welcome to PassControl 👋
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Set up your workspace to start managing operational checklists across your team.
        </p>
      </div>

      <Card variant="soft" className="border-2 border-sky-200/60 bg-sky-50/40 p-6">
        <h3 className="text-base font-semibold text-slate-900">
          Get started with PassControl
        </h3>
        <ol className="mt-5 list-none space-y-0 divide-y divide-slate-200/80">
          {steps.map((step, index) => {
            const done = step.complete(status);
            const isInvite = step.key === 'invite';
            const inviteBlocked = isInvite && !done && !emailVerified;

            return (
              <li
                key={step.key}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 shrink-0" aria-hidden>
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" strokeWidth={2} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium leading-snug',
                        done ? 'text-slate-500 line-through' : 'text-slate-900'
                      )}
                    >
                      <span className="mr-2 font-normal text-slate-400">{index + 1}.</span>
                      {step.label}
                    </span>
                    {inviteBlocked && (
                      <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-200/90">
                        Verify your email before inviting team members.
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 sm:pl-4">
                  {isInvite ? (
                    inviteBlocked ? (
                      <Button
                        type="button"
                        className="w-full min-w-[8rem] sm:w-auto"
                        disabled
                      >
                        Invite team
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant={done ? 'secondary' : 'primary'}
                        className="w-full min-w-[8rem] sm:w-auto"
                        onClick={() => navigate(step.href)}
                      >
                        {done ? 'Manage users' : 'Invite team'}
                      </Button>
                    )
                  ) : (
                    <Button
                      type="button"
                      variant={done ? 'secondary' : 'primary'}
                      className="w-full min-w-[8rem] sm:w-auto"
                      onClick={() => navigate(step.href)}
                    >
                      {done ? 'Review' : 'Continue'}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
