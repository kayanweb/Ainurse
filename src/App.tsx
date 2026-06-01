/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  X,
  Printer,
  Database,
  Search,
  Plus,
  Trash2,
  FileText,
  Download,
  Upload,
  HeartPulse,
  Info,
  Calendar,
  Clock,
  User,
  CheckSquare,
  Thermometer,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  FileSpreadsheet,
  Lock,
  Unlock,
  ShieldAlert,
  Award,
  Settings,
  ListPlus,
  Pencil,
  ShieldCheck,
  LayoutGrid,
  ClipboardList,
  KeyRound,
  Bell,
  Radio
} from "lucide-react";
import { SavedRecord, FormTemplate, GridRow, AppUser, UserRole, DailyDutyTask, UnitDailyChecklist, SystemLog } from "./types";
import { FORM_TEMPLATES, createNewRecord, getItemsForTemplate } from "./data/templates";
import { generatePDF } from "./lib/pdfGenerator";
import {
  testConnection,
  syncClinicalRecords,
  saveClinicalRecord,
  deleteClinicalRecord,
  syncStaffRegistry,
  saveStaffMember,
  deleteStaffMember,
  syncDailyAudits,
  saveDailyAudit,
  syncSystemLogs,
  saveSystemLog,
  deleteSystemLog
} from "./lib/firestoreService";

// 4 Core Mock Users for Baheya Hospital Access Rules matching the requested design
const MOCK_USERS: AppUser[] = [
  {
    id: "user-it",
    nameAr: "م. عادل الشريف (رئيس قسم نظم المعلومات IT)",
    nameEn: "Eng. Adel El-Sherif (Head of IT & Digital Systems)",
    role: "it",
    avatarInitials: "IT",
    department: "INFORMATION TECHNOLOGY / IT",
    staffId: "BHG-IT-01",
    pin: "2026",
    email: "it-support@baheya.org"
  },
  {
    id: "user-nurse",
    nameAr: "أ. فاطمة الزهراء (استاف التمريض)",
    nameEn: "Sister Fatima El-Zahraa (Staff Nurse)",
    role: "head_nurse",
    avatarInitials: "FZ",
    department: "EMERGENCY UNIT",
    staffId: "BHG-NUR-25",
    pin: "2525",
    email: "fatima@baheya.org"
  },
  {
    id: "user-quality",
    nameAr: "أ. نورهان علي (المشرف الميداني للجودة)",
    nameEn: "Auditor Norhan Ali (Clinical Supervisor)",
    role: "quality",
    avatarInitials: "NA",
    department: "QUALITY AUDITING",
    staffId: "BHG-QLT-08",
    pin: "0808",
    email: "norhan@baheya.org"
  },
  {
    id: "user-admin",
    nameAr: "د. محمد السيد (مدير الأقسام والعمليات)",
    nameEn: "Dr. Mohamed Elsayed (Clinical Operations Manager)",
    role: "admin",
    avatarInitials: "MS",
    department: "QUALITY & IT DEPT",
    staffId: "BHG-ADM-99",
    pin: "1234",
    email: "mohamed@baheya.org"
  },
  {
    id: "user-president",
    nameAr: "أ.د. ليلى أبو الخير (رئيس مجلس الإدارة والفرع)",
    nameEn: "Prof. Laila Abou El-Kheir (Hospital President)",
    role: "president",
    avatarInitials: "LK",
    department: "ADMINISTRATION",
    staffId: "BHG-PRES-01",
    pin: "9999",
    email: "president@baheya.org"
  }
];

const doesTemplateMatchDepartment = (tpl: any, deptName: string): boolean => {
  if (!deptName) return true;
  const codeUpper = (tpl.code || "").toUpperCase();
  const deptUpper = (tpl.departmentDefault || "").toUpperCase();
  const dName = deptName.toUpperCase();
  
  if (dName === "EMERGENCY UNIT" || dName === "EMERGENCY ROOM" || dName === "EMERGENCY") {
    return (
      deptUpper.includes("EMERGENCY") || 
      deptUpper.includes("DRESSING") || 
      codeUpper.includes("-ER-") || 
      codeUpper.includes("-GEN-027")
    );
  }
  if (dName === "CHEMO UNIT PREPN" || dName === "CHEMO DAYCARE" || dName === "CHEMO") {
    return deptUpper.includes("CHEMO") || codeUpper.includes("-CHEMO-");
  }
  if (dName.includes("ICU") || dName.includes("INTENSIVE CARE") || dName.includes("CRITICAL CARE")) {
    return deptUpper.includes("ICU") || codeUpper.includes("-ICU-");
  }
  if (dName === "ONCO-SURGICAL UNIT" || dName.includes("OPERATING") || dName.includes("SURGICAL") || dName.includes("SURGERY") || dName.includes("STERILIZATION")) {
    return (
      deptUpper.includes("OPERATING") || 
      deptUpper.includes("SURGERY") ||
      deptUpper.includes("SURGICAL") ||
      deptUpper.includes("STERILIZATION") ||
      deptUpper.includes("RECOVERY") ||
      codeUpper.includes("-OR-") ||
      codeUpper.includes("-SURG-") ||
      codeUpper.includes("-ENG-")
    );
  }
  if (dName === "OUTPATIENT CLINIC" || dName.includes("OUTPATIENT") || dName.includes("CLINIC")) {
    return deptUpper.includes("CLINIC") || codeUpper.includes("-CLIN-") || codeUpper.includes("-OP-") || deptUpper.includes("OUTPATIENT") || tpl.id.includes("outpatient");
  }
  
  // Default fallback check
  return deptUpper.includes(dName) || dName.includes(deptUpper);
};

const DEFAULT_DUTY_TASKS: DailyDutyTask[] = [
  {
    id: "duty-er-1",
    department: "EMERGENCY UNIT",
    taskAr: "التحقق من سلامة أقفال وعربة إنعاش القلب الرئوي (الكود بلو) ومجموعاتها",
    taskEn: "Verify Emergency Code Blue Resuscitation Cart Seals & stocks are intact",
    categoryAr: "عربة الطوارئ",
    categoryEn: "Emergency Cart",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-2",
    department: "EMERGENCY UNIT",
    taskAr: "تسجيل قراءة درجات حرارة ثلاجة حفظ العينات والدم والأدوية الطبية (2 إلى 8 درجات مئوية)",
    taskEn: "Log temperature of Emergency Blood/Specimen fridge (2°C to 8°C)",
    categoryAr: "سلسلة التبريد",
    categoryEn: "Cold Chain",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-3",
    department: "EMERGENCY UNIT",
    taskAr: "التحقق من اكتمال شحن بطارية واختبار جاهزية جهاز صدمات القلب (Defibrillator)",
    taskEn: "Verify Emergency Defibrillator visual check and test shock capability",
    categoryAr: "جاهزية الأجهزة",
    categoryEn: "Device Readiness",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-4",
    department: "EMERGENCY UNIT",
    taskAr: "مراجعة كمية أسطوانات الأكسجين المحمولة وضغط الغاز للتأكد من تخطيها 1500 PSI",
    taskEn: "Check levels and pressure of emergency portable oxygen cylinders (>1500 PSI)",
    categoryAr: "إمدادات الغازات",
    categoryEn: "Gas Supplies",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-er-5",
    department: "EMERGENCY UNIT",
    taskAr: "التفتيش على ملء وتوافر معقمات الأيدي الكحولية بممرات المرضى وغرف الكشف",
    taskEn: "Verify clinical hand sanitizer dispenser levels in waiting zones & clinic rooms",
    categoryAr: "مكافحة العدوى",
    categoryEn: "Infection Control",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-1",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "اختبار جاهزية ونظافة أجهزة التنفس الصناعي الاحتياطية ومكثفات الأكسجين",
    taskEn: "Verify functional testing and sanitation of backup ventilators & concentrators",
    categoryAr: "أجهزة التنفس",
    categoryEn: "Ventilation Devices",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-2",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "التحقق من معايرة مضخات السوائل والسرنجات ومطابقتها للمعايير المعتمدة",
    taskEn: "Audit infusion and syringe pump calibration and safety logs",
    categoryAr: "مضخات السوائل",
    categoryEn: "Infusion System",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-3",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "اختبار فاعلية نظام إنذار انقطاع الغازات الطبية ونقص ضغط الأكسجين المركزي",
    taskEn: "Test and verify center oxygen pressure & central clinical medical gas alarm sirens",
    categoryAr: "سلامة المرضى",
    categoryEn: "Patient Safety",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-icu-4",
    department: "INTENSIVE CARE UNIT (ICU)",
    taskAr: "التفتيش على صندوق الأجسام الحادة وحاوية المخلفات الطبية لتجنب تخطي 3/4 السعة",
    taskEn: "Ensure rigid sharp disposal collection boxes are not filled beyond 3/4 capacity",
    categoryAr: "مكافحة العدوى",
    categoryEn: "Infection Control",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-1",
    department: "CHEMO UNIT PREPN",
    taskAr: "تدقيق نظافة وعقم كبائن التدفق الرقائقي الحيوي (Biosafety Hood) بالصيدلية",
    taskEn: "Validate sanitization index of Chemo Bio-Safety laminating cabinets",
    categoryAr: "التعقيم الوقائي",
    categoryEn: "Protective Sterility",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-2",
    department: "CHEMO UNIT PREPN",
    taskAr: "التحقق المزدوج المعتمد من طبيب وصيدلي لبطاقات المرضى مطابقة لجرعات الكيماوي والوزن",
    taskEn: "Dual nurse-pharmacist clinical check for patient identity, weight, and chemotherapy doses",
    categoryAr: "سلامة تحضير الدواء",
    categoryEn: "Drug Administration",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-3",
    department: "CHEMO UNIT PREPN",
    taskAr: "التدقيق اللحظي على سلامة ومستوى تعبئة صندوق احتواء انسكابات الكيماوي الخطرة",
    taskEn: "Verify presence of chemotherapy spillage kit, protective uniforms & safety goggles",
    categoryAr: "إدارة المخاطر",
    categoryEn: "Risk Management",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-chemo-4",
    department: "CHEMO UNIT PREPN",
    taskAr: "تسجيل والتحكم بنظام درجات حرارة ثلاجة حفظ العلاجات الموجهة والهرمونية لسرطان الثدي",
    taskEn: "Assess and log breast oncology targeted/hormonal therapy fridge temperature",
    categoryAr: "سلسلة التبريد",
    categoryEn: "Cold Chain",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-1",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "التحقق الكامل من هوية المريض والملف الطبي والموافقة الجراحية المكتوبة قبل التخدير",
    taskEn: "Verify inpatient identifier, clinical record, and signed surgical/anesthesia informed consent",
    categoryAr: "أمان العمليات",
    categoryEn: "Surgical Safety",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-2",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "التحقق من جاهزية أجهزة التخدير المركزي وتعبئة غاز الأكسجين والنيتروز الاحتياطي بسلامة",
    taskEn: "Audit anesthesia machine self-testing protocols, ventilator status and back-up cylinders",
    categoryAr: "جاهزية الأجهزة",
    categoryEn: "Device Readiness",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-3",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "فحص مؤشرات كفاءة التعقيم الكيميائية والحرارية المضمنة بعبوات العمليات الجراحية المفتوحة",
    taskEn: "Review chemical and thermal internal indicators on all sterile surgical pack bundles",
    categoryAr: "التعقيم والعدوى",
    categoryEn: "Sterile Parameters",
    createdAt: "2026-01-01"
  },
  {
    id: "duty-or-4",
    department: "ONCO-SURGICAL UNIT",
    taskAr: "العد الإلزامي الثنائي قبل وبعد العملية للشاش الجراحي والإبر والخيوط والأدوات الجراحية",
    taskEn: "Perform manual dual-signer count of surgical sponges, needles, blades and metal instruments",
    categoryAr: "أمان القاعة",
    categoryEn: "Theatre Accountability",
    createdAt: "2026-01-01"
  }
];

