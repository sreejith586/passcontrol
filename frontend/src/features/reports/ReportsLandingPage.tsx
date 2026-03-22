import { Link } from 'react-router-dom';
import { ChevronRight, FileBarChart } from 'lucide-react';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Card } from '@/shared/ui/Card';
import { REPORT_CATALOG } from './report-config';

export function ReportsLandingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="View and export checklist completion, failed items, overdue runs, and operational summaries."
      />
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {REPORT_CATALOG.map((report) => (
          <Link key={report.type} to={report.path}>
            <Card className="flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-slate-50/80">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground">{report.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {report.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
