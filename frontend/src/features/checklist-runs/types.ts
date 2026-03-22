/** Section snapshot within a run */
export interface ChecklistRunSectionSnapshot {
  id: string;
  titleSnapshot: string;
  descriptionSnapshot: string | null;
  sortOrder: number;
  itemSnapshots: ChecklistRunItemSnapshot[];
}

/** Item snapshot within a run section */
export interface ChecklistRunItemSnapshot {
  id: string;
  itemTypeSnapshot: string;
  labelSnapshot: string;
  helpTextSnapshot: string | null;
  isRequiredSnapshot: boolean;
  requiresEvidenceOnFailSnapshot: boolean;
  requiresCommentOnFailSnapshot: boolean;
  severitySnapshot: string;
  configSnapshotJson: Record<string, unknown> | null;
  sortOrder: number;
  result: string | null;
  valueJson: Record<string, unknown> | null;
  comment: string | null;
  respondedAt: string | null;
  _count?: { attachments: number };
}

/** Full checklist run with sections and items */
export interface ChecklistRun {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  runNumber: number;
  templateNameSnapshot: string;
  templateKeySnapshot: string;
  assignedToUserId: string | null;
  assignedToUser?: { id: string; name: string } | null;
  sectionSnapshots: ChecklistRunSectionSnapshot[];
}

/** Paginated list response */
export interface ChecklistRunListResponse {
  items: ChecklistRun[];
  total: number;
  page: number;
  limit: number;
}

/** Params for today runs */
export interface ListTodayRunsParams {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  page?: number;
  limit?: number;
  timezone?: string;
  date?: string;
}

/** Params for overdue runs */
export interface ListOverdueRunsParams {
  page?: number;
  limit?: number;
}

/** Params for failed runs */
export interface ListFailedRunsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

/** Attachment metadata from run item detail */
export interface RunItemAttachment {
  id: string;
  fileId: string;
  createdAt: string;
  fileName: string | null;
  mimeType: string | null;
}

/** Run item detail with attachments (from GET /checklist-run-items/:id) */
export interface RunItemDetail {
  id: string;
  checklistRunId: string;
  label: string;
  attachments: RunItemAttachment[];
}
