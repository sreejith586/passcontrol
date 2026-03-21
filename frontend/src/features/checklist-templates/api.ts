import { get, post, patch } from '@/core/api/client';

export interface ChecklistTemplateSection {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  items: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  itemType: string;
  label: string;
  helpText: string | null;
  isRequired: boolean;
  requiresEvidenceOnFail: boolean;
  requiresCommentOnFail: boolean;
  severity: string;
  failureCreatesIncident: boolean;
  configJson: Record<string, unknown> | null;
  sortOrder: number;
}

export interface ChecklistTemplate {
  id: string;
  templateKey: string;
  version: number;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
  sections: ChecklistTemplateSection[];
  updatedAt: string;
}

export interface CreateTemplatePayload {
  templateKey: string;
  name: string;
  description?: string;
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  sections?: CreateSectionPayload[];
}

export interface CreateSectionPayload {
  title: string;
  description?: string;
  sortOrder: number;
  items?: CreateItemPayload[];
}

export interface CreateItemPayload {
  itemType: string;
  label: string;
  helpText?: string;
  isRequired?: boolean;
  requiresEvidenceOnFail?: boolean;
  requiresCommentOnFail?: boolean;
  severity?: string;
  failureCreatesIncident?: boolean;
  configJson?: Record<string, unknown>;
  sortOrder: number;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  sections?: UpdateSectionPayload[];
}

export interface UpdateSectionPayload {
  title?: string;
  description?: string;
  sortOrder?: number;
  items?: UpdateItemPayload[];
}

export interface UpdateItemPayload {
  itemType?: string;
  label?: string;
  helpText?: string;
  isRequired?: boolean;
  requiresEvidenceOnFail?: boolean;
  requiresCommentOnFail?: boolean;
  severity?: string;
  failureCreatesIncident?: boolean;
  configJson?: Record<string, unknown>;
  sortOrder?: number;
}

export async function listTemplates(params?: {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  page?: number;
  limit?: number;
}): Promise<ChecklistTemplate[]> {
  const searchParams: Record<string, string> = {};
  if (params?.status) searchParams.status = params.status;
  if (params?.page) searchParams.page = String(params.page);
  if (params?.limit) searchParams.limit = String(params.limit);
  return get<ChecklistTemplate[]>('/checklist-templates', searchParams);
}

export async function getTemplateById(id: string): Promise<ChecklistTemplate> {
  return get<ChecklistTemplate>(`/checklist-templates/${id}`);
}

export async function createTemplate(
  payload: CreateTemplatePayload
): Promise<ChecklistTemplate> {
  return post<ChecklistTemplate>('/checklist-templates', payload);
}

export async function updateTemplate(
  id: string,
  payload: UpdateTemplatePayload
): Promise<ChecklistTemplate> {
  return patch<ChecklistTemplate>(`/checklist-templates/${id}`, payload);
}

export async function publishTemplate(id: string): Promise<ChecklistTemplate> {
  return post<ChecklistTemplate>(`/checklist-templates/${id}/publish`, {});
}
