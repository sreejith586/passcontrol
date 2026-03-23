import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

/** Run summary row shape from ChecklistRunsRepository RUN_SUMMARY_SELECT */
export interface CompletionReportRow {
  id: string;
  runNumber: number;
  templateNameSnapshot: string;
  status: string;
  dueAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  assignedToUser?: { id: string; name: string } | null;
  performedByUser?: { id: string; name: string } | null;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
  createdAt: Date;
}

/** Failed run item row shape from ChecklistRunItemsService */
export interface FailedItemReportRow {
  id: string;
  checklistRunId: string;
  label: string;
  result: string | null;
  severitySnapshot: string;
  comment: string | null;
  attachmentCount: number;
  checklistRun: {
    runNumber: number;
    templateNameSnapshot: string;
    dueAt: Date | null;
    brandId: string | null;
    locationId: string | null;
    zoneId: string | null;
  };
}

/** Overdue run row - same shape as completion */
export type OverdueRunReportRow = CompletionReportRow;

/** Consolidated operations row - completion + failedItemCount, openAlertCount */
export interface ConsolidatedOperationsReportRow extends CompletionReportRow {
  failedItemCount: number;
  openAlertCount: number;
}

/** Checklist item status row for item-level report */
export interface ChecklistItemStatusReportRow {
  id: string;
  checklistRunId: string;
  labelSnapshot: string;
  itemTypeSnapshot: string;
  result: string | null;
  comment: string | null;
  severitySnapshot: string;
  sectionTitle: string;
  runNumber: number;
  templateNameSnapshot: string;
  dueAt: Date | null;
  attachmentCount: number;
}

@Injectable()
export class ReportsExcelService {
  async buildCompletionReport(rows: CompletionReportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Checklist Completion', {
      headerFooter: { firstHeader: 'Checklist Completion Report' },
    });
    sheet.columns = [
      { header: 'Run #', key: 'runNumber', width: 10 },
      { header: 'Template', key: 'templateNameSnapshot', width: 25 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Due At', key: 'dueAt', width: 20 },
      { header: 'Started At', key: 'startedAt', width: 20 },
      { header: 'Completed At', key: 'completedAt', width: 20 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Performed By', key: 'performedBy', width: 20 },
    ];
    sheet.addRow(sheet.columns.map((c: { header?: string }) => c.header));
    for (const r of rows) {
      sheet.addRow({
        runNumber: r.runNumber,
        templateNameSnapshot: r.templateNameSnapshot,
        status: r.status,
        dueAt: r.dueAt,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        assignedTo: r.assignedToUser?.name ?? '',
        performedBy: r.performedByUser?.name ?? '',
      });
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  async buildFailedItemsReport(rows: FailedItemReportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Failed Items', {
      headerFooter: { firstHeader: 'Failed Items Report' },
    });
    sheet.columns = [
      { header: 'Run #', key: 'runNumber', width: 10 },
      { header: 'Template', key: 'templateName', width: 25 },
      { header: 'Item Label', key: 'label', width: 40 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Comment', key: 'comment', width: 30 },
      { header: 'Attachments', key: 'attachmentCount', width: 12 },
      { header: 'Due At', key: 'dueAt', width: 20 },
    ];
    sheet.addRow(sheet.columns.map((c: { header?: string }) => c.header));
    for (const r of rows) {
      sheet.addRow({
        runNumber: r.checklistRun.runNumber,
        templateName: r.checklistRun.templateNameSnapshot,
        label: r.label,
        severity: r.severitySnapshot,
        comment: r.comment ?? '',
        attachmentCount: r.attachmentCount,
        dueAt: r.checklistRun.dueAt,
      });
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  async buildOverdueRunsReport(rows: OverdueRunReportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Overdue Runs', {
      headerFooter: { firstHeader: 'Overdue Runs Report' },
    });
    sheet.columns = [
      { header: 'Run #', key: 'runNumber', width: 10 },
      { header: 'Template', key: 'templateNameSnapshot', width: 25 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Due At', key: 'dueAt', width: 20 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
    ];
    sheet.addRow(sheet.columns.map((c: { header?: string }) => c.header));
    for (const r of rows) {
      sheet.addRow({
        runNumber: r.runNumber,
        templateNameSnapshot: r.templateNameSnapshot,
        status: r.status,
        dueAt: r.dueAt,
        assignedTo: r.assignedToUser?.name ?? '',
      });
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  async buildConsolidatedOperationsReport(
    rows: ConsolidatedOperationsReportRow[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Consolidated Operations', {
      headerFooter: { firstHeader: 'Consolidated Operations Report' },
    });
    sheet.columns = [
      { header: 'Run #', key: 'runNumber', width: 10 },
      { header: 'Template', key: 'templateNameSnapshot', width: 25 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Due At', key: 'dueAt', width: 20 },
      { header: 'Started At', key: 'startedAt', width: 20 },
      { header: 'Completed At', key: 'completedAt', width: 20 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Performed By', key: 'performedBy', width: 20 },
      { header: 'Failed Items', key: 'failedItemCount', width: 12 },
      { header: 'Open Alerts', key: 'openAlertCount', width: 12 },
    ];
    sheet.addRow(sheet.columns.map((c: { header?: string }) => c.header));
    for (const r of rows) {
      sheet.addRow({
        runNumber: r.runNumber,
        templateNameSnapshot: r.templateNameSnapshot,
        status: r.status,
        dueAt: r.dueAt,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        assignedTo: r.assignedToUser?.name ?? '',
        performedBy: r.performedByUser?.name ?? '',
        failedItemCount: r.failedItemCount ?? 0,
        openAlertCount: r.openAlertCount ?? 0,
      });
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  async buildChecklistItemStatusReport(
    rows: ChecklistItemStatusReportRow[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Checklist Item Status', {
      headerFooter: { firstHeader: 'Checklist Item Status Report' },
    });
    sheet.columns = [
      { header: 'Run #', key: 'runNumber', width: 10 },
      { header: 'Template', key: 'templateNameSnapshot', width: 25 },
      { header: 'Section', key: 'sectionTitle', width: 25 },
      { header: 'Item Label', key: 'labelSnapshot', width: 40 },
      { header: 'Result', key: 'result', width: 10 },
      { header: 'Severity', key: 'severitySnapshot', width: 12 },
      { header: 'Comment', key: 'comment', width: 30 },
      { header: 'Attachments', key: 'attachmentCount', width: 12 },
      { header: 'Due At', key: 'dueAt', width: 20 },
    ];
    sheet.addRow(sheet.columns.map((c: { header?: string }) => c.header));
    for (const r of rows) {
      sheet.addRow({
        runNumber: r.runNumber,
        templateNameSnapshot: r.templateNameSnapshot,
        sectionTitle: r.sectionTitle,
        labelSnapshot: r.labelSnapshot,
        result: r.result ?? '',
        severitySnapshot: r.severitySnapshot ?? '',
        comment: r.comment ?? '',
        attachmentCount: r.attachmentCount ?? 0,
        dueAt: r.dueAt,
      });
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
