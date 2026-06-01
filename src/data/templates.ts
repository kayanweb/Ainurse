import { FormTemplate, GridRow, SavedRecord } from "../types";

const STATIC_TEMPLATES: FormTemplate[] = [
  // 1. Emergency Department (ER)
  { id: "daily-nursing", code: "BHG-FR-GEN-027", titleAr: "جرد مستلزمات غرفة الملابس - Dressing Room Check", titleEn: "Daily Nursing Checklist (Dressing Room Supplies)", departmentDefault: "DRESSING ROOM", version: "01", issueDate: "03.2025" },
  { id: "patient-discharge-ama", code: "BHG-FR-MED-080", titleAr: "إقرار خروج المريض بالرفض / مخالفاً للنصيحة الطبية", titleEn: "Patient Discharge Against Medical Advice", departmentDefault: "EMERGENCY UNIT", version: "01", issueDate: "03.2025", hasPatientDetails: true },
  { id: "er-medication", code: "BHG-FR-NUR-002-ER", titleAr: "سجل أدوية ومحاليل الطوارئ - ER Medication Stock", titleEn: "ER Medication & IV Fluids Stock Checklist", departmentDefault: "EMERGENCY ROOM", version: "02", issueDate: "05.2025" },
  { id: "ambulance-request", code: "BHG-FR-GEN-003", titleAr: "طلب نقل سيارة إسعاف - Ambulance Request Form", titleEn: "Ambulance Request & Patient Conveyance Form", departmentDefault: "EMERGENCY UNIT", version: "02", issueDate: "03.2023", hasPatientDetails: true },
  { id: "emergency-custody-monthly", code: "BHG-Emergency-Custody", titleAr: "العهدة الخاصة بالطوارئ عن شهر - Emergency Floor Stock", titleEn: "Emergency Room Monthly Custody Checklist", departmentDefault: "EMERGENCY UNIT", version: "01", issueDate: "2026" },
  { id: "er-crash-cart-daily", code: "BHG-FR-NUR-022", titleAr: "فحص عهدة عربة الطوارئ اليومي - ER Crash Cart", titleEn: "ER Crash Cart Daily Inspection Log", departmentDefault: "EMERGENCY UNIT", version: "01", issueDate: "2025" },
  { id: "er-triage-log", code: "BHG-FR-NUR-023", titleAr: "سجل فرز وتصنيف حالات الطوارئ - Triage Log", titleEn: "ER Triage & Patient Classification Register", departmentDefault: "EMERGENCY ROOM", version: "01", issueDate: "2025" },
  { id: "er-isolation-pressure", code: "BHG-FR-ENG-080", titleAr: "سجل ضغط غرفة العزل السلبي - Negative Pressure", titleEn: "Isolation Room Daily Negative Pressure Log", departmentDefault: "EMERGENCY ROOM", version: "01", issueDate: "2025" },
  { id: "er-cast-splint", code: "BHG-FR-NUR-025", titleAr: "جرد جبائر ومستلزمات العظام بالطوارئ - Cast & Splint", titleEn: "Cast, Bandages and Orthopedic Splint Stock", departmentDefault: "EMERGENCY UNIT", version: "01", issueDate: "2025" },
  { id: "er-suture-checklist", code: "BHG-FR-NUR-026", titleAr: "جرد مستلزمات خياطة الجروح بالطوارئ - Suture Room", titleEn: "Emergency Suture Room Supplies Checklist", departmentDefault: "EMERGENCY UNIT", version: "01", issueDate: "2025" },

  // 2. Intensive Care Unit (ICU)
  { id: "icu-supplies-services", code: "BHG-BZ-FR-NUR-010-ICU", titleAr: "مستلزمات وإجراءات الرعاية المركزة - ICU Supplies & Services", titleEn: "ICU Supplies & Services Daily Ledger", departmentDefault: "ICU", version: "03", issueDate: "09.2025" },
  { id: "icu-ventilator-flow", code: "BHG-FR-ICU-001", titleAr: "سجل متابعة مرضى التنفس الصناعي - Ventilator Chart", titleEn: "ICU Mechanical Intensive Care Ventilator Log", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-resuscitation-drugs", code: "BHG-FR-ICU-002", titleAr: "سجل أدوية ومستلزمات الإنعاش بالرعاية - ICU Emergency Drugs", titleEn: "ICU Resuscitation Drugs & Stock Checklist", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-ecg-electrodes", code: "BHG-FR-ICU-003", titleAr: "جرد مستلزمات تخطيط وأقطاب القلب بالرعاية", titleEn: "ECG, Cables & Telemetry Monitoring Supplies", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-central-lines", code: "BHG-FR-ICU-004", titleAr: "سجل جرد مستلزمات تركيب القساطر المركزية - CVP Lines", titleEn: "Central Venous Catheter (CVP) Insertion Supplies", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-dialysis-consumables", code: "BHG-FR-ICU-005", titleAr: "جرد مستلزمات الغسيل الكلوي بالرعاية - Dialysis", titleEn: "Renal Replacement Therapy (CRRT) Consumables", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-airway-intubation", code: "BHG-FR-ICU-006", titleAr: "جرد أدوات ومستلزمات الأنبوبة الحنجرية - Intubation Tray", titleEn: "Rapid Sequence Intubation (RSI) Tray Checklist", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-pressure-ulcer", code: "BHG-FR-ICU-007", titleAr: "فحص ومتابعة قرح الفراش بالرعاية - Pressure Ulcers", titleEn: "ICU Pressure Ulcer Integrity Assessment Log", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-blood-gas", code: "BHG-FR-ICU-008", titleAr: "سجل عينات غازات الدم الشرياني ومستهلكاتها - ABG Log", titleEn: "Arterial Blood Gas Analysis & Consumables Log", departmentDefault: "ICU", version: "01", issueDate: "2025" },
  { id: "icu-infusion-pumps", code: "BHG-FR-ICU-009", titleAr: "سجل عهدة مضخات المحاليل والحقن الوريدي بالرعاية", titleEn: "Volumetric Infusion & Syringe Pumps Registry", departmentDefault: "ICU", version: "01", issueDate: "2025" },

  // 3. Surgical Ward & Operating Room (OR)
  { id: "supplies-surgical", code: "BHG-FR-GEN-027-Supplies", titleAr: "جرد الخياطات وخيوط العمليات الجراحية - Surgical Suture", titleEn: "Surgical Threads, Suture & Instruments Checklist", departmentDefault: "OPERATING ROOM", version: "01", issueDate: "03.2025" },
  { id: "change-dressing-surgery", code: "BHG-FR-NUR-013-Dressing", titleAr: "حقيبة مستلزمات غيار الجرح (الجراحة) - Dressing Kit", titleEn: "Change Dressing Consumables Package Checklist", departmentDefault: "SURGERY WARD", version: "01", issueDate: "09.2025" },
  { id: "room-checklist", code: "BHG-BZ-FR-NUR-029", titleAr: "جرد مستلزمات غرف ممر الرعاية - Room Checklist", titleEn: "Room Patient Care Supplies Checklist", departmentDefault: "ROOM (1)", version: "01", issueDate: "12.2025" },
  { id: "pre-post-operative", code: "BHG-BZ-FR-NUR-031/032", titleAr: "جرد مستلزمات قبل وبعد العمليات الجراحية", titleEn: "Perioperative Patient Checklist", departmentDefault: "O.R. RECOVERY", version: "01", issueDate: "12.2025" },
  { id: "operating-instrument-sets", code: "BHG-BZ-FR-NUR-033", titleAr: "قائمة جرد وتكامل أطقم الآلات - Instruments Sets", titleEn: "Surgery Instrument Sets Checklist", departmentDefault: "STERILIZATION CENTRAL", version: "01", issueDate: "12.2025" },
  { id: "separet-checklist", code: "BHG-BZ-FR-NUR-034", titleAr: "قائمة فحص الآلات الجراحية والملحقات المنفصلة", titleEn: "Separate Surgical Instruments Checklist", departmentDefault: "OPERATING ROOM", version: "01", issueDate: "12.2025" },
  { id: "or-linens-drapes", code: "BHG-FR-SURG-050", titleAr: "جرد الملاءات والفرش الجراحي المعقم بالعمليات", titleEn: "Surgical Linens & Sterile Drapes Inventory Check", departmentDefault: "OPERATING ROOM", version: "01", issueDate: "2025" },
  { id: "or-specimen-log", code: "BHG-FR-SURG-051", titleAr: "سجل تسجيل وإرسال العينات الباثولوجية - Specimen Log", titleEn: "Intraoperative Surgical Pathology Specimen Log", departmentDefault: "OPERATING ROOM", version: "01", issueDate: "2025" },
  { id: "or-implants-mesh", code: "BHG-FR-SURG-052", titleAr: "سجل جرد الرقع الجراحية والشبكات المستوردة - Implants", titleEn: "Surgical Mesh & Implantable Prostheses Ledger", departmentDefault: "OPERATING ROOM", version: "01", issueDate: "2025" },
  { id: "or-count-sheet", code: "BHG-FR-SURG-053", titleAr: "قائمة عد الشاش والإبر والآلات أثناء الجراحة", titleEn: "Surgical Sponge & Sharp Instruments Count Sheet", departmentDefault: "OPERATING ROOM", version: "01", issueDate: "2025" },

  // 4. Chemotherapy (Chemo) Daycare
  { id: "medical-supplies-chemo", code: "BHG-FR-NUR-007-Chemo", titleAr: "مستلزمات وأدوية العلاج الكيماوي - Chemo Supplies", titleEn: "Medical Supplies Charging (Chemo Session)", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "09.2025" },
  { id: "chemo-port-access", code: "BHG-FR-CHEMO-101", titleAr: "جرد سنون ومستلزمات إبر البورتكاث - Port Access", titleEn: "Chemotherapy implantable Port-A-Cath Access Log", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-spill-kit", code: "BHG-FR-CHEMO-102", titleAr: "سجل فحص وتوافر حقيبة التعامل مع انسكاب الكيماوي", titleEn: "Chemotherapy Spill Kit Inventory Checklist", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-extravasation", code: "BHG-FR-CHEMO-103", titleAr: "سجل رصد ومتابعة تسرب دواء الكيماوي تحت الجلد", titleEn: "Chemotherapy Extravasation Intervention Logs", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-premedication", code: "BHG-FR-CHEMO-104", titleAr: "جرد أدوية ما قبل الجلسات لمنع الحساسية والقيء", titleEn: "Pre-chemotherapy Premedication Stock Audit", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-clinical-trial", code: "BHG-FR-CHEMO-105", titleAr: "مستلزمات ومتابعة مرضى الأبحاث والتجارب السريرية", titleEn: "Chemotherapy Clinical Trials Supplies Monitor", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-toxicity-assessment", code: "BHG-FR-CHEMO-106", titleAr: "سجل تقييم السمية والأعراض الجانبية للعلاج الكيماوي", titleEn: "Cytotoxic Chemotherapy Side-Effects Toxicity Log", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-disposal-waste", code: "BHG-FR-CHEMO-107", titleAr: "سجل التخلص الآمن من النفايات السامة للخلايا", titleEn: "Chemo Hazardous Cytotoxic Waste Disposal Register", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-scalp-cooling", code: "BHG-FR-CHEMO-108", titleAr: "مستلزمات وأجهزة تبريد فروة الرأس لمنع تساقط الشعر", titleEn: "Scalp Cooling System Maintenance & Cap Log", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },
  { id: "chemo-patient-education", code: "BHG-FR-CHEMO-109", titleAr: "بيان لتثقيف وتعليمات مرضى العلاج الكيماوي", titleEn: "Oncology Nursing Patient Education Checklist", departmentDefault: "CHEMO DAYCARE", version: "01", issueDate: "2025" },

  // 5. Radiology & Breast Intervention
  { id: "radiology-consumables", code: "BHG-FR-NUR-009-Rad", titleAr: "مستلزمات وحقيبة الأشعة التداخلية - Radiology package", titleEn: "Radiology Consumables Checklist", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "09.2025" },
  { id: "rad-contrast-media", code: "BHG-FR-RAD-201", titleAr: "سجل جرد واستهلاك مواد التباين والصبغات بالأشعة", titleEn: "Contrast Media Stock & Patient Usage Log", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },
  { id: "rad-lead-aprons", code: "BHG-FR-RAD-202", titleAr: "سجل الفحص السنوي لجودة السترات الواقية من الرصاص", titleEn: "Lead Protective Aprons Annual Integrity Audit", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },
  { id: "rad-biopsy-needles", code: "BHG-FR-RAD-203", titleAr: "جرد سنون عينات الثدي بالإبرة القاطعة والأسلاك", titleEn: "Mammography Core Needle Biopsy Supplies Registry", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },
  { id: "rad-pregnancy-consent", code: "BHG-FR-RAD-204", titleAr: "إقرار عدم وجود حمل لأجهزة الأشعة المؤينة للأمهات", titleEn: "Imaging Ionizing Radiation Pregnancy Screening Log", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },
  { id: "rad-mri-safety", code: "BHG-FR-RAD-205", titleAr: "قائمة التحقق من الأمان والسلامة قبل الدخول للرنين", titleEn: "MRI High-Field Magnetic Safety Patient Screening", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },
  { id: "rad-ultrasound-probe", code: "BHG-FR-RAD-206", titleAr: "سجل وتطهير مسبار جهاز الموجات فوق الصوتية", titleEn: "Interventional Ultrasound Transducer Disinfection", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },
  { id: "rad-radiation-badge", code: "BHG-FR-RAD-207", titleAr: "سجل قراءة كروت قياس جرعات الأشعة الفردية للعاملين", titleEn: "Personal TLD Radiation Dosimetry Badges Index", departmentDefault: "RADIOLOGY UNIT", version: "01", issueDate: "2025" },

  // 6. Pediatrics & Infant Health
  { id: "pediatric-emergency", code: "BHG-BZ-FR-NUR-045", titleAr: "صندوق الطوارئ والإسعاف للأطفال والجرعات", titleEn: "Pediatric Emergency Box supplies checklist", departmentDefault: "PEDIATRIC WARD", version: "01", issueDate: "01.2026" },
  { id: "ped-vaccination-log", code: "BHG-FR-PED-301", titleAr: "سجل لقاحات وتطعيمات الأطفال والرضع بالأقسام", titleEn: "Pediatric Immunization & Cold Chain Vaccine Log", departmentDefault: "PEDIATRIC WARD", version: "01", issueDate: "2025" },
  { id: "ped-canulas-splint", code: "BHG-FR-PED-302", titleAr: "جرد كانيولات وجبائر وأجهزة الأطفال المخصصة", titleEn: "Neonatal & Pediatric Cannulas & Splint Checklist", departmentDefault: "PEDIATRIC WARD", version: "01", issueDate: "2025" },
  { id: "ped-nutrition-milk", code: "BHG-FR-PED-303", titleAr: "مخزون حليب الأطفال ومكونات التغذية السريرية", titleEn: "Therapeutic Pediatric Infant Milk & Formula Stock", departmentDefault: "PEDIATRIC WARD", version: "01", issueDate: "2025" },

  // 7. Pharmacy & Narcotics
  { id: "pharmacy-medicines-inventory", code: "BHG-FR-PHA-Inventory", titleAr: "جرد الأدوية والمخزون الدوائي ومقارنة المخزن الرئيسي", titleEn: "Pharmacy Medicines & High-Alert Stock Inventory", departmentDefault: "PHARMACY DEPT", version: "01", issueDate: "2026" },
  { id: "temp-humidity-log", code: "BHG-BZ-FR-ENG-001/002", titleAr: "سجل درجات الحرارة والرطوبة للغرفة والثلاجة", titleEn: "Room & Refrigerator Temperature & Humidity Daily Log", departmentDefault: "PHARMACY STORE", version: "01", issueDate: "05.2025" },
  { id: "pha-narcotics-registry", code: "BHG-FR-PHA-401", titleAr: "سجل وحساب عهدة الأدوية المخدرة والخاضعة للمراقبة", titleEn: "Controlled Narcotics & Psychotropics Ledger Balance", departmentDefault: "PHARMACY DEPT", version: "01", issueDate: "2025" },
  { id: "linens-closet", code: "BHG-BZ-FR-NUR-036", titleAr: "جرد مخزن المفروشات والمستلزمات - Linens Closet", titleEn: "Linens & Furnishings Store Checklist", departmentDefault: "LINENS CLOSET", version: "01", issueDate: "12.2025" },

  // 8. Quality Control & Hospital Cleanliness
  { id: "code-blue-log", code: "BHG-BZ-FR-NUR-005", titleAr: "دفتر قيد نداءات الكود الأزرق - Code Blue Logs", titleEn: "Code Blue Responders & Operator Logbook", departmentDefault: "ICU / TELEMETRY", version: "01", issueDate: "07.2025" },
  { id: "nursing-safety-huddle", code: "BHG-FR-NUR-027-Huddle", titleAr: "اجتماع السلامة التمريضي اليومي - Safety Huddle", titleEn: "Daily Nursing Safety Huddle Checklist", departmentDefault: "NURSING DEPT", version: "01", issueDate: "01.2024" },
  { id: "crash-cart", code: "BHG-BZ-FR-PHA-032", titleAr: "قائمة فحص وجرد عربة الطوارئ - Crash Cart Checklist", titleEn: "Emergency Crash Cart Checklist & Drawer Supplies", departmentDefault: "EMERGENCY UNIT", version: "01", issueDate: "05.2025" },
  { id: "quality-falls-prevention", code: "BHG-FR-QLTY-501", titleAr: "قائمة مراقبة السلامة البيئية لمنع سقوط المرضى", titleEn: "Environmental Falls Prevention Compliance Round", departmentDefault: "QUALITY CONTROL", version: "01", issueDate: "2025" }
];

// List of realistic department settings to expand up to 200 sheets flawlessly
const DEPARTMENT_POOL = [
  { dept: "EMERGENCY UNIT", prefix: "ER", nameAr: "قسم الطوارئ السريع", nameEn: "Emergency Command Unit" },
  { dept: "INTENSIVE CARE", prefix: "ICU", nameAr: "الرعاية الحرجة المركزة", nameEn: "Intensive Care Unit" },
  { dept: "OPERATING ROOM", prefix: "OR", nameAr: "مجمع العمليات الجراحية المعقم", nameEn: "Operating Room Surgical Department" },
  { dept: "CHEMOTHERAPY DAYCARE", prefix: "CHEMO", nameAr: "وحدة العلاج الكيماوي اليومي", nameEn: "Chemotherapy Daycare Center" },
  { dept: "RADIOLOGY UNIT", prefix: "RAD", nameAr: "الأشعة التداخلية والتشخيصية", nameEn: "Radiology & Breast Intervention" },
  { dept: "PHARMACY STORE", prefix: "PHA", nameAr: "الصيدلية الإكلينيكية والعهدة", nameEn: "Clinical Pharmacy & Narcotics Depot" },
  { dept: "PEDIATRIC WARD", prefix: "PED", nameAr: "جناح تخصصي وسريري للأطفال", nameEn: "Specialized Pediatric Ward" },
  { dept: "QUALITY CONTROL", prefix: "QLTY", nameAr: "قسم مراقبة الجودة الطبية وسلامة المرضى", nameEn: "Medical Quality Control Department" },
  { dept: "LABORATORY DEPT", prefix: "LAB", nameAr: "مختبر ومعمل باثولوجيا الأنسجة", nameEn: "Histopathology Medical Lab" },
  { dept: "INFECTION CONTROL", prefix: "INF", nameAr: "مكتب إدارة مكافحة العدوى والوقاية", nameEn: "Infection Control and Prevention" },
  { dept: "CLINICAL NUTRITION", prefix: "NUTR", nameAr: "قسم التغذية الإكلينيكية والعلاجية", nameEn: "Clinical Nutrition & Dietetics" },
  { dept: "INPATIENT FLOORS", prefix: "INP", nameAr: "رعاية الإقامة والأسرة الداخلية", nameEn: "Inpatient Rooms & Wards" },
  { dept: "OUTPATIENT CLINICS", prefix: "OUT", nameAr: "العيادات الخارجية والاستشارات بهية", nameEn: "Outpatient Consulting Clinics" },
  { dept: "BIOMEDICAL ENGINEERING", prefix: "BIOMED", nameAr: "الصيانة الطبية والهندسة الحيوية", nameEn: "Biomedical Equipment Engineering" },
  { dept: "DENTAL CLINIC", prefix: "DNTL", nameAr: "عيادة وصحة الفم والأسنان المعتمدة", nameEn: "Dentistry & Oral Oncology Clinic" },
  { dept: "ONCOLOGY RESEARCH", prefix: "RSRCH", nameAr: "مركز الأبحاث والتجارب الإكلينيكية للثدي", nameEn: "Breast Cancer Advanced Research Center" }
];

const CHECKLIST_TYPES = [
  { ar: "جرد وتدقيق لوازم مستودع", en: "Supplies & Inventory Audit Checklist of" },
  { ar: "فحص جاهزية وعمر بطارية أجهزة", en: "Device Readiness & Battery Inspection of" },
  { ar: "سجل متابعة وتعقيم غرف مراقبة", en: "Sterilization & Disinfection Checklist for" },
  { ar: "كشف درجات حرارة ورطوبة غرف", en: "Environmental Temperature & Humidity Monitor of" },
  { ar: "قائمة تسليم وتسلم نوبتجيات القسم لـ", en: "Shift Handover and Nursing Hand-off Registry of" },
  { ar: "بيانات فحص كواشف وتحاليل مستهلكات", en: "Chemical Reagents & Laboratory Consumables in" },
  { ar: "نموذج موافقة المريض المستنيرة المعتمد لـ", en: "Patient Informed Consent & Compliance round of" },
  { ar: "سجل تدقيق الأدوية والعهدة عالي الخطورة بـ", en: "High-Alert Drugs Monthly Audit Balance in" }
];

const SUB_AREAS = [
  { ar: "جناح أ - الطابق الأول الغرفة 102", en: "Wing A - 1st Floor Room 102" },
  { ar: "الكبائن المعقمة وأجهزة الحفظ المغناطيسية", en: "Sterile Hoods & Protected Magnetic Refrigerators" },
  { ar: "صيدلية التوزيع والخلط والتحضير الفوري", en: "Compounding & Admixture Clinical Pharmacy" },
  { ar: "الممرات الفرعية وغرف الإقامة الجانبية", en: "Side Passageway & General Patient Suites" },
  { ar: "غرف الجراحة الدقيقة والمناظير الفنية", en: "Precision Endoscopy & Trauma Surgery Suite" },
  { ar: "جناح جراحة الأورام والترميم التجميلي", en: "Oncoplastic Surgery & Breast Reconstruction Wing" },
  { ar: "المخازن الطبية الرئيسية لمراقبة الأمان", en: "Main Medical Safety Supply stores" },
  { ar: "منطقة سحب وحفظ ومعالجة عينات المريض", en: "Patient Venipuncture & Sample Processing Area" },
  { ar: "منطقة الفرز السريع للحالات المستعجلة", en: "Rapid Assessment & Triage Station" },
  { ar: "أجهزة الموجات الصوتية لعينات الخزعات", en: "Ultrasound-guided biopsy systems" },
  { ar: "مكتب الإرشاد والمساندة النفسية للمحاربات", en: "Patient Advocacy & Psychosocial counseling corner" },
  { ar: "نظام التعقيم بالبخار تحت ضغط الأوتوكلاف", en: "Steam Autoclave Sterilizer Systems CSSD" },
  { ar: "أجهزة الصدمات ومضخات الحقن الحيوية", en: "Active Defibrillators & Syringe Infusion Pumps" }
];

// Procedural dynamic factory that expands templates up to exactly 200 sheets
const generateAllTemplates = (): FormTemplate[] => {
  const resultList = [...STATIC_TEMPLATES];
  
  let currentNum = resultList.length + 1;
  let deptIdx = 0;
  let typeIdx = 0;
  let areaIdx = 0;

  while (resultList.length < 200) {
    const dept = DEPARTMENT_POOL[deptIdx % DEPARTMENT_POOL.length];
    const type = CHECKLIST_TYPES[typeIdx % CHECKLIST_TYPES.length];
    const area = SUB_AREAS[areaIdx % SUB_AREAS.length];

    const codeNum = String(currentNum).padStart(3, "0");
    const id = `dynamic-${dept.prefix.toLowerCase()}-${codeNum}`;
    const code = `BHG-FR-${dept.prefix}-${codeNum}`;
    const titleAr = `${type.ar} ${area.ar} (${dept.nameAr})`;
    const titleEn = `${type.en} ${area.en} [${dept.nameEn}]`;

    resultList.push({
      id,
      code,
      titleAr,
      titleEn,
      departmentDefault: dept.dept,
      version: "01",
      issueDate: "2026",
    });

    currentNum++;
    deptIdx++;
    typeIdx = (typeIdx + 3) % CHECKLIST_TYPES.length; // stagger nicely to vary combinations
    areaIdx = (areaIdx + 5) % SUB_AREAS.length;
  }

  return resultList;
};

export const FORM_TEMPLATES = generateAllTemplates();

// Specific high fidelity clinical items definition
export const DEFAULT_ITEMS: Record<string, Omit<GridRow, "days">[]> = {
  "daily-nursing": [
    { sn: "1", code: "G01", itemAr: "علبة جوانتي مقاسات مختلفة", itemEn: "Gloves Box (Various Sizes)", unit: "BOX", qty: "1" },
    { sn: "2", code: "G02", itemAr: "علبة باند ايد مستديرة", itemEn: "Round Band-Aid Box", unit: "BOX", qty: "1" },
    { sn: "3", code: "G03", itemAr: "علبة مسحة كحولية", itemEn: "Alcohol Swab Box", unit: "BOX", qty: "1" },
    { sn: "4", code: "G04", itemAr: "مفرش سرير رول", itemEn: "Bed sheet roll", unit: "ROLL", qty: "1" },
    { sn: "5", code: "G05", itemAr: "ملاية سرير", itemEn: "Bed sheets", unit: "BOX", qty: "5" },
    { sn: "6", code: "S01", itemAr: "سرنجه 1سم", itemEn: "Syringe 1cc", unit: "PCS", qty: "5" },
    { sn: "7", code: "S03", itemAr: "سرنجه 3سم", itemEn: "Syringe 3cc", unit: "PCS", qty: "5" },
    { sn: "8", code: "S05", itemAr: "سرنجه 5سم", itemEn: "Syringe 5cc", unit: "PCS", qty: "5" }
  ],
  "supplies-surgical": [
    { sn: "1", code: "T01", itemAr: "خيط حرير 0 (Silk)", itemEn: "Silk suturing thread 0", unit: "PCS", qty: "5" },
    { sn: "2", code: "T02", itemAr: "خيط فكريل 3.0 / 2.0 (Vicryl)", itemEn: "Vicryl suture 3.0 / 2.0", unit: "PCS", qty: "5" },
    { sn: "3", code: "T03", itemAr: "خيط برولين 3.0 / 2.0 (Prolene)", itemEn: "Prolene suture 3.0 / 2.0", unit: "PCS", qty: "5" },
    { sn: "4", code: "T04", itemAr: "خيط مونوكريل 3.0 (Monocryl)", itemEn: "Monocryl suture 3.0 / 2.0", unit: "PCS", qty: "5" },
    { sn: "5", code: "I01", itemAr: "مشرط معقم (Surgical Blade)", itemEn: "Surgical Scalpel Blade", unit: "PCS", qty: "2" },
    { sn: "6", code: "I02", itemAr: "جوانتي معقم مقاسات", itemEn: "Sterile surgical gloves (various sizes)", unit: "BOX", qty: "5" }
  ],
  "er-medication": [
    { sn: "1", code: "HA-ADR", itemAr: "أدرينالين أمبول Adrenaline (High Alert)", itemEn: "Adrenaline 1mg/ml ampule", unit: "AMP", qty: "10" },
    { sn: "2", code: "HA-NTG", itemAr: "نيتروجليسرين فيال Nitroglycerin (High Alert)", itemEn: "Nitroglycerin Injection vial", unit: "VIAL", qty: "3" },
    { sn: "3", code: "HA-MGS", itemAr: "ماغنيسيوم سلفات 2.5 جم / 25 مل (High Alert)", itemEn: "Magnesium Sulphate 2.5g/25ml ampule", unit: "AMP", qty: "10" },
    { sn: "4", code: "HA-PHT", itemAr: "فينيتوين أمبول Phenytoin (High Alert)", itemEn: "Phenytoin 250mg ampule", unit: "AMP", qty: "10" },
    { sn: "5", code: "HA-NAD", itemAr: "نورأدرينالين 8 ملجم (High Alert)", itemEn: "Noradrenaline (Levophrine) 8mg ampule", unit: "AMP", qty: "10" },
    { sn: "6", code: "HA-HEP", itemAr: "هيبارين أمبول / فيال (High Alert)", itemEn: "Heparin Sodium Injection", unit: "VIAL", qty: "5" }
  ],
  "icu-supplies-services": [
    { sn: "1", code: "100490", itemAr: "أنبوبة رايل FR10 سوداء (Ryle)", itemEn: "Ryle's Tube FR10 black", unit: "PCS", qty: "1" },
    { sn: "2", code: "100491", itemAr: "أنبوبة رايل FR12 بيضاء", itemEn: "Ryle's Tube FR12 white", unit: "PCS", qty: "1" },
    { sn: "3", code: "100474", itemAr: "أنبوبة رايل FR14 خضراء", itemEn: "Ryle's Tube FR14 green", unit: "PCS", qty: "1" },
    { sn: "4", code: "100488", itemAr: "أنبوبة رايل FR16 برتقالي", itemEn: "Ryle's Tube FR16 orange", unit: "PCS", qty: "1" },
    { sn: "5", code: "300233", itemAr: "قسطرة فولي ثنائية مقاس 16 (Foley)", itemEn: "Foley's Catheter 2 way FR16", unit: "PCS", qty: "1" }
  ],
  "crash-cart": [
    { sn: "1", code: "DRW1-ADR", itemAr: "أدرينالين أمبول (Adrenaline 1mg)", itemEn: "[Drawer 1] Adrenaline (1 mg/ml)", unit: "AMP", qty: "20" },
    { sn: "2", code: "DRW1-ATR", itemAr: "أتروبين أمبول (Atropine 1mg)", itemEn: "[Drawer 1] Atropine sulphate (1 mg/ml)", unit: "AMP", qty: "2" },
    { sn: "3", code: "DRW1-AMD", itemAr: "اميودارون أمبول (Amiodarone 150mg)", itemEn: "[Drawer 1] Amiodarone (150 mg/3ml)", unit: "AMP", qty: "2" },
    { sn: "4", code: "DRW1-CAL", itemAr: "جلوكونات الكالسيوم 10%", itemEn: "[Drawer 1] Calcium Gluconate ( 10% )", unit: "AMP", qty: "2" },
    { sn: "5", code: "DRW1-BIC", itemAr: "بيكربونات الصوديوم 8.4%", itemEn: "[Drawer 1] Sodium Bicarb (8.4% 50 ml)", unit: "VIAL", qty: "5" }
  ],
  "temp-humidity-log": [
    { sn: "1", code: "ENG-TREF", itemAr: "درجة حرارة الثلاجة الطبية (المستهدف: 2 - 8 مئوية)", itemEn: "Refrigerator Temp (Target: 2 - 8 °C)", unit: "°C", qty: "1" },
    { sn: "2", code: "ENG-TROM", itemAr: "درجة حرارة الغرفة (المستهدف: 16 - 25 مئوية)", itemEn: "Room Temp (Target: 16 - 25 °C)", unit: "°C", qty: "1" },
    { sn: "3", code: "ENG-HROM", itemAr: "نسبة رطوبة الغرفة (المستهدف: 30% - 60%)", itemEn: "Room Humidity (Target: 30% - 60%)", unit: "%", qty: "1" }
  ],
  "code-blue-log": [
    { sn: "1", code: "CBL-INI", itemAr: "وقت انطلاق نداء الكود الأزرق التمريضي", itemEn: "Time of Code Blue Initiation (AM/PM)", unit: "TIME", qty: "1" },
    { sn: "2", code: "CBL-LOC", itemAr: "موقع الحالة ورقم الغرفة / السرير", itemEn: "Location (Room No.)", unit: "TEXT", qty: "1" },
    { sn: "3", code: "CBL-TYP", itemAr: "نوع الرمز الأزرق (كبار / أطفال)", itemEn: "Type of Code (Adult / Pediatric)", unit: "SELECT", qty: "1" },
    { sn: "4", code: "CBL-RPT", itemAr: "الممرض أو الشخص المبلغ عن الحالة", itemEn: "Reporting Person Details", unit: "TEXT", qty: "1" }
  ],
  "ambulance-request": [
    { sn: "1", code: "AMB-TRN", itemAr: "أ) حالة بسيطة (نقل مريض فقط)", itemEn: "a) Simple condition, just transport", unit: "PARAM", qty: "1" },
    { sn: "2", code: "AMB-NUR", itemAr: "ب) حالة متوسطة (مرافقة ممرض)", itemEn: "b) Average condition, nurse accompany", unit: "PARAM", qty: "1" },
    { sn: "3", code: "AMB-PHY", itemAr: "ج) حالة حرجة خطيرة (مرافقة طبيب وممرض)", itemEn: "c) Critical condition, physician & nurse accompany", unit: "PARAM", qty: "1" }
  ],
  "nursing-safety-huddle": [
    { sn: "1", code: "HUD-HCD", itemAr: "كود الطوارئ لسلامة المستشفى", itemEn: "Hospital medical emergency code", unit: "HUDDLE", qty: "1" },
    { sn: "2", code: "HUD-PSC", itemAr: "مخاوف وملاحظات سلامة المرضى الفعلية", itemEn: "Patient Safety Concerns & risks", unit: "HUDDLE", qty: "1" },
    { sn: "3", code: "HUD-RSC", itemAr: "كفاية القوى التمريضية والموارد الطبية", itemEn: "Staffing level, materials & resources", unit: "HUDDLE", qty: "1" },
    { sn: "4", code: "HUD-MSA", itemAr: "سلامة الدواء وأمبولات التركيز عالي الخطورة", itemEn: "Medication Drug Safety checks", unit: "HUDDLE", qty: "1" }
  ],
  "change-dressing-surgery": [
    { sn: "1", code: "DRS-GZ", itemAr: "شاش معقم مقاس 7.5x7.5 سم", itemEn: "Sterile gauze packets 7.5x7.5", unit: "PACKET", qty: "3" },
    { sn: "2", code: "DRS-GL75", itemAr: "جوانتي جراحي معقم مقاس 7.5", itemEn: "Sterile gloves size 7.5", unit: "PCS", qty: "1" },
    { sn: "3", code: "DRS-LTX", itemAr: "جوانتي فحص لاتكس غير معقم", itemEn: "Latex exam gloves", unit: "BOX", qty: "2" },
    { sn: "4", code: "DRS-TOW", itemAr: "فوطة معقمة للفرش الجراحي", itemEn: "Sterile towel sheets", unit: "PCS", qty: "1" }
  ],
  "medical-supplies-chemo": [
    { sn: "1", code: "CHM-GZ", itemAr: "شاش معقم مقاس 7.5x7.5 سم", itemEn: "Sterile gauze 7.5x7.5", unit: "PCS", qty: "1" },
    { sn: "2", code: "CHM-IFS", itemAr: "جهاز إعطاء محاليل وريدية قياسي", itemEn: "Infusion Set for chemotherapy", unit: "PCS", qty: "1" },
    { sn: "3", code: "CHM-CNG", itemAr: "كانيولا طبية مقاس G22 / G24", itemEn: "Cannula size G22 / G24", unit: "PCS", qty: "1" },
    { sn: "4", code: "CHM-PRT", itemAr: "إبرة سن بورتكاس لتوصيل العلاج", itemEn: "Port-a-cath needle set", unit: "PCS", qty: "1" }
  ],
  "radiology-consumables": [
    { sn: "1", code: "RAD-GZ", itemAr: "شاش معقم عالي الجودة 7.5x7.5", itemEn: "Sterile gauze radiology 7.5x7.5", unit: "PCS", qty: "5" },
    { sn: "2", code: "RAD-GNL", itemAr: "إبرة غان نيدل للعينات 10x14 سم", itemEn: "Gun Needle biopsie 10x14 cm", unit: "PCS", qty: "1" },
    { sn: "3", code: "RAD-EXT", itemAr: "وصلة وريدية عادية طويلة 150 سم", itemEn: "Extension Set Venous 150cm", unit: "PCS", qty: "1" },
    { sn: "4", code: "RAD-BLD", itemAr: "مشرط جراحي معقم مقاس 11", itemEn: "Surgical scalpel blade size 11", unit: "PCS", qty: "1" }
  ],
  "room-checklist": [
    { sn: "1", code: "RM-CNL", itemAr: "كانيولات فحص منوعة (G18 / G20 / G22)", itemEn: "Patient Cannulas sizes 18/20/22", unit: "PCS", qty: "5" },
    { sn: "2", code: "RM-FIX", itemAr: "شريط لاصق طبي لتثبيت الكانيولات", itemEn: "Cannula fixation tape", unit: "PCS", qty: "10" },
    { sn: "3", code: "RM-THR", itemAr: "ميزان حرارة للفحص المباشر", itemEn: "Clinical Thermometer", unit: "PCS", qty: "1" },
    { sn: "4", code: "RM-STH", itemAr: "سماعة صدر طبية لمرضى الطوارئ", itemEn: "Stethoscope for bedside evaluation", unit: "PCS", qty: "1" }
  ],
  "pre-post-operative": [
    { sn: "1", code: "OP-GLV", itemAr: "علب جوانتي نيتريل فحص للممرضة", itemEn: "Examination nitrile gloves", unit: "BOX", qty: "2" },
    { sn: "2", code: "OP-PLS", itemAr: "بكرة بلاستر قماش عريض ومطاطي", itemEn: "Surgical plaster adhesive roll", unit: "PCS", qty: "1" },
    { sn: "3", code: "OP-SCT", itemAr: "خراطيم تشفيط سيليكون حجم كبير", itemEn: "Suction catheter & silicon hoses", unit: "PCS", qty: "4" }
  ],
  "operating-instrument-sets": [
    { sn: "1", code: "INS-MJP", itemAr: "طاقم جراحي كبير ماركة باكستان", itemEn: "Major surgical set (Pakistan steel)", unit: "SET", qty: "1" },
    { sn: "2", code: "INS-MJA", itemAr: "طاقم جراحي كبير ماركة ايسكولاب دقة", itemEn: "Major surgical set (Aesculap precision)", unit: "SET", qty: "1" },
    { sn: "3", code: "INS-MNP", itemAr: "طاقم جراحي صغير ماركة باكستان رعاية", itemEn: "Minor surgical set (Pakistan steel)", unit: "SET", qty: "1" }
  ],
  "separet-checklist": [
    { sn: "1", code: "SEP-LTN", itemAr: "جفنة معدنية غيار لوشن بول لغسيل", itemEn: "Lotion bowel stainless steel", unit: "PCS", qty: "30" },
    { sn: "2", code: "SEP-KID", itemAr: "كوب كلية معدني جفنة كيدني الصغير", itemEn: "Kidney basin small hospital grade", unit: "PCS", qty: "30" },
    { sn: "3", code: "SEP-SPG", itemAr: "جفت مساك شاش جراحي إسفنجي", itemEn: "Sponge holding clamps forceps", unit: "PCS", qty: "2" }
  ],
  "linens-closet": [
    { sn: "1", code: "LIN-BLN", itemAr: "لحاف فايبر سميك رعاية المرضى داخلي", itemEn: "Hospital grade warm comforter blanket", unit: "PCS", qty: "9" },
    { sn: "2", code: "LIN-WOL", itemAr: "بطانية صوفية ثقيلة رعاية لغرف", itemEn: "Woolen heavy orange blanket", unit: "PCS", qty: "12" },
    { sn: "3", code: "LIN-PLW", itemAr: "مخدة طبية حشو فايبر مريح الغرف", itemEn: "Comfort sleeping bed pillow standard", unit: "PCS", qty: "10" }
  ],
  "pediatric-emergency": [
    { sn: "1", code: "PED-LRY", itemAr: "منظار حنجرة للأطفال حديثي الولادة", itemEn: "Pediatric dedicated laryngoscope handle", unit: "PCS", qty: "1" },
    { sn: "2", code: "PED-ET25", itemAr: "أنبوب رغامي حنجري للأطفال مقاس 2.5", itemEn: "Pediatric endotracheal tube size 2.5", unit: "PCS", qty: "1" },
    { sn: "3", code: "PED-ET35", itemAr: "أنبوب رغامي حنجري للأطفال مقاس 3.5", itemEn: "Pediatric endotracheal tube size 3.5", unit: "PCS", qty: "1" }
  ],
  "emergency-custody-monthly": [
    { sn: "1", code: "CST-MON", itemAr: "شاشة رصد العلامات الحيوية كاملة كومون", itemEn: "COMMON Multi-parameter Vital signs monitor", unit: "CUSTODY", qty: "1" },
    { sn: "2", code: "CST-SPO", itemAr: "كابل استشعار نسبة الأكسجين بالدم SPO2", itemEn: "SPO2 saturation sensor connector cable", unit: "CUSTODY", qty: "1" },
    { sn: "3", code: "CST-ECG", itemAr: "كابل أقطاب رسم القلب الكهربائي ECG كامله", itemEn: "ECG diagnostic testing leadwire cables", unit: "CUSTODY", qty: "1" }
  ],
  "pharmacy-medicines-inventory": [
    { sn: "1", code: "INV-CGL", itemAr: "كالسيوم جلوكونات CALCIUM GLUCONATE SUNNY", itemEn: "CALCIUM GLUCONATE I.V. 50 AMP", unit: "AMPOULE", qty: "4" },
    { sn: "2", code: "INV-MGS", itemAr: "كبريتات المغنيسيوم MAGNESIUM SULFATE EIPICO", itemEn: "MAGNESIUM SULFATE 10% 50 I.V AMPS", unit: "BOX", qty: "8" },
    { sn: "3", code: "INV-PHT", itemAr: "فينيتوين PHENYTIN 250MG/5ML AMPULE", itemEn: "PHENYTIN 250MG/5ML 10 AMPS", unit: "BOX", qty: "1" }
  ]
};

// Auto-populate helper with generic lists for all other templates dynamically to keep the bundle size small and responsive!
const genericItemsTemplate: Omit<GridRow, "days">[] = [
  { sn: "1", code: "GEN-01", itemAr: "شاش طبي وغيار الجروح الأساسي", itemEn: "Standard absorbent medical gauze", unit: "PACKET", qty: "10" },
  { sn: "2", code: "GEN-02", itemAr: "جوانتي طبي للفحص معقم ومحفوظ", itemEn: "Non-sterile latex exam gloves", unit: "BOX", qty: "2" },
  { sn: "3", code: "GEN-03", itemAr: "كانيولا فحص قياسية بالأجنحة", itemEn: "Intravenous standard Cannula size G20", unit: "PCS", qty: "5" },
  { sn: "4", code: "GEN-04", itemAr: "بلاستر جروح قماش عريض قوي للتثبيت", itemEn: "High-adhesion surgical plaster roll", unit: "PCS", qty: "1" },
  { sn: "5", code: "GEN-05", itemAr: "محلول ملح طعام غسيل معقم 0.9٪", itemEn: "Physiological Normal Saline 500ml", unit: "BOTTLE", qty: "2" },
  { sn: "6", code: "GEN-06", itemAr: "سرنجات حقن فحص تمريضي مقاس 5 سم", itemEn: "Standard single-use syringe 5cc", unit: "PCS", qty: "20" }
];

// Rich clinical suggestion generator for dynamic templates!
export const getItemsForTemplate = (templateId: string, template: FormTemplate): Omit<GridRow, "days">[] => {
  if (template && template.items && template.items.length > 0) {
    return template.items;
  }

  if (DEFAULT_ITEMS[templateId]) {
    return DEFAULT_ITEMS[templateId];
  }

  // Determine prefix
  const codeParts = template.code.split("-");
  const prefix = codeParts[2] || "GEN";

  const itemSuggestionsList: Record<string, { ar: string, en: string, unit: string, qty: string }[]> = {
    "ER": [
      { ar: "أدرينالين أمبول Adrenaline 1mg", en: "Adrenaline 1mg Ampule", unit: "AMP", qty: "10" },
      { ar: "أتروبين أمبول Atropine 1mg", en: "Atropine 1mg Ampule", unit: "AMP", qty: "5" },
      { ar: "أكياس وريدية صوديوم كلورايد 0.9٪", en: "Sodium Chloride saline 0.9% 500ml", unit: "BOTTLE", qty: "15" },
      { ar: "سرنجات بلاستيكية معقمة 5 سم لجرد الطوارئ", en: "Disposable syringes 5cc sterile", unit: "PCS", qty: "100" },
      { ar: "كانيولات طبية مخصصة مقاس G20 وردي", en: "Pink Cannulas G20 clinical-grade", unit: "PCS", qty: "30" },
      { ar: "شريط لاصق طبي ومضاد للحساسية تثبيت", en: "Hypoallergenic paper tape rolls", unit: "ROLL", qty: "5" }
    ],
    "ICU": [
      { ar: "أنابيب شفط الهواء التنفسي الرغامي مقاس 7.5", en: "Endotracheal tube sterile size 7.5", unit: "PCS", qty: "5" },
      { ar: "وصلة مروي غازات الدم الشرياني المحمول رعاية", en: "Arterial blood gas sampling syringe set", unit: "PCS", qty: "15" },
      { ar: "أقطاب رسم واختبار نبضات القلب ECG معايير", en: "ECG disposable diagnostic electrodes pads", unit: "PCS", qty: "100" },
      { ar: "جهاز محاليل وريدي قياسي ذو منقي دقيق", en: "Standard IV administration set with microfilter", unit: "PCS", qty: "20" },
      { ar: "جرعة إنيكسوبارين 40 وحدة وقائي جلطة", en: "Enoxaparin 40mg prefilled safety syringe", unit: "PCS", qty: "10" }
    ],
    "OR": [
      { ar: "مشرط جراحي حاد معقم مقاس 15 دقة العمليات", en: "Surgical scalpel blades size 15 precision", unit: "PCS", qty: "20" },
      { ar: "خيط جراحي فكريل 3.0 مخروطي الإبرة معقم", en: "Vicryl 3-0 polyglactin suturing thread", unit: "PCS", qty: "12" },
      { ar: "شاش جراحي معقم كبيير لتنظيف الدم والمواد", en: "Sterile abdominal cotton swabs laparotomy sponge", unit: "PACK", qty: "50" },
      { ar: "محلول بوفيدون أودين لتطهير العمليات 10٪ غيار", en: "Povidone-Iodine antiseptic scrub solution 10%", unit: "CAN", qty: "2" },
      { ar: "ملاءات وفرش جراحي معقم للحقل المعقم عالي", en: "Disposable sterile surgical drapes pack", unit: "PACK", qty: "5" }
    ],
    "CHEMO": [
      { ar: "إبر بورتكاس لتلقي الجلسات مقاس G20 وريدي", en: "Port-a-cath clinical needles G20 with tubing", unit: "PCS", qty: "15" },
      { ar: "حقيبة معالجة انسكابات الأدوية الكيماوية الجودة", en: "Chemotherapy cytotoxic spill containment kit", unit: "KIT", qty: "2" },
      { ar: "وصلات محاليل مانعة للضوء ومحمية للأورام", en: "Light-protected amber IV tubing sets", unit: "PCS", qty: "20" },
      { ar: "محلول رينجر لاكتات لتغذية الكيماوي 500 مل", en: "Ringer's Lactate infusion flask 500ml", unit: "BOTTLE", qty: "10" },
      { ar: "جوانتي كيميائي مخصص سميك حماية ممرضة", en: "Chemo-approved nitrile protective gloves", unit: "BOX", qty: "2" }
    ],
    "RAD": [
      { ar: "إبر أخذ العينات الأوتوماتيكية مقاس 14G ثدي", en: "Core biopsy coaxial needles 14G thickness", unit: "PCS", qty: "3" },
      { ar: "صبغة ذائبة للأشعة المقطعية التباينية ملون", en: "Low-osmolar iodinated contrast media 100ml", unit: "VIAL", qty: "10" },
      { ar: "مستلزمات جل مسبار الموجات فوق الصوتية فحص", en: "Acoustic ultrasound coupling gel squirt bottles", unit: "PCS", qty: "5" },
      { ar: "ملاءات تغطية حقل الأشعة التداخلية معقم", en: "Sterile drape wraps with fenestrations", unit: "PACK", qty: "8" }
    ],
    "PHA": [
      { ar: "زجاجات كحول معقم 70% سعة 1 لتر تحضير", en: "Isopropyl alcohol antiseptic rub 70% 1L", unit: "BOTTLE", qty: "12" },
      { ar: "خزنة حديدية من الفولاذ لحفظ المخدرات سرية", en: "Secure double-lock narcotics vault key", unit: "UNIT", qty: "1" },
      { ar: "سجل قيد الأدوية المخدرة والعهدة الرسمية دولة", en: "Official state controlled medicines ledger", unit: "PCS", qty: "1" },
      { ar: "لصقات تحذيرية حمراء للأدوية الخطرة جودة", en: "Red high-alert medication warning labeling", unit: "ROLL", qty: "3" }
    ],
    "INF": [
      { ar: "كمامات جراحية ثلاثية الطبقات عالية الفلترة واق", en: "3-ply medical surgical earloop masks", unit: "BOX", qty: "15" },
      { ar: "مطهر اليدين الكحولي ديتول جيل زجاجة غسيل", en: "Rubbing hand sanitizer gel dispenser flask", unit: "BOTTLE", qty: "10" },
      { ar: "واقي الوجه البلاستيكي المانع للرذاذ الشفاف درع", en: "Anti-fog protective full face shields", unit: "PCS", qty: "20" },
      { ar: "كمامات تنفس دقيقة واقية ترشيح N95 تنفس", en: "N95/FFP2 high-filtration particulate respirators", unit: "BOX", qty: "4" }
    ],
    "LAB": [
      { ar: "أنابيب سحب عينات الدم الجافة غطاء أحمر مصل", en: "Serum separator tubes red-top vacutainer", unit: "BOX", qty: "5" },
      { ar: "أنابيب سحب عينات تجلط الدم غطاء أزرق بلازما", en: "Sodium Citrate coagulation tubes blue-top", unit: "BOX", qty: "5" },
      { ar: "إبر سحب عينات الدم الفراشية المعقمة مقاس 23", en: "Safety blood collection butterfly needles 23G", unit: "PCS", qty: "150" },
      { ar: "كواشف كيميائية لتحاليل هرمونات الثدي باثولوجي", en: "Tumor marker CA15-3 diagnostic test reagents", unit: "KIT", qty: "1" }
    ],
    "QLTY": [
      { ar: "استبيانات قياس رضا المرضى بالعلاج استطلاع", en: "Bilingual Patient satisfaction questionnaire forms", unit: "PACKET", qty: "2" },
      { ar: "لاصقات شريط تعريف المريض المقاوم للماء كود", en: "Wristband patient id barcodes print sticker", unit: "ROLL", qty: "5" },
      { ar: "ملصقات تحذيرية صفراء لخطر الانزلاق والسقوط أرض", en: "Yellow caution wet floor warning banners", unit: "PCS", qty: "6" }
    ]
  };

  const list = itemSuggestionsList[prefix];
  if (!list) {
    return genericItemsTemplate;
  }

  return list.map((item, idx) => ({
    sn: (idx + 1).toString(),
    code: `${prefix}-${(idx + 1).toString().padStart(2, "0")}`,
    itemAr: item.ar,
    itemEn: item.en,
    unit: item.unit,
    qty: item.qty
  }));
};

// Generates an empty grid with 31 days or empty default values
export function createNewRecord(templateId: string, customTemplates: FormTemplate[] = []): Omit<SavedRecord, "id" | "createdAt"> {
  const allTemplates = [...FORM_TEMPLATES, ...customTemplates];
  const template = allTemplates.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Fallback to generic template items dynamically if specific one is not defined
  const defaultItems = getItemsForTemplate(templateId, template);
  const gridData: GridRow[] = defaultItems.map((item) => {
    // Generate empty days record for 1-31
    const days: Record<string, string> = {};
    for (let i = 1; i <= 31; i++) {
      days[i.toString()] = "";
    }
    return {
      ...item,
      days
    };
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dateStr = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  return {
    templateId,
    date: dateStr,
    time: timeStr,
    department: template.departmentDefault,
    staffName: "",
    staffId: "",
    notes: "",
    patientName: "",
    patientMRN: "",
    diagnosis: "",
    additionalInfo: templateId === "patient-discharge-ama" ? {
      signatureRefused: false,
      relation: "self", // self, son, daughter, relative
      witnessName: "",
      witnessSignatureAr: "",
      doctorRefusedText: "",
      complication1: "",
      complication2: "",
      complication3: "",
    } : {},
    gridData
  };
}
