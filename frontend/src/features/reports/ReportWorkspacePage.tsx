import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { PageHeader } from '@/shared/layout/PageHeader';
import { useAuth } from '@/core/auth/auth-context';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DataTable } from '@/shared/ui';
import { FilterBar, FilterSelect, FilterInput } from '@/shared/layout/FilterBar';
import { listBrands } from '@/features/brands/api';
import { listLocations } from '@/features/locations/api';
import { listZones } from '@/features/zones/api';
import { listTemplates } from '@/features/checklist-templates/api';
import type { ReportFilters } from './api';
import {
  defaultFrom,
  defaultTo,
  getReportConfig,
  getDefaultColumnVisibilityForReport,
  type ReportType,
} from './report-config';
import { queryKeys as brandQueryKeys } from '@/features/brands/query-keys';
import { queryKeys as locationQueryKeys } from '@/features/locations/query-keys';
import { queryKeys as zoneQueryKeys } from '@/features/zones/query-keys';
import { toast } from '@/shared/feedback/useToast';
import { ApiError } from '@/core/api/errors';
import { REPORT_CATALOG } from './report-config';

interface ReportWorkspacePageProps {
  reportType: ReportType;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportWorkspacePage({ reportType }: ReportWorkspacePageProps) {
  const { user } = useAuth();
  const config = getReportConfig(reportType);
  const defaultFilters = config.getDefaultFilters();

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    () => getDefaultColumnVisibilityForReport(reportType)
  );
  const [draftFilters, setDraftFilters] = useState<ReportFilters>({
    ...defaultFilters,
    from: defaultFilters.from ?? defaultFrom,
    to: defaultFilters.to ?? defaultTo,
  });
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    ...defaultFilters,
    from: defaultFilters.from ?? defaultFrom,
    to: defaultFilters.to ?? defaultTo,
  });
  const [downloading, setDownloading] = useState(false);

  const { data: brands = [] } = useQuery({ queryKey: brandQueryKeys.list(), queryFn: listBrands });
  const { data: locations = [] } = useQuery({
    queryKey: locationQueryKeys.list(),
    queryFn: () => listLocations(),
  });
  const { data: zones = [] } = useQuery({ queryKey: zoneQueryKeys.list(), queryFn: () => listZones() });
  const filteredLocations = draftFilters.brandId
    ? locations.filter((l) => l.brandId === draftFilters.brandId)
    : locations;
  const filteredZones = draftFilters.locationId
    ? zones.filter((z) => z.locationId === draftFilters.locationId)
    : zones;

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates', 'reports'],
    queryFn: () => listTemplates({ status: 'PUBLISHED', limit: 200 }),
    enabled: config.showTemplateFilter,
  });

  const { data, isLoading } = useQuery({
    queryKey: [config.queryKey, appliedFilters],
    queryFn: () => config.queryFn(appliedFilters),
    enabled: true,
  });

  const tableData = data?.items ?? [];
  const totalCount = data && 'total' in data ? data.total : tableData.length;

  const handleApply = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const handleReset = () => {
    setDraftFilters(config.getDefaultFilters());
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await config.downloadFn(appliedFilters);
      triggerDownload(blob, config.downloadFilename);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const tableColumns = useMemo(
    () =>
      config.columns
        .filter((col) => columnVisibility[col.key] !== false)
        .map((col) => ({
          key: col.key,
          header: col.label,
          render: col.render,
        })),
    [config.columns, columnVisibility]
  );

  const templateName =
    appliedFilters.checklistTemplateId &&
    (Array.isArray(templates) ? templates : []).find(
      (t) => t.id === appliedFilters.checklistTemplateId
    )?.name;
  const filterSummary = [
    appliedFilters.brandId && brands.find((b) => b.id === appliedFilters.brandId)?.name,
    appliedFilters.locationId &&
      locations.find((l) => l.id === appliedFilters.locationId)?.name,
    appliedFilters.zoneId && zones.find((z) => z.id === appliedFilters.zoneId)?.name,
    config.showTemplateFilter && templateName,
    config.showResultFilter && appliedFilters.result && `Result: ${appliedFilters.result}`,
    config.showTemplateAndSeverity &&
      appliedFilters.severity &&
      `Severity: ${appliedFilters.severity}`,
    config.showDateRange &&
      appliedFilters.from &&
      appliedFilters.to &&
      `${appliedFilters.from} → ${appliedFilters.to}`,
    appliedFilters.assignedToMe && 'Assigned to me',
  ]
    .filter(Boolean)
    .join(' · ') || 'All';

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Reports', href: '/reports' },
          { label: config.title },
        ]}
      />
      <PageHeader
        title={config.title}
        description={config.subtitle}
        actions={
          <Button
            onClick={handleDownload}
            disabled={downloading || isLoading}
            variant="primary"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Downloading…' : 'Download Excel'}
          </Button>
        }
      />

      <Card className="p-4">
        <FilterBar className="flex-wrap items-end gap-4">
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Brand
            </span>
            <FilterSelect
              value={draftFilters.brandId ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({
                  ...f,
                  brandId: v || undefined,
                  locationId: undefined,
                  zoneId: undefined,
                }))
              }
              options={[
                { value: '', label: 'All' },
                ...brands.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Location
            </span>
            <FilterSelect
              value={draftFilters.locationId ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({
                  ...f,
                  locationId: v || undefined,
                  zoneId: undefined,
                }))
              }
              options={[
                { value: '', label: 'All' },
                ...filteredLocations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Zone
            </span>
            <FilterSelect
              value={draftFilters.zoneId ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, zoneId: v || undefined }))
              }
              options={[
                { value: '', label: 'All' },
                ...filteredZones.map((z) => ({ value: z.id, label: z.name })),
              ]}
            />
          </div>
          {config.showTemplateFilter && (
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Template
              </span>
              <FilterSelect
                value={draftFilters.checklistTemplateId ?? ''}
                onChange={(v) =>
                  setDraftFilters((f) => ({
                    ...f,
                    checklistTemplateId: v || undefined,
                  }))
                }
                options={[
                  { value: '', label: 'All' },
                  ...(Array.isArray(templates) ? templates : []).map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
              />
            </div>
          )}
          {config.showResultFilter && (
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Result
              </span>
              <FilterSelect
                value={draftFilters.result ?? ''}
                onChange={(v) =>
                  setDraftFilters((f) => ({
                    ...f,
                    result: (v || undefined) as 'PASS' | 'FAIL' | undefined,
                  }))
                }
                options={[
                  { value: '', label: 'All' },
                  { value: 'PASS', label: 'Pass' },
                  { value: 'FAIL', label: 'Fail' },
                ]}
              />
            </div>
          )}
          {config.showTemplateAndSeverity && (
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Severity
              </span>
              <FilterSelect
                value={draftFilters.severity ?? ''}
                onChange={(v) =>
                  setDraftFilters((f) => ({ ...f, severity: v || undefined }))
                }
                options={[
                  { value: '', label: 'All' },
                  { value: 'CRITICAL', label: 'Critical' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'LOW', label: 'Low' },
                ]}
              />
            </div>
          )}
          {config.showDateRange && (
            <>
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  From
                </span>
                <FilterInput
                  type="date"
                  value={draftFilters.from ?? defaultFrom}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, from: v }))}
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  To
                </span>
                <FilterInput
                  type="date"
                  value={draftFilters.to ?? defaultTo}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, to: v }))}
                />
              </div>
            </>
          )}
          {config.showAssignee && user?.id && (
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Assignee
              </span>
              <FilterSelect
                value={draftFilters.assignedToMe === true ? 'me' : 'anyone'}
                onChange={(v) =>
                  setDraftFilters((f) => ({ ...f, assignedToMe: v === 'me' }))
                }
                options={[
                  { value: 'anyone', label: 'Anyone' },
                  { value: 'me', label: 'Me' },
                ]}
                aria-label="Assignee filter"
              />
            </div>
          )}
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground invisible">
              Actions
            </span>
            <div className="flex h-9 items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleApply}>
                Apply
              </Button>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </FilterBar>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <Card className="min-h-[320px] overflow-hidden p-0">
          <DataTable
            columns={tableColumns}
            data={tableData}
            loading={isLoading}
            emptyMessage="No data for selected filters"
            emptyDescription="Try adjusting filters or date range."
            getRowId={(row) => config.getRowId(row)}
          />
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground">Columns</h3>
            <div className="mt-3 space-y-2">
              {config.columns.map((col) => (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={columnVisibility[col.key] !== false}
                    onChange={(e) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        [col.key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Report</dt>
                <dd>{REPORT_CATALOG.find((r) => r.type === reportType)?.title ?? config.title}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Row count</dt>
                <dd>{totalCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Filters</dt>
                <dd className="break-words">{filterSummary}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
