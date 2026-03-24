import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplateById,
  createTemplate,
  updateTemplate,
  publishTemplate,
} from './api';
import type {
  ChecklistTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  CreateSectionPayload,
  CreateItemPayload,
} from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { NativeSelect } from '@/shared/ui/NativeSelect';
import { Textarea } from '@/shared/ui/Textarea';
import { Badge } from '@/shared/ui/Badge';
import { toast } from '@/shared/feedback/useToast';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { ScopeSelectors } from '@/features/org-scope/ScopeSelectors';

const ITEM_TYPES = [
  { value: 'BOOLEAN', label: 'Yes/No (Pass/Fail)' },
  { value: 'TEXT', label: 'Text' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'CHECKBOX', label: 'Checkbox' },
] as const;

type SectionForm = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  items: ItemForm[];
};

type ItemForm = {
  id: string;
  label: string;
  itemType: string;
  isRequired: boolean;
  requiresEvidenceOnFail: boolean;
  requiresCommentOnFail: boolean;
  sortOrder: number;
};

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toCreatePayload(
  name: string,
  description: string,
  templateKey: string,
  sections: SectionForm[],
  scope: { brandId: string; locationId: string; zoneId: string }
): CreateTemplatePayload {
  const payload: CreateTemplatePayload = {
    templateKey: templateKey.trim() || slugFromName(name),
    name: name.trim(),
    description: description.trim() || undefined,
    sections: sections.map((s, si) => ({
      title: s.title.trim(),
      description: s.description.trim() || undefined,
      sortOrder: si,
      items: s.items.map((i, ii) => ({
        itemType: i.itemType,
        label: i.label.trim(),
        isRequired: i.isRequired,
        requiresEvidenceOnFail: i.requiresEvidenceOnFail,
        requiresCommentOnFail: i.requiresCommentOnFail,
        severity: 'MEDIUM',
        sortOrder: ii,
      })) as CreateItemPayload[],
    })) as CreateSectionPayload[],
  };
  if (scope.brandId) payload.brandId = scope.brandId;
  if (scope.locationId) payload.locationId = scope.locationId;
  if (scope.zoneId) payload.zoneId = scope.zoneId;
  return payload;
}

function toUpdatePayload(
  name: string,
  description: string,
  sections: SectionForm[],
  scope: { brandId: string; locationId: string; zoneId: string }
): UpdateTemplatePayload {
  const payload: UpdateTemplatePayload = {
    name: name.trim(),
    description: description.trim() || undefined,
    sections: sections.map((s, si) => ({
      title: s.title.trim(),
      description: s.description.trim() || undefined,
      sortOrder: si,
      items: s.items.map((i, ii) => ({
        itemType: i.itemType,
        label: i.label.trim(),
        isRequired: i.isRequired,
        requiresEvidenceOnFail: i.requiresEvidenceOnFail,
        requiresCommentOnFail: i.requiresCommentOnFail,
        severity: 'MEDIUM',
        sortOrder: ii,
      })),
    })),
    brandId: scope.brandId || null,
    locationId: scope.locationId || null,
    zoneId: scope.zoneId || null,
  };
  return payload;
}

function templateToForm(t: ChecklistTemplate): {
  name: string;
  description: string;
  templateKey: string;
  status: string;
  brandId: string;
  locationId: string;
  zoneId: string;
  sections: SectionForm[];
} {
  return {
    name: t.name,
    description: t.description ?? '',
    templateKey: t.templateKey,
    status: t.status,
    brandId: t.brandId ?? '',
    locationId: t.locationId ?? '',
    zoneId: t.zoneId ?? '',
    sections: (t.sections ?? []).map((s, si) => ({
      id: s.id,
      title: s.title,
      description: s.description ?? '',
      sortOrder: si,
      items: (s.items ?? []).map((i, ii) => ({
        id: i.id,
        label: i.label,
        itemType: i.itemType,
        isRequired: i.isRequired,
        requiresEvidenceOnFail: i.requiresEvidenceOnFail,
        requiresCommentOnFail: i.requiresCommentOnFail,
        sortOrder: ii,
      })),
    })),
  };
}

