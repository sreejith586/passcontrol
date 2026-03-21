import type { FocusEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { ChecklistRunItemSnapshot } from '../types';
import {
  BooleanItemInput,
  CheckboxItemInput,
  TextItemInput,
  TemperatureItemInput,
} from './items';
import { EvidencePanel } from './EvidencePanel';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { cn } from '@/lib/cn';

const SUPPORTED_ITEM_TYPES = ['BOOLEAN', 'CHECKBOX', 'TEXT', 'TEMPERATURE'];

function CommentField({
  itemId,
  initialValue,
  disabled,
  onUpdate,
}: {
  itemId: string;
  initialValue: string;
  disabled: boolean;
  onUpdate: (id: string, data: { comment?: string }) => void;
}) {
  const [local, setLocal] = useState(initialValue);
  useEffect(() => {
    setLocal(initialValue);
  }, [initialValue]);

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLTextAreaElement>) => {
      const trimmed = (e.target.value ?? '').trim();
      const prevTrimmed = initialValue.trim();
      if (trimmed !== prevTrimmed) {
        onUpdate(itemId, { comment: trimmed });
      }
    },
    [itemId, initialValue, onUpdate]
  );

  return (
    <div>
      <Textarea
        label="Comment (required when failed)"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="Explain why this item failed..."
        className="max-w-xl"
      />
    </div>
  );
}

interface RunItemRowProps {
  item: ChecklistRunItemSnapshot;
  runId: string;
  runStatus: string;
  disabled?: boolean;
  isUpdating?: boolean;
  canViewEvidence?: boolean;
  canDeleteEvidence?: boolean;
  canUploadEvidence?: boolean;
  onUpdate: (
    itemId: string,
    data: { result?: string; valueJson?: Record<string, unknown>; comment?: string }
  ) => void;
}

export function RunItemRow({
  item,
  runId,
  runStatus,
  disabled,
  isUpdating,
  canViewEvidence = false,
  canDeleteEvidence = false,
  canUploadEvidence = false,
  onUpdate,
}: RunItemRowProps) {
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const isCompleted = runStatus === 'COMPLETED';
  const isFail = item.result === 'FAIL';
  const showComment = item.requiresCommentOnFailSnapshot && isFail;
  const showEvidenceReq =
    item.requiresEvidenceOnFailSnapshot && isFail;
  const attachmentCount = item._count?.attachments ?? 0;
  const hasEvidence = attachmentCount > 0;
  const evidenceMissing = showEvidenceReq && !hasEvidence;
  const showEvidenceBadge = hasEvidence && canViewEvidence;
  const canOpenEvidencePanel =
    (showEvidenceBadge || (evidenceMissing && canUploadEvidence)) && canViewEvidence;

  const baseProps = {
    itemId: item.id,
    label: item.labelSnapshot,
    result: item.result,
    valueJson: item.valueJson,
    configSnapshotJson: item.configSnapshotJson,
    disabled: disabled ?? isCompleted,
    onUpdate: (id: string, data: { result?: string; valueJson?: Record<string, unknown> }) =>
      onUpdate(id, data),
    isUpdating,
  };

  function renderInput() {
    if (!SUPPORTED_ITEM_TYPES.includes(item.itemTypeSnapshot)) {
      return (
        <span className="text-sm text-muted-foreground italic">
          Unsupported item type
        </span>
      );
    }
    switch (item.itemTypeSnapshot) {
      case 'BOOLEAN':
        return <BooleanItemInput {...baseProps} />;
      case 'CHECKBOX':
        return <CheckboxItemInput {...baseProps} />;
      case 'TEXT':
        return <TextItemInput {...baseProps} />;
      case 'TEMPERATURE':
        return <TemperatureItemInput {...baseProps} />;
      default:
        return (
          <span className="text-sm text-muted-foreground italic">
            Unsupported item type
          </span>
        );
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        item.isRequiredSnapshot
          ? 'border-sky-200 bg-sky-50/50'
          : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {item.labelSnapshot}
              </span>
              {item.isRequiredSnapshot && (
                <span className="text-xs text-primary">Required</span>
              )}
              {isUpdating && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Spinner size="sm" className="h-3 w-3" />
                  Saving...
                </span>
              )}
            </div>
            {item.helpTextSnapshot && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.helpTextSnapshot}
              </p>
            )}
          </div>
          {renderInput()}
        </div>
        {showComment && (
          <CommentField
            itemId={item.id}
            initialValue={item.comment ?? ''}
            disabled={disabled ?? isCompleted}
            onUpdate={onUpdate}
          />
        )}
        {(evidenceMissing || hasEvidence) && (
          <div
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              evidenceMissing
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            )}
          >
            {evidenceMissing ? (
              canOpenEvidencePanel ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span>Evidence required before submission</span>
                  <button
                    type="button"
                    onClick={() => setEvidencePanelOpen(true)}
                    className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-500 shrink-0"
                  >
                    Upload evidence
                  </button>
                </span>
              ) : (
                <span>Evidence required before submission</span>
              )
            ) : showEvidenceBadge ? (
              <button
                type="button"
                onClick={() => setEvidencePanelOpen(true)}
                className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
              >
                Evidence attached ({attachmentCount} file{attachmentCount !== 1 ? 's' : ''})
              </button>
            ) : (
              <span>Evidence attached ({attachmentCount} file{attachmentCount !== 1 ? 's' : ''}).</span>
            )}
          </div>
        )}
        {canOpenEvidencePanel && (
          <EvidencePanel
            open={evidencePanelOpen}
            onClose={() => setEvidencePanelOpen(false)}
            itemId={item.id}
            itemLabel={item.labelSnapshot}
            runId={runId}
            canDelete={canDeleteEvidence}
            canUpload={canUploadEvidence}
            triggerFilePickerOnOpen={evidenceMissing && canUploadEvidence}
          />
        )}
      </div>
    </div>
  );
}
