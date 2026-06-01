import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer
} from "firebase/firestore";
import { SavedRecord, AppUser, UnitDailyChecklist, SystemLog } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection check
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "baheya_clinical_records", "test-connection"));
    return true;
  } catch (error) {
    console.warn("Firestore offline or inaccessible: ", error);
    return false;
  }
}

// 2. Clinical Records Sync (Real-time)
export function syncClinicalRecords(onData: (records: SavedRecord[]) => void) {
  const path = "baheya_clinical_records";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const records: SavedRecord[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as SavedRecord);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveClinicalRecord(record: SavedRecord): Promise<void> {
  const path = `baheya_clinical_records/${record.id}`;
  try {
    await setDoc(doc(db, "baheya_clinical_records", record.id), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClinicalRecord(recordId: string): Promise<void> {
  const path = `baheya_clinical_records/${recordId}`;
  try {
    await deleteDoc(doc(db, "baheya_clinical_records", recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Staff Registry Sync (Real-time)
export function syncStaffRegistry(onData: (users: AppUser[]) => void) {
  const path = "baheya_staff_registry";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const users: AppUser[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as AppUser);
      });
      onData(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveStaffMember(user: AppUser): Promise<void> {
  const path = `baheya_staff_registry/${user.id}`;
  try {
    await setDoc(doc(db, "baheya_staff_registry", user.id), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStaffMember(userId: string): Promise<void> {
  const path = `baheya_staff_registry/${userId}`;
  try {
    await deleteDoc(doc(db, "baheya_staff_registry", userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 4. Daily Supervisor Audits Sync (Real-time)
export function syncDailyAudits(onData: (audits: UnitDailyChecklist[]) => void) {
  const path = "baheya_daily_audits";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const audits: UnitDailyChecklist[] = [];
      snapshot.forEach((doc) => {
        audits.push(doc.data() as UnitDailyChecklist);
      });
      onData(audits);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveDailyAudit(audit: UnitDailyChecklist): Promise<void> {
  const path = `baheya_daily_audits/${audit.id}`;
  try {
    await setDoc(doc(db, "baheya_daily_audits", audit.id), audit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 5. System Troubleshooting / IT Logs Sync (Real-time and persistent)
export function syncSystemLogs(onData: (logs: SystemLog[]) => void) {
  const path = "baheya_system_logs";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const logs: SystemLog[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as SystemLog);
      });
      // Sort by timestampMs descending so most recent is first
      logs.sort((a, b) => b.timestampMs - a.timestampMs);
      onData(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveSystemLog(log: SystemLog): Promise<void> {
  const path = `baheya_system_logs/${log.id}`;
  try {
    await setDoc(doc(db, "baheya_system_logs", log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSystemLog(logId: string): Promise<void> {
  const path = `baheya_system_logs/${logId}`;
  try {
    await deleteDoc(doc(db, "baheya_system_logs", logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