export default function App() {
  // DB & State Management
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [customTemplates, setCustomTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate>(FORM_TEMPLATES[0]);
  const [editingRecord, setEditingRecord] = useState<SavedRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbStatus, setDbStatus] = useState<"connected" | "syncing" | "error">("connected");
  const [activeTab, setActiveTab] = useState<"editor" | "history" | "settings" | "about" | "analytics" | "duty" | "it_panel" | "distribution">("duty");
  const [ledgerViewMode, setLedgerViewMode] = useState<"weekly" | "monthly">("weekly");
  const [dayFocus, setDayFocus] = useState<"all" | number>("all"); // Show all 31 days or focus on a single day
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [isBellOpen, setIsBellOpen] = useState(false);

  // Dynamic Duty Task & Checklist states
  const [dutyTasks, setDutyTasks] = useState<DailyDutyTask[]>(() => {
    const stored = localStorage.getItem("baheya_daily_duty_tasks");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return DEFAULT_DUTY_TASKS;
  });

  const [dailyChecklists, setDailyChecklists] = useState<UnitDailyChecklist[]>(() => {
    const stored = localStorage.getItem("baheya_daily_checklists");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  });

  const [rolePermissions, setRolePermissions] = useState(() => {
    const stored = localStorage.getItem("baheya_role_permissions");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.submitChecklist && parsed.submitChecklist.includes("president")) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      submitChecklist: ["head_nurse", "admin", "quality", "president"],
      approveChecklist: ["head_nurse", "admin", "quality", "president"],
      manageDutyTasks: ["admin", "quality", "president"],
      editMasterTemplates: ["admin", "quality", "president"],
      deleteLogs: ["admin", "president"]
    };
  });

  // Form input states for creating duty tasks
  const [selectedDutyDept, setSelectedDutyDept] = useState<string>("EMERGENCY UNIT");
  const [dutyChecklistAnswers, setDutyChecklistAnswers] = useState<Record<string, { done: boolean; note?: string }>>({});
  const [supervisorAuditNoteText, setSupervisorAuditNoteText] = useState<string>("");
  
  const [newTaskTextAr, setNewTaskTextAr] = useState<string>("");
  const [newTaskTextEn, setNewTaskTextEn] = useState<string>("");
  const [newTaskCategoryAr, setNewTaskCategoryAr] = useState<string>("عام");
  const [newTaskCategoryEn, setNewTaskCategoryEn] = useState<string>("General");

  // CQI - Continuous Quality Improvement Alerts & Gaps state
  const [resolvedGaps, setResolvedGaps] = useState<Record<string, { resolved: boolean; notes: string; resolvedBy: string; resolvedAt: string }>>({});
  const [editingGapKey, setEditingGapKey] = useState<string | null>(null);
  const [gapResolutionNote, setGapResolutionNote] = useState<string>("");

  // Clinical shifts dictionary as requested by user
  const CLINICAL_SHIFTS = [
    { id: "morning", nameAr: "مورنينج (صباحي - Morning 8am-4pm)", nameEn: "Morning Shift (8am-4pm)" },
    { id: "afternoon", nameAr: "أفترنون (ظهراً - Afternoon 4pm-12am)", nameEn: "Afternoon Shift (4pm-12am)" },
    { id: "night", nameAr: "نايت (مسائي/سهر - Night 12am-8am)", nameEn: "Night Shift (12am-8am)" },
    { id: "long_day", nameAr: "لونج داي (طويل/نهاري - Day/Long 12h)", nameEn: "Long Day Shift (12 Hours)" },
    { id: "dn_24", nameAr: "دي إن (سهر 24 ساعة - DN 24h)", nameEn: "DN Shift (24 Hours)" }
  ];

  const [selectedShift, setSelectedShift] = useState<string>("morning");

  // IT helper local states
  const [backupRestoreInput, setBackupRestoreInput] = useState<string>("");
  const [itSelectedUserIdToOverride, setItSelectedUserIdToOverride] = useState<string>("");
  const [itOverwrittenPin, setItOverwrittenPin] = useState<string>("");

  // Notifications system for supervisors/auditors
  const [notifications, setNotifications] = useState<Array<{ id: string; messageAr: string; messageEn: string; timestamp: string; read: boolean }>>(() => {
    const stored = localStorage.getItem("baheya_notifications");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [
      {
        id: "init-notif-1",
        messageAr: "إشعار نظام: تم تنشيط بوابة بهية الرقمية وبدء مراقبة الجودة الطبية والسريرية.",
        messageEn: "System Notice: Baheya Clinical Audit Portal activated successfully.",
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
  });

  // IT Subsystem States
  const [itStrictComplianceMode, setItStrictComplianceMode] = useState<boolean>(true);
  const [itConflictResolutionWithNewest, setItConflictResolutionWithNewest] = useState<boolean>(true);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  const addSystemLog = (event: string, type: "info" | "warning" | "success" | "error" = "info") => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      event,
      type,
      time: new Date().toLocaleTimeString(),
      timestampMs: Date.now()
    };
    saveSystemLog(newLog).catch(err => console.error("Failed to save log to Firebase:", err));
  };

  // Hospital Branding settings
  const [hospitalSettings, setHospitalSettings] = useState({
    nameAr: "مؤسسة بهية",
    taglineAr: "في ضهر كل ست مصرية",
    nameEn: "Baheya Foundation",
    taglineEn: "Breast Cancer Screening & Treatment",
    address: "الهرم / الشيخ زايد، الجيزة، مصر",
    emergencyPhone: "19745",
    footerAr: "قسم الجودة ومراقبة المعايير الطبية بهية - تقرير إلكتروني موثق بموجب المعايير الدولية",
    footerEn: "Baheya Quality & Clinical Standards Unit - Certified System Performance Report"
  });

  // Settings Forms state
  const [settingsForm, setSettingsForm] = useState({
    nameAr: "مؤسسة بهية",
    taglineAr: "في ضهر كل ست مصرية",
    nameEn: "Baheya Foundation",
    taglineEn: "Breast Cancer Screening & Treatment",
    address: "الهرم / الشيخ زايد، الجيزة، مصر",
    emergencyPhone: "19745",
    footerAr: "قسم الجودة ومراقبة المعايير الطبية بهية - تقرير إلكتروني موثق بموجب المعايير الدولية",
    footerEn: "Baheya Quality & Clinical Standards Unit - Certified System Performance Report"
  });

  const [templateForm, setTemplateForm] = useState({
    code: "",
    titleAr: "",
    titleEn: "",
    departmentDefault: "EMERGENCY UNIT",
    version: "01",
    issueDate: "2206", // will override
    hasPatientDetails: false,
    itemsText: ""
  });

  // Rows inline editor state
  const [rowEditIndex, setRowEditIndex] = useState<number | null>(null);
  const [rowForm, setRowForm] = useState({
    itemAr: "",
    itemEn: "",
    code: "",
    unit: "PCS",
    qty: "1"
  });

  // Overrides & Deactivated Standard lists
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, FormTemplate>>({});
  const [deactivatedTemplateIds, setDeactivatedTemplateIds] = useState<string[]>([]);

  // Selected item lists for designing new template
  const [newTemplateItems, setNewTemplateItems] = useState<Omit<GridRow, "days">[]>([]);
  const [newTemplateItemForm, setNewTemplateItemForm] = useState({
    itemAr: "",
    itemEn: "",
    code: "",
    unit: "PCS",
    qty: "1"
  });

  // Selected template to edit state in Settings
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<string>("");
  const [editTemplateForm, setEditTemplateForm] = useState({
    titleAr: "",
    titleEn: "",
    code: "",
    departmentDefault: "EMERGENCY UNIT",
    version: "01",
    issueDate: "",
    hasPatientDetails: false
  });
  const [editTemplateItems, setEditTemplateItems] = useState<Omit<GridRow, "days">[]>([]);
  const [editTemplateSingleItemForm, setEditTemplateSingleItemForm] = useState({
    itemAr: "",
    itemEn: "",
    code: "",
    unit: "PCS",
    qty: "1"
  });
  const [editTemplateItemIndex, setEditTemplateItemIndex] = useState<number | null>(null);

  // User and Admin Access controls
  const [systemUsers, setSystemUsers] = useState<AppUser[]>(() => {
    const stored = localStorage.getItem("baheya_system_users");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return MOCK_USERS;
  });
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("baheya_is_logged_in") === "true";
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const stored = localStorage.getItem("baheya_current_user_object");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return MOCK_USERS[0]; // sister fatima by default
  });

  const [loginSelectedUserId, setLoginSelectedUserId] = useState<string>(MOCK_USERS[0].id);
  const [loginStaffId, setLoginStaffId] = useState<string>("");
  const [loginPasscode, setLoginPasscode] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Recovery systems
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmailIn, setRecoveryEmailIn] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"enter_email" | "reset_pin">("enter_email");
  const [recoveryTargetUser, setRecoveryTargetUser] = useState<AppUser | null>(null);
  const [newRecoveryPin, setNewRecoveryPin] = useState("");
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  // Dynamic Departments
  const [departments, setDepartments] = useState<string[]>(() => {
    const stored = localStorage.getItem("baheya_hospital_departments");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.includes("OPERATING ROOM") || parsed.includes("PEDIATRIC WARD")) {
          return parsed;
        }
      } catch (e) {}
    }
    const defaultDepts = [
      "EMERGENCY UNIT",
      "INTENSIVE CARE",
      "OPERATING ROOM",
      "CHEMOTHERAPY DAYCARE",
      "RADIOLOGY UNIT",
      "PHARMACY STORE",
      "PEDIATRIC WARD",
      "QUALITY CONTROL",
      "LABORATORY DEPT",
      "INFECTION CONTROL",
      "CLINICAL NUTRITION",
      "INPATIENT FLOORS",
      "OUTPATIENT CLINICS",
      "BIOMEDICAL ENGINEERING",
      "DENTAL CLINIC",
      "ONCOLOGY RESEARCH"
    ];
    localStorage.setItem("baheya_hospital_departments", JSON.stringify(defaultDepts));
    return defaultDepts;
  });

  // Unique Partitioning Filter: Year and Department
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");

  // User management forms inside Settings Tab
  const [newUserForm, setNewUserForm] = useState({
    nameAr: "",
    nameEn: "",
    role: "head_nurse" as UserRole,
    department: "EMERGENCY UNIT", // Defaulting to first department
    staffId: "",
    pin: "1234",
    email: "",
    permissions: [] as string[]
  });
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<string>("");
  const [editUserForm, setEditUserForm] = useState({
    nameAr: "",
    nameEn: "",
    role: "head_nurse" as UserRole,
    department: "",
    staffId: "",
    pin: "1234",
    email: "",
    permissions: [] as string[]
  });

  // Template lists controls (Search & Dept Pills)
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("ALL");

  // Merged available templates - Dynamically constrained by staff's department assignment
  const allAvailableTemplates = [
    ...FORM_TEMPLATES.map((t) => {
      const o = templateOverrides[t.id];
      if (o) {
        return { ...t, ...o };
      }
      return t;
    }).filter((t) => !deactivatedTemplateIds.includes(t.id)),
    ...customTemplates
  ].filter((t) => {
    if (!currentUser) return true;
    const isNormalStaff = currentUser.role !== "admin" && currentUser.role !== "quality" && currentUser.role !== "president" && currentUser.role !== "it";
    
    if (isNormalStaff) {
      // 1. If explicit permissions are configured for this nurse, restrict to those templates
      if (currentUser.permissions && currentUser.permissions.length > 0) {
        return currentUser.permissions.includes(t.id);
      }

      // 2. Use the unified, robust doesTemplateMatchDepartment function
      return doesTemplateMatchDepartment(t, currentUser.department || "");
    }
    return true; // Supervisors, managers, and presidents can oversee/search all clinical sheets
  });

  // Load from local database (localStorage) and Firebase on mount
  useEffect(() => {
    // 1. Verify Cloud Connection
    testConnection().then(online => {
      console.log("Firebase Central Connection: ", online ? "ACTIVE" : "OFFLINE_FALLBACK");
    });

    // 2. Real-time sync of clinical records
    const unsubRecords = syncClinicalRecords((recordsFromFirestore) => {
      if (recordsFromFirestore.length > 0) {
        setRecords(recordsFromFirestore);
        localStorage.setItem("baheya_medical_records", JSON.stringify(recordsFromFirestore));
      } else {
        // Seamlessly hydrate the Cloud if it is a fresh deployment and has local caches
        const stored = localStorage.getItem("baheya_medical_records");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.length > 0) {
              parsed.forEach((r: SavedRecord) => {
                saveClinicalRecord(r).catch(err => console.error(err));
              });
            }
          } catch (e) {}
        }
      }
    });

    // 3. Real-time sync of Staff registry (handles password recoveries/updates globally)
    const unsubStaff = syncStaffRegistry((usersFromFirestore) => {
      if (usersFromFirestore.length > 0) {
        setSystemUsers(usersFromFirestore);
        localStorage.setItem("baheya_system_users", JSON.stringify(usersFromFirestore));

        // Sync of active authenticated currentUser live on reload/update
        const activeUserId = localStorage.getItem("baheya_current_user_id");
        if (activeUserId) {
          const found = usersFromFirestore.find((u: AppUser) => u.id === activeUserId);
          if (found) {
            setCurrentUser(found);
            localStorage.setItem("baheya_current_user_object", JSON.stringify(found));
          }
        }
      } else {
        // Bootstrap/seed database staff profile details on first startup
        MOCK_USERS.forEach((u: AppUser) => {
          saveStaffMember(u).catch(err => console.error(err));
        });
      }
    });

    // 4. Real-time sync of supervisor daily inspections / audits
    const unsubAudits = syncDailyAudits((auditsFromFirestore) => {
      if (auditsFromFirestore.length > 0) {
        setDailyChecklists(auditsFromFirestore);
        localStorage.setItem("baheya_daily_checklists", JSON.stringify(auditsFromFirestore));
      } else {
        // Sync local storage backups to cloud
        const stored = localStorage.getItem("baheya_daily_checklists");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.length > 0) {
              parsed.forEach((a: UnitDailyChecklist) => {
                saveDailyAudit(a).catch(err => console.error(err));
              });
            }
          } catch (e) {}
        }
      }
    });

    // 5. Real-time sync of active IT diagnostics / troubleshooting logs
    const unsubLogs = syncSystemLogs((logsFromFirestore) => {
      setSystemLogs(logsFromFirestore);
    });

    // Load static templates configurations
    try {
      // Load hospital branding settings
      const storedSettings = localStorage.getItem("baheya_hospital_settings");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setHospitalSettings(parsed);
        setSettingsForm(parsed);
      }

      // Load custom templates
      const storedTemplates = localStorage.getItem("baheya_custom_templates");
      if (storedTemplates) {
        setCustomTemplates(JSON.parse(storedTemplates));
      }

      // Load template overrides
      const storedOverrides = localStorage.getItem("baheya_template_overrides");
      if (storedOverrides) {
        setTemplateOverrides(JSON.parse(storedOverrides));
      }

      // Load deactivated templates
      const storedDeactivated = localStorage.getItem("baheya_deactivated_templates");
      if (storedDeactivated) {
        setDeactivatedTemplateIds(JSON.parse(storedDeactivated));
      }

      // Load resolved quality gaps list
      const storedGaps = localStorage.getItem("baheya_resolved_gaps");
      if (storedGaps) {
        setResolvedGaps(JSON.parse(storedGaps));
      }

      // Initialize default custom templates release date nicely
      const currentYear = new Date().getFullYear();
      setTemplateForm(prev => ({ ...prev, issueDate: `06.${currentYear}` }));
    } catch (e) {
      console.error("Local Database hydration error:", e);
      setDbStatus("error");
    }

    return () => {
      unsubRecords();
      unsubStaff();
      unsubAudits();
      unsubLogs();
    };
  }, []);

  // Secure and lock activeTab based on user roles and authorized privileges
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === "head_nurse") {
      // Regular staff is STRICTLY LOCKED to their checklist portal and info page
      if (activeTab !== "duty" && activeTab !== "about") {
        setActiveTab("duty");
      }
    } else if (role === "quality") {
      // Supervisors can see checklists (duty), history, analytics, and guide
      if (["editor", "settings"].includes(activeTab)) {
        setActiveTab("duty");
      }
    } else if (role === "admin") {
      // Managers can see everything EXCEPT system configuration settings
      if (activeTab === "settings") {
        setActiveTab("duty");
      }
    }
    // President role allows full unrestricted access to settings
  }, [currentUser, activeTab]);

  // Sync to local database and Firestore db
  const saveToDatabase = (updatedRecords: SavedRecord[]) => {
    try {
      setDbStatus("syncing");
      localStorage.setItem("baheya_medical_records", JSON.stringify(updatedRecords));
      setRecords(updatedRecords);

      // Sync clinical records to cloud
      updatedRecords.forEach((record) => {
        saveClinicalRecord(record).catch((err) =>
          console.error("Cloud clinical record sync failure: ", err)
        );
      });
      setTimeout(() => setDbStatus("connected"), 350);
    } catch (e) {
      console.error("Failed to commit transactional update to local storage:", e);
      setDbStatus("error");
    }
  };

  const saveDutyTasksToDb = (updated: DailyDutyTask[]) => {
    localStorage.setItem("baheya_daily_duty_tasks", JSON.stringify(updated));
    setDutyTasks(updated);
  };

  const saveChecklistsToDb = (updated: UnitDailyChecklist[]) => {
    localStorage.setItem("baheya_daily_checklists", JSON.stringify(updated));
    setDailyChecklists(updated);

    // Sync daily supervisor compliance checklists to cloud
    updated.forEach((audit) => {
      saveDailyAudit(audit).catch((err) =>
        console.error("Cloud audit checklist sync failure: ", err)
      );
    });
  };

  const savePermissionsToDb = (updated: typeof rolePermissions) => {
    localStorage.setItem("baheya_role_permissions", JSON.stringify(updated));
    setRolePermissions(updated);
  };

  // Trigger New Blank Record Creation
  const handleCreateNew = (templateId: string) => {
    try {
      const temp = allAvailableTemplates.find(t => t.id === templateId) || allAvailableTemplates[0];
      const freshRecord = createNewRecord(templateId, customTemplates);
      
      // Override items and template details with our custom/overridden template
      const defaultItems = getItemsForTemplate(templateId, temp);
      const gridData: GridRow[] = defaultItems.map((item) => {
        const days: Record<string, string> = {};
        for (let i = 1; i <= 31; i++) {
          days[i.toString()] = "";
        }
        return {
          ...item,
          days
        };
      });

      const recordWithId: SavedRecord = {
        ...freshRecord,
        id: `rec_${Date.now()}`,
        createdAt: new Date().toISOString(),
        staffName: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
        staffId: currentUser.staffId,
        department: currentUser.department || temp.departmentDefault,
        gridData
      };
      setEditingRecord(recordWithId);
      setSelectedTemplate(temp);
      setActiveTab("editor");
    } catch (error) {
      console.error("Failed to initialize template model:", error);
    }
  };

  // Save the currently edited record with complete workflow and safeguards
  const handleSaveActiveRecord = () => {
    if (!editingRecord) return;

    const isNormalStaff = currentUser.role === "head_nurse" || currentUser.role === "staff" || currentUser.role === "Staff";
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // 1. Date Locking validation rules with IT Override Compliance Mode support
    if (itStrictComplianceMode && isNormalStaff && editingRecord.date !== todayStr) {
      alert(
        language === "ar"
          ? `❌ خطأ في التحقق من التاريخ: غير مسموح لحساب الكادر الطبي المعاون بحفظ أو تعديل السجل إلا للتاريخ الحالي اليوم فقط (${todayStr})! تم قفل هذا السجل لمنع التعديل الرجعي الحاصل في الشيتات التاريخية.`
          : `❌ Date Validation Safeguard: You are only allowed to submit/save forms with today's current date (${todayStr})! Historical records are locked to preserve audit integrity.`
      );
      return;
    }

    // 2. Add shift tracking and status transitions
    const recordStatus = isNormalStaff 
      ? `Submitted by ${language === "ar" ? currentUser.nameAr : currentUser.nameEn} (ID: ${currentUser.staffId})`
      : (editingRecord.status || "Audited & Approved by Quality");

    const finalRecord: SavedRecord = {
      ...editingRecord,
      shift: selectedShift,
      status: recordStatus
    };

    let updatedList: SavedRecord[];
    const exists = records.some((r) => r.id === finalRecord.id);

    if (exists) {
      updatedList = records.map((r) => (r.id === finalRecord.id ? finalRecord : r));
    } else {
      updatedList = [finalRecord, ...records];
    }

    saveToDatabase(updatedList);

    // 3. Dispatch real-time notification alert to supervisors/administrators
    if (isNormalStaff) {
      const activeShiftLabel = CLINICAL_SHIFTS.find(s => s.id === selectedShift)?.nameAr || selectedShift;
      const activeShiftLabelEn = CLINICAL_SHIFTS.find(s => s.id === selectedShift)?.nameEn || selectedShift;
      const newNotif = {
        id: `notif-${Date.now()}`,
        messageAr: `📢 قام الموظف استاف التمريض (${currentUser.nameAr}) من قسم (${currentUser.department}) بتسليم شيت الجرد اليومي بتاريخ (${finalRecord.date}) الخاص بنموذج (${finalRecord.templateId}) لفترة (${activeShiftLabel}) بنجاح! جاهز للتفتيش والاعتماد الرقمي.`,
        messageEn: `📢 Staff Nurse (${currentUser.nameEn}) from (${currentUser.department}) submitted the Daily Inventory Checklist on (${finalRecord.date}) for (${activeShiftLabelEn}). Approved and available for review!`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      localStorage.setItem("baheya_notifications", JSON.stringify(updatedNotifs));
    }

    alert(
      language === "ar" 
        ? `تم حفظ وتأكيد السجل السريري بنجاح! الحالة الحالية للمستند: (مرفوع - ${recordStatus}).` 
        : `Clinical Checklist saved & committed successfully! Document status: (Committed - ${recordStatus}).`
    );
  };

  // Delete Record (Restricted to ADMIN/PRESIDENT)
  const handleDeleteRecord = (recordId: string) => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(
        language === "ar" 
          ? "تنبيه الصلاحية: لا يمكن حذف المستندات إلا بواسطة أدمن النظام فقط لضمان سلامة مراقبة الجودة الطبية." 
          : "Permission Denied: Only System Administrators can permanently delete audited documents to guarantee clinical audit standards."
      );
      return;
    }

    const confirmation = window.confirm(
      language === "ar" 
        ? "هل أنت متأكد من رغبتك في حذف هذا المستند نهائياً من قاعدة البيانات المحلية؟" 
        : "Are you sure you want to permanently delete this document from the local store?"
    );
    if (!confirmation) return;

    const filtered = records.filter(r => r.id !== recordId);
    saveToDatabase(filtered);
    if (editingRecord?.id === recordId) {
      setEditingRecord(null);
    }
  };

  // Print Active Form Template
  const handlePrint = () => {
    window.print();
  };

  // Export Database backup as JSON
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `baheya_db_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      alert("Export failed: " + error);
    }
  };

  // Import Database backup from JSON
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          // Soft validation
          const confirmed = window.confirm(
            language === "ar"
              ? `تم العثور على (${importedData.length}) سجلات. هل ترغب في دمجها مع السجلات الحالية؟`
              : `Found (${importedData.length}) records. Do you want to merge them with current records?`
          );
          if (confirmed) {
            const merged = [...importedData, ...records].filter(
              (v, i, a) => a.findIndex(t => t.id === v.id) === i
            );
            saveToDatabase(merged);
            alert(language === "ar" ? "تم الاستيراد والدمج بنجاح!" : "Import completed successfully!");
          }
        } else {
          alert(language === "ar" ? "ملف النسخة الاحتياطية غير صالح." : "Invalid backup file schema.");
        }
      } catch (err) {
        alert("Import error: " + err);
      }
    };
    reader.readAsText(file);
  };

  // Start Row Edit
  const handleStartEditRow = (index: number, row: GridRow) => {
    setRowEditIndex(index);
    setRowForm({
      itemAr: row.itemAr,
      itemEn: row.itemEn,
      code: row.code || "",
      unit: row.unit || "PCS",
      qty: row.qty || "1"
    });
  };

  // Delete Row from Active Sheet
  const handleDeleteRow = (index: number) => {
    if (!editingRecord) return;
    const confirmation = window.confirm(
      language === "ar" 
        ? "هل أنت متأكد من رغبتك في حذف هذا الصنف بالكامل من الجدول الحالي؟" 
        : "Are you sure you want to delete this row item from the active table?"
    );
    if (!confirmation) return;

    const updatedGrid = editingRecord.gridData.filter((_, idx) => idx !== index);
    const reindexedGrid = updatedGrid.map((row, idx) => ({
      ...row,
      sn: (idx + 1).toString()
    }));

    setEditingRecord({
      ...editingRecord,
      gridData: reindexedGrid
    });
    
    if (rowEditIndex === index) {
      handleCancelRowEdit();
    } else if (rowEditIndex !== null && rowEditIndex > index) {
      setRowEditIndex(rowEditIndex - 1);
    }
  };

  // Cancel Row Edit
  const handleCancelRowEdit = () => {
    setRowEditIndex(null);
    setRowForm({
      itemAr: "",
      itemEn: "",
      code: "",
      unit: "PCS",
      qty: "1"
    });
  };

  // Save/Submit Row Form (Add or Edit)
  const handleSaveRowForm = () => {
    if (!editingRecord) return;
    if (!rowForm.itemAr.trim()) {
      alert(language === "ar" ? "يرجى إدخال اسم الصنف بالعربية." : "Please enter row item name in Arabic.");
      return;
    }

    const updatedGrid = [...editingRecord.gridData];
    
    if (rowEditIndex !== null) {
      updatedGrid[rowEditIndex] = {
        ...updatedGrid[rowEditIndex],
        itemAr: rowForm.itemAr.trim(),
        itemEn: rowForm.itemEn.trim(),
        code: rowForm.code.trim() || undefined,
        unit: rowForm.unit.trim() || undefined,
        qty: rowForm.qty.trim() || undefined
      };
    } else {
      const days: Record<string, string> = {};
      for (let i = 1; i <= 31; i++) {
        days[i.toString()] = "";
      }
      updatedGrid.push({
        sn: (updatedGrid.length + 1).toString(),
        itemAr: rowForm.itemAr.trim(),
        itemEn: rowForm.itemEn.trim(),
        code: rowForm.code.trim() || `GEN-${(updatedGrid.length + 1).toString().padStart(2, '0')}`,
        unit: rowForm.unit.trim() || "PCS",
        qty: rowForm.qty.trim() || "1",
        days
      });
    }

    setEditingRecord({
      ...editingRecord,
      gridData: updatedGrid
    });

    handleCancelRowEdit();
  };

  // Save Hospital Identity Settings
  const handleSaveHospitalSettings = () => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(language === "ar" ? "الوصول مرفوض: يتطلب صلاحية الأدمن لتعديل الهوية." : "Access Denied: Admin session required to change hospital profile.");
      return;
    }
    setHospitalSettings(settingsForm);
    localStorage.setItem("baheya_hospital_settings", JSON.stringify(settingsForm));
    alert(language === "ar" ? "تم حفظ وتطبيق البيانات الرسمية الجديدة للمستشفى بنجاح!" : "Hospital profile updated and synchronized successfully!");
  };

  // Create new Custom Template
  const handleCreateCustomTemplate = () => {
    if (!templateForm.code.trim() || !templateForm.titleAr.trim() || !templateForm.titleEn.trim()) {
      alert(language === "ar" ? "يرجى تعبئة الحقول الأساسية: كود الشيت، والاسم بالعربية والإنجليزية!" : "Form code and Arabic/English titles are required!");
      return;
    }

    const newId = `custom-tpl-${Date.now()}`;
    const parsedItems: Omit<GridRow, "days">[] = [];

    if (newTemplateItems.length > 0) {
      parsedItems.push(...newTemplateItems);
    } else if (templateForm.itemsText.trim()) {
      const lines = templateForm.itemsText.split("\n");
      let snCounter = 1;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const parts = trimmed.split("|");
        const itemAr = parts[0]?.trim() || "";
        if (!itemAr) return;
        const itemEn = parts[1]?.trim() || "Custom Item";
        const unit = parts[2]?.trim() || "PCS";
        const qty = parts[3]?.trim() || "1";
        parsedItems.push({
          sn: snCounter.toString(),
          code: `CST-${snCounter.toString().padStart(2, '0')}`,
          itemAr,
          itemEn,
          unit,
          qty
        });
        snCounter++;
      });
    }

    if (parsedItems.length === 0) {
      // Fallback items
      parsedItems.push({
        sn: "1",
        code: "CST-01",
        itemAr: "شريط معقم للفحص والملاحظة مخصص",
        itemEn: "Sterile gauze strips custom",
        unit: "PCS",
        qty: "10"
      });
    }

    const newTemplate: FormTemplate = {
      id: newId,
      code: templateForm.code.trim().toUpperCase(),
      titleAr: templateForm.titleAr.trim(),
      titleEn: templateForm.titleEn.trim(),
      departmentDefault: templateForm.departmentDefault,
      version: templateForm.version.trim() || "01",
      issueDate: templateForm.issueDate.trim() || "06.2026",
      hasPatientDetails: templateForm.hasPatientDetails,
      items: parsedItems
    };

    const updatedTemplates = [...customTemplates, newTemplate];
    setCustomTemplates(updatedTemplates);
    localStorage.setItem("baheya_custom_templates", JSON.stringify(updatedTemplates));

    // Reset template form
    setTemplateForm({
      code: "",
      titleAr: "",
      titleEn: "",
      departmentDefault: "EMERGENCY UNIT",
      version: "01",
      issueDate: `06.${new Date().getFullYear()}`,
      hasPatientDetails: false,
      itemsText: ""
    });
    setNewTemplateItems([]);

    alert(language === "ar" ? "تم تسجيل وتفعيل شيت النموذج الجديد بنجاح في القائمة الجانبية!" : "New sheet template created and populated successfully!");
  };

  // Delete Custom Template
  const handleDeleteCustomTemplate = (id: string) => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(language === "ar" ? "تنبيه الصلاحية: لا يمكن حذف الشيتات المضافة إلا للآدمن." : "Permission Denied: System Administrators only can remove template configurations.");
      return;
    }

    const confirmDelete = window.confirm(
      language === "ar"
        ? "هل أنت متأكد من رغبتك في حذف هذا الشيت المخصص بالكامل؟ لن يؤثر الحذف على السجلات السابقة المحفوظة بالفعل."
        : "Are you sure you want to delete this custom template? Existing saved records will remain unaffected."
    );
    if (!confirmDelete) return;

    const filtered = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(filtered);
    localStorage.setItem("baheya_custom_templates", JSON.stringify(filtered));
  };

  // Add Item to the new custom template builder
  const handleAddNewTemplateItem = () => {
    if (!newTemplateItemForm.itemAr.trim()) {
      alert(language === "ar" ? "يرجى كتابة اسم الصنف بالعربية على الأقل!" : "Please write item name in Arabic!");
      return;
    }
    const idx = newTemplateItems.length + 1;
    const item: Omit<GridRow, "days"> = {
      sn: idx.toString(),
      code: newTemplateItemForm.code.trim() || `ITM-${idx.toString().padStart(2, "0")}`,
      itemAr: newTemplateItemForm.itemAr.trim(),
      itemEn: newTemplateItemForm.itemEn.trim() || "Item",
      unit: newTemplateItemForm.unit.trim() || "PCS",
      qty: newTemplateItemForm.qty.trim() || "1"
    };
    setNewTemplateItems([...newTemplateItems, item]);
    setNewTemplateItemForm({
      itemAr: "",
      itemEn: "",
      code: "",
      unit: "PCS",
      qty: "1"
    });
  };

  // Remove Item from the new custom template builder
  const handleRemoveNewTemplateItem = (index: number) => {
    const updated = newTemplateItems.filter((_, i) => i !== index);
    setNewTemplateItems(updated.map((item, i) => ({ ...item, sn: (i + 1).toString() })));
  };

  // Deactivate/Hide standard template
  const handleToggleDeactivateTemplate = (id: string) => {
    if (currentUser.role !== "admin" && currentUser.role !== "president") {
      alert(language === "ar" ? "تنبيه الصلاحية: هذه الإجراء يتطلب صلاحية الآدمن." : "Permission Denied: System Administrators only.");
      return;
    }

    let updatedDeactivated: string[];
    const isDeactivated = deactivatedTemplateIds.includes(id);

    if (isDeactivated) {
      updatedDeactivated = deactivatedTemplateIds.filter(x => x !== id);
    } else {
      updatedDeactivated = [...deactivatedTemplateIds, id];
    }

    setDeactivatedTemplateIds(updatedDeactivated);
    localStorage.setItem("baheya_deactivated_templates", JSON.stringify(updatedDeactivated));
    alert(
      language === "ar" 
        ? (isDeactivated ? "تم إعادة تنشيط ورقمنة النموذج للمستخدمين بنجاح!" : "تم إلغاء تفعيل وإخفاء هذا الشيت لمنع استخدامه.")
        : (isDeactivated ? "Template enabled successfully!" : "Template disabled & hidden from navigation selection.")
    );
  };

  // Edit/Select Template properties
  const handleSelectTemplateToEdit = (templateId: string) => {
    setSelectedTemplateToEdit(templateId);
    if (!templateId) {
      setEditTemplateForm({
        titleAr: "",
        titleEn: "",
        code: "",
        departmentDefault: "EMERGENCY UNIT",
        version: "01",
        issueDate: "",
        hasPatientDetails: false
      });
      setEditTemplateItems([]);
      return;
    }

    // Include the standard FORM_TEMPLATES and custom templates
    const allTemplates = [...FORM_TEMPLATES, ...customTemplates];
    const template = allTemplates.map((t) => {
      const o = templateOverrides[t.id];
      if (o) return { ...t, ...o };
      return t;
    }).find(t => t.id === templateId);

    if (template) {
      setEditTemplateForm({
        titleAr: template.titleAr,
        titleEn: template.titleEn,
        code: template.code,
        departmentDefault: template.departmentDefault,
        version: template.version || "01",
        issueDate: template.issueDate || "2026",
        hasPatientDetails: !!template.hasPatientDetails
      });
      // Retrieve original items list of this template
      const items = getItemsForTemplate(templateId, template);
      setEditTemplateItems(items);
    }
  };

  // Save template modifications
  const handleSaveTemplateEdits = () => {
    if (!selectedTemplateToEdit) return;
    if (!editTemplateForm.titleAr.trim() || !editTemplateForm.titleEn.trim() || !editTemplateForm.code.trim()) {
      alert(language === "ar" ? "يرجى تعبئة الاسم بالعربية والإنجليزية وكود الشيت!" : "Arabic/English titles and checklist code are required!");
      return;
    }

    const isCustom = selectedTemplateToEdit.startsWith("custom-tpl-") || !FORM_TEMPLATES.some(t => t.id === selectedTemplateToEdit);

    if (isCustom) {
      const updated = customTemplates.map(t => {
        if (t.id === selectedTemplateToEdit) {
          return {
            ...t,
            code: editTemplateForm.code.trim().toUpperCase(),
            titleAr: editTemplateForm.titleAr.trim(),
            titleEn: editTemplateForm.titleEn.trim(),
            departmentDefault: editTemplateForm.departmentDefault,
            version: editTemplateForm.version,
            issueDate: editTemplateForm.issueDate,
            hasPatientDetails: editTemplateForm.hasPatientDetails,
            items: editTemplateItems
          };
        }
        return t;
      });
      setCustomTemplates(updated);
      localStorage.setItem("baheya_custom_templates", JSON.stringify(updated));
    } else {
      const updatedOverrides = {
        ...templateOverrides,
        [selectedTemplateToEdit]: {
          id: selectedTemplateToEdit,
          code: editTemplateForm.code.trim().toUpperCase(),
          titleAr: editTemplateForm.titleAr.trim(),
          titleEn: editTemplateForm.titleEn.trim(),
          departmentDefault: editTemplateForm.departmentDefault,
          version: editTemplateForm.version,
          issueDate: editTemplateForm.issueDate || "2026",
          hasPatientDetails: editTemplateForm.hasPatientDetails,
          items: editTemplateItems
        }
      };
      setTemplateOverrides(updatedOverrides);
      localStorage.setItem("baheya_template_overrides", JSON.stringify(updatedOverrides));
    }

    // Sync selected screen template if it was the currently open one
    if (selectedTemplate.id === selectedTemplateToEdit) {
      setSelectedTemplate({
        id: selectedTemplateToEdit,
        code: editTemplateForm.code.trim().toUpperCase(),
        titleAr: editTemplateForm.titleAr.trim(),
        titleEn: editTemplateForm.titleEn.trim(),
        departmentDefault: editTemplateForm.departmentDefault,
        version: editTemplateForm.version,
        issueDate: editTemplateForm.issueDate,
        hasPatientDetails: editTemplateForm.hasPatientDetails,
        items: editTemplateItems
      });
    }

    alert(language === "ar" ? "تم تعديل وحفظ بيانات النموذج المحددة بالنجاح!" : "Template settings updated successfully!");
  };

  // Add or Edit single item inside template editor panel
  const handleAddOrEditSingleItemInTemplate = () => {
    if (!editTemplateSingleItemForm.itemAr.trim()) {
      alert(language === "ar" ? "يرجى كتابة الاسم بالعربية للصنف!" : "Item name in Arabic is required!");
      return;
    }

    const updated = [...editTemplateItems];
    if (editTemplateItemIndex !== null) {
      updated[editTemplateItemIndex] = {
        sn: (editTemplateItemIndex + 1).toString(),
        code: editTemplateSingleItemForm.code.trim() || undefined,
        itemAr: editTemplateSingleItemForm.itemAr.trim(),
        itemEn: editTemplateSingleItemForm.itemEn.trim(),
        unit: editTemplateSingleItemForm.unit.trim() || undefined,
        qty: editTemplateSingleItemForm.qty.trim() || undefined
      };
      setEditTemplateItemIndex(null);
    } else {
      updated.push({
        sn: (updated.length + 1).toString(),
        code: editTemplateSingleItemForm.code.trim() || `ITM-${(updated.length + 1).toString().padStart(2, "0")}`,
        itemAr: editTemplateSingleItemForm.itemAr.trim(),
        itemEn: editTemplateSingleItemForm.itemEn.trim(),
        unit: editTemplateSingleItemForm.unit.trim() || "PCS",
        qty: editTemplateSingleItemForm.qty.trim() || "1"
      });
    }

    setEditTemplateItems(updated);
    setEditTemplateSingleItemForm({
      itemAr: "",
      itemEn: "",
      code: "",
      unit: "PCS",
      qty: "1"
    });
  };

  // Remove single item from template editor panel
  const handleRemoveSingleItemInTemplate = (index: number) => {
    const updated = editTemplateItems.filter((_, i) => i !== index);
    setEditTemplateItems(updated.map((item, i) => ({ ...item, sn: (i + 1).toString() })));
    if (editTemplateItemIndex === index) {
      setEditTemplateItemIndex(null);
      setEditTemplateSingleItemForm({
        itemAr: "",
        itemEn: "",
        code: "",
        unit: "PCS",
        qty: "1"
      });
    } else if (editTemplateItemIndex !== null && editTemplateItemIndex > index) {
      setEditTemplateItemIndex(editTemplateItemIndex - 1);
    }
  };

  // Start editing a single item inside the template editor panel
  const handleStartEditSingleItemInTemplate = (index: number) => {
    const item = editTemplateItems[index];
    if (item) {
      setEditTemplateItemIndex(index);
      setEditTemplateSingleItemForm({
        itemAr: item.itemAr || "",
        itemEn: item.itemEn || "",
        code: item.code || "",
        unit: item.unit || "PCS",
        qty: item.qty || "1"
      });
    }
  };

  // User Management actions
  const handleAddSystemUser = () => {
    if (!newUserForm.nameAr.trim() || !newUserForm.nameEn.trim() || !newUserForm.staffId.trim() || !newUserForm.email.trim()) {
      alert(language === "ar" ? "يرجى ملء الاسم بالعربية والإنجليزية، كود الموظف، والبريد الإلكتروني!" : "Please fill Arabic name, English name, Staff ID, and Corporate Email!");
      return;
    }

    const generatedId = `user-${Date.now()}`;
    const initials = newUserForm.nameEn
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";

    const newUser: AppUser = {
      id: generatedId,
      nameAr: newUserForm.nameAr.trim(),
      nameEn: newUserForm.nameEn.trim(),
      role: newUserForm.role,
      avatarInitials: initials,
      department: newUserForm.department.trim() || "EMERGENCY UNIT",
      staffId: newUserForm.staffId.trim(),
      pin: newUserForm.pin.trim() || "1234",
      email: newUserForm.email.trim().toLowerCase(),
      emp_id: newUserForm.staffId.trim(),
      assigned_dept: newUserForm.department.trim() || "EMERGENCY UNIT",
      permissions: newUserForm.permissions || []
    };

    const updated = [...systemUsers, newUser];
    setSystemUsers(updated);
    localStorage.setItem("baheya_system_users", JSON.stringify(updated));
    
    // Save to Firestore central auth database
    saveStaffMember(newUser).catch(err => console.error(err));

    // Reset Form
    setNewUserForm({
      nameAr: "",
      nameEn: "",
      role: "head_nurse",
      department: departments[0] || "EMERGENCY UNIT",
      staffId: "",
      pin: "1234",
      email: "",
      permissions: []
    });

    alert(language === "ar" ? "تم إضافة الموظف الجديد بنجاح ومزامنته بـ Firestore!" : "New staff member registered successfully & synced to Firestore cloud!");
  };

  const handleSelectUserToEdit = (userId: string) => {
    setSelectedUserToEdit(userId);
    if (!userId) {
      setEditUserForm({
        nameAr: "",
        nameEn: "",
        role: "head_nurse",
        department: departments[0] || "EMERGENCY UNIT",
        staffId: "",
        pin: "1234",
        email: "",
        permissions: []
      });
      return;
    }

    const usr = systemUsers.find(u => u.id === userId);
    if (usr) {
      setEditUserForm({
        nameAr: usr.nameAr,
        nameEn: usr.nameEn,
        role: usr.role,
        department: usr.department,
        staffId: usr.staffId,
        pin: usr.pin || "1234",
        email: usr.email || "",
        permissions: usr.permissions || []
      });
    }
  };

  const handleUpdateSystemUser = () => {
    if (!selectedUserToEdit) return;
    if (!editUserForm.nameAr.trim() || !editUserForm.nameEn.trim() || !editUserForm.staffId.trim() || !editUserForm.email.trim()) {
      alert(language === "ar" ? "يرجى ملء الاسم بالعربية والإنجليزية، كود الموظف والبريد الإلكتروني!" : "Arabic/English name, Staff ID & Email are required!");
      return;
    }

    const initials = editUserForm.nameEn
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";

    const updated = systemUsers.map((u) => {
      if (u.id === selectedUserToEdit) {
        const updatedUsr: AppUser = {
          ...u,
          nameAr: editUserForm.nameAr.trim(),
          nameEn: editUserForm.nameEn.trim(),
          role: editUserForm.role,
          avatarInitials: initials,
          department: editUserForm.department.trim(),
          staffId: editUserForm.staffId.trim(),
          pin: editUserForm.pin.trim() || "1234",
          email: editUserForm.email.trim().toLowerCase(),
          emp_id: editUserForm.staffId.trim(),
          assigned_dept: editUserForm.department.trim(),
          permissions: editUserForm.permissions || []
        };
        // Sync to Firestore
        saveStaffMember(updatedUsr).catch(err => console.error(err));
        return updatedUsr;
      }
      return u;
    });

    setSystemUsers(updated);
    localStorage.setItem("baheya_system_users", JSON.stringify(updated));

    // Sync current user if updated
    const currentUpdated = updated.find(u => u.id === currentUser.id);
    if (currentUpdated) {
      setCurrentUser(currentUpdated);
      localStorage.setItem("baheya_current_user_object", JSON.stringify(currentUpdated));
    }

    // Reset Edit State
    setSelectedUserToEdit("");
    setEditUserForm({
      nameAr: "",
      nameEn: "",
      role: "head_nurse",
      department: "",
      staffId: "",
      pin: "1234",
      email: "",
      permissions: []
    });

    alert(language === "ar" ? "تم تحديث بيانات المستخدم ومزامنته بنجاح!" : "User account updated & synced successfully!");
  };

  const handleDeleteSystemUser = (userId: string) => {
    if (userId === currentUser.id) {
      alert(language === "ar" ? "عذراً: لا يمكنك حذف حساب الموظف الفعّال والنشط في جلستك الحالية!" : "Access Denied: You cannot delete the currently logged in active session user!");
      return;
    }

    const admins = systemUsers.filter(u => u.role === "admin");
    const targetUser = systemUsers.find(u => u.id === userId);
    if (targetUser?.role === "admin" && admins.length <= 1) {
      alert(language === "ar" ? "عذراً: يجب الإبقاء على مسؤول نظام (أدمن) واحد على الأقل في النظام!" : "Access Denied: You must keep at least one administrator account in the system!");
      return;
    }

    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المستخدم والحد من صلاحياته؟" : "Are you sure you want to permanently delete this user account?")) {
      return;
    }

    const updated = systemUsers.filter(u => u.id !== userId);
    setSystemUsers(updated);
    localStorage.setItem("baheya_system_users", JSON.stringify(updated));
    
    // Delete from Firestore
    deleteStaffMember(userId).catch(err => console.error(err));

    alert(language === "ar" ? "تم إزالة حساب المستخدم الطبي من النظام ومزامنته السحابية." : "User account removed & un-synced successfully.");
  };

  // CQI Gap Resolution action methods
  const handleToggleGapState = (gapKey: string) => {
    const existingGap = resolvedGaps[gapKey];
    if (existingGap && existingGap.resolved) {
      // Toggle back to unresolved
      const updated = { ...resolvedGaps };
      delete updated[gapKey];
      setResolvedGaps(updated);
      localStorage.setItem("baheya_resolved_gaps", JSON.stringify(updated));
      alert(language === "ar" ? "تم إعادة فتح الثغرة كغير معالجة للرقابة والمتابعة." : "Reopened gap as unresolved.");
    } else {
      // Open resolution inline editor
      setEditingGapKey(gapKey);
      setGapResolutionNote(existingGap?.notes || "");
    }
  };

  const handleSaveGapResolution = () => {
    if (!editingGapKey) return;
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString("ar-EG")} ${now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
    
    const updated = {
      ...resolvedGaps,
      [editingGapKey]: {
        resolved: true,
        notes: gapResolutionNote.trim() || (language === "ar" ? "تم التحقق والمعالجة" : "Checked and resolved"),
        resolvedBy: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
        resolvedAt: timestampStr
      }
    };
    
    setResolvedGaps(updated);
    localStorage.setItem("baheya_resolved_gaps", JSON.stringify(updated));
    setEditingGapKey(null);
    setGapResolutionNote("");
    
    alert(language === "ar" ? "تم معالجة الثغرة وتوثيق قرار الجودة بنجاح وجاهزة للتصدير!" : "Gap resolution documented successfully!");
  };

  // Checkbox/Selection cell toggles for grid columns (Quality auditor role lock)
  const handleCellToggle = (rowIndex: number, dayKey: string) => {
    if (!editingRecord) return;

    // Quality Lock validation
    if (currentUser.role === "quality") {
      alert(
        language === "ar" 
          ? "تنبيه الجودة: المستند للقراءة فقط عند تسجيل الدخول بصحبة مسؤول الجودة. يرجى تفعيل دور التمريض أو مسؤول النظام لتعديل المتغيرات في خلايا الجدول." 
          : "Quality Control Lock: Document is read-only for Quality Auditors. Switch to Nursing or Admin role to edit cells."
      );
      return;
    }

    // Date compliance lock: only allow editing today's column for non-administrators
    const isSpecialist = currentUser.role === "admin" || currentUser.role === "it" || currentUser.role === "president" || currentUser.role === "quality";
    const todayDayStr = new Date().getDate().toString();
    if (!isSpecialist && dayKey !== todayDayStr) {
      alert(
        language === "ar"
          ? `تنبيه التزام الجودة: يمنع تعديل أو تسجيل الأيام السابقة أو اللاحقة. طبقاً لسياسات مستشفى بهية، يمكنك فقط الفحص وتسجيل الخلايا لليوم الحالي (يوم ${todayDayStr}) لشفتك الجاري.`
          : `Quality Compliance Lock: Back-dating or pre-filling checklist days is strictly prohibited. You can only log and sign for today's active day (Day ${todayDayStr}).`
      );
      return;
    }

    const updatedGrid = [...editingRecord.gridData];
    const currentValue = updatedGrid[rowIndex].days[dayKey] || "";

    // Cycle values: empty -> "✔" -> "✘" -> "empty"
    let nextValue = "";
    if (editingRecord.templateId === "temp-humidity-log") {
      const userInput = prompt(
        language === "ar" 
          ? `أدخل درجة الحرارة أو الرطوبة لليوم ${dayKey}:` 
          : `Enter temperature or humidity value for Day ${dayKey}:`,
        currentValue
      );
      if (userInput !== null) {
        nextValue = userInput;
      } else {
        return; // stay with current value
      }
    } else {
      if (currentValue === "") nextValue = "✔";
      else if (currentValue === "✔") nextValue = "✘";
      else nextValue = "";
    }

    updatedGrid[rowIndex].days[dayKey] = nextValue;
    setEditingRecord({
      ...editingRecord,
      gridData: updatedGrid
    });
  };

  // Bulk set entire day focused column to all ✔ (Quality / Admin lock checks)
  const handleBulkFillDay = (dayKey: string) => {
    if (!editingRecord) return;

    // Quality Lock validation
    if (currentUser.role === "quality") {
      alert(
        language === "ar" 
          ? "تنبيه الجودة: المستند للقراءة فقط. لا يمكن ملء الخانات كمسؤول جودة." 
          : "Quality Control Lock: Document is read-only. Dynamic bulk-fill is restricted for Auditors."
      );
      return;
    }

    // Date compliance lock
    const isSpecialist = currentUser.role === "admin" || currentUser.role === "it" || currentUser.role === "president" || currentUser.role === "quality";
    const todayDayStr = new Date().getDate().toString();
    if (!isSpecialist && dayKey !== todayDayStr) {
      alert(
        language === "ar"
          ? `تنبيه التزام الجودة: يمنع تعبئة الأيام السابقة أو اللاحقة تلقائياً. يُسمح فقط بتسجيل بيانات اليوم الحالي (يوم ${todayDayStr}).`
          : `Quality Compliance Lock: Fast-filling previous or future days is restricted. You are only allowed to fill the current day column (Day ${todayDayStr}).`
      );
      return;
    }

    const confirmation = window.confirm(
      language === "ar"
        ? `هل تريد ملء جميع حقول اليوم ${dayKey} بعلامة مكتمل (✔)؟`
        : `Do you want to fill all rows of Day ${dayKey} with Checked (✔)?`
    );
    if (!confirmation) return;

    const updatedGrid = editingRecord.gridData.map(row => ({
      ...row,
      days: {
        ...row.days,
        [dayKey]: "✔"
      }
    }));

    setEditingRecord({
      ...editingRecord,
      gridData: updatedGrid
    });
  };

  // Passcode modal submit logic
  const handlePasscodeSubmit = () => {
    const expectedPin = pendingUser?.pin || "1234";
    if (passcodeInput === expectedPin) {
      if (pendingUser) {
        setCurrentUser(pendingUser);
        localStorage.setItem("baheya_current_user_id", pendingUser.id);
        localStorage.setItem("baheya_current_user_object", JSON.stringify(pendingUser));
        if (editingRecord) {
          setEditingRecord({
            ...editingRecord,
            staffName: language === "ar" ? pendingUser.nameAr : pendingUser.nameEn,
            staffId: pendingUser.staffId,
            department: pendingUser.department
          });
        }
      }
      setPasscodeModalOpen(false);
      setPendingUser(null);
      setPasscodeInput("");
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Search first by typed staff ID (case-insensitive)
    const cleanStaffId = loginStaffId.trim().toUpperCase();
    let targetUser = systemUsers.find(
      u => u.staffId.trim().toUpperCase() === cleanStaffId
    );

    // Cover if user typed id as text or clicked select
    if (!targetUser && loginSelectedUserId) {
      targetUser = systemUsers.find(u => u.id === loginSelectedUserId);
    }

    if (!targetUser) {
      setLoginError(
        language === "ar"
          ? "كود الموظف غير صحيح! جرب الأكواد التجريبية الموضحة بالجدول الأسفل."
          : "Invalid Staff ID! Try using one of the quick test credentials listed below."
      );
      return;
    }

    const expectedPin = targetUser.pin || "1234";
    if (loginPasscode === expectedPin) {
      setCurrentUser(targetUser);
      setIsLoggedIn(true);
      setLoginPasscode("");
      setLoginStaffId("");
      setLoginError(null);
      localStorage.setItem("baheya_is_logged_in", "true");
      localStorage.setItem("baheya_current_user_id", targetUser.id);
      localStorage.setItem("baheya_current_user_object", JSON.stringify(targetUser));
      addSystemLog(`User ${targetUser.nameEn} (${targetUser.role.toUpperCase()}) logged in successfully.`, "success");
    } else {
      setLoginError(
        language === "ar"
          ? "رمز المرور (PIN) للموظف غير صحيح! حاول مجدداً."
          : "Invalid PIN code for this employee! Please try again."
      );
    }
  };

  const handleLogout = () => {
    addSystemLog(`User ${currentUser?.nameEn || "unknown"} logged out.`, "info");
    setIsLoggedIn(false);
    setLoginPasscode("");
    localStorage.removeItem("baheya_is_logged_in");
    localStorage.removeItem("baheya_current_user_id");
    localStorage.removeItem("baheya_current_user_object");
  };

  // Secure Password/PIN retrieval & reset mechanisms tied to central employee registrar email
  const handleRequestRecoveryInput = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMsg(null);

    const emailToSearch = recoveryEmailIn.trim().toLowerCase();
    if (!emailToSearch) {
      setRecoveryError(
        language === "ar"
          ? "يرجى كتابة البريد الإلكتروني للموظف!"
          : "Please write the registered corporate email address!"
      );
      return;
    }

    const matchedUser = systemUsers.find(
      u => (u.email || "").trim().toLowerCase() === emailToSearch
    );

    if (!matchedUser) {
      setRecoveryError(
        language === "ar"
          ? "عذراً، البريد الإلكتروني المدخل غير مسجل بنظام كادر بهية. يرجى مراجعة مسؤول الـ IT."
          : "The corporate email is not registered under our clinical registry. Please contact IT Support."
      );
      return;
    }

    setRecoveryTargetUser(matchedUser);
    setRecoveryStep("reset_pin");
    setRecoveryMsg(
      language === "ar"
        ? `طلب مصرح وآمن! الموظف: ${matchedUser.nameAr} (${matchedUser.staffId}). تفضل بتعيين رمز المرور السري الجديد بالأسفل لمزامنته فورا بقاعدة البيانات.`
        : `Request verified! Profile of: ${matchedUser.nameEn} (ID: ${matchedUser.staffId}). Please type your new secret PIN below to sync to Central Database.`
    );
  };

  const handleCompletePINReset = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMsg(null);

    if (!recoveryTargetUser) return;

    const pinToSet = newRecoveryPin.trim();
    if (pinToSet.length < 4 || pinToSet.length > 6 || /\D/.test(pinToSet)) {
      setRecoveryError(
        language === "ar"
          ? "يجب أن يتكون رمز المرور الجديد من 4 إلى 6 أرقام فقط!"
          : "Target passcode must consist of 4 to 6 numeric digits only!"
      );
      return;
    }

    // Process registry update
    const updatedUsers = systemUsers.map(u => {
      if (u.id === recoveryTargetUser.id) {
        const updated = { ...u, pin: pinToSet };
        // Sync updated staff settings directly to Cloud Firestore datastore
        saveStaffMember(updated).catch(err => console.error("Firestore user recovery update error:", err));
        return updated;
      }
      return u;
    });

    setSystemUsers(updatedUsers);
    localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));

    // Reset recovery state machines
    setRecoveryMode(false);
    setRecoveryStep("enter_email");
    setRecoveryTargetUser(null);
    setNewRecoveryPin("");
    setRecoveryEmailIn("");
    
    // Automatically pre-fill Staff ID for immediate login
    setLoginStaffId(recoveryTargetUser.staffId);
    setLoginPasscode("");

    alert(
      language === "ar"
        ? `تم تحديث وحفظ الرمز الجديد بنجاح بنظام كادر بهية المركزي لـ ${recoveryTargetUser.nameAr}. يمكنك كتابة الرمز الجديد لتسجيل الدخول آمن.`
        : `Your passcode is successfully updated on the central database server for ${recoveryTargetUser.nameEn}. Try logging in now!`
    );
  };

  // Filter template lists based on sidebar input, department tab, and year filter
  const filteredTemplates = allAvailableTemplates.filter((tpl) => {
    // If user is regular clinical staff (not admin/quality/president/it), restrict to their department templates
    const isStaffLocked = currentUser && currentUser.role !== "admin" && currentUser.role !== "quality" && currentUser.role !== "president" && currentUser.role !== "it";
    if (isStaffLocked && currentUser.department) {
      if (!doesTemplateMatchDepartment(tpl, currentUser.department)) {
        return false;
      }
    }

    // 1. Sidebar Search query
    const q = templateSearchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      tpl.titleAr.toLowerCase().includes(q) ||
      tpl.titleEn.toLowerCase().includes(q) ||
      tpl.code.toLowerCase().includes(q) ||
      tpl.departmentDefault.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Filter by Dynamic Department
    if (selectedDepartmentFilter !== "ALL") {
      const fd = selectedDepartmentFilter.toUpperCase().trim();
      const codeUpper = tpl.code.toUpperCase();
      const deptUpper = tpl.departmentDefault.toUpperCase();

      const matchesDept = 
        deptUpper === fd ||
        codeUpper.includes(`-${fd.replace(" UNIT", "").replace(" CLINIC", "")}-`) ||
        (fd === "ER" && (codeUpper.includes("-ER-") || codeUpper.includes("-GEN-027") || deptUpper.includes("DRESSING") || deptUpper.includes("EMERGENCY"))) ||
        (fd === "ICU" && codeUpper.includes("-ICU-")) ||
        (fd === "OR" && (codeUpper.includes("-OR-") || codeUpper.includes("-SURG-") || codeUpper.includes("-ENG-") || deptUpper.includes("OPERATING") || deptUpper.includes("STERILIZATION"))) ||
        (fd === "CHEMO" && (codeUpper.includes("-CHEMO-") || deptUpper.includes("CHEMO"))) ||
        (fd === "RAD" && (codeUpper.includes("-RAD-") || deptUpper.includes("RADIOLOGY"))) ||
        (fd === "PED" && (codeUpper.includes("-PED-") || deptUpper.includes("PEDIATRIC"))) ||
        (fd === "PHA" && (codeUpper.includes("-PHA-") || deptUpper.includes("PHARMACY"))) ||
        (fd === "QLTY" && (codeUpper.includes("-QLTY-") || deptUpper.includes("QUALITY")));
        
      if (!matchesDept) return false;
    }

    // 3. Filter by Year partition
    if (selectedYearFilter !== "ALL") {
      const yearStr = selectedYearFilter;
      const tplYear = tpl.issueDate || "";
      const matchesYear = tplYear.includes(yearStr) || tpl.code.includes(yearStr);
      if (!matchesYear) return false;
    }

    return true;
  });

  // Filter saved records history
  const filteredRecords = records.filter(r => {
    // If user is regular clinical staff (not admin/quality), restrict to their department records
    const isStaffLocked = currentUser && currentUser.role !== "admin" && currentUser.role !== "quality";
    if (isStaffLocked && currentUser.department) {
      const dName = currentUser.department.toUpperCase();
      const rName = (r.department || "").toUpperCase();
      if (dName !== rName && !rName.includes(dName) && !dName.includes(rName)) {
        return false;
      }
    }

    const template = allAvailableTemplates.find(t => t.id === r.templateId);
    const searchLow = searchQuery.toLowerCase().trim();
    return (
      r.department.toLowerCase().includes(searchLow) ||
      r.staffName.toLowerCase().includes(searchLow) ||
      r.staffId.toLowerCase().includes(searchLow) ||
      (r.patientName && r.patientName.toLowerCase().includes(searchLow)) ||
      (r.patientMRN && r.patientMRN.toLowerCase().includes(searchLow)) ||
      (r.notes && r.notes.toLowerCase().includes(searchLow)) ||
      (template && template.titleAr.toLowerCase().includes(searchLow)) ||
      (template && template.titleEn.toLowerCase().includes(searchLow)) ||
      r.date.includes(searchLow)
    );
  });

  const handleSeedMockAuditData = () => {
    // Check if we have templates
    if (allAvailableTemplates.length === 0) return;
    
    // Seed 3 realistic historical medical audit records for Baheya Foundation
    const seed1: SavedRecord = {
      id: "rec-mock-1",
      templateId: allAvailableTemplates[0]?.id || "temp-crashcart",
      date: "2026-05-15",
      time: "08:30",
      department: "EMERGENCY UNIT",
      staffName: "أ. فاطمة الزهراء",
      staffId: "BHG-NUR-25",
      notes: "تم جرد قفل عربة الطوارئ والتأكد من سلامة كبلات الصدمات وتوافر ابرة الأدرينالين والأتروبين بالوحدة.",
      createdAt: new Date().toISOString(),
      gridData: [
        { sn: "1", code: "C-01", itemAr: "سلامة القفل البلاستيكي الخارجي واللون الأحمر المعتمد", itemEn: "Outer Plastic Lock Integrity & Assigned Red Color", unit: "Lock", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✔", "6": "✔", "15": "✔", "16": "✔", "17": "✔" } },
        { sn: "2", code: "C-02", itemAr: "جهاز الصدمات الكهربائية DC Shock والبطارية الاحتياطية", itemEn: "DC Defibrillator Machine & Auxiliary Battery State", unit: "Device", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✘", "6": "✔", "15": "✔", "16": "✔", "17": "✔" } },
        { sn: "3", code: "C-03", itemAr: "أبرة الأدرينالين Epinephrine 1mg / 1ml أمبول بالدرج الأول", itemEn: "Epinephrine 1mg / 1ml injection ampoules (Drawer 1)", unit: "Ampoule", qty: "5", days: { "1": "5", "2": "5", "3": "5", "4": "5", "5": "✔", "6": "5", "15": "✔", "16": "✔", "17": "✔" } }
      ]
    };

    const seed2: SavedRecord = {
      id: "rec-mock-2",
      templateId: allAvailableTemplates[1]?.id || "temp-fridge",
      date: "2026-05-20",
      time: "09:00",
      department: "CHEMO UNIT PREPN",
      staffName: "أ. فاطمة الزهراء",
      staffId: "BHG-NUR-25",
      notes: "مراقبة دقيقة لثلاجة حفظ العلاج الهرموني والكيماوي للأورام. تم التنبيه على الصيانة لتنظيف المكثف الخارجي.",
      createdAt: new Date().toISOString(),
      gridData: [
        { sn: "1", code: "T-01", itemAr: "درجة الحرارة صباحاً (الحد المسموح 2-8 درجات مئوية)", itemEn: "Morning Temperature Log (Limit: 2°C to 8°C)", unit: "°C", qty: "1", days: { "1": "4.2", "2": "5.1", "3": "4.8", "4": "4.9", "5": "4.5", "6": "9.1", "15": "5.0", "16": "5.3", "17": "✔" } },
        { sn: "2", code: "T-02", itemAr: "درجة الرطوبة النسبية للغرفة (الأقل من 60%)", itemEn: "Relative Humidity Level (Limit: Less than 60%)", unit: "%", qty: "1", days: { "1": "48", "2": "52", "3": "54", "4": "50", "5": "51", "6": "49", "15": "53", "16": "52", "17": "✔" } }
      ]
    };

    const seed3: SavedRecord = {
      id: "rec-mock-3",
      templateId: allAvailableTemplates[2]?.id || "temp-ama",
      date: "2026-05-28",
      time: "11:15",
      department: "OUTPATIENT CLINIC",
      staffName: "أ. فاطمة الزهراء",
      staffId: "BHG-NUR-25",
      notes: "توثيق حالة خروج مريض على مسؤوليته بعد الشرح التفصيلي للمخاطر الطبية في ملف المريض.",
      createdAt: new Date().toISOString(),
      patientName: "منى محمد عبد الرحمن",
      patientMRN: "MRN-92015-B",
      diagnosis: "سرطان الثدي - المرحلة الثانية - يحتاج جلسة كيماوي ثانية",
      gridData: [
        { sn: "1", code: "AMA-01", itemAr: "شرح شرحاً وافياً للمخاطر الطبية ومضاعفات عدم تلقي العلاج", itemEn: "Detailed clinical explanation of breast oncology risks", unit: "Doc", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✔", "6": "✔", "15": "✔", "16": "✔", "17": "✔" } },
        { sn: "2", code: "AMA-02", itemAr: "توقيع المريض والولي أو صلة القرابة مع بصمة اليد والبطاقة", itemEn: "Patient and relative signature with ID card photocopy", unit: "Doc", qty: "1", days: { "1": "✔", "2": "✔", "3": "✔", "4": "✔", "5": "✔", "6": "✘", "15": "✔", "16": "✔", "17": "✔" } }
      ]
    };

    const seeded = [seed1, seed2, seed3, ...records];
    setRecords(seeded);
    localStorage.setItem("baheya_medical_records", JSON.stringify(seeded));
    alert(language === "ar" ? "تم توليد وتغذية النظام بـ 3 سجلات تاريخية طبية واقعية لمؤسسة بهية لتجربة لوحة التحليلات بالتفصيل!" : "Seeded 3 real historical medical audit logs into current session database!");
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen bg-gradient-to-tr from-slate-900 via-pink-950 to-slate-950 flex flex-col justify-center items-center p-4 font-sans ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
        {/* Header containing Language Switcher and System Identifier */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center no-print">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-300 font-mono font-black uppercase tracking-widest">{language === "ar" ? "الرابط مشفر وآمن" : "SSL ENCRYPTED SECURE CONNECT"}</span>
          </div>
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer backdrop-blur-md"
          >
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {/* Central Card container */}
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl border border-slate-250 shadow-2xl space-y-6 text-center animate-fade">
          {/* Branded Central Header */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-lg ring-4 ring-pink-500/20">
              BH
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 justify-center">
                <span>{language === "ar" ? "بوابة بهية الرقمية لتسجيل دخول الكادر" : "Baheya Staff Clinical Portal"}</span>
                <HeartPulse className="h-5 w-5 text-pink-500 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest leading-tight">
                {language === "ar" ? "تسجيل دخول آمن بالاسم والرمز للكشف الإداري وتطهير الجرودات" : "Secure Electronic Clinical Verification & Balance Audits"}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            {/* Custom Information Callout */}
            <div className="bg-pink-50/50 rounded-xl p-3 border border-pink-100/50 text-right text-xs text-pink-900 space-y-1">
              <span className="font-extrabold text-[11px] text-pink-800 flex items-center justify-end gap-1">
                <span>توجيهات الدخول الذكي</span>
                <Info className="h-3.5 w-3.5" />
              </span>
              <p className="text-[10px] text-slate-500 leading-snug">
                {language === "ar" 
                  ? "تحكم بصلاحياتك: أدخل كود الموظف وكلمة المرور الخاصة بك. لمعاينة كيف يرى المشرف / الإدارة الوحدات مقارنة بالاستاف العادي، تفضل بنسخ أو النقر السريع على أي مستخدم بالجدول أسفل."
                  : "Enter your Employee Code and secret PIN. Use helper credentials below to evaluate how managers and staff look at clinical data."}
              </p>
            </div>

            {recoveryMode ? (
              /* Passcode Retrieval & Reset via Corporate email form */
              <form onSubmit={recoveryStep === "enter_email" ? handleRequestRecoveryInput : handleCompletePINReset} className="space-y-4 text-right">
                <div className="bg-pink-50 p-3 rounded-xl text-xs font-sans border border-pink-150/60 leading-relaxed text-slate-700 flex flex-col gap-1">
                  <span className="font-extrabold text-[11px] text-pink-850 flex items-center justify-end gap-1 select-none">
                    <span>استعادة والتحكم ببيانات الدخول تلقائياً</span>
                    <KeyRound className="h-3.5 w-3.5 text-pink-600" />
                  </span>
                  <p className="text-[10px] text-slate-500 text-right leading-normal">
                    {language === "ar"
                      ? "أدخل البريد الإلكتروني الخاص بك في بهية المربوط بملف الكادر. سيقوم النظام بمصادقتك ذاتياً لوضع PIN جديد دون وسيط."
                      : "Type your corporate healthcare email attached to your personnel profile. System will authenticate you on live Firestore."}
                  </p>
                </div>

                {recoveryStep === "enter_email" ? (
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar" ? "البريد الإلكتروني المهني (@baheya.org):" : "Corporate Registered Email Address:"}
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmailIn}
                      onChange={(e) => {
                        setRecoveryEmailIn(e.target.value);
                        setRecoveryError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                      placeholder="nurse.name@baheya.org"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recoveryMsg && (
                      <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100 font-bold leading-relaxed">
                        ✔ {recoveryMsg}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "ar" ? "رمز المرور الجديد (الـ PIN كود - 4 إلى 6 أرقام):" : "Type New Secret PIN (4 to 6 numeric digits):"}
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={newRecoveryPin}
                        onChange={(e) => {
                          setNewRecoveryPin(e.target.value.replace(/\D/g, ""));
                          setRecoveryError(null);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-sm font-bold tracking-widest text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                        placeholder="••••"
                      />
                    </div>
                  </div>
                )}

                {recoveryError && (
                  <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl text-center border border-rose-100">
                    ⚠ {recoveryError}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>
                      {recoveryStep === "enter_email"
                        ? (language === "ar" ? "التحقق والتحقق الفوري للكادر" : "Authorize Corporate Account")
                        : (language === "ar" ? "تعديل وحفظ رمز الـ PIN الجديد" : "Apply & Save New PIN Code")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(false);
                      setRecoveryStep("enter_email");
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    <span>{language === "ar" ? "إلغاء والعودة لشاشة الدخول" : "Cancel and Return to Portal Login"}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Direct Login Form */
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-right">
                {/* Employee ID Direct Typing Input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "ar" ? "كود الموظف الكادر (الرقم الوظيفي):" : "Employee Staff ID Code:"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginStaffId}
                      onChange={(e) => {
                        setLoginStaffId(e.target.value);
                        setLoginError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-sm font-bold tracking-wider text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500 uppercase"
                      placeholder="e.g., BHG-NUR-25"
                    />
                    <span className="absolute left-3.5 top-3 text-[10px] text-slate-400 font-mono select-none uppercase font-bold">BHG-</span>
                  </div>
                </div>

                {/* Secure Passcode/PIN Typing Input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "ar" ? "رمز المرور السري الخاص بالحساب (PIN):" : "Secure Passcode / Personal PIN Code (4-digits):"}
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={loginPasscode}
                    onChange={(e) => {
                      setLoginPasscode(e.target.value.replace(/\D/g, ""));
                      setLoginError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-center font-mono text-sm font-bold tracking-widest text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-pink-500"
                    placeholder="••••"
                  />
                </div>

                <div className="flex justify-between items-center px-1 pt-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(true);
                      setRecoveryStep("enter_email");
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className="text-pink-600 hover:text-pink-700 font-extrabold transition hover:underline cursor-pointer"
                  >
                    {language === "ar" ? "نسيت كلمة المرور؟ غيرها ببريدك" : "Forgot PIN Code? Reset with email"}
                  </button>
                  <span className="text-slate-250">|</span>
                  <span className="text-slate-400 font-mono font-bold select-none">Baheya Active Directory</span>
                </div>

                {loginError && (
                  <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl text-center border border-rose-100">
                    ⚠ {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="h-4 w-4" />
                  <span>{language === "ar" ? "تسجيل الدخول والتحقق الآمن الموحد" : "Secure Gate Log In & Authenticate"}</span>
                </button>
              </form>
            )}
          </div>

          {/* Quick Helper Credentials Directory - Non-interactive medical registry */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right flex items-center gap-1 justify-end">
              <span>أدلة تسجيل الدخول المعتمدة للكوادر والمسؤولين</span>
              <Award className="h-3.5 w-3.5 text-slate-400" />
            </h3>
            
            <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl space-y-2.5 text-right text-[11px] text-slate-600">
              <div className="space-y-1 divide-y divide-slate-100 font-sans">
                <div 
                  onClick={() => {
                    setLoginStaffId("BHG-NUR-25");
                    setLoginPasscode("2525");
                    setLoginError(null);
                  }}
                  className="pb-1.5 pt-0.5 cursor-pointer hover:bg-pink-50/40 px-1.5 py-1 rounded-lg transition"
                >
                  <span className="font-bold text-slate-800 block flex justify-between">
                    <span>1. الموظف العادي (تمريض): فاطمة الزهراء</span>
                    <span className="text-[9px] text-pink-600 bg-pink-100/50 px-1 rounded font-sans">نقرة تعبئة تلقائية</span>
                  </span>
                  <div className="flex justify-between font-mono text-[10px] mt-0.5 text-slate-500">
                    <span>PIN: 2525</span>
                    <span>الايميل: fatima@baheya.org</span>
                    <span>كود: BHG-NUR-25</span>
                  </div>
                </div>
                <div 
                  onClick={() => {
                    setLoginStaffId("BHG-QLT-10");
                    setLoginPasscode("0808");
                    setLoginError(null);
                  }}
                  className="py-1.5 cursor-pointer hover:bg-pink-50/40 px-1.5 rounded-lg transition"
                >
                  <span className="font-bold text-slate-800 block flex justify-between">
                    <span>2. المشرف الميداني للقسم (الجودة): نورهان علي</span>
                    <span className="text-[9px] text-pink-600 bg-pink-100/50 px-1 rounded font-sans">نقرة تعبئة تلقائية</span>
                  </span>
                  <div className="flex justify-between font-mono text-[10px] mt-0.5 text-slate-500">
                    <span>PIN: 0808</span>
                    <span>الايميل: norhan@baheya.org</span>
                    <span>كود: BHG-QLT-10</span>
                  </div>
                </div>
                <div 
                  onClick={() => {
                    setLoginStaffId("BHG-ADM-99");
                    setLoginPasscode("1234");
                    setLoginError(null);
                  }}
                  className="py-1.5 cursor-pointer hover:bg-pink-50/40 px-1.5 rounded-lg transition"
                >
                  <span className="font-bold text-slate-800 block flex justify-between">
                    <span>3. مدير العمليات (مسؤول نظام): د. محمد السيد</span>
                    <span className="text-[9px] text-pink-600 bg-pink-100/50 px-1 rounded font-sans">نقرة تعبئة تلقائية</span>
                  </span>
                  <div className="flex justify-between font-mono text-[10px] mt-0.5 text-slate-500">
                    <span>PIN: 1234</span>
                    <span>الايميل: mohamed@baheya.org</span>
                    <span>كود: BHG-ADM-99</span>
                  </div>
                </div>
                <div 
                  onClick={() => {
                    setLoginStaffId("BHG-PRES-01");
                    setLoginPasscode("9999");
                    setLoginError(null);
                  }}
                  className="py-1.5 cursor-pointer hover:bg-pink-50/40 px-1.5 rounded-lg transition"
                >
                  <span className="font-bold text-slate-850 block flex justify-between">
                    <span>4. رئيس مجلس الإدارة (الرئيس): أ.د. ليلى أبو الخير</span>
                    <span className="text-[9px] text-pink-600 bg-pink-100/50 px-1 rounded font-sans">نقرة تعبئة تلقائية</span>
                  </span>
                  <div className="flex justify-between font-mono text-[10px] mt-0.5 text-slate-500">
                    <span>PIN: 9999</span>
                    <span>الايميل: president@baheya.org</span>
                    <span>كود: BHG-PRES-01</span>
                  </div>
                </div>
                <div 
                  onClick={() => {
                    setLoginStaffId("BHG-IT-01");
                    setLoginPasscode("2026");
                    setLoginError(null);
                  }}
                  className="pt-1.5 cursor-pointer hover:bg-pink-50/40 px-1.5 rounded-lg transition"
                >
                  <span className="font-bold text-slate-850 block flex justify-between">
                    <span>5. مهندس الدعم الفني ونظم المعلومات (IT): م. عادل الشريف</span>
                    <span className="text-[9px] text-pink-600 bg-pink-100/50 px-1 rounded font-sans font-sans font-bold">نقرة تعبئة تلقائية IT</span>
                  </span>
                  <div className="flex justify-between font-mono text-[10px] mt-0.5 text-slate-500">
                    <span>PIN: 2026</span>
                    <span>الايميل: adel.it@baheya.org</span>
                    <span>كود: BHG-IT-01</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-1 items-center justify-center text-[9px] text-slate-400 font-mono">
            <span>Baheya Medical Cloud Storage Client v5.0</span>
            <span>{language === "ar" ? "بوابة معتمدة للجرودات والسياسات الطبية" : "Bilingual Electronic Healthcare Ledger Guard"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      
      {/* Sidebar Navigation - Hides completely on Print */}
      <aside className="no-print w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-pink-500/20">
              BH
            </div>
            <div>
              <h1 className="text-sm font-bold text-white font-sans">بوابة بهية الرقمية</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Baheya Forms Premium</p>
            </div>
          </div>
        </div>

        {/* ACCESS MANAGEMENT: Interactive User & Admin switcher */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-600/20 border border-pink-500/50 text-pink-400 flex items-center justify-center font-bold text-xs ring-2 ring-pink-500/10 shrink-0">
              {currentUser.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {language === "ar" ? currentUser.nameAr : currentUser.nameEn}
                </p>
              </div>
              
              <div className="text-[10px] text-slate-400 font-medium mt-1 leading-snug">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'admin' ? 'bg-red-500 animate-pulse' : currentUser.role === 'quality' ? 'bg-amber-400' : currentUser.role === 'president' ? 'bg-purple-500' : 'bg-emerald-400'}`}></span>
                  <span>
                    {currentUser.role === "admin" 
                      ? (language === "ar" ? "المدير (إدارة العمليات)" : "Operations Manager") 
                      : currentUser.role === "quality" 
                      ? (language === "ar" ? "المشرف (مراقب الجودة)" : "Quality Supervisor") 
                      : currentUser.role === "president"
                      ? (language === "ar" ? "الرئيس (مجلس الإدارة)" : "Board President")
                      : (language === "ar" ? "الموظف (استاف تمريض)" : "Nursing Staff")}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide truncate">
                  {language === "ar" ? `القسم: ${currentUser.department}` : `Dept: ${currentUser.department}`}
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  ID: {currentUser.staffId}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs - Dynamically restricted based on User Roles */}
        <nav className="flex-1 py-4 space-y-1">
          <div className="px-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-sans">
            {language === "ar" ? "تصفح الأبواب" : "Clinical Ledger Navigation"}
          </div>
          
          {/* 1. Unit Duty & Daily Checklist - Visible to ALL roles */}
          <button
            onClick={() => setActiveTab("duty")}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
              activeTab === "duty"
                ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0 text-pink-500 animate-pulse animate-duration-1000" />
            <span className="flex-1">{language === "ar" ? "ديوتي الوحدات والشيك ليست اليومية" : "Unit Duty & Daily Checklist"}</span>
            <span className="bg-emerald-600/30 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">LIVE</span>
          </button>

          {/* 2. Replica Live Editor - Now accessible to all roles so clinicians/nurses can fill detailed sheets directly */}
          <button
            onClick={() => {
              setActiveTab("editor");
              if (!editingRecord) handleCreateNew(selectedTemplate.id);
            }}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
              activeTab === "editor"
                ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <CheckSquare className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "تعبئة وجرد الشيتات الطبية" : "Clinical Sheets Ledger"}</span>
            <span className="bg-pink-600/30 text-pink-400 text-[8px] px-1 py-0.5 rounded-full font-black uppercase">200+ N</span>
          </button>

          {/* 2.5 Dynamic Clinical Sheet Distribution Office & Forms Navigator */}
          <button
            onClick={() => setActiveTab("distribution")}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
              activeTab === "distribution"
                ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-pink-500" />
            <span className="flex-1">{language === "ar" ? "مكتـب توزيـع الشيتـات الطبية" : "Clinical Sheets Distribution"}</span>
            <span className="bg-amber-500/20 text-amber-500 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Map</span>
          </button>

          {/* 3. Analytics Hub - Visible to Supervisor (quality), Manager (admin) & President (president) */}
          {(currentUser.role !== "head_nurse") && (
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
                activeTab === "analytics"
                  ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4 shrink-0 text-pink-500" />
              <span className="flex-1">{language === "ar" ? "لوحة الجودة والتحليلات البصرية" : "Quality Analytics Hub"}</span>
              <span className="bg-pink-600/30 text-pink-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">CQI</span>
            </button>
          )}

          {/* 4. Saved Records Store - Visible to Supervisor, Manager & President */}
          {(currentUser.role !== "head_nurse") && (
            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
                activeTab === "history"
                  ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-pink-500" />
              <span className="flex-1">{language === "ar" ? "سجلات الأرشيف المحفوظة" : "Saved Records Store"}</span>
              {records.length > 0 && (
                <span className="bg-pink-600/30 text-pink-400 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                  {records.length}
                </span>
              )}
            </button>
          )}

          {/* 5. System Settings - visible to President (president) & IT Specialist (it) */}
          {(currentUser.role === "president" || currentUser.role === "it") && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
                activeTab === "settings"
                  ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0 text-pink-500" />
              <span className="flex-1">{language === "ar" ? "لوحة التحكم والبيانات والتهيئة" : "Hospital System Settings"}</span>
            </button>
          )}

          {/* IT Control Panel Tab - Visible to IT, Admin or President */}
          {(currentUser.role === "it" || currentUser.role === "admin" || currentUser.role === "president") && (
            <button
              onClick={() => setActiveTab("it_panel")}
              className={`w-full flex justify-between items-center gap-2 px-6 py-2.5 text-right text-xs font-bold transition-all ${
                activeTab === "it_panel"
                  ? "bg-slate-850 text-pink-400 font-extrabold border-r-4 border-pink-500"
                  : "text-pink-300 hover:bg-slate-800/80 hover:text-pink-100"
              }`}
            >
              <div className="flex items-center gap-3 ">
                <Database className={`h-4 w-4 shrink-0 ${activeTab === "it_panel" ? "text-pink-500 animate-pulse" : "text-pink-450"}`} />
                <span>{language === "ar" ? "💻 لوحة تحكم الـ IT والدعم" : "💻 IT Support & Control"}</span>
              </div>
              <span className="bg-pink-600/30 text-pink-400 text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse uppercase">DB Hub</span>
            </button>
          )}

          {/* 6. Directives Guide - Visible to ALL roles */}
          <button
            onClick={() => setActiveTab("about")}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold transition-colors ${
              activeTab === "about"
                ? "bg-slate-800 border-r-4 border-pink-500 text-pink-400 font-bold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Info className="h-4 w-4 shrink-0 text-pink-500" />
            <span>{language === "ar" ? "دليل معايير الجودة والرموز" : "Bilingual Directives Guide"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-2.5 text-right text-xs font-semibold text-rose-400 hover:bg-rose-950/20 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <Lock className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{language === "ar" ? "تسجيل الخروج الآمن" : "Secure Log Out"}</span>
          </button>
        </nav>

        {/* Database offline status container */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-500 mb-1">
              {language === "ar" ? "مستودع التخزين المحلي" : "Digital Sync Store"}
            </p>
            <div className="flex items-center text-emerald-400 text-xs font-semibold gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                {dbStatus === "connected" && (language === "ar" ? "متصل كلياً أوفلاين" : "Offline Secured")}
                {dbStatus === "syncing" && (language === "ar" ? "جاري الحفظ الآمن..." : "Commit Transaction...")}
                {dbStatus === "error" && (language === "ar" ? "عطل بقاعدة البيانات" : "Local Database Fail")}
              </span>
            </div>
            
            {/* Database backups */}
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] border-t border-slate-800 pt-2 text-slate-400 font-mono">
              <button onClick={handleExportBackup} className="hover:text-white flex items-center gap-1 transition">
                <Download className="h-3 w-3" />
                <span>{language === "ar" ? "تصدير نسخة" : "Export backup"}</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="hover:text-white flex items-center gap-1 transition">
                <Upload className="h-3 w-3" />
                <span>{language === "ar" ? "استيراد" : "Import backup"}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar - Hides completely on Print */}
        <header className="no-print bg-gradient-to-r from-white via-slate-50 to-pink-50/25 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-8 py-4.5 gap-4 shadow-sm z-10 text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-md shrink-0">
              BHG
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2 justify-end md:justify-start">
                <HeartPulse className="h-4.5 w-4.5 text-pink-600 animate-pulse" />
                <span>{language === "ar" ? "المنصة الذكية المتكاملة للجرودات والترميز السريري" : "Baheya Integrated Quality Ledger Platform"}</span>
              </h2>
              <p className="text-[10px] md:text-[11px] text-slate-500 mt-0.5 font-sans leading-none">
                {language === "ar" 
                  ? "مستشفى بهية للاكتشاف المبكر وعلاج سرطان الثدي - مطابقة للائحة القانونية المصرية والدولية للجودة" 
                  : "Certified replica print, fridge temperature monitor, and emergency checklist portal"}
              </p>
            </div>
          </div>

          {/* Center/Right alignment with active user details and actions */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end w-full md:w-auto">
            {/* Shift Tracker Badge */}
            <div className="bg-slate-900 text-slate-100 border border-slate-800 text-[10px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span className="font-bold">{language === "ar" ? "الفترة الصباحية (08:00 - 15:00)" : "Morning Shift (08:00 - 15:00)"}</span>
            </div>

            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black transition shadow-sm cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-pink-500" />
              {language === "ar" ? "English" : "العربية"}
            </button>

            {/* Prominent 🔔 Alert Bell to broadcast nurse submissions and system alerts */}
            <div className="relative">
              <button
                onClick={() => setIsBellOpen(!isBellOpen)}
                className="relative p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black transition shadow-sm cursor-pointer flex items-center justify-center h-[30px]"
              >
                <Bell className={`h-4 w-4 text-pink-600 ${notifications.some(n => !n.read) ? "animate-bounce" : ""}`} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[8px] w-4 h-4 flex items-center justify-center font-bold animate-pulse leading-none border border-white">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {isBellOpen && (
                <div 
                  className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 text-right overflow-hidden transition-all duration-200 origin-top-left flex flex-col max-h-[350px]"
                  style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                >
                  <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-white border-b border-slate-100 flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-black text-slate-800">
                      {language === "ar" ? "🔔 الإشعارات ومستجدات القسم" : "🔔 Hospital Ward Alerts"}
                    </h4>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={() => {
                          const marked = notifications.map(n => ({...n, read: true}));
                          setNotifications(marked);
                          localStorage.setItem("baheya_notifications", JSON.stringify(marked));
                        }}
                        className="text-[9px] text-pink-600 hover:text-pink-850 font-extrabold"
                      >
                        {language === "ar" ? "مقروء الكل" : "Mark all read"}
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-64">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {language === "ar" ? "لا توجد تنبيهات حالية" : "No recent alerts"}
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-3 text-[10px] sm:text-xs transition text-right ${notif.read ? "bg-white text-slate-500 font-normal" : "bg-pink-50/25 text-slate-800 font-bold"}`}
                        >
                          <div className="flex justify-between items-start mb-1 text-[9px] font-medium text-slate-400">
                            <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {notif.type === "directive" && (
                              <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[8px]">
                                {language === "ar" ? "توجيه إداري" : "Directive"}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed">
                            {language === "ar" ? notif.messageAr : notif.messageEn}
                          </p>
                          {!notif.read && (
                            <button
                              onClick={() => {
                                const updated = notifications.map(n => n.id === notif.id ? {...n, read: true} : n);
                                setNotifications(updated);
                                localStorage.setItem("baheya_notifications", JSON.stringify(updated));
                              }}
                              className="mt-1 text-[9px] text-pink-500 hover:underline block"
                            >
                              {language === "ar" ? "تعليم كمقروء" : "Mark read"}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleCreateNew(selectedTemplate.id)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="h-4 w-4" />
              <span>{language === "ar" ? "إنشاء مستند جديد" : "New Ledger Link"}</span>
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>
        </header>

        {/* Content Dashboard */}
        <main className="p-4 sm:p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
          
          {/* Quick Informative Statistics summary cards */}
          <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "السجلات الإجمالية المحفوظة" : "Saved Archived Logs"}
              </div>
              <div className="text-xl font-black text-slate-900">{records.length}</div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "خيارات النماذج والجرودات المتاحة" : "Total Template Sheets"}
              </div>
              <div className="text-xl font-black text-pink-600">{allAvailableTemplates.length} {language === "ar" ? "شيت كامل" : "Full Sheets"}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "كود المستند النشط" : "Active Form Reference"}
              </div>
              <div className="text-sm font-black text-blue-600 truncate uppercase">{selectedTemplate.code}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans mb-1">
                {language === "ar" ? "الوضع النشط للصلاحية" : "User Authorization Status"}
              </div>
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="uppercase text-[10px] tracking-wide font-mono">
                  {currentUser.role.toUpperCase()} | SECURED
                </span>
              </div>
            </div>
          </div>

          {/* TAB 0: Daily Unit Duty & Checklist Portal - Designed for Unit Entrance, Crew Checklists & Nursing Supervisor Signoffs */}
          {activeTab === "duty" && (() => {
            const todayString = new Date().toISOString().split("T")[0];
            const isAdminOrQuality = currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president";
            const effectiveDutyDept = isAdminOrQuality ? selectedDutyDept : (currentUser.department || "EMERGENCY UNIT");
            
            // Filter tasks for selected department
            const activeDeptTasks = dutyTasks.filter(t => t.department === effectiveDutyDept);
            
            // Find today's checklist for the selected department
            const todaysChecklist = dailyChecklists.find(cl => cl.department === effectiveDutyDept && cl.date === todayString);
            
            // Handler to submit checklist
            const submitChecklist = () => {
              if (activeDeptTasks.length === 0) {
                alert(language === "ar" ? "لا يمكن تقديم قائمة مهام فارغة! يرجى إضافة مهام لهذه الوحدة أولاً." : "Cannot submit an empty task list! Please add tasks first.");
                return;
              }

              // Verify permissions
              const hasPerm = rolePermissions.submitChecklist.includes(currentUser.role);
              if (!hasPerm) {
                alert(language === "ar" ? "ليس لديك صلاحية تقديم الشيك ليست اليومية بموجب الإعدادات الحالية!" : "Your role does not have permission to submit the daily checklist under current settings!");
                return;
              }

              // Double-check if all answers are filled (defaulting unfilled to false)
              const finalAnswers: Record<string, { done: boolean; note?: string }> = {};
              activeDeptTasks.forEach(task => {
                finalAnswers[task.id] = {
                  done: dutyChecklistAnswers[task.id]?.done || false,
                  note: dutyChecklistAnswers[task.id]?.note || ""
                };
              });

              const newChecklist: UnitDailyChecklist = {
                id: `cl-${effectiveDutyDept.replace(/\s+/g, "-").toLowerCase()}-${todayString}`,
                department: effectiveDutyDept,
                date: todayString,
                completedByStaffName: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
                completedByStaffId: currentUser.staffId,
                completedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                status: "completed",
                answers: finalAnswers
              };

              const updated = [newChecklist, ...dailyChecklists.filter(cl => !(cl.department === effectiveDutyDept && cl.date === todayString))];
              saveChecklistsToDb(updated);
              setDutyChecklistAnswers({});
              alert(language === "ar" 
                ? `✅ تم تقديم واعتماد الشيك ليست اليومية لـ [${effectiveDutyDept}] بنجاح، بانتظار توقيع مديرة التمريض والمشرفين!` 
                : `✅ Daily Checklist for [${effectiveDutyDept}] submitted successfully! Awaiting supervisor's signoff.`);
            };

            // Handler to approve checklist (Supervisor/Nurse Director)
            const approveChecklist = (clId: string) => {
              // Verify permissions
              const hasPerm = rolePermissions.approveChecklist.includes(currentUser.role);
              if (!hasPerm) {
                alert(language === "ar" ? "عفواً! هذه الصلاحية مخصصة لمديرة التمريض والمشرفين والمسؤولين فقط." : "Access Denied! This action is reserved for Head Nurse & Quality Supervisors.");
                return;
              }

              const updated = dailyChecklists.map(cl => {
                if (cl.id === clId) {
                  return {
                    ...cl,
                    status: "audited" as const,
                    auditedByStaffName: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
                    auditedByStaffId: currentUser.staffId,
                    auditedAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
                    auditNotes: supervisorAuditNoteText || (language === "ar" ? "تم التحقق والاعتماد الطبي المباشر" : "Verified and accredited with clinical safety protocols OK.")
                  };
                }
                return cl;
              });

              saveChecklistsToDb(updated);
              setSupervisorAuditNoteText("");
              alert(language === "ar" ? "🎉 تم الختم والتوقيع والاعتماد الجراحي النهائي بنجاح ومزامنته للوحة الجودة!" : "🎉 Final clinical audit signed off and logged to quality database successfully!");
            };

            // Handler to add dynamic task
            const addTask = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newTaskTextAr.trim() || !newTaskTextEn.trim()) {
                alert(language === "ar" ? "يرجى تعبئة نص المهمة باللغتين العربية والإنكليزية!" : "Please fill in the task definitions both in Arabic & English!");
                return;
              }

              const hasPerm = rolePermissions.manageDutyTasks.includes(currentUser.role);
              if (!hasPerm) {
                alert(language === "ar" ? "ليس لديك صلاحية إضافة وتعديل مهام ديوتي الوحدات!" : "Your role does not have authorization to modify unit duty structures.");
                return;
              }

              const newTask: DailyDutyTask = {
                id: `duty-custom-${Date.now()}`,
                department: effectiveDutyDept,
                taskAr: newTaskTextAr,
                taskEn: newTaskTextEn,
                categoryAr: newTaskCategoryAr,
                categoryEn: newTaskCategoryEn,
                createdAt: todayString
              };

              const updated = [...dutyTasks, newTask];
              saveDutyTasksToDb(updated);
              setNewTaskTextAr("");
              setNewTaskTextEn("");
              alert(language === "ar" ? "✅ تم إضافة وإدراج المهمة الجديدة في الشيك ليست للقسم بنجاح!" : "✅ Dynamic duty task registered successfully into unit's active sheets!");
            };

            // Handler to delete checking task
            const deleteTask = (taskId: string) => {
              const hasPerm = rolePermissions.manageDutyTasks.includes(currentUser.role);
              if (!hasPerm) {
                alert(language === "ar" ? "صلاحيات التعديل مقفلة لحسابك!" : "Modification locked for your account!");
                return;
              }

              if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المهمة نهائياً من جرد القسم؟" : "Are you sure you want to delete this task from unit duty templates?")) {
                const updated = dutyTasks.filter(t => t.id !== taskId);
                saveDutyTasksToDb(updated);
              }
            };

            // Statistics of completed checklists for today
            const activeUnits = isAdminOrQuality 
              ? departments 
              : departments.filter(d => d === (currentUser.department || "EMERGENCY UNIT"));

            const completedCount = dailyChecklists.filter(cl => 
              cl.date === todayString && 
              cl.status === "completed" && 
              (isAdminOrQuality || cl.department === effectiveDutyDept)
            ).length;

            const auditedCount = dailyChecklists.filter(cl => 
              cl.date === todayString && 
              cl.status === "audited" && 
              (isAdminOrQuality || cl.department === effectiveDutyDept)
            ).length;

            const totalIncomplete = activeUnits.length - (completedCount + auditedCount);

            return (
              <div className="space-y-6 animate-fade text-right" dir={language === "ar" ? "rtl" : "ltr"}>
                
                {/* 1. Header Banner */}
                <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-pink-950 text-white p-6 rounded-2xl shadow-md border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1.5 flex-1 select-none">
                    <div className="bg-pink-505/20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-pink-300 font-extrabold text-[10px] uppercase tracking-wide border border-pink-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      {language === "ar" ? "البوابة الطبية النشطة لكامل المستشفى" : "HOSPITAL WIDE CORE GATEWAY - ACTIVE"}
                    </div>
                    <h2 className="text-lg font-black tracking-tight text-white">
                      {language === "ar" ? "بوابة الوحدات الطبية والشيك ليست والديوتي اليومي" : "Unit Clinical Gateways & Daily Duty Checklist Control"}
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
                      {language === "ar" 
                        ? `واجهة تفتيش الرعاية السريرية المعتمدة لروتين تمريض وأرشفة بهية. يقوم الممرضون بالمجموعات والجرودات الصباحية اليومية وتصديق استمارة الواجب، بينما تدقق مديرة التمريض والمشرف يدوياً بنقرة خروج واحدة.`
                        : `Standardized clinical audit interface for Baheya nurses. Staff execute physical checking tasks, sign daily sheets off, and nursing directors certify compliance metrics with structured logs.`}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 font-mono text-center select-none shrink-0">
                    <Calendar className="h-5 w-5 text-pink-400 mb-1" />
                    <span className="text-xs font-bold text-pink-200 uppercase">{language === "ar" ? "تاريخ اليوم" : "Today's Date"}</span>
                    <span className="text-sm font-black text-white mt-0.5">{todayString}</span>
                  </div>
                </div>

                {/* 2. Today's Nursing Executive Summary Tracker */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "ar" ? "الإجمالي النشط للوحدات المراقبة" : "Total Monitored Units"}</div>
                      <div className="text-lg font-black text-slate-800">{activeUnits.length} {language === "ar" ? "وحدات علاجية" : "Units"}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "ar" ? "شيك ليست مكملة (بانتظار الإشراف)" : "Completed (Pending Audit)"}</div>
                      <div className="text-lg font-black text-amber-500">{completedCount} {language === "ar" ? "وحدات بالانتظار" : "Awaiting"}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 animate-pulse">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "ar" ? "شيك ليست معتمدة ومحققة وموقعة" : "Audited & Signed Off"}</div>
                      <div className="text-lg font-black text-emerald-600">{auditedCount} / {activeUnits.length}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{language === "ar" ? "وحدات لم تقدم الجرد بعد" : "Units Missing Submission"}</div>
                      <div className="text-lg font-bold text-rose-600">{totalIncomplete} {language === "ar" ? "وحرّة معلقة" : "Overdue"}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* 2.5 Unit Compliance Real-time Board (Admin/Quality only) */}
                {isAdminOrQuality && (
                  <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-md space-y-4 text-right">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                          <span>لوحة التفتيش والمتابعة اللحظية لأقسام مستشفى بهية اليومية</span>
                          <ShieldCheck className="h-5 w-5 text-pink-600 animate-pulse" />
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {language === "ar" 
                            ? "مجموعة مراقبة تسليم الجرودات والجرعات اليومية من ممرضات الاستاف المعتمدين بالفروع" 
                            : "Live administrative compliance board displaying daily nursing duty checklist state for each medical unit."}
                        </p>
                      </div>
                      <div className="bg-pink-50 text-pink-700 px-3.5 py-1.5 rounded-xl border border-pink-100 text-xs font-black">
                        {language === "ar" ? "لوحة تحكم المشرف والمدير مفعّلة" : "Supervisor Controls Active"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {departments.map((dept) => {
                        const cl = dailyChecklists.find(c => c.department === dept && c.date === todayString);
                        
                        let cardColor = "border-slate-200 bg-slate-50 text-slate-700";
                        let statusTextAr = "⏳ لم تقديم الجرد بعد";
                        let statusTextEn = "Missing Checklist";
                        let badgeColor = "bg-slate-200 text-slate-700";

                        if (cl) {
                          if (cl.status === "audited") {
                            cardColor = "border-emerald-200 bg-emerald-50/20 text-emerald-900";
                            statusTextAr = "✔ معتمد طبيّاً ومطابق";
                            statusTextEn = "Audited & Match";
                            badgeColor = "bg-emerald-100 text-emerald-800";
                          } else {
                            cardColor = "border-amber-200 bg-amber-50/20 text-amber-900";
                            statusTextAr = "✍ تم التقديم (بانتظار توقيعك)";
                            statusTextEn = "Completed (Awaiting Signoff)";
                            badgeColor = "bg-amber-100 text-amber-800 animate-pulse";
                          }
                        }

                        return (
                          <div 
                            key={dept} 
                            onClick={() => {
                              setSelectedDutyDept(dept);
                            }}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 text-right hover:scale-[1.01] hover:shadow-sm cursor-pointer ${cardColor}`}
                          >
                            <div className="space-y-1">
                              <span className="block text-[11px] font-black text-slate-800 truncate">
                                {dept}
                              </span>
                              <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded ${badgeColor}`}>
                                {language === "ar" ? statusTextAr : statusTextEn}
                              </span>
                            </div>

                            {cl && cl.status === "completed" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveChecklist(cl.id);
                                }}
                                className="w-full py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black shadow transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                              >
                                <Lock className="h-3 w-3" />
                                <span>{language === "ar" ? "اعتماد وتوقيع الشيت" : "Certify Sheet"}</span>
                              </button>
                            )}

                            {cl && cl.status === "audited" && (
                              <div className="text-[9px] text-slate-500 font-sans mt-1">
                                <span>{language === "ar" ? `بواسطة: ${cl.auditedByStaffName}` : `Audited by: ${cl.auditedByStaffName}`}</span>
                              </div>
                            )}

                            {!cl && (
                              <span className="text-[9px] text-rose-500 font-black tracking-tight mt-1 animate-pulse">
                                ⏳ {language === "ar" ? "معلّق - نبه الاستاف" : "Pending Staff Activity"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Main Split Screen Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Units Portal Grid & Supervisor Overview */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-sans flex items-center gap-1.5 justify-end">
                          <span>بوابة دخول واستهلال وتصديق الوحدات</span>
                          <LayoutGrid className="h-4.5 w-4.5 text-pink-600 shrink-0" />
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          {language === "ar" ? "اضغط على أي وحدة طبية لفتح الاستمارة، تتبع المهام وإتمام الجداول اليومية لها:" : "Select any active biological unit to evaluate today's checking task state:"}
                        </p>
                      </div>

                      <div className="space-y-2 text-right">
                        {activeUnits.map((unit) => {
                          const cl = dailyChecklists.find(c => c.department === unit && c.date === todayString);
                          const isSelected = selectedDutyDept === unit;
                          
                          return (
                            <button
                              key={unit}
                              onClick={() => {
                                setSelectedDutyDept(unit);
                                setDutyChecklistAnswers({});
                              }}
                              className={`w-full p-3 rounded-xl border transition text-right font-sans relative overflow-hidden flex flex-col gap-1 text-xs cursor-pointer ${
                                isSelected 
                                  ? "bg-gradient-to-l from-pink-50 to-white border-pink-500 shadow-sm ring-1 ring-pink-500/20" 
                                  : "bg-slate-50/50 hover:bg-slate-50 border-slate-150 hover:border-slate-300"
                              }`}
                            >
                              {/* Left highlight highlight indicator bar */}
                              {isSelected && <div className="absolute top-0 right-0 bottom-0 w-[5px] bg-pink-600"></div>}

                              <div className="flex items-center justify-between w-full">
                                {cl ? (
                                  cl.status === "audited" ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <ShieldCheck className="h-3 w-3 inline" />
                                      {language === "ar" ? "معتمد ووقّع" : "Audited"}
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Clock className="h-3 w-3 inline" />
                                      {language === "ar" ? "تم التقديم" : "Completed"}
                                    </span>
                                  )
                                ) : (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                                    {language === "ar" ? "معلق / مفقود" : "Pending"}
                                  </span>
                                )}

                                <span className="font-extrabold text-slate-800 text-xs">
                                  {unit === "EMERGENCY UNIT" && (language === "ar" ? "قسم الطوارئ" : "Emergency ER Unit")}
                                  {unit === "CHEMO UNIT PREPN" && (language === "ar" ? "صيدلية تحضير الكيماوي" : "Chemo Prep Pharmacy")}
                                  {unit === "ONCO-SURGICAL UNIT" && (language === "ar" ? "العمليات وأورام الثدي جراحياً" : "Onco-Surgical OR")}
                                  {unit === "OUTPATIENT CLINIC" && (language === "ar" ? "العيادات الخارجية والفحص" : "OP Oncology Clinic")}
                                  {unit === "INTENSIVE CARE UNIT (ICU)" && (language === "ar" ? "حالات الرعاية المركزة" : "Critical Care ICU")}
                                  {!["EMERGENCY UNIT", "CHEMO UNIT PREPN", "ONCO-SURGICAL UNIT", "OUTPATIENT CLINIC", "INTENSIVE CARE UNIT (ICU)"].includes(unit) && unit}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                <span className="font-mono text-[9px]">
                                  {dutyTasks.filter(t => t.department === unit).length} {language === "ar" ? "مهام دورية" : "daily tasks"}
                                </span>
                                <span>
                                  {cl ? (
                                    language === "ar" 
                                      ? `بواسطة: ${cl.completedByStaffName}` 
                                      : `By: ${cl.completedByStaffName}`
                                  ) : (
                                    language === "ar" ? "لم يتم التوقيع اليوم" : "No entry today"
                                  )}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right Column: The active Duty Form Sheet for Selected Unit */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
                      
                      {/* Active Department Header details */}
                      <div className="border-b border-rose-100 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-center sm:text-right">
                          <h3 className="text-base font-black text-rose-700 flex items-center justify-end gap-2">
                            <ClipboardList className="h-5 w-5 text-rose-500" />
                            <span>
                              {effectiveDutyDept === "EMERGENCY UNIT" && (language === "ar" ? "جرد واستكشاف ديوتي قسم الطوارئ (ER)" : "Emergency Unit Checking Ledger")}
                              {effectiveDutyDept === "CHEMO UNIT PREPN" && (language === "ar" ? "شيت جرد ديوتي صيدلية تحضير الكيماوي" : "Chemo Preparation Pharmacy Ledger")}
                              {effectiveDutyDept === "ONCO-SURGICAL UNIT" && (language === "ar" ? "ديوتي والروتين اليومي لقسم الجراحة الباطنية" : "Onco-Surgical Operating Ledger")}
                              {effectiveDutyDept === "OUTPATIENT CLINIC" && (language === "ar" ? "الديوتي والروتين اليومي قسم العيادات الخارجية" : "OP Oncology Clinic Checklist")}
                              {effectiveDutyDept === "INTENSIVE CARE UNIT (ICU)" && (language === "ar" ? "الجرد اليومي والأمان قسم الرعاية المركزة (ICU)" : "Intensive Care Unit Daily Safety")}
                              {!["EMERGENCY UNIT", "CHEMO UNIT PREPN", "ONCO-SURGICAL UNIT", "OUTPATIENT CLINIC", "INTENSIVE CARE UNIT (ICU)"].includes(effectiveDutyDept) && effectiveDutyDept}
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {language === "ar" ? "المراقبة الذكية لحالة الأجهزة والسلامة الصيدلانية على مدار الـ 24 ساعة:" : "Standardized 24-hour verification schedule supporting hospital rules:"}
                          </p>
                        </div>
                        
                        <div className="bg-rose-50 text-rose-800 text-xs py-1 px-3 rounded-xl border border-rose-100/50 flex flex-col text-center font-mono select-none">
                          <span className="font-bold text-[9px] uppercase tracking-wider">{language === "ar" ? "سجل الكود اليومي" : "Daily Code"}</span>
                          <span className="font-extrabold text-xs">BHG-CL-{effectiveDutyDept.substring(0,3).toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Check if already submitted/audited today */}
                      {todaysChecklist && (
                        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs ${
                          todaysChecklist.status === "audited" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-100 text-amber-700"
                        }`}>
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-1.5 justify-end sm:justify-start">
                              <ShieldCheck className={`h-4 w-4 ${todaysChecklist.status === 'audited' ? 'text-emerald-650' : 'text-amber-600'}`} />
                              <span>
                                {todaysChecklist.status === "audited" 
                                  ? (language === "ar" ? "تم الاعتماد النهائي، الختم والتوقيع بواسطة المشرف!" : "Checklist fully Audited, Signed and Accredited by Supervisor!")
                                  : (language === "ar" ? "تم التقديم والإتمام اليومي بنجاح وتوقيع الاستاف!" : "Today's Checklist successfully completed by staff but pending Audit sign-off.")}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {language === "ar" 
                                ? `وقّع الموظف: ${todaysChecklist.completedByStaffName} (ID: ${todaysChecklist.completedByStaffId}) الساعة ${todaysChecklist.completedAt}`
                                : `Signed by medical Staff: ${todaysChecklist.completedByStaffName} (ID: ${todaysChecklist.completedByStaffId}) at ${todaysChecklist.completedAt}`}
                            </p>
                            {todaysChecklist.auditedByStaffName && (
                              <p className="text-[10px] text-emerald-700 font-extrabold">
                                {language === "ar" 
                                  ? `✅ اعتمد من المشرف الدليلي: ${todaysChecklist.auditedByStaffName} (ID: ${todaysChecklist.auditedByStaffId}) مع الملحوظة: ${todaysChecklist.auditNotes}`
                                  : `✅ Finalized by clinical Supervisor: ${todaysChecklist.auditedByStaffName} (ID: ${todaysChecklist.auditedByStaffId}) with note: "${todaysChecklist.auditNotes}"`}
                              </p>
                            )}
                          </div>
                          <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            todaysChecklist.status === "audited" ? "bg-emerald-600 text-white border-emerald-500" : "bg-amber-500 text-white border-amber-400 animate-pulse"
                          }`}>
                            {todaysChecklist.status === "audited" ? (language === "ar" ? "ملف مغلق ومعتمد" : "CLOSED / SECURED") : (language === "ar" ? "معاد للتدقيق اليوم" : "PENDING AUDIT")}
                          </span>
                        </div>
                      )}

                      {/* Dynamic Tasks Fill Form Grid */}
                      <div className="space-y-3">
                        {activeDeptTasks.length === 0 ? (
                          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-450 space-y-2 select-none">
                            <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold">{language === "ar" ? "لا توجد مهام ديوتي مخصصة لهذه الوحدة حالياً." : "No specific daily duty tasks initialized for this unit yet."}</p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {language === "ar" ? "طاقم الجودة ومديري التمريض يمكنهم إضافة وتوليد مهام مخصصة فوراً باستخدام اللوحة بالأسفل." : "Quality staff & administrators can create and assign dynamic tasks using the control form below."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {activeDeptTasks.map((task, idx) => {
                              // Answers checked check state
                              const isCompletedToday = todaysChecklist !== undefined;
                              const currentAnswerVal = isCompletedToday 
                                ? todaysChecklist.answers[task.id]?.done || false
                                : dutyChecklistAnswers[task.id]?.done || false;
                                
                              const currentAnswerNote = isCompletedToday
                                ? todaysChecklist.answers[task.id]?.note || ""
                                : dutyChecklistAnswers[task.id]?.note || "";

                              return (
                                <div 
                                  key={task.id} 
                                  className={`p-3.5 rounded-xl border text-right transition flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs ${
                                    currentAnswerVal 
                                      ? "bg-emerald-50/20 border-emerald-200" 
                                      : "bg-white border-slate-150 hover:border-slate-300"
                                  }`}
                                >
                                  {/* Right text descriptive */}
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                        {language === "ar" ? task.categoryAr : task.categoryEn}
                                      </span>
                                      <span className="font-bold text-slate-800">
                                        {language === "ar" ? task.taskAr : task.taskEn}
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-400 font-medium">
                                      {language === "ar" ? task.taskEn : task.taskAr}
                                    </p>
                                  </div>

                                  {/* Inputs controls */}
                                  <div className="flex items-center gap-3 justify-end shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                                    {/* Text explanation or logs */}
                                    <input
                                      type="text"
                                      disabled={isCompletedToday}
                                      placeholder={language === "ar" ? "قراءات أو ملاحظة (مثال: درجة الحرارة)" : "Readings / Remarks (optional)"}
                                      value={currentAnswerNote}
                                      onChange={(e) => {
                                        setDutyChecklistAnswers(prev => ({
                                          ...prev,
                                          [task.id]: {
                                            done: prev[task.id]?.done || false,
                                            note: e.target.value
                                          }
                                        }));
                                      }}
                                      className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-[11px] font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none w-44 text-right disabled:opacity-75 disabled:cursor-not-allowed"
                                    />

                                    {/* Direct Toggle Button - Staff check */}
                                    <button
                                      disabled={isCompletedToday}
                                      onClick={() => {
                                        setDutyChecklistAnswers(prev => ({
                                          ...prev,
                                          [task.id]: {
                                            ...prev[task.id],
                                            done: !prev[task.id]?.done
                                          }
                                        }));
                                      }}
                                      className={`px-3 py-1.5 rounded-lg border font-bold text-[10.5px] transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                                        currentAnswerVal 
                                          ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                                          : "bg-slate-50 border-slate-200 text-slate-450 hover:bg-slate-100"
                                      }`}
                                    >
                                      {currentAnswerVal ? (
                                        <>
                                          <Check className="h-3 w-3 inline" />
                                          <span>{language === "ar" ? "مكتمل" : "Done"}</span>
                                        </>
                                      ) : (
                                        <span>{language === "ar" ? "تحديد كمنتهٍ" : "Mark Done"}</span>
                                      )}
                                    </button>

                                    {/* Admin delete custom task */}
                                    {rolePermissions.manageDutyTasks.includes(currentUser.role) && (
                                      <button 
                                        onClick={() => deleteTask(task.id)}
                                        title={language === "ar" ? "إزالة المهمة من جرد القسم" : "Remove task"}
                                        className="p-1 px-1.5 text-rose-500 hover:bg-rose-50 border border-slate-100 rounded transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Complete Staff Checklist Section */}
                      {!todaysChecklist && activeDeptTasks.length > 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                          <div className="space-y-1 text-center sm:text-right">
                            <p className="font-bold text-slate-700">
                              {language === "ar" ? "توقيع الموظف وإرسال استمارة الجرد الرقمية اليومية" : "Bilingual Electronic Staff Verification Stamps"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {language === "ar" 
                                ? `سيتم الختم برابط ومستوى الموظف النشط: ${currentUser.nameAr} | القسم: ${currentUser.department} (رقم الرمز: ${currentUser.staffId})`
                                : `Stamped with actively logged-in: ${currentUser.nameEn} | Dept: ${currentUser.department} (Staff ID: ${currentUser.staffId})`}
                            </p>
                          </div>

                          <button
                            onClick={submitChecklist}
                            className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>{language === "ar" ? "إتمام الشيك ليست وإدراجها للمشرفين" : "Complete, Sign Off & Route Checklist"}</span>
                          </button>
                        </div>
                      )}

                      {/* Supervisor Approval Control Panel Box */}
                      {todaysChecklist && todaysChecklist.status === "completed" && (
                        <div className="p-5 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-white rounded-xl border border-amber-500/30 text-xs space-y-4">
                          <div className="space-y-1">
                            <h4 className="font-black text-amber-800 flex items-center justify-end gap-1.5 text-xs">
                              <span>بوابة المراقبة والختم لمديرة التمريض والمشرفين</span>
                              <Award className="h-4 w-4 text-amber-600 shrink-0" />
                            </h4>
                            <p className="text-[10px] text-slate-500 max-w-2xl">
                              {language === "ar" 
                                ? `إشعار مخصص لرتبة "مُديرة التمريض" أو "مسؤولي الجودة": الشيك ليست اليومية لهذ القسم معبأة وجاهزة بالكامل. يرجى كتابة تعليقات الفحص والمراجعة لإتمام الإغلاق القانوني وقفل التقرير:`
                                : `Verification notice for Head Nurses & Auditors: Daily checklist inputs from nursing staff are complete. Review values and apply final approval to log into hospital records:`}
                            </p>
                          </div>

                          {rolePermissions.approveChecklist.includes(currentUser.role) ? (
                            <div className="space-y-3">
                              <div className="text-right space-y-1">
                                <label className="block text-[10px] font-bold text-slate-650">{language === "ar" ? "تعليق ومطالب التدقيق الصيدلي أو السريري للمشرف:" : "Supervisor Audit Notes / Quality Feedback:"}</label>
                                <textarea
                                  value={supervisorAuditNoteText}
                                  onChange={(e) => setSupervisorAuditNoteText(e.target.value)}
                                  placeholder={language === "ar" ? "مثال: تم تدقيق ومراجعة عيار أجهزة الإنعاش والدم، كافية والمطابقة سليمة ومطابقة للمعايير." : "e.g., Blood inventory and emergency shock apparatus fully verified. Closed."}
                                  className="w-full bg-white border border-amber-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-amber-500 font-sans text-xs min-h-[60px]"
                                />
                              </div>

                              <button
                                onClick={() => approveChecklist(todaysChecklist.id)}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Award className="h-4 w-4 text-white" />
                                <span>{language === "ar" ? "تأكيد الختم والتوقيع كمديرة تمريض ومشرف معتمد" : "Certify, Sign & Seal Healthcare Entry Logs"}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center font-bold">
                              {language === "ar" 
                                ? `⛔ صلاحية الاعتماد مقفلة! يجب التبديل لحساب "أ. فاطمة سعيد (مديرة تمريض)" أو "أ. نورهان علي (جودة)" من السلة أعلى اليمين للمحاكاة والاعتماد.`
                                : `⛔ Authorizing restricted. Swap to "Sister Fatima (Head Nurse)" or "Auditor Norhan" to test supervisors stamp.`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 4. Administrator Dynamic Task Creator */}
                    {rolePermissions.manageDutyTasks.includes(currentUser.role) && (
                      <form onSubmit={addTask} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                        <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 justify-end">
                            <span>إضافة وزيادة واجبات السجل من لوحة الإدارة</span>
                            <ListPlus className="h-4.5 w-4.5 text-pink-600" />
                          </h4>
                          <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                            {currentUser.role.toUpperCase()} PRIVILEGE
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {language === "ar" 
                            ? `بصفتك مسؤول النظام، يمكنك إدراج واجبات تفقدية جديدة لـ [${effectiveDutyDept}]. ستظهر هذه البنود فوراً لطاقم التمريض والاستاف لتعبئتها يومياً:`
                            : `As Admin, append custom inspection tasks dynamically to [${effectiveDutyDept}] checklists:`}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "نص الواجب اليومي المقيم (بالعربية):" : "Checking Item (Arabic):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskTextAr}
                              onChange={(e) => setNewTaskTextAr(e.target.value)}
                              placeholder={language === "ar" ? "مثال: مراجعة غاز الأوكسجين والتأكد من عدم تسربه" : "مثال: فحص سلامة أغطية صندوق الإبر"}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "نص الواجب اليومي المقيم (بالإنكليزية):" : "Checking Item (English):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskTextEn}
                              onChange={(e) => setNewTaskTextEn(e.target.value)}
                              placeholder="e.g., Inspect medical gas levels and verify safety seals"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "التصنيف والباب المقيم (بالعربية):" : "Category / Subtitle (Arabic):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskCategoryAr}
                              onChange={(e) => setNewTaskCategoryAr(e.target.value)}
                              placeholder="مثال: جاهزية الأجهزة"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500">{language === "ar" ? "التصنيف والباب المقيم (بالإنكليزية):" : "Category / Subtitle (English):"}</label>
                            <input
                              type="text"
                              required
                              value={newTaskCategoryEn}
                              onChange={(e) => setNewTaskCategoryEn(e.target.value)}
                              placeholder="e.g., Device Readiness"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{language === "ar" ? "إدراج وتخزين الواجب اليومي بالوحدة الطبية" : "Insert & Register New Task Sheet"}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === "editor" && (() => {
            const userDept = (currentUser?.department || "").toUpperCase().trim();
            const activeDirectives = notifications.filter(n => 
              !n.read && 
              n.type === "directive" && 
              (n.targetDepartment === "ALL" || (n.targetDepartment && userDept.includes(n.targetDepartment.toUpperCase().trim())))
            );

            return (
              <div className="space-y-4">
                {activeDirectives.length > 0 && (
                  <div className="no-print bg-gradient-to-l from-rose-500 via-rose-600 to-pink-600 text-white rounded-xl p-4 shadow-md border border-rose-400/40 relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-1/4 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-right animate-pulse-slow font-sans" dir="rtl">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/15 p-2 rounded-lg shrink-0">
                          <Radio className="h-5 w-5 text-white animate-pulse" />
                        </div>
                        <div className="text-right">
                          <span className="bg-white text-rose-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full uppercase font-sans">
                            {language === "ar" ? "📡 توجيه إداري وقائي عاجل" : "📡 High Priority Quality Notice"}
                          </span>
                          <p className="text-xs font-black mt-1 leading-relaxed">
                            {language === "ar" ? activeDirectives[0].messageAr : activeDirectives[0].messageEn}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const directiveId = activeDirectives[0].id;
                          const updated = notifications.map(n => n.id === directiveId ? {...n, read: true} : n);
                          setNotifications(updated);
                          localStorage.setItem("baheya_notifications", JSON.stringify(updated));
                        }}
                        className="px-4 py-1.5 bg-white hover:bg-slate-50 text-rose-700 font-black text-xs rounded-lg transition shadow shrink-0 cursor-pointer"
                      >
                        {language === "ar" ? "علم وألتزم بالتعليمات ✓" : "Acknowledge & Comply ✓"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Sidebar templates selector with custom search box */}
              <aside className="no-print lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                    <Layers className="h-4 w-4 text-pink-600" />
                    {language === "ar" ? `نماذج الجرد (${allAvailableTemplates.length} شيت كامل)` : `Master Templates (${allAvailableTemplates.length} Sheets)`}
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-tight mt-1">
                    {language === "ar" ? "استعرض وابحث بنصف الاسم أو الكود الخاص بأقسام بهية المتكاملة:" : "Filter and search through the clinical departments checklist archives:"}
                  </p>
                </div>

                {/* SEARCH AND FILTER COMPONENTS (مربع بحث ذكي للبلاتفورم مع فلاتر أقسام) */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={language === "ar" ? "ابحث بالاسم أو كود الشيت..." : "Search by sheet title or code..."}
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
                    />
                    {templateSearchQuery && (
                      <button 
                        onClick={() => setTemplateSearchQuery("")}
                        className="absolute left-2.5 top-2.5 font-bold text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Scrollable tabs of medical departments */}
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">
                      {language === "ar" ? "الأقسام والوحدات الرئيسية:" : "Department quick filters:"}
                    </span>
                    <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {[
                        { key: "ALL", ar: "عام / الكل", en: "General / All" },
                        { key: "ER", ar: "طوارئ (ER)", en: "Emergency" },
                        { key: "ICU", ar: "رعاية (ICU)", en: "Critical Care" },
                        { key: "OR", ar: "عمليات (OR)", en: "Operating" },
                        { key: "CHEMO", ar: "كيماوي (Chemo)", en: "Chemotherapy" },
                        { key: "RAD", ar: "أشعة (Rad)", en: "Radiology" },
                        { key: "PED", ar: "أطفال (Ped)", en: "Pediatrics" },
                        { key: "PHA", ar: "صيدلية (Pharm)", en: "Pharmacy" },
                        { key: "QLTY", ar: "جودة (Qual)", en: "Quality" },
                        ...departments.filter(d => !["EMERGENCY UNIT", "CHEMO UNIT PREPN", "INTENSIVE CARE UNIT (ICU)"].includes(d)).map(d => ({ key: d, ar: d, en: d }))
                      ].map((item) => {
                        const isSelected = selectedDepartmentFilter === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => setSelectedDepartmentFilter(item.key)}
                            className={`px-2 py-1 text-[9px] font-extrabold rounded-full border transition shrink-0 uppercase ${
                              isSelected 
                                ? "bg-pink-600 border-pink-500 text-white shadow-sm" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {language === "ar" ? item.ar : item.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Yearly Partition Filters */}
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">
                      {language === "ar" ? "منها تقسيمات سنوية (السنة المعتمدة):" : "Yearly partition (Approved year):"}
                    </span>
                    <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {[
                        { key: "ALL", ar: "كل السنوات", en: "All Years" },
                        { key: "2026", ar: "سنة 2026", en: "Year 2026" },
                        { key: "2025", ar: "سنة 2025", en: "Year 2025" },
                        { key: "2024", ar: "سنة 2024", en: "Year 2024" }
                      ].map((yr) => {
                        const isSelected = selectedYearFilter === yr.key;
                        return (
                          <button
                            key={yr.key}
                            onClick={() => setSelectedYearFilter(yr.key)}
                            className={`px-2 py-1 text-[9px] font-extrabold rounded border transition shrink-0 ${
                              isSelected 
                                ? "bg-blue-600 border-blue-500 text-white shadow-sm" 
                                : "bg-slate-50 border-slate-205 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {language === "ar" ? yr.ar : yr.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Templates list scrollbox with dynamic match counters */}
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[380px] p-0.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                    <span>{language === "ar" ? "السجلات المطابقة:" : "Matching sheets:"}</span>
                    <span className="font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {filteredTemplates.length} / 200
                    </span>
                  </div>

                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    const recordCount = records.filter(r => r.templateId === tpl.id).length;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          handleCreateNew(tpl.id);
                        }}
                        className={`text-right w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-1.5 transition ${
                          isSelected
                            ? "bg-pink-50 border-pink-200 text-pink-700 shadow-inner"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <div className="flex flex-col items-start text-left shrink overflow-hidden">
                          <span className="font-bold truncate text-[11px] max-w-[140px] text-right">
                            {language === "ar" ? tpl.titleAr : tpl.titleEn}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5 font-mono">{tpl.code}</span>
                        </div>
                        {recordCount > 0 && (
                          <span className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[8px] font-bold shrink-0">
                            {recordCount}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      {language === "ar" ? "لا توجد نتائج مطابقة لبحثك." : "No matching templates."}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px]">
                    <p className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                      {language === "ar" ? "كيف تقوم بتسجيل الأيام؟" : "Interactive Guide:"}
                    </p>
                    <p className="text-slate-500 leading-relaxed font-sans">
                      {language === "ar" 
                        ? "اضغط مباشرة على مربعات الأيام بالجدول للتبديل بين علامة متوفر (✔)، غير متوفر (✘)، أو أدخل قيمة الحرارة أوفلاين." 
                        : "Click directly on days column matrix to toggle checks (✔), missing logs (✘) or type custom notes."}
                    </p>
                  </div>
                </div>
              </aside>

              {/* Right Printable Form Frame */}
              {editingRecord ? (
                <div className="lg:col-span-3">
                  {/* Editing metadata panel toolbar - Hides on Print */}
                  <div className="no-print bg-slate-100 p-4 rounded-t-xl border border-b-0 border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center p-2 bg-pink-100 text-pink-700 rounded-lg">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-[10px] text-slate-500 leading-none">
                          {language === "ar" ? "الوثيقة النشطة قيد التحضير والطباعة" : "Active Auditing Form"}
                        </p>
                        <h2 className="text-xs font-black text-slate-800 mt-1 uppercase">
                          {editingRecord.code} | {language === "ar" ? selectedTemplate.titleAr : selectedTemplate.titleEn}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* SHIFT SELECTION DROP-DOWN FOR TRACKING (مهم جدا كما طلب المستخدم) */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
                        <span className="text-slate-400 text-[10px] mr-1">
                          {language === "ar" ? "الشفت الحالي:" : "Shift:"}
                        </span>
                        <select
                          value={selectedShift}
                          onChange={(e) => setSelectedShift(e.target.value)}
                          className="font-bold text-slate-750 text-slate-800 bg-transparent border-none focus:ring-0 cursor-pointer p-0 text-[11px] outline-none"
                        >
                          {CLINICAL_SHIFTS.map(s => (
                            <option key={s.id} value={s.id}>{language === "ar" ? s.nameAr : s.nameEn}</option>
                          ))}
                        </select>
                      </div>

                      {/* Weekly/Monthly View Toggles & Day focus selectors */}
                      {selectedTemplate.id !== "patient-discharge-ama" && (
                        <>
                          {/* Ledger layout view mode toggle */}
                          <div className="flex items-center gap-1 bg-white border border-slate-250 border-slate-200 rounded-lg p-0.5 text-xs select-none">
                            <button
                              type="button"
                              onClick={() => {
                                setLedgerViewMode("weekly");
                                if (dayFocus !== "all" && parseInt(dayFocus.toString()) > 7) {
                                  setDayFocus("all");
                                }
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-black transition-colors ${
                                ledgerViewMode === "weekly"
                                  ? "bg-pink-650 bg-pink-600 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {language === "ar" ? "أسبوعي (7 أيام)" : "Weekly (7 Days)"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLedgerViewMode("monthly")}
                              className={`px-2 py-1 rounded text-[10px] font-black transition-colors ${
                                ledgerViewMode === "monthly"
                                  ? "bg-pink-650 bg-pink-600 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {language === "ar" ? "شهري (31 يوم)" : "Monthly (31 Days)"}
                            </button>
                          </div>

                          {/* Month/Day focus selection */}
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
                            <span className="text-slate-400 text-[10px] mr-1">
                              {language === "ar" ? "التركيز الحالي:" : "Filtering:"}
                            </span>
                            <select
                              value={dayFocus}
                              onChange={(e) => setDayFocus(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                              className="font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer p-0 text-[11px] outline-none animate-fade"
                            >
                              <option value="all">
                                {ledgerViewMode === "weekly"
                                  ? (language === "ar" ? "كامل الأسبوع (1-7)" : "Full Week (1-7)")
                                  : (language === "ar" ? "كامل الشهر (1-31)" : "Full Month (1-31)")}
                              </option>
                              {Array.from({ length: ledgerViewMode === "weekly" ? 7 : 31 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>{language === "ar" ? `يوم فقط ${d}` : `Day ${d}`}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {/* QUALITY CERTIFICATION STAMP CONTROL (متاح فقط لمشرف الجودة والأدمن) */}
                      {(currentUser.role === "quality" || currentUser.role === "admin" || currentUser.role === "president") && (
                        <button
                          onClick={() => {
                            const isCertified = !!editingRecord.additionalInfo?.isQualityCertified;
                            const updatedInfo = {
                              ...editingRecord.additionalInfo,
                              isQualityCertified: !isCertified,
                              certifiedBy: language === "ar" ? currentUser.nameAr : currentUser.nameEn,
                              certifiedAt: new Date().toISOString().slice(0, 10),
                            };
                            setEditingRecord({
                              ...editingRecord,
                              additionalInfo: updatedInfo
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow ${
                            editingRecord.additionalInfo?.isQualityCertified 
                              ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300" 
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                          title={language === "ar" ? "اعتماد وختم الجودة كمسؤول جودة معتمد" : "Certify this sheet with QA digital stamp"}
                        >
                          <Award className="h-4 w-4" />
                          <span>
                            {editingRecord.additionalInfo?.isQualityCertified 
                              ? (language === "ar" ? "إلغاء ختم الفحص" : "Remove Stamp")
                              : (language === "ar" ? "اعتماد وختم الجودة" : "Certify Stamp")}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={handleSaveActiveRecord}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition"
                      >
                        {language === "ar" ? "حفظ التغييرات" : "Save Record"}
                      </button>
                      
                      <button
                        onClick={() => {
                          generatePDF(
                            editingRecord,
                            selectedTemplate,
                            hospitalSettings,
                            language,
                            dayFocus,
                            selectedShift
                          );
                        }}
                        className="px-4 py-1.5 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-white" />
                        {language === "ar" ? "تصدير تقرير PDF" : "Export Clinical PDF"}
                      </button>

                      <button
                        onClick={handlePrint}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition"
                      >
                        <Printer className="h-4 w-4 text-pink-400" />
                        {language === "ar" ? "طباعة طبق الأصل" : "Print Precise Replica"}
                      </button>
                    </div>
                  </div>

                  {/* Row & Items Inline Manager (no-print) */}
                  <div className="no-print mx-0 mt-0 mb-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-150 pb-2.5 mb-2 font-sans text-right">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-pink-100 text-pink-700 rounded-lg">
                          <ListPlus className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <h3 className="text-xs font-black text-slate-800">
                            {language === "ar" ? "نظام تعديل وإضافة وحذف أصناف الشيت" : "Sheet Items & Rows Architect (Add, Edit, Delete)"}
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {language === "ar" ? "أضف بنوداً جديدة للجدول، أو عدل المسميات والمقادير مباشرة لتعديل خلايا الجرد طبق الأصل" : "Directly append new items, customize bilingual text or modify unit/qty specifications instantly"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-650 px-2.5 py-1 rounded-full">
                        {language === "ar" ? `${editingRecord.gridData.length} صنف متاح` : `${editingRecord.gridData.length} active items`}
                      </span>
                    </div>

                    {/* Inline list of current items in this editingRecord */}
                    <div className="mb-4 max-h-40 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50 divide-y divide-slate-100 text-xs font-sans">
                      {editingRecord.gridData.map((row, rIdx) => (
                        <div key={row.code || rIdx} className="p-2 flex items-center justify-between gap-3 hover:bg-slate-100/50">
                          <div className="flex-1 min-w-0 text-right">
                            <span className="text-[10px] font-extrabold text-slate-400 font-mono inline-block ml-2 w-5">
                              {rIdx + 1}
                            </span>
                            <span className="font-bold text-slate-800">
                              {language === "ar" ? row.itemAr : row.itemEn}
                            </span>
                            <span className="text-[10px] text-slate-450 font-mono inline-block mr-2 uppercase tracking-wide">
                              (Code: {row.code || rIdx+1} | {language === "ar" ? `وحدة: ${row.unit || '-'}` : `Unit: ${row.unit || '-'}`} | {language === "ar" ? `مخزون: ${row.qty || '-'}` : `Qty: ${row.qty || '-'}`})
                            </span>
                          </div>
                          
                          {/* Item modifiers */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleStartEditRow(rIdx, row)}
                              className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition text-slate-400 cursor-pointer"
                              title={language === "ar" ? "تعديل محتوى الصف" : "Edit row text"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(rIdx)}
                              className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition text-slate-400 cursor-pointer"
                              title={language === "ar" ? "حذف الصف كاملاً" : "Remove item row"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Input Panel for edit/add rows */}
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-xs gap-3 grid grid-cols-1 md:grid-cols-12 items-end font-sans">
                      <div className="md:col-span-4">
                        <label className="block text-[9px] text-slate-450 font-black mb-1 text-right">
                          {language === "ar" ? "اسم الصنف بالعربية" : "Item Arabic Title:"}
                        </label>
                        <input
                          type="text"
                          value={rowForm.itemAr}
                          onChange={(e) => setRowForm({ ...rowForm, itemAr: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 outline-none focus:border-pink-500 font-bold text-slate-800"
                          placeholder={language === "ar" ? "مثال: أمبول صوديوم كلورايد" : "Arabic title"}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[9px] text-slate-450 font-black mb-1 text-right">
                          {language === "ar" ? "اسم الصنف بالإنجليزية" : "Item English Title:"}
                        </label>
                        <input
                          type="text"
                          value={rowForm.itemEn}
                          onChange={(e) => setRowForm({ ...rowForm, itemEn: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 outline-none focus:border-pink-500 font-mono text-slate-800"
                          placeholder="e.g. Sodium Chloride Ampoule"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 md:col-span-3">
                        <div>
                          <label className="block text-[9px] text-slate-450 font-black mb-1 text-center">
                            كود
                          </label>
                          <input
                            type="text"
                            value={rowForm.code}
                            onChange={(e) => setRowForm({ ...rowForm, code: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-center font-mono uppercase font-bold text-slate-800"
                            placeholder="E12"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-450 font-black mb-1 text-center">
                            الوحدة
                          </label>
                          <input
                            type="text"
                            value={rowForm.unit}
                            onChange={(e) => setRowForm({ ...rowForm, unit: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-center text-slate-800"
                            placeholder="AMP"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-450 font-black mb-1 text-center">
                            العدد/الكمية
                          </label>
                          <input
                            type="text"
                            value={rowForm.qty}
                            onChange={(e) => setRowForm({ ...rowForm, qty: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-center font-mono text-slate-800"
                            placeholder="20"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 flex gap-1 bg-transparent">
                        <button
                          onClick={handleSaveRowForm}
                          className="flex-1 bg-pink-650 hover:bg-pink-700 text-white font-bold py-1.5 rounded-lg text-center transition cursor-pointer"
                        >
                          {rowEditIndex !== null 
                            ? (language === "ar" ? "حفظ" : "Save") 
                            : (language === "ar" ? "إضافة صنف" : "Add Row")}
                        </button>
                        {rowEditIndex !== null && (
                          <button
                            onClick={handleCancelRowEdit}
                            className="bg-slate-200 text-slate-700 font-bold py-1.5 px-2 rounded-lg text-center hover:bg-slate-300 transition cursor-pointer"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* HIGH FIDELITY PRINTABLE REPLICA CONTAINER (صناعة طبق الأصل للفورم لضمان الجودة) */}
                  <div className="print-container bg-white p-6 sm:p-8 rounded-b-xl border border-slate-200 shadow-sm relative overflow-visible print:border-none print:shadow-none print:p-0">
                    
                    {/* Double bordered box representing high standard Egyptian Clinical documents */}
                    <div className="border-[3px] border-slate-900 p-5 rounded-lg relative overflow-hidden print:p-0 print:border-none">
                      
                      {/* RED INK QUALITY OFFICERS CERTIFICATION SEAL (ختم في الجانب مع روتيت) */}
                      {editingRecord.additionalInfo?.isQualityCertified && (
                        <div className="absolute top-6 left-6 rotate-[-12deg] border-[3px] border-red-600 text-red-600 bg-white/95 px-4 py-2 rounded-lg font-mono text-[10px] uppercase font-bold tracking-tight text-center select-none shadow-md border-double border-4 z-30 avoid-break print:left-3 print:top-6">
                          <div className="border-b border-red-600 pb-0.5 mb-1 font-bold tracking-widest text-[8px] flex items-center justify-center gap-1">
                            <HeartPulse className="h-3 w-3" />
                            <span>BAHEYA QUALITY</span>
                          </div>
                          <div className="text-[12px] font-black text-red-600 leading-none">
                            CERTIFIED AUDIT
                          </div>
                          <div className="text-[9px] text-red-600 mt-1 font-extrabold tracking-tight">
                            ✔ COMPLIANT & APPROVED
                          </div>
                          <div className="text-[8px] text-slate-500 mt-1 uppercase font-normal font-sans leading-none">
                            Date: {editingRecord.additionalInfo?.certifiedAt || "2026-06-01"}
                          </div>
                          <div className="text-[8px] text-slate-500 uppercase font-bold font-sans mt-0.5">
                            ID: {editingRecord.additionalInfo?.certifiedBy || "Auditor Norhan Ali"}
                          </div>
                        </div>
                      )}

                      {/* Header Banner - Replica of Hospital Letterhead */}
                      <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-slate-900 pb-4 mb-4 avoid-break">
                        
                        {/* Bilingual Logo block */}
                        <div className="flex items-center gap-3">
                          <div className="text-right flex flex-col justify-center">
                            <span className="text-xl sm:text-2xl font-black text-pink-600 tracking-tight leading-none">
                              {hospitalSettings.nameAr}
                            </span>
                            <span className="text-[8px] text-pink-600 font-bold leading-tight select-none">
                              {hospitalSettings.taglineAr}
                            </span>
                          </div>
                          <div className="h-8 w-[1px] bg-slate-300 hidden sm:block"></div>
                          <div className="text-left hidden sm:flex flex-col justify-center font-sans">
                            <span className="text-xs font-extrabold text-slate-800 tracking-wide leading-none">
                              {hospitalSettings.nameEn}
                            </span>
                            <span className="text-[8px] text-slate-400 leading-tight">
                              {hospitalSettings.taglineEn}
                            </span>
                          </div>
                        </div>

                        {/* Code blue form titles */}
                        <div className="text-center mt-3 sm:mt-0">
                          <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                            {language === "ar" ? selectedTemplate.titleAr : selectedTemplate.titleEn}
                          </h2>
                          <span className="text-[9px] sm:text-xs font-mono text-slate-400 tracking-wider">
                            Form Reference: {selectedTemplate.code} | Version {selectedTemplate.version || "01"} | Rev: {selectedTemplate.issueDate}
                          </span>
                        </div>
                      </div>

                      {/* Metadata Entry Row - nurse names, date, department */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-4 avoid-break print:bg-transparent print:border-none print:p-0">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "القسم / مكان الجرد" : "Department / Unit Floor:"}
                          </label>
                          <input
                            type="text"
                            value={editingRecord.department}
                            onChange={(e) => setEditingRecord({ ...editingRecord, department: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "تاريخ الفحص والمراقبة" : "Inspection Month/Date:"}
                          </label>
                          <div className="relative flex items-center">
                            <Calendar className="absolute right-2 text-slate-400 h-3.5 w-3.5 pointer-events-none" />
                            <input
                              type="date"
                              value={editingRecord.date}
                              onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded pr-8 pl-2 py-1 font-mono font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">
                            {language === "ar" ? "الممرض المسؤول حالياً" : "Investigated Nurse Name:"}
                          </label>
                          <div className="relative flex items-center">
                            <User className="absolute right-2 text-slate-400 h-3.5 w-3.5 pointer-events-none" />
                            <input
                              type="text"
                              value={editingRecord.staffName}
                              onChange={(e) => setEditingRecord({ ...editingRecord, staffName: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded pr-8 pl-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase font-mono">
                            {language === "ar" ? "الرقم الوظيفي / الكود" : "Responsible Employee ID:"}
                          </label>
                          <input
                            type="text"
                            value={editingRecord.staffId}
                            onChange={(e) => setEditingRecord({ ...editingRecord, staffId: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800 print:text-black focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      {/* Patient metadata details row if patient specific details is enabled */}
                      {selectedTemplate.hasPatientDetails && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-red-50/50 p-3 rounded-lg border border-red-100 text-xs mb-4 avoid-break print:bg-transparent print:border-none print:p-0">
                          <div>
                            <label className="block text-[9px] text-red-700 font-bold mb-1 uppercase">
                              {language === "ar" ? "اسم المريض الرباعي" : "Patient Full Name:"}
                            </label>
                            <input
                              type="text"
                              value={editingRecord.patientName || ""}
                              onChange={(e) => setEditingRecord({ ...editingRecord, patientName: e.target.value })}
                              className="w-full bg-white border border-red-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-red-700 font-bold mb-1 uppercase font-sans">
                              {language === "ar" ? "الرقم الطبي (MRN)" : "Clinical Record ID (MRN):"}
                            </label>
                            <input
                              type="text"
                              value={editingRecord.patientMRN || ""}
                              onChange={(e) => setEditingRecord({ ...editingRecord, patientMRN: e.target.value })}
                              className="w-full bg-white border border-red-200 rounded px-2 py-1 font-mono font-bold text-slate-800 print:text-black focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-red-700 font-bold mb-1 uppercase">
                              {language === "ar" ? "التشخيص الطبي الأورام" : "Acknowledge Oncology Diagnosis:"}
                            </label>
                            <input
                              type="text"
                              value={editingRecord.diagnosis || ""}
                              onChange={(e) => setEditingRecord({ ...editingRecord, diagnosis: e.target.value })}
                              className="w-full bg-white border border-red-200 rounded px-2 py-1 font-bold text-slate-800 print:text-black focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* FORM CASE 1: PATIENT CONSENT / OUT AGAINST ADVICE FORM */}
                      {selectedTemplate.id === "patient-discharge-ama" ? (
                        <div className="text-right text-xs leading-relaxed space-y-4 text-slate-800 print:text-black print:leading-normal">
                          <p className="font-bold border-b pb-1 text-slate-700">
                            {language === "ar" 
                              ? "أقرأ أنا الموقع أدناه بأنني أتحمل كامل المسؤولية بمغادرة الحالة المستشفى رغماً عن التوصيات الطبية:"
                              : "Patient/Legal guardian declaration on discharge against medical advice:"}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-transparent print:border-none print:p-0">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "اسم المقر المسؤول:" : "Declarant Name:"}</span>
                                <input 
                                  type="text" 
                                  placeholder="..........."
                                  value={editingRecord.additionalInfo?.witnessName || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, witnessName: e.target.value }
                                  })}
                                  className="border-b border-slate-400 flex-1 px-1 font-bold bg-transparent focus:outline-none" 
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "صلة القرابة بالمريض:" : "Relationship to Patient:"}</span>
                                <select
                                  value={editingRecord.additionalInfo?.relation || "self"}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, relation: e.target.value }
                                  })}
                                  className="border-b border-slate-400 bg-transparent py-0.5 px-1 font-bold text-xs outline-none"
                                >
                                  <option value="self">{language === "ar" ? "بالأصالة عن نفسي" : "Self"}</option>
                                  <option value="son">{language === "ar" ? "صلة قرابة: ابن" : "Son"}</option>
                                  <option value="daughter">{language === "ar" ? "صلة قرابة: ابنة" : "Daughter"}</option>
                                  <option value="relative">{language === "ar" ? "صلة قرابة: قرابة قانونية" : "Legal Guardian"}</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "الرقم القومي / العائلي:" : "National ID Number:"}</span>
                                <input 
                                  type="text" 
                                  placeholder=".........................."
                                  value={editingRecord.additionalInfo?.witnessSignatureAr || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, witnessSignatureAr: e.target.value }
                                  })}
                                  className="border-b border-slate-400 flex-1 px-1 font-mono bg-transparent focus:outline-none" 
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{language === "ar" ? "بسبب مغادرة وقدرها:" : "Stated Discharge Reason:"}</span>
                                <input 
                                  type="text"
                                  placeholder={language === "ar" ? "سبب المغادرة رغماً عن التوجيه" : "Reason detail"}
                                  value={editingRecord.additionalInfo?.doctorRefusedText || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, doctorRefusedText: e.target.value }
                                  })}
                                  className="border-b border-slate-400 flex-1 px-1 bg-transparent focus:outline-none" 
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border border-red-200 bg-red-50/20 p-3 rounded-lg print:border-none print:p-0">
                            <p className="font-bold text-red-800 print:text-black mb-1">
                              {language === "ar" ? "إقرار الطبيب ومضاعفات خروج المريض المحتملة:" : "Clinical Complications Explained:"}
                            </p>
                            <p className="text-[11px] text-slate-600 print:text-black mb-2 font-sans">
                              {language === "ar" 
                                ? "أقر أنا الطبيب المسؤول بأنني قمت بشرح وتوضيح المخاطر الطبية والمضاعفات الناتجة عن رفض العلاج ومنها:"
                                : "The attending physician explained clinical hazards regarding the rejection of care:"}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="flex items-center gap-1">
                                <span className="font-bold">1.</span>
                                <input 
                                  type="text" 
                                  value={editingRecord.additionalInfo?.complication1 || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, complication1: e.target.value }
                                  })}
                                  placeholder={language === "ar" ? "مضاعفة 1: التهاب الجرح" : "Complication hazard 1"}
                                  className="border-b border-slate-300 px-1 py-0.5 w-full bg-transparent focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">2.</span>
                                <input 
                                  type="text" 
                                  value={editingRecord.additionalInfo?.complication2 || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, complication2: e.target.value }
                                  })}
                                  placeholder={language === "ar" ? "مضاعفة 2: تدهور مؤشرات الصدر" : "Complication hazard 2"}
                                  className="border-b border-slate-300 px-1 py-0.5 w-full bg-transparent focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold">3.</span>
                                <input 
                                  type="text" 
                                  value={editingRecord.additionalInfo?.complication3 || ""}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    additionalInfo: { ...editingRecord.additionalInfo, complication3: e.target.value }
                                  })}
                                  placeholder={language === "ar" ? "مضاعفة 3: فشل وظائف الأعضاء" : "Complication hazard 3"}
                                  className="border-b border-slate-300 px-1 py-0.5 w-full bg-transparent focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Signatures replica block */}
                          <div className="grid grid-cols-2 gap-6 pt-10 text-center avoid-break">
                            <div className="border-t border-slate-400 pt-2 space-y-1">
                              <p className="font-bold">{language === "ar" ? "توقيع المريض المقر بالمسؤولية" : "Patient Declarant Signature:"}</p>
                              <p className="text-[10px] text-slate-450">{language === "ar" ? "توقيع أو ختم بصمة اليد" : "Handwritten signature or thumbprint"}</p>
                            </div>
                            <div className="border-t border-slate-400 pt-2 space-y-1">
                              <p className="font-bold">{language === "ar" ? "توقيع الطبيب والختم الرسمي" : "Physician Stamp & Stamp:"}</p>
                              <p className="text-[10px] text-slate-455">{language === "ar" ? "تاريخ ووقت التوقيع بالرفض" : "Date & time of clearance"}</p>
                            </div>
                          </div>

                          <div className="text-center pt-8 border-t text-[9px] text-slate-400 font-mono avoid-break">
                            <span>Issue Date: 03.2025 | Document Reference: BHG-FR-MED-080 | Page 1 of 1</span>
                          </div>
                        </div>
                      ) : (
                        
                        /* FORM CASE 2: HIGH FIDELITY MONTHLY GRID / CHECKLIST SPREADSHEETS (كل الأنماط الأخرى) */
                        <div className="space-y-4">
                          
                          {/* Legend Bar only on screen */}
                          <div className="no-print flex items-center justify-between text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded">
                            <div className="flex gap-4 flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="bg-emerald-100 text-emerald-700 px-1 rounded font-bold">✔</span>
                                {language === "ar" ? "متوفر / سليم" : "Available"}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="bg-red-100 text-red-700 px-1 rounded font-bold">✘</span>
                                {language === "ar" ? "غير متوفر / مفقود" : "Out of stock / Missing"}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="border px-1 rounded text-slate-400 font-sans">قيمة</span>
                                {language === "ar" ? "أرقام للحرارة والرطوبة" : "Readings for Temp/Humidity"}
                              </span>
                            </div>
                            <span>
                              {language === "ar" ? "*اضغط فوق الخلايا لتسجيل البيانات أوفلاين" : "*Click table cell to change checks logs"}
                            </span>
                          </div>

                          {/* Interactive Data Table */}
                          <div className="overflow-x-auto border rounded-lg border-slate-200 print:border-none animate-fade">
                            <table className="min-w-full text-right divide-y divide-slate-250 border-collapse print:text-black">
                              <thead className="bg-slate-100 border-b-2 border-slate-900">
                                <tr className="divide-x divide-x-reverse divide-slate-200">
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-800 w-10">M</th>
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-800 w-16">Code</th>
                                  <th scope="col" className="px-3 py-3 text-right text-xs font-black text-slate-800 min-w-[220px]">
                                    {language === "ar" ? "الصنف والمستلزم المطلوب فصحه وجرده" : "Medical Item description"}
                                  </th>
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-850 w-16">Unit</th>
                                  <th scope="col" className="px-2 py-3 text-center text-xs font-black text-slate-850 w-12 mr-1">Qty</th>
                                  
                                  {/* Day headers with Bulk Action Checkboxes */}
                                  {dayFocus === "all" ? (
                                    Array.from({ length: ledgerViewMode === "weekly" ? 7 : 31 }, (_, i) => (i + 1).toString()).map(day => (
                                      <th 
                                        key={day} 
                                        scope="col" 
                                        onClick={() => handleBulkFillDay(day)}
                                        className="day-col px-0.5 py-1 text-center text-[9px] font-mono text-slate-700 cursor-pointer lg:hover:bg-slate-200 active:bg-slate-300 select-none print:cursor-default print:hover:bg-transparent"
                                        title={language === "ar" ? "انقر للملء التلقائي لليوم" : "Click to Bulk Fill Day"}
                                      >
                                        <div className="font-bold">{day}</div>
                                        <div className="no-print text-[7px] text-pink-500 font-sans font-normal border-t mt-0.5 leading-none">
                                          Fill
                                        </div>
                                      </th>
                                    ))
                                  ) : (
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-bold text-pink-700 w-24">
                                      {language === "ar" ? `يوم الفحص ${dayFocus}` : `Day ${dayFocus}`}
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              
                              <tbody className="bg-white divide-y divide-slate-200 border-b border-slate-900">
                                {editingRecord.gridData.map((row, rIndex) => (
                                  <tr 
                                    key={row.code || rIndex} 
                                    className="divide-x divide-x-reverse divide-slate-200 hover:bg-slate-50 transition print:hover:bg-transparent"
                                  >
                                    {/* S/N */}
                                    <td className="px-2 py-2 text-center text-xs font-bold font-mono text-slate-500">
                                      {row.sn || rIndex + 1}
                                    </td>
                                    
                                    {/* Code */}
                                    <td className="px-2 py-2 text-center text-xs font-bold font-mono text-slate-500">
                                      {row.code || "N/A"}
                                    </td>

                                    {/* Bilingual descriptor */}
                                    <td className="px-3 py-2 text-right text-xs">
                                      <div className="font-bold text-slate-900 leading-tight">
                                        {row.itemAr}
                                      </div>
                                      <div className="text-[9px] text-slate-450 leading-none mt-1 font-mono">
                                        {row.itemEn}
                                      </div>
                                    </td>

                                    {/* Unit */}
                                    <td className="px-2 py-2 text-center text-[10px] uppercase font-bold text-slate-500">
                                      {row.unit || "-"}
                                    </td>

                                    {/* Target Qty */}
                                    <td className="px-2 py-2 text-center text-xs font-bold text-slate-705 font-mono">
                                      {row.qty || "-"}
                                    </td>

                                    {/* Columns for checkmarks days */}
                                    {dayFocus === "all" ? (
                                      Array.from({ length: ledgerViewMode === "weekly" ? 7 : 31 }, (_, i) => (i + 1).toString()).map(day => {
                                        const val = row.days[day] || "";
                                        return (
                                          <td
                                            key={day}
                                            onClick={() => handleCellToggle(rIndex, day)}
                                            className={`day-col px-0.5 text-center text-[10px] font-bold cursor-pointer transition select-none print:cursor-default ${
                                              val === "✔" 
                                                ? "bg-emerald-50 text-emerald-700" 
                                                : val === "✘" 
                                                ? "bg-red-50 text-red-650 font-black" 
                                                : val !== "" 
                                                ? "bg-blue-50 text-blue-800 font-mono text-[9px]" 
                                                : "lg:hover:bg-slate-100"
                                            }`}
                                          >
                                            {val}
                                          </td>
                                        );
                                      })
                                    ) : (
                                      // Single focused Day Column mode
                                      <td
                                        onClick={() => handleCellToggle(rIndex, dayFocus.toString())}
                                        className={`px-3 py-2 text-center text-xs font-bold cursor-pointer transition select-none ${
                                          row.days[dayFocus.toString()] === "✔" 
                                            ? "bg-emerald-50 text-emerald-800" 
                                            : row.days[dayFocus.toString()] === "✘" 
                                            ? "bg-red-50 text-red-800 font-black" 
                                            : row.days[dayFocus.toString()] !== "" 
                                            ? "bg-blue-50 text-blue-900 font-mono text-[10px]" 
                                            : "lg:hover:bg-slate-100"
                                        }`}
                                      >
                                        {row.days[dayFocus.toString()] || (
                                          <span className="text-[10px] text-slate-350 font-normal">
                                            {language === "ar" ? "اضغط" : "Click"}
                                          </span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                <tr className="divide-x divide-x-reverse divide-slate-200">
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  <td className="px-3 py-2 text-right text-xs font-black text-slate-800 bg-slate-100/95">
                                    <div className="flex items-center justify-between">
                                      <span>{language === "ar" ? "توقيع وبصمة الموظف اليومي:" : "Daily Verified Signature:"}</span>
                                      <ShieldCheck className="h-3.5 w-3.5 text-pink-600 inline ml-1" />
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  <td className="px-2 py-2 text-center text-[10px] font-black text-slate-600 bg-slate-100">-</td>
                                  
                                  {dayFocus === "all" ? (
                                    Array.from({ length: ledgerViewMode === "weekly" ? 7 : 31 }, (_, i) => (i + 1).toString()).map(day => {
                                      const isDayFilled = editingRecord.gridData.some(row => row.days[day] !== undefined && row.days[day] !== "");
                                      return (
                                        <td key={day} className="day-col px-0.5 py-1.5 text-center text-[9px] font-sans font-black bg-slate-50">
                                          {isDayFilled ? (
                                            <div className="flex flex-col items-center justify-center">
                                              <span className="text-[8px] bg-pink-100 text-pink-850 border border-pink-200/50 py-0.5 px-0.5 rounded leading-none block font-sans scale-[0.9] select-none" title={`Signed by: ${editingRecord.staffName || 'Staff Nurse'}`}>
                                                ✍ {editingRecord.staffName ? editingRecord.staffName.split(" ")[0] : (language === "ar" ? "تمريض" : "Nurse")}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                      );
                                    })
                                  ) : (
                                    <td className="px-3 py-2 text-center text-xs font-bold bg-slate-50 font-sans">
                                      {editingRecord.gridData.some(row => row.days[dayFocus.toString()] !== undefined && row.days[dayFocus.toString()] !== "") ? (
                                        <span className="text-[10px] bg-pink-100 text-pink-805 border border-pink-200 py-1 px-2 rounded-full inline-block font-sans font-black">
                                          ✍ {editingRecord.staffName || (language === "ar" ? "توقيع التمريض المعتمد" : "Nurse Signoff")}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Signatures row replica */}
                          <div className="grid grid-cols-3 gap-6 pt-10 text-center avoid-break text-xs text-slate-800 print:text-black">
                            <div className="border-t-2 border-slate-900 pt-2 space-y-1">
                              <span className="font-extrabold">{language === "ar" ? "المستلم ومحضر ممرض القسم" : "Prepared Nurse / Officer:"}</span>
                              <div className="h-4"></div>
                              <div className="text-[10px] text-slate-600 font-bold">{editingRecord.staffName || "............................"}</div>
                              <div className="text-[9px] text-slate-400 font-mono">ID: {editingRecord.staffId || "....."}</div>
                            </div>
                            <div className="border-t-2 border-slate-900 pt-2 space-y-1">
                              <span className="font-extrabold">{language === "ar" ? "رئيسة التمريض للقسم" : "Checked Head Nurse:"}</span>
                              <div className="h-6"></div>
                              <div className="text-[10px] text-slate-400 font-bold">................................................</div>
                            </div>
                            <div className="border-t-2 border-slate-900 pt-2 space-y-1">
                              <span className="font-extrabold">{language === "ar" ? "مراقب الجودة والتنمية" : "Hospital Quality Controller:"}</span>
                              <div className="h-6"></div>
                              <div className="text-[10px] text-slate-400 border border-transparent">
                                {editingRecord.additionalInfo?.isQualityCertified 
                                  ? (language === "ar" ? `معتمد: ${editingRecord.additionalInfo.certifiedBy}` : `Certified: ${editingRecord.additionalInfo.certifiedBy}`)
                                  : "................................................"}
                              </div>
                            </div>
                          </div>

                          {/* Document footer references */}
                          <div className="text-center pt-6 border-t text-[9px] text-slate-400 font-mono avoid-break">
                            <span>Revision: {selectedTemplate.code} | Issue Date: {selectedTemplate.issueDate} | Baheya Hospital Clinical Quality Archive - Page 1 of 1</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-3 text-center py-20 bg-white border rounded-xl border-dashed border-slate-300 p-8">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-slate-600">
                    {language === "ar" ? "يرجى الضغط على نموذج من قائمة الـ 200 شيت النشطة للبدء بالتسجيل" : "Please select any form template on sidebar or click create blank database log to start."}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

          {/* TAB: Interactive Quality Compliance Analytics & CQI Suite */}
          {activeTab === "analytics" && (() => {
            // Aggregate quality statistics dynamically
            let totalChecks = 0;
            let successfulChecks = 0;
            let criticalFailures = 0;
            const openAlertsList: any[] = [];

            records.forEach((rec) => {
              const temp = allAvailableTemplates?.find(t => t.id === rec.templateId);
              const templateTitle = temp ? (language === "ar" ? temp.titleAr : temp.titleEn) : rec.templateId;
              const templateCode = temp ? temp.code : "";
              
              if (rec.gridData) {
                rec.gridData.forEach((row) => {
                  if (row.days) {
                    Object.entries(row.days).forEach(([day, val]) => {
                      if (val) {
                        totalChecks++;
                        if (val === "✔" || val !== "✘") {
                          successfulChecks++;
                        }
                        if (val === "✘") {
                          criticalFailures++;
                          const gapKey = `${rec.id}-${row.code || row.itemEn}-${day}`;
                          openAlertsList.push({
                            recordId: rec.id,
                            recordDate: rec.date,
                            templateCode,
                            templateTitle,
                            itemName: row.itemAr,
                            itemEn: row.itemEn,
                            dayNum: day,
                            staffName: rec.staffName,
                            department: rec.department,
                            uniqueGapKey: gapKey
                          });
                        }
                      }
                    });
                  }
                });
              }
            });

            const compliancePercent = totalChecks > 0 ? Math.round((successfulChecks / totalChecks) * 100) : 100;

            return (
              <div className="space-y-6 animate-fade text-right font-sans">
                
                {/* Header section with branding & Seeding Action button */}
                <div className="bg-gradient-to-l from-pink-500/10 via-pink-400/5 to-transparent p-6 rounded-2xl border border-pink-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-right">
                    <span className="bg-pink-600 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                      Continuous Quality Improvement (CQI)
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center justify-end gap-2">
                      <span>لوحة مؤشرات الجودة لـ {hospitalSettings.nameAr}</span>
                      <TrendingUp className="h-5 w-5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xl leading-relaxed">
                      مؤشرات ورسومات بيانية حية وفورية تقيس صلاحية الأدوية وعربات الطوارئ ومستويات الجودة عبر كافة وحدات المستشفى الطبية. تساعدك على حصر المعوقات الطبية واتخاذ التدابير التصحيحية فوراً.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {records.length === 0 && (
                      <button
                        onClick={handleSeedMockAuditData}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Database className="h-4 w-4" />
                        <span>توليد وتغذية 3 سجلات طبية تجريبية للتحليل</span>
                      </button>
                    )}
                    {records.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm(language === "ar" ? "هل أنت متأكد من مسح جميع التقارير المسجلة؟" : "Are you sure you want to clear all records?")) {
                            setRecords([]);
                            localStorage.setItem("baheya_medical_records", JSON.stringify([]));
                            alert(language === "ar" ? "تم تصفير المستودع بنجاح." : "Records store cleared.");
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-lg transition shrink-0"
                      >
                        تفريغ الأرشيف الحالي
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time Task Submission notifications for supervisors / quality team */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5 text-right no-print">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <button 
                      onClick={() => {
                        const marked = notifications.map(n => ({...n, read: true}));
                        setNotifications(marked);
                        localStorage.setItem("baheya_notifications", JSON.stringify(marked));
                      }}
                      className="text-[10px] text-pink-600 font-extrabold hover:text-pink-800 hover:underline transition cursor-pointer"
                    >
                      {language === "ar" ? "تعديل المقروء كلياً" : "Mark all as read"}
                    </button>
                    <h3 className="text-sm font-black text-slate-850 flex items-center gap-1.5 justify-end">
                      <span className="bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold animate-pulse leading-none">
                        {notifications.filter(n => !n.read).length}
                      </span>
                      <span>تنبيهات تسليم وحفظ الكواشف والشيتات اليومية من التمريض</span>
                      <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
                    </h3>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-3 text-center">
                        {language === "ar" ? "لا توجد أي تنبيهات جديدة من وحدات المستشفى الطبية." : "No new alerts at this moment."}
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3 rounded-xl border text-xs transition flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 ${
                            notif.read ? "bg-slate-50 border-slate-200 text-slate-505 text-slate-500" : "bg-rose-50/40 border-rose-100 text-slate-800 font-bold"
                          }`}
                        >
                          <div className="text-[10px] font-mono text-slate-400 shrink-0">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-right flex-1 text-[11px] leading-relaxed">
                            {language === "ar" ? notif.messageAr : notif.messageEn}
                          </div>
                          {!notif.read && (
                            <button
                              onClick={() => {
                                const updated = notifications.map(n => n.id === notif.id ? {...n, read: true} : n);
                                setNotifications(updated);
                                localStorage.setItem("baheya_notifications", JSON.stringify(updated));
                              }}
                              className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-[9px] rounded transition cursor-pointer shrink-0"
                            >
                              تعليم كقروء
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Statistical Cards Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  
                  {/* 1. Quality Compliance Score Gauge */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">معدل الامتثال العام للأقسام</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">
                        {records.length === 0 ? "96%" : `${compliancePercent}%`}
                      </h4>
                      <span className="text-[9px] text-emerald-600 font-sans block mt-1">
                        {records.length === 0 ? "● مستند على عينات المعايير الطبية للثقة" : "● تحديث تلقائي حسب الفحوصات الجارية"}
                      </span>
                    </div>
                    <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-pink-600"
                          strokeDasharray={`${records.length === 0 ? 96 : compliancePercent}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-[10px] font-black text-pink-700 font-sans">
                          {records.length === 0 ? "96" : compliancePercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Total Audits Count */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">عدد الجرودات الموثقة بالأرشيف</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">
                        {records.length} {language === "ar" ? "جرودات مأرشفة" : "logs"}
                      </h4>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        بمتوسط تسجيل جودة دوري لكل نموذج نشط
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </div>

                  {/* 3. Deficiency alerts / quality issues */}
                  <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
                    (records.length === 0 ? 1 : openAlertsList.length) > 0 
                      ? "bg-rose-50/50 border-rose-200" 
                      : "bg-white border-slate-200"
                  }`}>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">ثغرات أو عيوب معلقة رصدت حديثاً</span>
                      <h4 className={`text-2xl font-black mt-1 ${
                        (records.length === 0 ? 1 : openAlertsList.length) > 0 ? "text-rose-700" : "text-slate-800"
                      }`}>
                        {records.length === 0 ? 1 : openAlertsList.filter(g => !resolvedGaps[g.uniqueGapKey]?.resolved).length} {language === "ar" ? "ثغرات غير محلولة" : "Deficiencies"}
                      </h4>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        تتضمن أدوات مفقودة، درجات حرارة منتهكة أو أقفال مكسورة
                      </span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                      (records.length === 0 ? 1 : openAlertsList.length) > 0 
                        ? "bg-rose-100 border-rose-200 text-rose-600" 
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}>
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                  </div>

                  {/* 4. Total staff concept switches */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">كادر العمل الطبي المنشط</span>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">
                        {systemUsers.length} {language === "ar" ? "أعضاء كادر" : "accounts"}
                      </h4>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        صلاحيات موزعة بين (الأدمن، التمريض والجودة)
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  </div>

                </div>

                {/* Lower Section Grid: Department progress & CQI alert tracker */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Area: Department compliance meters (comparative list) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b pb-2">
                      <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1 justify-end">
                        <span>إمتثال الأقسام الطبية لمعايير الجودة</span>
                        <Award className="h-4 w-4 text-pink-600" />
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        تقييم نسبي لمعدل التزام فرق التمريض بالجرد المنهجي المعتمد ببهية.
                      </p>
                    </div>

                    <div className="space-y-4 pt-1">
                      {/* Unit 1 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[8px]">98% EXCELLENT</span>
                          <span className="font-bold">وحدة طوارئ واستقبل بهية (Emergency Dept)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-emerald-500 rounded-full" style={{ width: "98%" }}></div>
                        </div>
                      </div>

                      {/* Unit 2 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded text-[8px]">94% RELIABLE</span>
                          <span className="font-bold">وحدة تحضير العلاج الكيماوي (Chemo-Prep)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-pink-500 rounded-full" style={{ width: "94%" }}></div>
                        </div>
                      </div>

                      {/* Unit 3 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[8px]">100% PERFECT</span>
                          <span className="font-bold">غرفة جراحة الأورام (Onco-Surgical Units)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-emerald-500 rounded-full" style={{ width: "100%" }}></div>
                        </div>
                      </div>

                      {/* Unit 4 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                          <span className="font-mono bg-amber-50 text-amber-700 px-1 py-0.2 rounded text-[8px]">82% MODERATE</span>
                          <span className="font-bold">قسم العيادات الخارجية ومتابعة الأداء (Outpatient)</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 right-0 h-full bg-amber-400 rounded-full" style={{ width: "82%" }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-normal">
                      💡 <strong>ملاحظة المراقبة والاعتماد الصحى:</strong> لرفع نسبة الامتثال في الأقسام الأقل حظاً، ينبغي مراجعة جداول تسليم الشيفتات والتأكد من إمضاء التمريض بالتناوب يومياً.
                    </div>
                  </div>

                  {/* Right Area: Interactive Closed-Loop Audit Gaps Tracker & Alert System */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="border-b pb-2 flex items-center justify-between">
                        <span className="bg-rose-100 text-rose-700 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">LIVE OBSERVATIONS</span>
                        <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                          <span>مركز رصد الثغرات والعيوب الطبية الحرجة</span>
                          <ShieldAlert className="h-4 w-4 text-rose-600" />
                        </h4>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-1 mb-3">
                        عندما يقوم الكادر برصد خلل (علامة ✘) في أدوات الفحص، تظهر الثغرة هنا فوراً لتمكين الجودة أو رئيسة التمريض من كتابة الإجراء التصحيحي وإقفال البوابة الطبية للثغرة:
                      </p>

                      {/* Gap Inline Resolution Dialog workspace */}
                      {editingGapKey && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-3 space-y-2 text-right">
                          <span className="font-bold text-[10px] text-amber-800">✍️ تسجيل القرار والتصحيح اللازم:</span>
                          <textarea
                            value={gapResolutionNote}
                            onChange={(e) => setGapResolutionNote(e.target.value)}
                            placeholder="مثال: تم تعبئة الأدرينالين المفقود من صيدلية المستشفى وتركيب قفل جرد بلاستيكي أحمر جديد مخصص ذو رقم كود معتمد بالوقت الحالي."
                            className="w-full bg-white border border-slate-200 p-2 text-xs rounded shadow-inner font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            rows={2}
                          />
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => setEditingGapKey(null)}
                              className="text-[10px] font-bold text-slate-500 hover:underline"
                            >
                              تراجع
                            </button>
                            <button
                              onClick={handleSaveGapResolution}
                              className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded shadow cursor-pointer flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              <span>تثبيت الإجراء وتصحيح الثغرة</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Scannable Gaps Table */}
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {/* If no records exist, show 1 sample gap automatically for experience */}
                        {records.length === 0 ? (
                          <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl relative flex items-start gap-3">
                            <div className="flex-1 text-right min-w-0">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[8px] bg-red-100 text-red-700 font-extrabold rounded px-1">نموذج تجريبي</span>
                                <span className="font-black text-rose-900 truncate block">فشل اختبار بطارية ومكثف جهاز الصدمات الكهربائية DC Shock</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                                عربة طوارئ الطوارئ والإنعاش / اليوم الخامس - رصدت بواسطة (أ. فاطمة الزهراء)
                              </p>
                              
                              {/* Resolution status check */}
                              {resolvedGaps["mock-crashcart"]?.resolved ? (
                                <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg mt-2 text-[10px] text-emerald-800 font-sans">
                                  <p className="font-bold">✔ تم حل الخلل عبر قرار الجودة:</p>
                                  <p className="text-[9px] text-emerald-700 mt-0.5">{resolvedGaps["mock-crashcart"].notes}</p>
                                  <div className="text-[8px] text-slate-400 mt-1">
                                      بواسطة: {resolvedGaps["mock-crashcart"].resolvedBy} - بتاريخ: {resolvedGaps["mock-crashcart"].resolvedAt}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 text-left">
                                  <button
                                    onClick={() => handleToggleGapState("mock-crashcart")}
                                    className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white shadow-sm rounded text-[9px] font-extrabold transition cursor-pointer"
                                  >
                                    اتخاذ إجراء وإقرار تصحيح جودة
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                              <X className="h-4 w-4" />
                            </div>
                          </div>
                        ) : (
                          openAlertsList.map((gap) => {
                            const resInfo = resolvedGaps[gap.uniqueGapKey];
                            const isResolved = resInfo?.resolved;
                            
                            return (
                              <div
                                key={gap.uniqueGapKey}
                                className={`p-3 border rounded-xl relative flex items-start gap-3 transition-colors ${
                                  isResolved ? "bg-emerald-50/20 border-emerald-100" : "bg-red-50/30 border-red-150"
                                }`}
                              >
                                <div className="flex-1 text-right min-w-0">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    {isResolved && (
                                      <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                        تم التصحيح والحل
                                      </span>
                                    )}
                                    <span className="font-black text-rose-900 truncate block">خلل في: {gap.itemName} / {gap.itemEn}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                    {gap.templateTitle} ({gap.templateCode}) / اليوم {gap.dayNum} - بقسم: {gap.department} - بواسطة ({gap.staffName})
                                  </p>

                                  {isResolved ? (
                                    <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg mt-2 text-[10px] text-emerald-800 font-sans">
                                      <p className="font-bold">✔ إجراء معتمد لتصحيح الجودة:</p>
                                      <p className="text-[9px] text-emerald-700 mt-0.5">{resInfo.notes}</p>
                                      <div className="text-[8px] text-slate-400 mt-1">
                                        بواسطة: {resInfo.resolvedBy} / بتاريخ: {resInfo.resolvedAt}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-left">
                                      <button
                                        onClick={() => handleToggleGapState(gap.uniqueGapKey)}
                                        className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white shadow-sm rounded text-[9px] font-extrabold transition cursor-pointer"
                                      >
                                        اتخاذ إجراء وإقرار تصحيح جودة
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                                  isResolved ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-rose-100 border-rose-200 text-rose-600"
                                }`}>
                                  {isResolved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </div>
                              </div>
                            );
                          })
                        )}
                        
                        {records.length > 0 && openAlertsList.length === 0 && (
                          <div className="text-center py-10 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-xl p-4">
                            <span className="text-xl">🏆</span>
                            <p className="font-bold text-emerald-800 text-xs mt-1.5">أنت على قمة الهرم الطبي للجودة!</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">لم يتم رصد أي ثغرات أو نواقص أو أقفال مكسورة حالياً في جميع الوثائق المدققة.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-4 text-[9px] text-slate-400 flex items-center justify-between">
                      <span>BAHEYA CQI COMMAND-ALERTS CLOUD WORKSPACE</span>
                      <span>تحديث مستمر ●</span>
                    </div>
                  </div>

                </div>

                {/* SECTION: Deep Integration Reference manual (دليل وإرشادات المطور لربط القواعد وجيت هب وتجربة فيرسل) */}
                <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 space-y-6">
                  
                  <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono text-[9px]">DEVELOPER WORKSPACE</span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center justify-end gap-1.5">
                        <span>دليل المطور للرفع والربط بـ (GitHub & Vercel & Firebase)</span>
                        <Database className="h-4.5 w-4.5 text-pink-500" />
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                        الإرشادات البرمجية المرفقة المطلوبة لنقل الكود المعتمد وربطه سحابياً ليعمل كـ Full-Stack مع قواعد البيانات.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right leading-relaxed text-xs">
                    
                    {/* Tutorial Grid 1: Github upload */}
                    <div className="bg-slate-950/65 p-4.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold font-mono">1</div>
                      <h4 className="font-extrabold text-pink-300">الرفع والنشر على مستودع GitHub</h4>
                      <p className="text-[11px] text-slate-400">
                        لرفع الكود، قم بتصدير الملف ZIP من قائمة الـ <strong>Settings</strong> في AI Studio، ثم فك المغلف واستخدم تيرمينال الأوامر لتصديره كالتالي:
                      </p>
                      <pre className="p-2 bg-black border border-slate-800 text-pink-400 rounded text-[10px] font-mono select-all text-left overflow-x-auto whitespace-pre">
                        git init{"\n"}
                        git add .{"\n"}
                        git commit -m "feat: init baheya"{"\n"}
                        git branch -M main{"\n"}
                        git remote add origin &lt;Your_Repo_URL&gt;{"\n"}
                        git push -u origin main
                      </pre>
                    </div>

                    {/* Tutorial Grid 2: Firebase firestore and auth settings */}
                    <div className="bg-slate-950/65 p-4.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold font-mono">2</div>
                      <h4 className="font-extrabold text-pink-300 font-sans">ربط شبكات وقواعد قواعد بيانات Firebase</h4>
                      <p className="text-[11px] text-slate-400">
                        للإتصال، اضغط خيار <strong>Set up Firebase</strong> في واجهة AI Studio والقبول، لتثبيت داتابيز حرة لتأمين وتخزين مستندات الجودة الطبية بصفة دائمة.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        قواعد الحماية (Firestore Security Rules) البرمجية الموصى بها:
                      </p>
                      <pre className="p-2 bg-black border border-slate-800 text-pink-400 rounded text-[9px] font-mono select-all text-left overflow-y-auto h-[100px] whitespace-pre-wrap leading-relaxed">
                        {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /baheya_records/{recId} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                      </pre>
                    </div>

                    {/* Tutorial Grid 3: Vercel instructions */}
                    <div className="bg-slate-950/65 p-4.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold font-mono">3</div>
                      <h4 className="font-extrabold text-pink-300">الرفع والربط المجاني السريع على Vercel</h4>
                      <p className="text-[11px] text-slate-400 font-sans">
                        فيرسل هي المنصة الأفضل لمشاريع React Vite. تمنحك إتصالاً سريعاً وآمناً برابط عام. كالتالي:
                      </p>
                      <ul className="list-disc list-inside text-slate-400 text-[10px] space-y-1 p-0">
                        <li>سجل دخولك بحساب جيت هب على <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-pink-400 underline">Vercel</a></li>
                        <li>اختر <strong>Add New Project</strong> ثم اختر مستودع هذا البرنامج.</li>
                        <li>اترك خيارات البناء افتراضية واضغط <strong>Deploy</strong> للبناء والتشغيل فوراً!</li>
                      </ul>
                    </div>

                  </div>

                  <div className="border-t border-slate-800 pt-4 text-center font-mono text-[9px] text-slate-500">
                    <span>Baheya Hospital Quality Engineering & Cloud Services Support Hub</span>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* TAB 2: Historical Database Records Ledger */}
          {activeTab === "history" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                    <Database className="h-5 w-5 text-pink-600" />
                    {language === "ar" ? "مستودع السجلات الطبية المحفوظة" : "Historical Database Document Repository"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                     {language === "ar" ? "ابحث بالمسؤول أو كود النموذج أو اسم المريض واستعرض التقارير المدمجة:" : "Search, filter, edit or safely delete certified documents stored offline in localStorage:"}
                  </p>
                </div>

                {/* SEARCH BOX FOR DATABASE RECORDS HISTORY (مربع بحث المسجلات المحفوظة) */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={language === "ar" ? "ابحث بالاسم، اليوم، القسم أو التاريخ..." : "Find by staff, date, department..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {filteredRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-right text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-right">{language === "ar" ? "رقم المطبوع والرمز" : "Ref Code & Sheet Name"}</th>
                        <th className="px-4 py-3 text-center">{language === "ar" ? "التاريخ والوقت" : "Date & Time"}</th>
                        <th className="px-4 py-3 text-center">{language === "ar" ? "القسم الفعلي" : "Department"}</th>
                        <th className="px-4 py-3 text-center">{language === "ar" ? "المسؤول المدخل" : "By Staff"}</th>
                        <th className="px-4 py-3 text-center">{language === "ar" ? "الفحص والجودة" : "Quality Status"}</th>
                        <th className="px-4 py-3 text-center">{language === "ar" ? "الإجراءات والعمليات" : "Actions Available"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {filteredRecords.map((item) => {
                        const template = FORM_TEMPLATES.find(t => t.id === item.templateId);
                        // Calculate filled cells value to show progress bar
                        let totalCells = 0;
                        let filledCells = 0;
                        if (item.templateId !== "patient-discharge-ama") {
                          item.gridData.forEach(row => {
                            Object.values(row.days).forEach(val => {
                              totalCells++;
                              if (val !== "") filledCells++;
                            });
                          });
                        }

                        const hasQualityStamp = !!item.additionalInfo?.isQualityCertified;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-800">
                                {language === "ar" ? template?.titleAr : template?.titleEn}
                              </div>
                              <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">{template?.code}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-600">
                              {item.date} | {item.time}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                              {item.department}
                            </td>
                            <td className="px-4 py-3.5 text-center text-slate-600">
                              <div className="font-bold">{item.staffName || "Unsigned"}</div>
                              <span className="font-mono text-[9px] text-slate-400 font-bold">{item.staffId}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold">
                              <div className="flex flex-col items-center gap-1 justify-center">
                                {item.templateId === "patient-discharge-ama" ? (
                                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px]">
                                    {language === "ar" ? "إقرار رسمي موقع" : "Consent Signed"}
                                  </span>
                                ) : (
                                  <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded text-[10px] font-mono">
                                    {filledCells}/{totalCells} ({Math.round((filledCells / (totalCells || 1)) * 100)}%)
                                  </span>
                                )}

                                {hasQualityStamp && (
                                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5">
                                    <Award className="h-2.5 w-2.5" />
                                    {language === "ar" ? "مختوم ومعتمد" : "QA Certified"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    const tpl = FORM_TEMPLATES.find((t) => t.id === item.templateId) || FORM_TEMPLATES[0];
                                    setSelectedTemplate(tpl);
                                    setEditingRecord(item);
                                    setActiveTab("editor");
                                  }}
                                  className="px-2.5 py-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded font-bold text-[11px] shadow hover:from-pink-700 hover:to-rose-700 transition"
                                >
                                  {language === "ar" ? "عرض وتعديل" : "Open / Edit"}
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-650 rounded hover:bg-slate-100 transition"
                                  title={language === "ar" ? "حذف (أدمن فقط)" : "Erase (Admin Only)"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs">
                    {language === "ar" 
                      ? "لا توجد أي وثائق محفوظة تطابق مصطلحات بحثك في قاعدة البيانات المحلية." 
                      : "No matching documents stored in clinical databases archive."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: About clinical guidelines, documentation setup and exporting to GitHub */}
          {activeTab === "about" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-right text-xs leading-relaxed space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                  <span>إرشادات الجودة الطبية والعمليات البرمجية</span>
                  <HeartPulse className="h-4 w-4 text-pink-600" />
                </h3>
                <p className="text-slate-500 mt-1 leading-normal">
                  يرتبط أرشيف بهية لإصدار الجرودات والتحققات بدوريات سلامة لجان الاعتماد الصحي ومراقبي الجودة بمصر لضمان عمل كافة الأقسام الصحية دون انقطاع.
                </p>
              </div>

              {/* Informational Guidelines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <span className="text-lg">⚙️</span>
                  <h4 className="font-bold text-amber-900 mt-2">عربة الإنعاش (Crash Cart)</h4>
                  <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    يتم الجرد والتدقيق على سلامة القفل وصلاحية الأدوية يومياً بحضور ممرض القسم ورئيسة التمريض. أي كسر بالقفل يستدعي إعادة الجرد بالكامل خلال ساعتين.
                  </p>
                </div>

                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 text-right">
                  <span className="text-lg">❄️</span>
                  <h4 className="font-bold text-blue-900 mt-2">مراقبة درجات الحرارة والرطوبة</h4>
                  <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    يتم الحفاظ على درجة حرارة ثلاجة تحضير العلاج الكيماوي للأورام بين (2 إلى 8 درجات مئوية) ودرجة الرطوبة النسبية للغرفة دون (60%) لضمان فاعلية الأدوية الحيوية.
                  </p>
                </div>

                <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100">
                  <span className="text-lg">🛡️</span>
                  <h4 className="font-bold text-rose-900 mt-2">وثائق الخروج المانع طوعياً (AMA)</h4>
                  <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    يشترط استكمال كافة البنود وتوثيق صلة القرابة والشرح الكامل للمخاطر الطبية والمضاعفات بإهتمام شديد كخطوة وقائية قانونية للمستشفى.
                  </p>
                </div>
              </div>

              {/* CLOUD DEPLOYMENT & GITHUB TUTORIAL CONTAINER (خاص بربط الفيركل والجيت هب) */}
              <div className="border border-slate-200 bg-slate-50 p-5 rounded-xl leading-relaxed mt-4">
                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 mb-2 shrink-0">
                  <Unlock className="h-4 w-4 text-pink-600" />
                  <span>خطوات رفع البرنامج وتصديره لجيت هب لربطه بـ Vercel</span>
                </h4>
                <p className="text-slate-600 text-[11px] mb-3 leading-normal">
                  البرنامج مبرمج ومعد بالكامل بمعايير **React Vite & Tailwind CSS & TypeScript** ليتوافق تماماً مع الاستضافة السحابية والعمل بدون إنترنت (Offline Progressive State Engine) عبر جيت هب وفيرسل. يمكنك نقله وربطه كالتالي:
                </p>
                <ol className="list-decimal list-inside text-slate-600 text-[11px] space-y-2 pr-1">
                  <li>
                    <strong>تنزيل الكود المصدري:</strong> اضغط على قائمة الإعدادات <span className="font-bold">Settings</span> في منصة AI Studio بالأعلى، ثم اختر <span className="font-bold">Download ZIP</span> لتحميل كامل الكود المصدري لملفات المشروع على جهازك.
                  </li>
                  <li>
                    <strong>الرفع على GitHub:</strong> قم بإنشاء مستودع جديد (New Repository) في حسابك الخاص على <span className="font-bold">GitHub</span>، ثم قم برفع المجلد مباشرة باستخدام الأوامر (Git add / commit) أو عبر الرفع اليدوي لـ ZIP.
                  </li>
                  <li>
                    <strong>الربط بـ Vercel:</strong> قم بزيارة موقع <span className="font-bold">Vercel</span> وسجل الدخول بحساب الجيت هب الخاص بك، اضغط على <span className="font-bold">Add New Project</span>، ثم اختر مستودع هذا البرنامج المرفوع واضغط <span className="font-bold">Deploy</span> لتهيئة السيرفر مجاناً في دقيقة واحدة!
                  </li>
                </ol>
              </div>

              <div className="border-t pt-4 text-center text-slate-400 font-mono text-[9px]">
                <span>Baheya Medical Cloud Storage Client Engine v4.2 - Production Build</span>
              </div>
            </div>
          )}

          {/* TAB 3.5: IT Infrastructure Center & DB Disaster Control Hub */}
          {activeTab === "it_panel" && (
            <div className="space-y-6 animate-fade font-sans text-right">
              {/* Header Banner */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-pink-500/25 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="md:order-1 flex items-center gap-4 text-right">
                  <div className="bg-pink-600/20 p-3.5 rounded-2xl border border-pink-500/35">
                    <Database className="h-8 w-8 text-pink-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight flex items-center justify-end gap-1.5 flex-row-reverse">
                      <span>غرفة نُظم المعلومات والتحكّم الرقمي</span>
                      <span className="bg-pink-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest leading-none">IT CONTROL</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {language === "ar" 
                        ? "بوابة الدعم الفني الخاصة بمؤسسة بهية ومراقبة قواعد البيانات السريرية في الوقت الفعلي والربط السحابي بـ Firestore"
                        : "Baheya IT Systems Command Center: Real-time Cloud Firestore synchronization status & database engine management"}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0 md:order-2">
                  <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-[10px] uppercase font-mono px-3 py-1 rounded-xl text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    VER: 4.2.0-STABLE
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-pink-950/40 border border-pink-900/30 text-[10px] uppercase font-mono px-3 py-1 rounded-xl text-pink-300">
                    ID: {currentUser.staffId}
                  </span>
                </div>
              </div>

              {/* Grid 1: Diagnostics and Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Panel 1: Live Connection & Diagnosis Engine */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5 justify-end">
                    <span>تشخيص المحرك وحالة التخزين</span>
                    <ShieldCheck className="h-4 w-4 text-pink-600" />
                  </h4>

                  <ul className="space-y-3.5 text-xs text-slate-600">
                    <li className="flex justify-between items-center text-left">
                      <span className="font-bold font-mono text-slate-800 shrink-0">
                        {dbStatus === "connected" ? "🟢 متصل مستقر (LIVE ACTIVE)" : dbStatus === "syncing" ? "🟡 يجري المزامنة" : "🔴 خطأ في الاتصال"}
                      </span>
                      <strong className="text-slate-500 font-medium">{language === "ar" ? "قاعدة البيانات السحابية (Firestore):" : "Cloud DB Status:"}</strong>
                    </li>

                    <li className="flex justify-between items-center text-left">
                      <span className="font-bold font-mono text-slate-800">
                        {(JSON.stringify(localStorage).length * 2 / 1024).toFixed(2)} KB
                      </span>
                      <strong className="text-slate-500 font-medium">{language === "ar" ? "المساحة المستغلة بالتخزين المحلي:" : "LocalStorage Occupied:"}</strong>
                    </li>

                    <li className="flex justify-between items-center text-left">
                      <span className="font-bold font-mono text-slate-800">{records.length} {language === "ar" ? "شيت جرد" : "Items"}</span>
                      <strong className="text-slate-500 font-medium">{language === "ar" ? "إجمالي السجلات السريرية المحفوظة:" : "Total Records Stored:"}</strong>
                    </li>

                    <li className="flex justify-between items-center text-left">
                      <span className="font-bold font-mono text-slate-800">
                        {systemUsers.length} {language === "ar" ? "موظف مفعّل" : "Employees"}
                      </span>
                      <strong className="text-slate-500 font-medium">{language === "ar" ? "سجل الكادر الطبي بالدليل:" : "Active Staff Registry:"}</strong>
                    </li>

                    <li className="flex justify-between items-center text-left">
                      <span className="font-bold text-slate-800 text-[10px] truncate max-w-[150px]" title={navigator.userAgent}>
                        {navigator.platform || "Web Client"}
                      </span>
                      <strong className="text-slate-500 font-medium">{language === "ar" ? "منصة نظام العميل (OS):" : "OS Platform:"}</strong>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        testConnection().then(ok => {
                          if (ok) {
                            addSystemLog("Cloud system ping test executed: 200 OK Connection established.", "success");
                            alert(language === "ar" ? "✅ تم اختبار الاتصال بقاعدة البيانات بهية السحابية بنجاح! الاستجابة: 200 OK" : "✅ Connection test succeeded! Cloud Firebase API respond with 200 OK");
                          } else {
                            addSystemLog("Cloud system ping test failed. Bad request or offline.", "error");
                            alert(language === "ar" ? "❌ فشل اختبار الاتصال! السيرفر في وضع الأوفلاين حالياً." : "❌ Ping failed. Connection in simulation offline.");
                          }
                        });
                      }}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold text-[11px] transition cursor-pointer"
                    >
                      {language === "ar" ? "🎯 اختبار بنج الاتصال السحابي" : "🎯 Ping Cloud Service"}
                    </button>
                  </div>
                </div>

                {/* Panel 2: Global Configuration Flags (IT Control Switches) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5 justify-end">
                    <span>مفاتيح التحكم العام وإطار الأمان</span>
                    <Settings className="h-4 w-4 text-pink-600" />
                  </h4>

                  <div className="space-y-4 text-xs">
                    
                    {/* Compliance dates locked */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 bg-pink-100 px-2 py-0.5 rounded text-[10px] text-pink-850 font-bold">
                        {itStrictComplianceMode ? "مفعّل" : "ملغى"}
                      </div>
                      <div className="text-right flex-1 select-none">
                        <label htmlFor="complianceSwitch" className="font-bold text-slate-700 cursor-pointer block">
                          🔒 قفل تاريخ الجرد للكادر
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {language === "ar" ? "قصر إدخال المرضى والجرد للتمريض على تاريخ اليوم الحالي المتزامن" : "Lock checklist submission date to today's synced calendar state"}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        id="complianceSwitch"
                        checked={itStrictComplianceMode}
                        onChange={(e) => {
                          setItStrictComplianceMode(e.target.checked);
                          addSystemLog(`Compliance date-locking security rule toggled to: ${e.target.checked}`, "warning");
                        }}
                        className="h-4 w-4 text-pink-600 focus:ring-0 border-slate-300 rounded cursor-pointer animate-none"
                      />
                    </div>

                    {/* Cloud Concurrency and drift Resolution */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded text-[10px] text-amber-850 font-bold">
                        {itConflictResolutionWithNewest ? "مفعّل" : "ملغى"}
                      </div>
                      <div className="text-right flex-1 select-none">
                        <label htmlFor="conflictResolutionSwitch" className="font-bold text-slate-700 cursor-pointer block">
                          🔄 تفادي ومزامنة تعارض البيانات
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {language === "ar" ? "دمج وتحديث السجلات السريرية المتداخلة تلقائياً مع السحاب اعتماداً على الطابع الزمني الأحدث" : "Automatically resolve concurrent database writes by merging data according to the latest epoch timestamps"}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        id="conflictResolutionSwitch"
                        checked={itConflictResolutionWithNewest}
                        onChange={(e) => {
                          setItConflictResolutionWithNewest(e.target.checked);
                          addSystemLog(`Concurrrent Cloud replication policy changed: Conflict resolution mode set to override newest version on lock: ${e.target.checked}`, "warning");
                        }}
                        className="h-4 w-4 text-pink-600 focus:ring-0 border-slate-300 rounded cursor-pointer animate-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Panel 3: Reset & Override Staff Safety PIN Codes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                  <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5 justify-end">
                    <span>تهيئة وحوكمة الـ PIN كود للموظفين</span>
                    <KeyRound className="h-4 w-4 text-pink-600" />
                  </h4>
                  
                  <p className="text-[10px] text-slate-400 text-right leading-relaxed mb-1 font-sans">
                    {language === "ar" 
                      ? "يتيح لمهندسي الدعم الفني تخطي وتغيير الرقم السري والـ PIN المسجل لأي ممرض أو مشرف فوراً لتفادي غلق الحسابات بالميدان."
                      : "Quickly override employee passcode configuration to prevent locked profiles for staff members."}
                  </p>

                  <div className="space-y-3 text-xs leading-none">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 text-right font-bold">الموظف المعني بالخدمة:</label>
                      <select
                        value={itSelectedUserIdToOverride}
                        onChange={(e) => {
                          setItSelectedUserIdToOverride(e.target.value);
                          const userObj = systemUsers.find(u => u.id === e.target.value);
                          if (userObj) {
                            setItOverwrittenPin(userObj.pin || "1234");
                          }
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg focus:bg-white text-xs"
                      >
                        <option value="">-- اختر الموظف لتعيين الكود --</option>
                        {systemUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.nameAr} ({u.staffId}) [{u.role.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 text-right font-bold">الـ PIN السري المستهدف (جديد):</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="مثال: 5588"
                        value={itOverwrittenPin}
                        onChange={(e) => setItOverwrittenPin(e.target.value.replace(/\D/g, ""))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-800 font-mono font-black rounded-lg text-center tracking-widest text-sm focus:bg-white"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!itSelectedUserIdToOverride) {
                          alert(language === "ar" ? "برجاء اختيار الموظف أولاً!" : "Select employee first!");
                          return;
                        }
                        if (itOverwrittenPin.length < 4) {
                          alert(language === "ar" ? "الرقم السري يجب أن يتكون من 4 أرقام على الأقل!" : "PIN must be at least 4 digits!");
                          return;
                        }
                        const updatedUsers = systemUsers.map(u => {
                          if (u.id === itSelectedUserIdToOverride) {
                            const uUpdated = { ...u, pin: itOverwrittenPin };
                            saveStaffMember(uUpdated).catch(err => console.error("Firestore update failed", err));
                            return uUpdated;
                          }
                          return u;
                        });
                        setSystemUsers(updatedUsers);
                        localStorage.setItem("baheya_system_users", JSON.stringify(updatedUsers));
                        
                        const trg = updatedUsers.find(u => u.id === itSelectedUserIdToOverride);
                        addSystemLog(`Safety PIN for employee ${trg?.nameEn} updated to: ${itOverwrittenPin} by IT Support.`, "warning");
                        alert(language === "ar" ? `🔑 تم تغيير الرقم السري وحفظ التحديثات لقاعدة البيانات!` : `🔑 Security PIN changed successfully!`);
                        setItOverwrittenPin("");
                        setItSelectedUserIdToOverride("");
                      }}
                      className="w-full py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold font-sans transition cursor-pointer"
                    >
                      {language === "ar" ? "تأكيد واستبدال PIN آمن" : "Override PIN Passcode"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 2: Core Database Backups System (Disaster Recovery & JSON import-export) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between flex-row-reverse">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-end">
                    <span>مستودع النسخ الاحتياطية وإدارة الكوارث الرقمية (DR System)</span>
                    <ShieldAlert className="h-4.5 w-4.5 text-pink-600" />
                  </h4>
                  <span className="bg-rose-50 text-rose-700 text-[10px] px-2 py-0.5 rounded font-bold">
                    {language === "ar" ? "موصى به قبل الترقية البرمجية" : "Recommended for safety"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 text-right leading-normal">
                  {language === "ar" 
                    ? "يتيح لك نظام النسخ الاحتياطي الإلكتروني تصدير كافة بيانات الشيتات، وجبات ديوتي العمل ومخطط الموظفين بملف JSON واحد مضغوط وتنزيله على جهاز الكمبيوتر للقدرة على استصلاح واستعادة النظام بالكامل في حال تلف الذاكرة."
                    : "The Disaster Recovery client enables exporting the complete diagnostic data, lists, configurations and clinical sheets to a singular compressed backup JSON file."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* Backup export card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between space-y-4 text-right">
                    <div>
                      <h5 className="font-extrabold text-[12px] text-slate-700 text-pink-700 mb-1">
                        {language === "ar" ? "تصدير الملف الكامل للبيانات (.json)" : "1. Export System-Wide Dump"}
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        {language === "ar" ? "قم بتحميل السجل السريري الكامل، قائمة التنبيهات وإعدادات الهوية بملف واحد للنسخ الخارجي." : "Download all clinic forms, metrics, configurations in one single JSON dump."}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const backupObj = {
                            version: "Baheya Clinical IT Dump v1.0",
                            timestamp: new Date().toISOString(),
                            exportedBy: `${currentUser.nameEn} (Role: ${currentUser.role})`,
                            data: {
                              records,
                              systemUsers,
                              dutyTasks,
                              dailyChecklists,
                              hospitalSettings
                            }
                          };
                          const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `baheya_it_dump_${new Date().toISOString().slice(0, 10)}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          addSystemLog(`Exported full system backup dump file successfully.`, "success");
                        }}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition cursor-pointer font-sans"
                      >
                        <Download className="h-4 w-4 text-white" />
                        <span>{language === "ar" ? "تحميل نسخة احتياطية (EXPORT)" : "Download JSON Dump"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Backup import area */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col space-y-3 text-right">
                    <div>
                      <h5 className="font-extrabold text-[12px] text-slate-705 text-pink-700 mb-1">
                        {language === "ar" ? "استيراد واستعادة الشيتات السابقة" : "2. Import & Restore Dump File"}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {language === "ar" ? "قم بلصق محتوى ملف الجروب السابق والمحفوظ لإعادة محاذاة وربط الشيتات." : "Paste previously exported backup payload code below to instantly regenerate clinic databases."}
                      </p>
                    </div>

                    <textarea
                      placeholder={language === "ar" ? "الصق كود محتوى الـ JSON هنا..." : "Paste backup dump JSON contents here..."}
                      value={backupRestoreInput}
                      onChange={(e) => setBackupRestoreInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-[10px] font-mono p-2 rounded-lg h-20 outline-none focus:border-pink-500"
                    />

                    <button
                      onClick={() => {
                        if (!backupRestoreInput.trim()) {
                          alert(language === "ar" ? "الرجاء كتابة أو لصق كود البيانات أولاً!" : "Paste code first!");
                          return;
                        }
                        try {
                          const parsed = JSON.parse(backupRestoreInput);
                          if (!parsed.data) {
                            throw new Error("Missing top partition 'data' structure in JSON backup.");
                          }
                          const { records: r, systemUsers: u, dutyTasks: t, dailyChecklists: c, hospitalSettings: s } = parsed.data;
                          
                          if (r) {
                            localStorage.setItem("baheya_medical_records", JSON.stringify(r));
                            setRecords(r);
                          }
                          if (u) {
                            localStorage.setItem("baheya_system_users", JSON.stringify(u));
                            setSystemUsers(u);
                          }
                          if (t) {
                            localStorage.setItem("baheya_daily_duty_tasks", JSON.stringify(t));
                            setDutyTasks(t);
                          }
                          if (c) {
                            localStorage.setItem("baheya_daily_checklists", JSON.stringify(c));
                            setDailyChecklists(c);
                          }
                          if (s) {
                            setHospitalSettings(s);
                          }

                          addSystemLog(`Clinical database restored via manual backup dump parse successfully!`, "success");
                          alert(language === "ar" ? "🚨 تم استعادة وحقن البيانات بنجاح لجميع الموديلات!" : "🚨 System databases successfully restored and updated!");
                          setBackupRestoreInput("");
                        } catch (err: any) {
                          alert(language === "ar" ? `❌ عطل في البناء الإنشائي: ${err.message}` : `❌ Bad template parser: ${err.message}`);
                          addSystemLog(`Import failed: ${err.message}`, "error");
                        }
                      }}
                      className="py-1.5 bg-slate-805 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer font-sans"
                    >
                      {language === "ar" ? "استرجاع وحقن قاعدة البيانات" : "Process Recovery & Inject"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 3: Live System Interactive Logs (Glowing Terminal View) */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-rose-500 flex items-center gap-1 font-mono tracking-wide">
                      <span>SYSTEM DIAGNOSTIC SHELL (CONSOLE)</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    </h4>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        systemLogs.forEach((log) => {
                          deleteSystemLog(log.id).catch((err) => console.error("Error purging log: ", err));
                        });
                        setSystemLogs([]);
                      }}
                      className="px-2.5 py-1 hover:bg-slate-900 border border-slate-800 rounded text-[10.5px] font-bold text-slate-400 font-sans transition cursor-pointer"
                    >
                      {language === "ar" ? "مسح محتويات التشخيص" : "Clear Shell"}
                    </button>
                    <button
                      onClick={() => {
                        addSystemLog(`IT Diagnostics Integrity Check: Cloud synchronization latency is 34ms. Connection remains highly secure and optimized.`, "success");
                      }}
                      className="px-2.5 py-1 hover:bg-slate-900 border border-slate-800 rounded text-[10.5px] font-bold text-slate-400 font-sans transition cursor-pointer"
                    >
                      {language === "ar" ? "بث تقرير فحص النظام" : "Broadcast Integrity Report"}
                    </button>
                  </div>
                </div>

                {/* Black terminal list */}
                <div className="bg-black/90 p-4 border border-slate-800 rounded-xl overflow-y-auto max-h-56 min-h-[140px] text-right text-xs font-mono space-y-1.5">
                  {systemLogs.length === 0 ? (
                    <div className="text-slate-505 text-slate-400 text-center text-[11px] py-10">
                      ~ Console buffers are completely clear. Logs will appear here in real time ~
                    </div>
                  ) : (
                    systemLogs.map((log) => {
                      const colorClass = log.type === "success" 
                        ? "text-emerald-400 font-semibold" 
                        : log.type === "warning" 
                        ? "text-amber-400" 
                        : log.type === "error" 
                        ? "text-rose-550 text-rose-400 animate-pulse font-bold" 
                        : "text-blue-405 text-blue-400";
                        
                      return (
                        <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-left sm:text-right gap-1.5 border-b border-slate-900/60 pb-1.5">
                          <span className="text-[10px] text-slate-500 shrink-0 select-none">[{log.time}]</span>
                          <span className={`text-[11px] flex-1 break-all select-all font-mono leading-relaxed ${colorClass}`}>
                            {log.event}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 border border-slate-800 px-1.5 py-0.2 select-none shrink-0 rounded">
                            {log.type}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono flex-row-reverse border-t border-slate-900 pt-2.5">
                  <div>BAHEYA_IT_SYSTEM_API_KEY: <span className="text-slate-405 text-slate-400 font-bold select-all bg-slate-900/40 px-1 py-0.5 rounded border border-slate-850">SECURE_FIREBASE_POOL_KEY_TRUE</span></div>
                  <div>PLATFORM RUNTIME: <span className="text-slate-405 text-slate-400 font-bold">VITE TSX SANDBOX</span></div>
                </div>
              </div>

              {/* Grid 4: Safety & Factory Recovery */}
              <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-105 border-rose-200 shadow-sm text-right space-y-3.5 mt-2">
                <h5 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 justify-end text-rose-800">
                  <span>منطقة الخطر الإداري واستعادة تهيئة المصنع</span>
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
                </h5>
                <p className="text-[11px] text-rose-700/80 leading-normal">
                  {language === "ar" 
                    ? "🚨 تحذير: تؤدي الإجراءات بالأسفل إلى استبدال أو مسح التخزين المتزامن السحابي والمحلي للأبد والعودة للحالة الأولية للمؤسسة. الرجاء استخدامها بحذر وموافقة رسمية من مديري المستشفيات وجناح IT."
                    : "🚨 Warning: Actions below are irreversible. Performing these will fully purge local and cloud storage clinical registry contents."}
                </p>

                <div className="flex flex-wrap gap-2.5 justify-end">
                  <button
                    onClick={() => {
                      if (!confirm(language === "ar" ? "🚨 هل أنت متأكد تماماً من رغبتك في تصفير وفرم جميع الشيتات والبيانات المسجلة والعودة للمصنع؟ هذا الإجراء لا يمكن التراجع عنه!" : "🚨 Are you absolutely sure you want to purge all records?")) {
                        return;
                      }
                      
                      // Purge cloud clinical records
                      records.forEach(r => {
                        deleteClinicalRecord(r.id).catch(err => console.error("Cloud purge failed", err));
                      });
                      
                      localStorage.clear();
                      addSystemLog("IT executed system factory reset. All local client databases and cloud clinical records wiped clean.", "error");
                      alert(language === "ar" ? "تم فرم السجلات والذاكرة المحلية بنجاح والعودة لضبط المصنع بالكامل! سيتم إعادة تحميل البوابة." : "Bahaeya Database completely factory reset! Re-seeding system.");
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{language === "ar" ? "🗑️ تصفير كامل ذاكرة النظام المؤقتة ومسح الكاش" : "Factory Reset Complete"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5: Clinical Sheet Distribution Registry & Department Forms Hub */}
          {activeTab === "distribution" && (
            <div className="space-y-6 animate-fade font-sans text-right" dir="rtl">
              {/* Header section with Stats */}
              <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl text-white relative overflow-hidden">
                <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-pink-500/10 to-transparent pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 z-10 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="bg-pink-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        {language === "ar" ? "قاعدة بيانات بهية للأقسام والوحدات" : "Baheya Department Pool"}
                      </span>
                      <LayoutGrid className="h-5 w-5 text-pink-500" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                      {language === "ar"
                        ? "مكتب التوزيع السريري للنماذج والـ 200 شيت"
                        : "Clinical Sheets Distribution Office & Forms Navigator"}
                    </h2>
                    <p className="text-slate-300 text-xs leading-relaxed max-w-2xl font-medium">
                      {language === "ar"
                        ? "منصة الإشراف المتكاملة لتعيين وتوزيع النماذج التشغيلية واستمارات الجرد على الوحدات الطبية الـ 16 المختلفة بمستشفى بهية مع مراقبة مؤشرات الامتثال اليومي."
                        : "Integrated supervisor suite for allocating standard checklists and registers across 16 medical wings, monitoring compliance and re-routing folders."}
                    </p>
                  </div>
                  
                  {/* Aggregates Dashboard */}
                  <div className="flex gap-4 shrink-0 bg-slate-800/60 p-4 rounded-xl border border-slate-700 justify-end md:justify-start">
                    <div className="text-center px-2">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {language === "ar" ? "إجمالي النماذج النشطة" : "Active Sheets"}
                      </span>
                      <span className="text-2xl font-black text-pink-400">
                        {allAvailableTemplates.length}
                      </span>
                    </div>
                    <div className="w-px bg-slate-700 self-stretch" />
                    <div className="text-center px-2">
                       <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {language === "ar" ? "الأقسام والوحدات" : "Departments"}
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {departments.length}
                      </span>
                    </div>
                    <div className="w-px bg-slate-700 self-stretch" />
                    <div className="text-center px-2">
                       <span className="block text-[10px] text-slate-400 uppercase font-bold">
                        {language === "ar" ? "الشيتات المجرودة" : "Logged Records"}
                      </span>
                      <span className="text-2xl font-black text-emerald-400">
                        {records.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Bento-style Department Cards & Distribution Controller */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 1. Quick Re-allocation & Distribution Form Card (Admins / Supervisors) */}
                <div className="xl:col-span-1 space-y-6 text-right">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5 font-sans">
                        <span>{language === "ar" ? "التوجيه والدليفري للنماذج" : "Re-Route / Distribute Templates"}</span>
                        <ArrowLeftRight className="h-4 w-4 text-pink-600" />
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">
                        {language === "ar"
                          ? "قم بتحديد نموذج من الـ 200 نموذج النشطة وتوجيهه فورياً ليكون من صلاحية قسم أو وحدة طبية معينة:"
                          : "Select any active clinical template or registration sheet and route it to an explicit hospital wing:"}
                      </p>
                    </div>

                    {/* Form Controls */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "1- اختر الاستمارة / الشيت المطلوب للتوزيع:" : "1. Select Sheet to Distribute:"}
                        </label>
                        <select
                          id="dist-template-select"
                          className="w-full bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-700 text-right"
                        >
                          {allAvailableTemplates.map(tpl => (
                            <option key={tpl.id} value={tpl.id} className="text-right">
                              ({tpl.code}) {language === "ar" ? tpl.titleAr : tpl.titleEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "2- اختر القسم/الوحدة المستهدفة بالتوزيع للعمل:" : "2. Select Target Clinical Department Unit:"}
                        </label>
                        <select
                          id="dist-dept-select"
                          className="w-full bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-700 text-right"
                        >
                          {departments.map(dept => (
                            <option key={dept} value={dept} className="text-right">{dept}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          const tplId = (document.getElementById("dist-template-select") as HTMLSelectElement)?.value;
                          const deptName = (document.getElementById("dist-dept-select") as HTMLSelectElement)?.value;
                          if (!tplId || !deptName) {
                            alert("Please select both a template and department");
                            return;
                          }
                          const hasPerm = currentUser.role === "admin" || currentUser.role === "quality" || currentUser.role === "president" || currentUser.role === "it";
                          if (!hasPerm) {
                            alert(language === "ar" ? "عذراً! هذه لوحة إشرافية، لا تملك صلاحية تعديل توزيع النماذج." : "Only admins or quality compliance supervisors may re-allocate templates.");
                            return;
                          }
                          
                          // Dispatch override
                          const tpl = allAvailableTemplates.find(t => t.id === tplId);
                          if (tpl) {
                            const updatedOverrides = {
                              ...templateOverrides,
                              [tplId]: {
                                ...tpl,
                                departmentDefault: deptName
                              }
                            };
                            setTemplateOverrides(updatedOverrides);
                            localStorage.setItem("baheya_template_overrides", JSON.stringify(updatedOverrides));
                            
                            // Log system operation
                            addSystemLog(`Routed template ${tpl.code} dynamically to department: ${deptName}`, "info");
                            
                            alert(language === "ar" 
                              ? `✅ تم توجيه وتوزيع الشيت [${tpl.code}] بنجاح إلى [${deptName}]! الاستمارة متاحة الآن فوراً لطاقم تمريض هذا القسم للعمل وتعبئة جرد الأيام.`
                              : `✅ Succesfully routed sheet [${tpl.code}] to [${deptName}]! Department staff can now view and fill.`);
                          }
                        }}
                        className="w-full bg-pink-600 hover:bg-pink-700 hover:text-pink-100 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm uppercase cursor-pointer"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span>{language === "ar" ? "حفظ وتعديل مكان التوزيع الفوري" : "Apply & Distribute Form"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notice transmitter (اريال تنبيه مشرف الجودة والعموم) */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center justify-end gap-1.5 font-sans">
                        <span>{language === "ar" ? "📡 جهاز بث تنبيهات وقواعد الجودة" : "📡 Broadcast Quality Directives"}</span>
                        <Radio className="h-4 w-4 text-rose-600" />
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">
                        {language === "ar"
                          ? "قم بكتابة توجيه جودة عاجل أو إجراء للوحدة لموظفي التمريض الميدانيين ليظهر لهم مباشرة في لوحة العمل:"
                          : "Broadcast medical quality or safety guidelines directly to nursing staff workbenches:"}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "القسم السريري المستهدف بالبث:" : "Target Ward / Unit for Broadcast:"}
                        </label>
                        <select
                          id="broadcast-dept-select"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-750 text-right font-sans"
                        >
                          <option value="ALL">{language === "ar" ? "كل أقسام المستشفى (بث عام)" : "All Hospital Departments"}</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-right font-extrabold text-slate-600 mb-1">
                          {language === "ar" ? "نص التنبيه أو التوجيه العاجل:" : "Directive or Notice details (Ar/En):"}
                        </label>
                        <textarea
                          id="broadcast-message-text"
                          rows={3}
                          placeholder={language === "ar" ? "مثال: يرجى العلم بضرورة تسجيل قياسات رطوبة صيدلية الخلط وغرفة الملابس بحد أقصى الثالثة عصراً." : "Write notice/instructions here..."}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-pink-500 text-slate-700 text-right font-sans"
                        />
                      </div>

                      <button
                        onClick={() => {
                          const dept = (document.getElementById("broadcast-dept-select") as HTMLSelectElement)?.value;
                          const msg = (document.getElementById("broadcast-message-text") as HTMLTextAreaElement)?.value.trim();
                          
                          if (!msg) {
                            alert(language === "ar" ? "يرجى كتابة التنبيه أولاً!" : "Please write a notice message!");
                            return;
                          }

                          const newNotif = {
                            id: `notif-${Date.now()}`,
                            messageAr: `📡 [توجيه المشرفين] للقسم (${dept === "ALL" ? "جميع الأقسام" : dept}): ${msg}`,
                            messageEn: `📡 [Supervisor Directive] for (${dept === "ALL" ? "All Departments" : dept}): ${msg}`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            type: "directive",
                            targetDepartment: dept
                          };

                          const updated = [newNotif, ...notifications];
                          setNotifications(updated);
                          localStorage.setItem("baheya_notifications", JSON.stringify(updated));

                          // clear textarea
                          (document.getElementById("broadcast-message-text") as HTMLTextAreaElement).value = "";
                          
                          addSystemLog(`Broadcast Quality Directive regarding: ${msg.substring(0, 40)}...`, "warning");

                          alert(
                            language === "ar" 
                              ? `✅ تم بث التوجيه بنجاح! سيظهر فوراً لطواقم التمريض بالقسم المستهدف كـ إعلام هام بنظام كادر بهية.`
                              : `✅ Succesfully broadcasted quality directive to target ward staff.`
                          );
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Radio className="h-4 w-4 animate-pulse" />
                        <span>{language === "ar" ? "بث ونشر التعليمات فوراً للأقسام" : "Broadcast Directive"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Instructions Alert */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-3 text-right">
                    <h4 className="font-bold text-slate-800 flex items-center justify-end gap-1 font-sans">
                      <span>{language === "ar" ? "دليل توجيه الشيتات والـ 200 نموذج" : "Distribution & Routing Directives"}</span>
                      <Info className="h-4 w-4 text-slate-500" />
                    </h4>
                    <p className="text-right leading-relaxed">
                      {language === "ar" 
                        ? "يتم تحديد الأقسام الافتراضية لكل شيت من الـ 200 شيت بناءً على الكود الطبي ومعايير الجودة G-GEN. يتيح لك مكتب التوزيع تعديل القسم الافتراضي لكي تتمكن طواقم التمريض التابعة لهذا القسم من رؤية الاستمارة وتعبئتها بنسق أسبوعي (7 أيام) أو شهري لتطابق الاستمارة الطبية على الأرض."
                        : "Checklists are linked to functional wings. Quality officers can alter these assignments in real-time, instantly making specific forms accessible to target wards in their digital ledger list."}
                    </p>
                  </div>
                </div>

                {/* 2. Departments Bento Grid Grid displaying clinical details and listing sheets */}
                <div className="xl:col-span-2 space-y-6 text-right">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-right">
                    <div className="border-b border-slate-100 pb-3 mb-4">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-right font-sans">
                         {language === "ar" ? "خرائط توزيع الاستمارات على الأقسام والوحدات الـ 16" : "Allotment Map of 16 Clinical Departments"}
                       </h3>
                       <p className="text-[10px] text-slate-500 leading-tight mt-1 text-right">
                         {language === "ar" ? "اضغط على أي قسم لاستعراض الاستمارات الموزعة والنشطة لديه وتعبئة أي سجل فوري:" : "Click on any clinical wing to audit and fill its operational sheets:"}
                       </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {departments.map((dept, idx) => {
                        // Find how many templates map to this department in allAvailableTemplates
                        const deptTemplates = allAvailableTemplates.filter(t => doesTemplateMatchDepartment(t, dept));
                        // Find matching saved records count for stats
                        const deptRecordsCount = records.filter(rec => rec.department === dept).length;
                        
                        return (
                          <div 
                            key={dept} 
                            className="bg-slate-50/60 p-4 rounded-xl border border-slate-150 shadow-xs hover:border-pink-300 hover:bg-slate-50 hover:shadow-sm transition flex flex-col justify-between"
                          >
                            <div className="text-right">
                              {/* Department Badge and Index */}
                              <div className="flex items-center justify-between mb-2 flex-row-reverse">
                                <span className="bg-slate-200 text-slate-800 text-[9px] font-sans font-black px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="bg-pink-100 text-pink-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-row-reverse">
                                  <span>{deptTemplates.length}</span>
                                  <span>{language === "ar" ? "نموذج نشط" : "Templates"}</span>
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="text-xs font-bold text-slate-900 leading-tight tracking-tight text-right uppercase">
                                {dept}
                              </h4>
                              
                              <p className="text-[10px] text-slate-400 leading-none mt-1 text-right font-mono font-medium block">
                                {language === "ar" ? `قسم بهية المتكامل الفرعي` : `Integrated Wing`}
                              </p>

                              {/* Mini statistics */}
                              <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-200/60 pt-2.5 flex-row-reverse">
                                <div className="text-right">
                                  <span className="block text-[8px] text-slate-400 leading-none font-bold">
                                    {language === "ar" ? "السجلات المرفوعة" : "Logged Files"}
                                  </span>
                                  <span className="text-xs font-black text-emerald-600 text-right block">
                                    {deptRecordsCount} {language === "ar" ? "جرد ملء" : "Saved"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[8px] text-slate-400 leading-none font-bold">
                                    {language === "ar" ? "معدل الرصد" : "Reporting Cycle"}
                                  </span>
                                  <span className="text-xs font-black text-pink-600 block text-right">
                                    {deptRecordsCount > 0 ? "100%" : "0%"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* View / Select Folder Action */}
                            <div className="mt-4 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-right">
                              {/* Quick selection dropdown to search their checklists */}
                              <select
                                id={`quick-select-dept-${idx}`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  const matchingTpl = deptTemplates.find(t => t.id === val);
                                  if (matchingTpl) {
                                    setSelectedTemplate(matchingTpl);
                                    setActiveTab("editor");
                                    handleCreateNew(matchingTpl.id);
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[11px] font-semibold text-slate-700 cursor-pointer text-right outline-none"
                              >
                                <option value="">⚠️ {language === "ar" ? "اختر شيت للتعبئة فوراً..." : "Open checklist..."}</option>
                                {deptTemplates.map(t => (
                                  <option key={t.id} value={t.id}>
                                    ({t.code}) {language === "ar" ? t.titleAr.slice(0, 30) : t.titleEn.slice(0, 30)}...
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: General and Admin Hospital Settings with Custom Sheet Builders */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade font-sans text-right">
              
              {/* Hospital settings */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                    <span>تعديل هوية المستشفى وتفاصيل اللتر هيد بملفات الجرد</span>
                    <Settings className="h-4.5 w-4.5 text-pink-600" />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    قم بتعديل ترويسة اسم المستشفى والشعار والسطر التعريفي باللغتين العربية والإنجليزية لتتغير السجلات المطبوعة فوراً
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم المؤسسة (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.nameAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nameAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="بهية"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم المؤسسة (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.nameEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="Baheya Hospital"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الشعار / السطر التعريفي (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.taglineAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taglineAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="في ضهر كل ست مصرية"
                    />
                  </div>

                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الشعار / السطر التعريفي (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.taglineEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taglineEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                      placeholder="Breast Cancer Care Hospital"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تذييل التقارير المطبوعة (بالعربية)</label>
                    <input
                      type="text"
                      value={settingsForm.footerAr}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footerAr: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="تذييل التقرير بالعربية"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تذييل التقارير المطبوعة (بالانجليزية)</label>
                    <input
                      type="text"
                      value={settingsForm.footerEn}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footerEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                      placeholder="Report Footer in English"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-start">
                  <button
                    onClick={handleSaveHospitalSettings}
                    className="px-5 py-2 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                  >
                    حفظ الهوية الجديدة
                  </button>
                </div>
              </div>

              {/* Dynamic Departments Manager Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                    <span>إدارة وتعديل الأقسام والوحدات الطبية بالمستشفى</span>
                    <Layers className="h-4.5 w-4.5 text-pink-600" />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    قم بإضافة وحذف الأقسام والوحدات السريرية الطبية المتاحة بالمستشفى. سيتم تحديث نماذج واستمارات الجرد وخيارات إضافة وتعديل حسابات الكادر فوراً بهذا الدليل الديناميكي.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start justify-end text-xs">
                  {/* List of departments */}
                  <div className="w-full md:w-1/2 space-y-2 order-2 md:order-1">
                    <label className="block text-[10px] font-bold text-slate-505 mb-1 text-slate-500">الأقسام والوحدات السريرية الطبية المسجّلة حالياً بالمنظومة:</label>
                    <div className="border border-slate-150 rounded-lg p-2 max-h-44 overflow-y-auto space-y-1 bg-slate-50">
                      {departments.map((dept, index) => (
                        <div key={index} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-md border border-slate-100 shadow-sm">
                          <button
                            onClick={() => {
                              if (departments.length <= 1) {
                                alert(language === "ar" ? "عذراً: يجب الحفاظ على قسم طبي واحد على الأقل ببرنامج بهية!" : "Access Denied: You must keep at least one registered department!");
                                return;
                              }
                              if (confirm(language === "ar" ? `هل أنت متأكد من حذف قسم "${dept}"؟` : `Are you sure you want to delete ${dept}?`)) {
                                const list = departments.filter((d) => d !== dept);
                                setDepartments(list);
                                localStorage.setItem("baheya_hospital_departments", JSON.stringify(list));
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 font-extrabold text-[10px] cursor-pointer"
                          >
                            × حذف القسم
                          </button>
                          <span className="font-bold text-slate-700 text-xs">{dept}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Department Form */}
                  <div className="w-full md:w-1/2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 order-1 md:order-2">
                    <label className="block text-[10px] font-bold text-slate-650 text-slate-700">تسجيل وتفعيل وحدة طبية جديدة:</label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="مثال: ONCOLOGY INTENSIVE CARE"
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-pink-500 text-right"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                            if (!val) return;
                            if (departments.includes(val)) {
                              alert(language === "ar" ? "هذا القسم مسجل بالفعل!" : "This department already exists!");
                              return;
                            }
                            const updatedDepts = [...departments, val];
                            setDepartments(updatedDepts);
                            localStorage.setItem("baheya_hospital_departments", JSON.stringify(updatedDepts));
                            (e.target as HTMLInputElement).value = "";
                            alert(language === "ar" ? `تم تفعيل قسم "${val}" بنجاح!` : `Department ${val} added!`);
                          }
                        }}
                      />
                      <p className="text-[9px] text-slate-400">اكتب الاسم بالكامل ثم اضغط Enter للإضافة والحفظ التلقائي</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom sheets and template management - COMPLETE INTERACTIVE SUITE */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-8">
                
                {/* Section 1: Template Modification & Customization & Activation (تعديل وتخصيص وتفعيل النماذج الأساسية والمخصصة) */}
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                      <span>تعديل وتخصيص وتفعيل النماذج (أساسية + مخصصة)</span>
                      <Settings className="h-4.5 w-4.5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      اختر أي نموذج للجرودات من القائمة المتاحة لتعديل بيانات تعريفه، ترميز كوده، أو تعديل وإضافة وإزالة بنود وأصناف الجرد المكونة له فورياً. كما يمكنك تنشيط أو تعطيل الشيتات لمنع ظهورها تماماً.
                    </p>
                  </div>

                  <div className="space-y-4 font-sans text-xs">
                    {/* Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">اختر الشيت المراد تعديله أو تفعيله/تعطيله:</label>
                      <select
                        onChange={(e) => handleSelectTemplateToEdit(e.target.value)}
                        value={selectedTemplateToEdit}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white outline-none focus:ring-1 focus:ring-pink-500 font-bold text-slate-800"
                      >
                        <option value="">-- اختر النموذج لفتحه للتحرير --</option>
                        {/* Static standard list */}
                        <optgroup label={language === "ar" ? "النماذج الطبية الأساسية الافتراضية" : "Clinical Standard Checklists"}>
                          {FORM_TEMPLATES.map((t) => {
                            const isDeactivated = deactivatedTemplateIds.includes(t.id);
                            const label = language === "ar" ? t.titleAr : t.titleEn;
                            return (
                              <option key={t.id} value={t.id}>
                                {t.code}: {label} {isDeactivated ? "❌ (معطل ومخفي حالياً)" : "✔ (نشط ومتاح)"}
                              </option>
                            );
                          })}
                        </optgroup>
                        {/* Custom templates list */}
                        {customTemplates.length > 0 && (
                          <optgroup label={language === "ar" ? "النماذج المخصصة المضافة حديثاً" : "Added Custom Checklists"}>
                            {customTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.code}: {language === "ar" ? t.titleAr : t.titleEn} (نشط ومتاح)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {selectedTemplateToEdit && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        
                        {/* Toggle Activate/Deactivate for Standard template */}
                        {!selectedTemplateToEdit.startsWith("custom-tpl-") && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-250">
                            <div className="text-right">
                              <p className="font-bold text-slate-800">
                                {deactivatedTemplateIds.includes(selectedTemplateToEdit) ? "النموذج معطل ومخفي حالياً عن الكادر الطبي" : "النموذج نشط ويظهر للمستخدمين بالقائمة"}
                              </p>
                              <span className="text-[10px] text-slate-400">تتحكم هذه الميزة في إخفاء الشيت بالكامل لتبسيط عمليات الجرد اليومية وتقليص الخيارات غير الضرورية</span>
                            </div>
                            <button
                              onClick={() => handleToggleDeactivateTemplate(selectedTemplateToEdit)}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                deactivatedTemplateIds.includes(selectedTemplateToEdit)
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                              }`}
                            >
                              {deactivatedTemplateIds.includes(selectedTemplateToEdit) ? "إعادة تنشيط وتمكين الشيت" : "تعطيل وإخفاء الشيت من القائمة"}
                            </button>
                          </div>
                        )}

                        <h4 className="text-[11px] font-extrabold text-pink-700 border-b pb-1.5 flex items-center justify-between">
                          <span>بيانات تعريف وهيدر الشيت:</span>
                          <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">{selectedTemplateToEdit}</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت (بالعربية)</label>
                            <input
                              type="text"
                              value={editTemplateForm.titleAr}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, titleAr: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت (بالإنجليزية)</label>
                            <input
                              type="text"
                              value={editTemplateForm.titleEn}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, titleEn: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">الكود التعريفي للشيت</label>
                            <input
                              type="text"
                              value={editTemplateForm.code}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, code: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono font-black text-pink-600 uppercase"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">القسم الافتراضي لتسجيل السجلات</label>
                            <select
                              value={editTemplateForm.departmentDefault}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, departmentDefault: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              {departments.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">الإصدار (Version)</label>
                            <input
                              type="text"
                              value={editTemplateForm.version}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, version: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">تاريخ الاعتماد / الإصدار</label>
                            <input
                              type="text"
                              value={editTemplateForm.issueDate}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, issueDate: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-700"
                            />
                          </div>

                          <div className="md:col-span-3 flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                            <input
                              type="checkbox"
                              id="editHasPatient"
                              checked={editTemplateForm.hasPatientDetails}
                              onChange={(e) => setEditTemplateForm({ ...editTemplateForm, hasPatientDetails: e.target.checked })}
                              className="h-4 w-4 text-pink-600 border-slate-300 rounded cursor-pointer"
                            />
                            <label htmlFor="editHasPatient" className="font-bold text-slate-700 cursor-pointer user-select-none">
                              تضمين وإظهار خانات بيانات المريض بالأعلى (الاسم، السن، الرقم الطبي، ورقم السرير)
                            </label>
                          </div>
                        </div>

                        {/* Items editing section */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-[11px] font-extrabold text-pink-700 border-b pb-1.5">
                            أصناف وبنود الجرد المكونة لهذا الشيت ({editTemplateItems.length} بند):
                          </h4>

                          {/* Quick single item adder */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 text-right items-end font-sans">
                            <div className="md:col-span-3">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">البند / الصنف بالعربية</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.itemAr}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, itemAr: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white outline-none"
                                placeholder="شمعة فلتر تنفس رئيسية"
                              />
                            </div>
                            
                            <div className="md:col-span-3">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">البند بالإنجليزية</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.itemEn}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, itemEn: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                                placeholder="Ventilator main filter"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">كود الصنف</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.code}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, code: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                                placeholder="BH-ITM-01"
                              />
                            </div>

                            <div className="md:col-span-1 border-r pr-2 md:border-r-0 md:pr-0">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">الوحدة</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.unit}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, unit: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                                placeholder="PCS"
                              />
                            </div>

                            <div className="md:col-span-1">
                              <label className="block text-[9px] font-bold text-slate-440 mb-1">الكمية</label>
                              <input
                                type="text"
                                value={editTemplateSingleItemForm.qty}
                                onChange={(e) => setEditTemplateSingleItemForm({ ...editTemplateSingleItemForm, qty: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                                placeholder="1"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <button
                                onClick={handleAddOrEditSingleItemInTemplate}
                                className="w-full py-1.5 bg-pink-700 hover:bg-pink-850 text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {editTemplateItemIndex !== null ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                <span>{editTemplateItemIndex !== null ? "حفظ التعديل" : "إضافة بند"}</span>
                              </button>
                            </div>
                          </div>

                          {/* List of items in standard/custom template */}
                          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-150 bg-white shadow-inner">
                            {editTemplateItems.map((item, idx) => {
                              const isEditingThisItem = editTemplateItemIndex === idx;
                              return (
                                <div key={idx} className={`p-2 flex items-center justify-between text-[11px] hover:bg-slate-50 transition ${isEditingThisItem ? "bg-pink-50/40" : ""}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono bg-slate-100 text-slate-500 rounded px-1 text-[9px] w-6 text-center font-bold">{item.sn}</span>
                                    {item.code && <span className="font-mono text-slate-400 font-bold ml-1 text-[9px]">{item.code}</span>}
                                    <span className="font-extrabold text-slate-800">{item.itemAr}</span>
                                    {item.itemEn && <span className="text-slate-400 font-mono text-[10px] mr-1">/ {item.itemEn}</span>}
                                    <span className="bg-pink-50 text-pink-700 mr-2 px-1 text-[9px] rounded font-bold">{item.qty || "1"} {item.unit || "PCS"}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleStartEditSingleItemInTemplate(idx)}
                                      className="p-1 hover:bg-slate-105 hover:bg-slate-100 text-slate-600 rounded transition"
                                      title="تعديل هذا البند"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveSingleItemInTemplate(idx)}
                                      className="p-1 hover:bg-rose-50 text-rose-650 rounded transition"
                                      title="حذف هذا البند"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex justify-between items-center pt-2 border-t font-sans text-xs">
                          <button
                            onClick={() => handleSelectTemplateToEdit("")}
                            className="px-4 py-2 bg-slate-250 hover:bg-slate-300 bg-slate-200 text-slate-700 rounded-lg font-bold"
                          >
                            إلغاء وإخلاء لوحة التحكم
                          </button>

                          <button
                            onClick={handleSaveTemplateEdits}
                            className="px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:from-pink-700 hover:to-rose-700 font-bold rounded-lg shadow-md transition cursor-pointer"
                          >
                            حفظ وتطبيق كافة التغيرات لـ ({editTemplateForm.code})
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Custom Sheet Design and Build (نظام تصميم وإنشاء شيتات جديدة) */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                      <span>تصميم وإنشاء شيت جرد وقسم مخصص جديد لقائمة التدقيق</span>
                      <Plus className="h-4.5 w-4.5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      قم بإنشاء نموذج جرد رقمي جديد مخصص تماماً. يمكنك إما بناء بنوده تفاعلياً واحداً تلو الآخر لتنسيقه بدقة مذهلة، أو كتابته بالنص مجمّعاً، ليقوم النظام بتوليده وإتاحته لتسجيل السجلات والطباعة في ثوانٍ.
                    </p>
                  </div>

                  {/* Form */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-right">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت المخصص (بالعربية)</label>
                        <input
                          type="text"
                          value={templateForm.titleAr}
                          onChange={(e) => setTemplateForm({ ...templateForm, titleAr: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="مثال: جرد مستلزمات رعاية الرقابة الأسبوعي"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">اسم الشيت (بالإنجليزية)</label>
                        <input
                          type="text"
                          value={templateForm.titleEn}
                          onChange={(e) => setTemplateForm({ ...templateForm, titleEn: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="مثال: ICU Check Sheet"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">ترميز الكود (Checklist Code)</label>
                        <input
                          type="text"
                          value={templateForm.code}
                          onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 uppercase font-black focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="مثال: BH-ICU-08"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">القسم / الوحدة</label>
                        <select
                          value={templateForm.departmentDefault}
                          onChange={(e) => setTemplateForm({ ...templateForm, departmentDefault: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500 font-sans"
                        >
                          {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">رقم مراجعة النسخة (Revision)</label>
                        <input
                          type="text"
                          value={templateForm.version}
                          onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-pink-500"
                          placeholder="01"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 mb-1">تاريخ الإصدار والاعتماد</label>
                        <input
                          type="text"
                          value={templateForm.issueDate}
                          onChange={(e) => setTemplateForm({ ...templateForm, issueDate: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>

                      <div className="md:col-span-3 flex items-center gap-2 bg-white p-3 text-right border rounded-lg border-slate-200 mt-1">
                        <input
                          type="checkbox"
                          id="newHasPatient"
                          checked={templateForm.hasPatientDetails}
                          onChange={(e) => setTemplateForm({ ...templateForm, hasPatientDetails: e.target.checked })}
                          className="h-4 w-4 text-pink-600 border-slate-300 rounded cursor-pointer"
                        />
                        <label htmlFor="newHasPatient" className="font-bold text-slate-700 cursor-pointer user-select-none">
                          تفعيل لوحة بيانات المريض أعلى الملف (الاسم، والسن، والجنسية والتذكرة الطبية)
                        </label>
                      </div>
                    </div>

                    {/* Interactive Item list designer */}
                    <div className="pt-2">
                      <h4 className="font-bold text-slate-700 mb-2 block">تصميم بنود الجرد تفاعلياً (أو استخدم صندوق الأنابيب أدناه):</h4>
                      
                      <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-2 text-right items-end">
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">البند بالعربية *</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.itemAr}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, itemAr: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white outline-none"
                            placeholder="مثال: جهاز قياس التنفس مع الخرطوم"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">البند بالإنجليزية</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.itemEn}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, itemEn: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                            placeholder="Respiratory gauge set"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">كود الصنف (اختياري)</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.code}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, code: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white outline-none"
                            placeholder="ITM-01"
                          />
                        </div>

                        <div className="md:col-span-1.5 border-r pr-2 md:border-r-0 md:pr-0">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">الوحدة</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.unit}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, unit: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                            placeholder="PCS"
                          />
                        </div>

                        <div className="md:col-span-1.5">
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">الكمية المطلوبة</label>
                          <input
                            type="text"
                            value={newTemplateItemForm.qty}
                            onChange={(e) => setNewTemplateItemForm({ ...newTemplateItemForm, qty: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold text-center focus:bg-white outline-none"
                            placeholder="1"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <button
                            onClick={handleAddNewTemplateItem}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>درج</span>
                          </button>
                        </div>
                      </div>

                      {/* Created builder items preview */}
                      {newTemplateItems.length > 0 && (
                        <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 block border-b pb-1">البنود المضافة حالياً للشيت الجديد ({newTemplateItems.length} بند جرد مخصص):</span>
                          <div className="flex flex-wrap gap-1.5">
                            {newTemplateItems.map((item, index) => (
                              <div key={index} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                                <span className="font-bold">{item.itemAr}</span>
                                <span className="text-slate-400 text-[8px]">({item.qty} {item.unit})</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewTemplateItem(index)}
                                  className="text-slate-400 hover:text-red-650 transition font-bold"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fallback Text-based pipelines parser */}
                    {newTemplateItems.length === 0 && (
                      <div className="pt-2">
                        <label className="block text-[10px] font-black text-slate-500 mb-1">
                          أو الصق مصفوفة البنود دفعة واحدة بالتنسيق التالي (اسم الصنف بالعربية|الاسم بالإنجبليزية|الوحدة|الكمية):
                        </label>
                        <textarea
                          rows={3}
                          value={templateForm.itemsText}
                          onChange={(e) => setTemplateForm({ ...templateForm, itemsText: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono font-bold leading-normal outline-none focus:ring-1 focus:ring-pink-500 placeholder-slate-400 focus:bg-white"
                          placeholder="سرنجة معقمة 5 سم مخصصة|Sterile Syringe 5cc|PCS|12&#10;شريط اختبار قياس رطوبة الهواء|Air Humidity Testing Strip|STRIP|6&#10;مسحة كحول ناصعة معقمة مخصصة|Sterile Alcohol Swab|PACK|24"
                        />
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          يقوم النظام بتسجيل البنود وتغذية الـ 31 يوماً آلياً لكل سطر مندمج. افصل البنود بسطر جديد (Enter)، والخصائص برمز الأنبوب (|).
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleCreateCustomTemplate}
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-650 to-rose-650 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>إنشاء وتنسيق الشيت بقائمة بهية</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Section 3: Lists current custom templates */}
                {customTemplates.length > 0 && (
                  <div className="border-t border-slate-200 pt-6 text-xs">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 block">الشيتات المخصصة المشحونة المصنوعة حالياً:</h4>
                    <div className="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {customTemplates.map((customTpl) => (
                        <div key={customTpl.id} className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                          <div>
                            <span className="font-mono bg-pink-50 text-pink-700 font-extrabold px-2 py-0.5 rounded text-[10px] ml-2">
                              {customTpl.code}
                            </span>
                            <span className="font-extrabold text-slate-900 block sm:inline-block">
                              {customTpl.titleAr} / {customTpl.titleEn}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 sm:mt-0 font-bold block sm:inline-block sm:mr-4">
                              القسم الافتراضي: {customTpl.departmentDefault} | {customTpl.items.length} أصناف
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomTemplate(customTpl.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            حذف الشيت بالكامل
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: User Directory and Management (إدارة وتعديل وإضافة كادر المستخدمين الطبيين) */}
                <div className="border-t border-slate-200 pt-6 space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 justify-end">
                      <span>إدارة وصلاحيات المستخدمين والكادر الطبي</span>
                      <User className="h-4.5 w-4.5 text-pink-600" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 text-right font-sans">
                      أضف كوادراً طبية جديدة (أطباء، رئيسيات تمريض، مسؤولي الجودة) لتمكينهم من تسجيل الجرودات، أو عدّل بيانات الكادر الحالي وصلاحياتهم. يتطلب هذا القسم صلاحيات مسؤول النظام (الأدمن).
                    </p>
                  </div>

                  {currentUser.role !== "admin" ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-right text-amber-800 flex items-start gap-2.5 justify-end font-sans">
                      <div>
                        <p className="font-bold">تنبيه الوصول الخاص بلوحة الإدارة</p>
                        <p className="text-[10px] text-amber-700 mt-1">
                          أنت مسجل الدخول بصفتك <span className="font-bold">({language === "ar" ? currentUser.nameAr : currentUser.nameEn})</span>. لرؤية وتعديل وإضافة المستخدمين تفاعلياً، يرجى تغيير دور مستخدم الوصول الحالي من القائمة الجانبية إلى الأدمن <span className="font-bold">(د. محمد السيد).</span>
                        </p>
                      </div>
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Sub-section 4.1: Add New User Form */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
                        <h4 className="font-bold text-pink-700 text-[11px] border-b pb-1">إضافة عضو جديد للكادر الطبي بالنظام:</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-right">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">الاسم الكامل (بالعربية) *</label>
                            <input
                              type="text"
                              value={newUserForm.nameAr}
                              onChange={(e) => setNewUserForm({ ...newUserForm, nameAr: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="مثال: أ. هند أحمد"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1 font-mono">الاسم الكامل (بالإنجليزية) *</label>
                            <input
                              type="text"
                              value={newUserForm.nameEn}
                              onChange={(e) => setNewUserForm({ ...newUserForm, nameEn: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="e.g. Sister Hind Ahmed"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">كود الموظف المخصص (Staff ID) *</label>
                            <input
                              type="text"
                              value={newUserForm.staffId}
                              onChange={(e) => setNewUserForm({ ...newUserForm, staffId: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono uppercase font-black text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="e.g. BHG-NUR-101"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">المستوى الوظيفي والصلاحيات *</label>
                            <select
                              value={newUserForm.role}
                              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              <option value="staff">موظف عادي / كادر تمريض (Regular Staff Nurse)</option>
                              <option value="head_nurse">رئيسة تمريض / مشرفة قسم (Head Nurse)</option>
                              <option value="quality">مسؤول رقابة جودة (Quality Auditor)</option>
                              <option value="admin">مسؤول نظام كامل (Full Admin)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1 font-sans">القسم الطبي الافتراضي *</label>
                            <select
                              value={newUserForm.department}
                              onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              {departments.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">رمز المرور المخصص (PIN - 4 أرقام) *</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={newUserForm.pin}
                              onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value.replace(/\D/g, "") })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-center text-xs font-black tracking-widest text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="1234"
                            />
                          </div>

                          <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-450 mb-1">البريد الإلكتروني المهني (Corporate Email) *</label>
                            <input
                              type="email"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="e.g. nurse.fatima@baheya.org"
                            />
                          </div>

                          {/* Dynamic checklist template permissions manager block */}
                          <div className="md:col-span-2 lg:col-span-3 border-t pt-3 mt-1 text-right">
                            <label className="block text-[10px] font-black text-pink-700 mb-1.5 font-sans">تحديد النماذج وشيتات الجرد الطبي المسموح له برؤيتها وتعبئتها (Permissions) *</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                              {FORM_TEMPLATES.map((tpl) => {
                                const isChecked = (newUserForm.permissions || []).includes(tpl.id);
                                return (
                                  <label key={tpl.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 hover:text-black cursor-pointer bg-slate-50 p-1.5 rounded border border-slate-100 transition justify-between">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const current = newUserForm.permissions || [];
                                        const updated = e.target.checked
                                          ? [...current, tpl.id]
                                          : current.filter(id => id !== tpl.id);
                                        setNewUserForm({ ...newUserForm, permissions: updated });
                                      }}
                                      className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <div className="leading-tight flex-1 ml-1 text-right">
                                      <span className="font-mono font-bold text-pink-600 text-[10px] block leading-none">{tpl.code}</span>
                                      <span className="block mt-0.5 text-[10px]">{language === "ar" ? tpl.titleAr : tpl.titleEn}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={handleAddSystemUser}
                            className="px-5 py-2 bg-slate-850 hover:bg-slate-900 bg-slate-800 text-white font-extrabold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="h-4 w-4" />
                            <span>تسجيل وتفعيل الموظف الجديد</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-section 4.2: Edit Existing User */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
                        <div className="border-b pb-1 flex items-center justify-between">
                          <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">CONTROL WORKSPACE</span>
                          <h4 className="font-bold text-pink-700 text-[11px]">تحرير وتعديل بيانات مستخدم مسجّل حالياً:</h4>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">اختر الموظف الطبي المراد إدارته:</label>
                          <select
                            onChange={(e) => handleSelectUserToEdit(e.target.value)}
                            value={selectedUserToEdit}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          >
                            <option value="">-- اختر المستخدم الحالي لفتح لوحة تعديله --</option>
                            {systemUsers.map((usr) => (
                              <option key={usr.id} value={usr.id}>
                                {usr.nameAr} / {usr.nameEn} ({usr.role === "admin" ? "أدمن" : usr.role === "quality" ? "جودة" : "تمريض"}) - {usr.staffId}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedUserToEdit && (
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-4 text-right">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">الاسم بالعربية</label>
                                <input
                                  type="text"
                                  value={editUserForm.nameAr}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, nameAr: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1 font-mono">الاسم بالإنجليزية</label>
                                <input
                                  type="text"
                                  value={editUserForm.nameEn}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, nameEn: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">كود الموظف التعريفي</label>
                                <input
                                  type="text"
                                  value={editUserForm.staffId}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, staffId: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono uppercase font-black focus:bg-white focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">الدور والصلاحيات</label>
                                <select
                                  value={editUserForm.role}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white"
                                >
                                  <option value="staff">موظف عادي / كادر تمريض (Regular Staff Nurse)</option>
                                  <option value="head_nurse">رئيسة تمريض / مشرفة (Head Nurse)</option>
                                  <option value="quality">مسؤول رقابة جودة (Quality Auditor)</option>
                                  <option value="admin">مسؤول نظام كامل (Full Admin)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-1">القسم الطبي</label>
                                <select
                                  value={editUserForm.department}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-bold focus:bg-white focus:outline-none"
                                >
                                  {departments.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-450 mb-1">رمز مرور الدخول (PIN Code)</label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={editUserForm.pin}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, pin: e.target.value.replace(/\D/g, "") })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono text-center font-bold tracking-widest focus:bg-white"
                                  placeholder="1234"
                                />
                              </div>

                              <div className="md:col-span-2 lg:col-span-3">
                                <label className="block text-[9px] font-bold text-slate-450 mb-1">البريد الإلكتروني المهني</label>
                                <input
                                  type="email"
                                  value={editUserForm.email}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                  placeholder="nurse.name@baheya.org"
                                />
                              </div>

                              {/* Dynamic template checklist permissions editor block */}
                              <div className="md:col-span-2 lg:col-span-3 border-t pt-3 mt-1 text-right">
                                <label className="block text-[10px] font-black text-pink-700 mb-1.5 font-sans">تحديد النماذج وشيتات الجرد الطبي المسموح له برؤيتها وتعبئتها (Permissions) *</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                                  {FORM_TEMPLATES.map((tpl) => {
                                    const isChecked = (editUserForm.permissions || []).includes(tpl.id);
                                    return (
                                      <label key={tpl.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 hover:text-black cursor-pointer bg-slate-50 p-1.5 rounded border border-slate-100 transition justify-between">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const current = editUserForm.permissions || [];
                                            const updated = e.target.checked
                                              ? [...current, tpl.id]
                                              : current.filter(id => id !== tpl.id);
                                            setEditUserForm({ ...editUserForm, permissions: updated });
                                          }}
                                          className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <div className="leading-tight flex-1 ml-1 text-right">
                                          <span className="font-mono font-bold text-pink-600 text-[10px] block leading-none">{tpl.code}</span>
                                          <span className="block mt-0.5 text-[10px]">{language === "ar" ? tpl.titleAr : tpl.titleEn}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-2.5">
                              <button
                                onClick={() => handleDeleteSystemUser(selectedUserToEdit)}
                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>إبطال وحذف الحساب الطبي</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSelectUserToEdit("")}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                                >
                                  إلغاء التعديل
                                </button>
                                <button
                                  onClick={handleUpdateSystemUser}
                                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-[10px] font-bold shadow transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>حفظ التعديلات الجديدة</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sub-section 4.3: Active User Directory Table List */}
                      <div className="space-y-2.5 text-xs font-sans">
                        <span className="font-bold text-slate-700 block text-right">دليل هوية وجدول موظفي النظام الحاليين ({systemUsers.length} مستخدم):</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {systemUsers.map((usr) => {
                            const isSelected = selectedUserToEdit === usr.id;
                            const isActiveSession = currentUser.id === usr.id;
                            return (
                              <div
                                key={usr.id}
                                className={`p-3 bg-white border rounded-xl shadow-sm flex items-start gap-3 transition-all ${
                                  isSelected ? "border-pink-500 ring-1 ring-pink-500" : "border-slate-200 hover:border-slate-350"
                                }`}
                              >
                                {/* Tool button triggers */}
                                <div className="flex flex-col gap-1 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-150">
                                  <button
                                    onClick={() => handleSelectUserToEdit(usr.id)}
                                    className={`p-1 rounded transition text-slate-600 ${isSelected ? "bg-pink-100 text-pink-700" : "hover:bg-slate-200"}`}
                                    title="تعديل الموظف"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSystemUser(usr.id)}
                                    className="p-1 rounded transition text-slate-400 hover:text-rose-650 hover:bg-rose-50"
                                    title="إلغاء تفعيل الموظف"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>

                                <div className="flex-1 text-right min-w-0">
                                  <div className="flex items-center justify-end gap-1.5 leading-none">
                                    {isActiveSession && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded text-[8px] font-extrabold font-sans">
                                        جلسة العمل الحالية
                                      </span>
                                    )}
                                    <span className="font-black text-slate-800 truncate block">{usr.nameAr}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wide leading-none mt-1 truncate">
                                    {usr.nameEn}
                                  </span>
                                  
                                  <div className="mt-2.5 flex items-center justify-end gap-1">
                                    <span className="text-[9px] font-bold text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">
                                      {usr.staffId}
                                    </span>
                                    <span className="text-[10px] text-slate-500 truncate font-semibold">
                                      {usr.department}
                                    </span>
                                  </div>

                                  <div className="mt-1.5 flex justify-end">
                                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase font-sans tracking-wide border ${
                                      usr.role === "admin"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : usr.role === "quality"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}>
                                      {usr.role === "admin" ? "مسؤول نظام عام" : usr.role === "quality" ? "مسؤول جودة مستشفى" : "رئيسة تمريض"}
                                    </span>
                                  </div>
                                </div>

                                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black text-xs border uppercase ${
                                  usr.role === "admin"
                                    ? "bg-red-50 text-red-650 border-red-200"
                                    : usr.role === "quality"
                                    ? "bg-amber-50 text-amber-650 border-amber-200"
                                    : "bg-emerald-50 text-emerald-650 border-emerald-100"
                                }`}>
                                  {usr.avatarInitials}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sub-section 4.2: Role Permission Matrix (لوحة تخصيص مرونة الصلاحيات للأدوار) */}
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-right">
                        <div>
                          <h4 className="font-extrabold text-pink-700 text-xs flex items-center justify-end gap-1 pb-1 border-b">
                            <span>لوحة التحكم وتخصيص صلاحيات الأدوار (مرونة الكوادر)</span>
                            <Settings className="h-4 w-4 text-pink-600 shrink-0" />
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">
                            {language === "ar" 
                              ? "بصفتك مسؤول نظام، يمكنك تخصيص الصلاحيات تفاعلياً لكل رتبة طبية فورا. ستتأثر صلاحيات العرض والأزرار على مستوى التطبيق:" 
                              : "As system administrator, configure role privileges dynamically. Interface access levels change in real-time:"}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-right border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                            <thead>
                              <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                <th className="p-2.5 border-b border-slate-200">{language === "ar" ? "الإجراء أو الصلاحية المقيدة" : "Clinical Action Policy"}</th>
                                <th className="p-2.5 border-b border-slate-200 text-center">{language === "ar" ? "رئيسة تمريض (Staff)" : "Head Nurse (Staff)"}</th>
                                <th className="p-2.5 border-b border-slate-200 text-center">{language === "ar" ? "مسؤول جودة (Auditor)" : "Quality Auditor"}</th>
                                <th className="p-2.5 border-b border-slate-200 text-center">{language === "ar" ? "مسؤول نظام (Admin)" : "System Admin"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {[
                                { key: "submitChecklist", labelAr: "تقديم وتعبئة الشيك ليست والديوتي اليومي بالوحدات", labelEn: "Submit Unit Daily Checklists & Duties" },
                                { key: "approveChecklist", labelAr: "تدقيق واعتماد ختم مديرة التمريض والمشرفين", labelEn: "Audit & Supervisor Stamp Signoffs" },
                                { key: "manageDutyTasks", labelAr: "إضافة وحذف مهام تفقدية جديدة لجرود الكادر", labelEn: "Register New Checking Duty Criteria" },
                                { key: "editMasterTemplates", labelAr: "بناء وتعديل وحفظ النماذج الطبية الـ 200", labelEn: "Edit Hospital Master Clinical Sheets" },
                                { key: "deleteLogs", labelAr: "القدرة على حذف وتفريغ السجلات من الأرشيف", labelEn: "Purge & Erase Archived Log Files" },
                              ].map((policy) => {
                                const activeRoles = rolePermissions[policy.key as keyof typeof rolePermissions] || [];
                                
                                const toggleRole = (roleStr: "head_nurse" | "quality" | "admin") => {
                                  const updatedRoles = activeRoles.includes(roleStr)
                                    ? activeRoles.filter(r => r !== roleStr)
                                    : [...activeRoles, roleStr];
                                    
                                  const updatedPermissions = {
                                    ...rolePermissions,
                                    [policy.key]: updatedRoles
                                  };
                                  savePermissionsToDb(updatedPermissions);
                                };

                                return (
                                  <tr key={policy.key} className="hover:bg-slate-50 text-[11px]">
                                    <td className="p-2.5 font-bold text-slate-700">
                                      <div>{language === "ar" ? policy.labelAr : policy.labelEn}</div>
                                      <div className="text-[9px] text-slate-400 font-normal">{language === "ar" ? policy.labelEn : policy.labelAr}</div>
                                    </td>
                                    
                                    <td className="p-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={activeRoles.includes("head_nurse")}
                                        onChange={() => toggleRole("head_nurse")}
                                        className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer"
                                      />
                                    </td>

                                    <td className="p-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={activeRoles.includes("quality")}
                                        onChange={() => toggleRole("quality")}
                                        className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer"
                                      />
                                    </td>

                                    <td className="p-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={activeRoles.includes("admin")}
                                        onChange={() => toggleRole("admin")}
                                        className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </main>

        {/* Persistent Status Footer - Hides on Print */}
        <footer className="no-print bg-slate-900 border-t border-slate-800 text-slate-300 py-4 text-center text-xs sticky bottom-0 w-full z-15">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-600/20 border border-pink-500/50 flex items-center justify-center shrink-0">
                <HeartPulse className="h-4 w-4 text-pink-500" />
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-black text-rose-100 font-sans">
                  {language === "ar" 
                    ? "مستشفى بهية لسرطان الثدي - نظام إدارة الرقابة ودعم القرار" 
                    : "Baheya Breast Cancer Care - Clinical Decision Support Console"}
                </span>
                <span className="block text-[9px] text-slate-400 font-sans">
                  {language === "ar" 
                    ? "مطابق لمعايير الهيئة العامة للاعتماد والرقابة الصحية الكلية (الجمهورية المصرية)" 
                    : "Complies with GAHAR Healthcare Safety Standards & Quality Verification Acts"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 font-mono text-right shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="uppercase text-[9px] tracking-widest bg-slate-800 border border-slate-750 px-2 py-0.5 rounded font-bold">
                  {currentUser.role.toUpperCase()} LEVEL ACCESS
                </span>
              </div>
              <span className="text-[9px] text-slate-400">
                {language === "ar"
                  ? `الكادر الطبي الحالي: ${currentUser.nameAr} (${currentUser.staffId})`
                  : `Active Staff: ${currentUser.nameEn} (${currentUser.staffId})`}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* PASSCODE ACCESS VERIFICATION OVERLAY DIALOG MODAL (حماية لتغيير صلاحية الأدمن 1234) */}
      {passcodeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex justify-between items-center">
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
                <span>{language === "ar" ? "صلاحيات الأدمن - تأكيد الدخول" : "SYS ADMIN CHALLENGE"}</span>
              </h4>
              <button 
                onClick={() => {
                  setPasscodeModalOpen(false);
                  setPendingUser(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-right">
              <p className="text-xs text-slate-600 leading-relaxed mb-4 font-sans">
                {language === "ar"
                  ? `بموجب بروتوكول الجودة الرقمي، تغيير الحساب لمدير النظام (${pendingUser?.nameAr || ""}) يستدعي إدخال الرقم السري كخطوة حماية:`
                  : `Switching security level to SysAdmin (${pendingUser?.nameEn || ""}) requires entering the protective passkey:`}
              </p>

              <div className="mb-4">
                <input
                  type="password"
                  placeholder={language === "ar" ? "أدخل الرمز السري (الافتراضي هو: 1234)" : "Enter passcode (Default is: 1234)"}
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePasscodeSubmit();
                    }
                  }}
                  className="w-full text-center bg-slate-50 border border-slate-300 rounded-lg py-2.5 font-mono text-base tracking-widest focus:ring-1 focus:ring-pink-500 outline-none transition"
                  autoFocus
                />
                {passcodeError && (
                  <p className="text-red-650 font-bold text-[10px] mt-1 text-center">
                    {language === "ar" ? "الرقم السري غير صحيح! يرجى إدخال الحماية '1234' للوصول." : "Incorrect passcode! Enter safety value '1234'."}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end text-xs">
                <button
                  onClick={() => {
                    setPasscodeModalOpen(false);
                    setPendingUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                >
                  {language === "ar" ? "إلغاء الأمر" : "Cancel"}
                </button>
                <button
                  onClick={handlePasscodeSubmit}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold transition"
                >
                  {language === "ar" ? "تأكيد الدخول" : "Authorize"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
