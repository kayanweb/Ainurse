/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FormTemplate {
  id: string;
  code: string; // e.g. BHG-FR-GEN-027
  titleAr: string;
  titleEn: string;
  departmentDefault: string;
  version?: string;
  issueDate?: string;
  hasPatientDetails?: boolean;
  items?: Omit<GridRow, "days">[]; // Custom initial items
}

export interface SavedRecord {
  id: string;
  templateId: string;
  date: string;
  time: string;
  department: string;
  staffName: string;
  staffId: string;
  notes?: string;
  createdAt: string;
  shift?: string; // Active clinical tracking shift/period
  status?: string; // status e.g. "Pending", "Submitted by [Employee]", etc.
  // Patient / Custom Info
  patientName?: string;
  patientMRN?: string;
  diagnosis?: string;
  additionalInfo?: Record<string, any>;
  // The actual form data grid
  gridData: GridRow[];
}

export interface GridRow {
  sn?: string; // Serial number
  code?: string; // Item code/ID
  itemAr: string;
  itemEn: string;
  unit?: string;
  qty?: string;
  expiry?: string;
  batch?: string;
  days: Record<string, string>; // Map of "day" (1-31) to status ("✔", "✘", "1", "2.5", empty, etc.)
  extraType?: string; // e.g., 'select', 'text', 'checkbox'
}

export type UserRole = "admin" | "head_nurse" | "quality" | "president" | "staff" | "Staff" | "it";

export interface AppUser {
  id: string;
  nameAr: string;
  nameEn: string;
  role: UserRole;
  avatarInitials: string;
  department: string;
  staffId: string;
  pin?: string; // Secure passcode/PIN
  email?: string; // Employee's corporate email for recovery
  emp_id?: string; // Matching user requirement for exact emp_id
  assigned_dept?: string; // Matching user requirement for exact assigned_dept
  permissions?: string[]; // Array of allowed form template IDs
}

export interface DailyDutyTask {
  id: string;
  department: string;
  taskAr: string;
  taskEn: string;
  categoryAr: string;
  categoryEn: string;
  createdAt: string;
}

export interface UnitDailyChecklist {
  id: string;
  department: string;
  date: string;
  completedByStaffName: string;
  completedByStaffId: string;
  completedAt: string;
  status: "completed" | "audited";
  auditedByStaffName?: string;
  auditedByStaffId?: string;
  auditedAt?: string;
  auditNotes?: string;
  answers: Record<string, { done: boolean; note?: string }>;
}

export interface SystemLog {
  id: string;
  event: string;
  type: "info" | "warning" | "success" | "error";
  time: string;
  timestampMs: number;
}