function emptySection(sortOrder: number): SectionForm {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    sortOrder,
    items: [emptyItem(0)],
  };
}

function emptyItem(sortOrder: number): ItemForm {
  return {
    id: crypto.randomUUID(),
    label: '',
    itemType: 'BOOLEAN',
    isRequired: true,
    requiresEvidenceOnFail: false,
    requiresCommentOnFail: false,
    sortOrder,
  };
}

function validate(
  name: string,
  _templateKey: string,
  isNew: boolean,
  sections: SectionForm[]
): string[] {
  const errors: string[] = [];
  if (!name.trim()) errors.push('Template name is required');
  if (isNew && !name.trim()) return errors; // key derives from name
  if (sections.length === 0) errors.push('At least one section is required');
  sections.forEach((s, i) => {
    if (!s.title.trim()) errors.push(`Section ${i + 1}: title is required`);
    if (s.items.length === 0)
      errors.push(`Section "${s.title || i + 1}": at least one item is required`);
    s.items.forEach((item, j) => {
      if (!item.label.trim())
        errors.push(`Section "${s.title}" item ${j + 1}: label is required`);
    });
  });
  return errors;
}

export function ChecklistTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [brandId, setBrandId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [sections, setSections] = useState<SectionForm[]>(() => [
    emptySection(0),
  ]);

  const templateQuery = useQuery({
    queryKey: queryKeys.detail(id!),
    queryFn: () => getTemplateById(id!),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (templateQuery.data) {
      const form = templateToForm(templateQuery.data);
      setName(form.name);
      setDescription(form.description);
      setTemplateKey(form.templateKey);
      setBrandId(form.brandId);
      setLocationId(form.locationId);
      setZoneId(form.zoneId);
      setSections(form.sections);
    }
  }, [templateQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTemplatePayload) => createTemplate(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Template created');
      navigate(`/checklist-templates/${data.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: UpdateTemplatePayload }) =>
      updateTemplate(templateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      if (id) queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
      toast.success('Template updated');
      templateQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update template');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (templateId: string) => publishTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      if (id) queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
      toast.success('Template published');
      templateQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to publish template');
    },
  });

  const template = templateQuery.data;
  const isPublished = template?.status === 'PUBLISHED';
  const isDraft = template?.status === 'DRAFT';

  function handleSave() {
    const errors = validate(name, templateKey, isNew, sections);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    const scope = { brandId, locationId, zoneId };
    if (isNew) {
      createMutation.mutate(toCreatePayload(name, description, templateKey, sections, scope));
    } else if (id && isDraft) {
      updateMutation.mutate({
        templateId: id,
        payload: toUpdatePayload(name, description, sections, scope),
      });
    }
  }

  function handlePublish() {
    if (id && isDraft) {
      publishMutation.mutate(id);
    }
  }

  function addSection() {
    setSections((prev) => [...prev, emptySection(prev.length)]);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      if (next.length === 0) return [emptySection(0)];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }

  function updateSection(sectionId: string, updates: Partial<SectionForm>) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  }

  function addItem(sectionId: string) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const newItem = emptyItem(s.items.length);
        return { ...s, items: [...s.items, newItem] };
      })
    );
  }

  function removeItem(sectionId: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const next = s.items.filter((i) => i.id !== itemId);
        if (next.length === 0) return { ...s, items: [emptyItem(0)] };
        return {
          ...s,
          items: next.map((i, idx) => ({ ...i, sortOrder: idx })),
        };
      })
    );
  }

  function updateItem(
    sectionId: string,
    itemId: string,
    updates: Partial<ItemForm>
  ) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map((i) =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        };
      })
    );
  }

  if (!isNew && templateQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isNew && templateQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Template" />
        <ErrorState
          title="Failed to load template"
          description={
            templateQuery.error instanceof Error
              ? templateQuery.error.message
              : 'Something went wrong'
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => templateQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const canEdit = isNew || isDraft;
  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Checklist Templates', href: '/checklist-templates' },
          { label: isNew ? 'New Template' : template?.name ?? 'Edit' },
        ]}
      />
      <PageHeader
        title={isNew ? 'New Template' : template?.name ?? 'Edit Template'}
        description={isNew ? 'Create a new checklist template' : 'Edit template (Draft only)'}
      />

      {isPublished && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Published templates cannot be edited. You can create a new version or archive this template.
        </div>
      )}

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily Opening Checklist"
            disabled={!canEdit}
          />
          {isNew && (
            <Input
              label="Template key"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              placeholder="e.g. opening-checklist (used in APIs)"
              disabled={!canEdit}
            />
          )}
          {!isNew && (
            <div>
              <label className="block text-sm font-medium text-foreground">
                Status
              </label>
              <Badge
                variant={template?.status === 'PUBLISHED' ? 'success' : 'warning'}
                className="mt-1.5"
              >
                {template?.status}
              </Badge>
            </div>
          )}
        </div>
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this checklist"
          rows={2}
          disabled={!canEdit}
        />
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Scope (optional)</h3>
          <ScopeSelectors
            brandId={brandId}
            locationId={locationId}
            zoneId={zoneId}
            onChange={({ brandId: b, locationId: l, zoneId: z }) => {
              setBrandId(b);
              setLocationId(l);
              setZoneId(z);
            }}
            disabled={!canEdit}
          />
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {!isNew && isDraft && (
              <PermissionGate permission="checklist.template.publish">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={publishMutation.isPending}
                >
                  {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                </Button>
              </PermissionGate>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sections</h2>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={addSection}>
              + Add section
            </Button>
          )}
        </div>

        {sections.map((section) => (
          <Card key={section.id} className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Input
                  label="Section title"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(section.id, { title: e.target.value })
                  }
                  placeholder="e.g. Temperature Checks"
                  disabled={!canEdit}
                />
                <Textarea
                  label="Description (optional)"
                  value={section.description}
                  onChange={(e) =>
                    updateSection(section.id, { description: e.target.value })
                  }
                  placeholder="Optional section description"
                  rows={1}
                  disabled={!canEdit}
                />
              </div>
              {canEdit && sections.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => removeSection(section.id)}
                >
                  Delete section
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">
                Items ({section.items.length})
              </div>
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                >
                  <Input
                    label="Label"
                    value={item.label}
                    onChange={(e) =>
                      updateItem(section.id, item.id, { label: e.target.value })
                    }
                    placeholder="Item label"
                    className="min-w-[200px] flex-1"
                    disabled={!canEdit}
                  />
                  <div className="w-[180px]">
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Type
                    </label>
                    <NativeSelect
                      value={item.itemType}
                      onChange={(e) =>
                        updateItem(section.id, item.id, {
                          itemType: e.target.value,
                        })
                      }
                      disabled={!canEdit}
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(e) =>
                          updateItem(section.id, item.id, {
                            isRequired: e.target.checked,
                          })
                        }
                        disabled={!canEdit}
                        className="h-4 w-4 rounded border-border"
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.requiresEvidenceOnFail}
                        onChange={(e) =>
                          updateItem(section.id, item.id, {
                            requiresEvidenceOnFail: e.target.checked,
                          })
                        }
                        disabled={!canEdit}
                        className="h-4 w-4 rounded border-border"
                      />
                      Evidence on fail
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.requiresCommentOnFail}
                        onChange={(e) =>
                          updateItem(section.id, item.id, {
                            requiresCommentOnFail: e.target.checked,
                          })
                        }
                        disabled={!canEdit}
                        className="h-4 w-4 rounded border-border"
                      />
                      Comment on fail
                    </label>
                  </div>
                  {canEdit && section.items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(section.id, item.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addItem(section.id)}
                >
                  + Add item
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
