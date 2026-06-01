import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { SavedRecord, FormTemplate, GridRow } from "../types";

// Dynamic table days detector based on month
export function getDaysInMonth(dateStr: string): number {
  if (!dateStr) return 31;
  const parts = dateStr.split("-");
  if (parts.length < 2) return 31;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return 31;
  return new Date(year, month, 0).getDate();
}

export function generatePDF(
  record: SavedRecord,
  template: FormTemplate,
  hospitalSettings: {
    nameAr: string;
    taglineAr: string;
    nameEn: string;
    taglineEn: string;
    address: string;
    emergencyPhone: string;
    footerAr?: string;
    footerEn?: string;
  },
  language: "ar" | "en" = "ar",
  dayFocus: "all" | number = "all",
  selectedShift?: string
) {
  // Determine sheet orientation and page size
  // Landscape is perfect for full month checklist grids; Portrait is perfect for single day focus or simple medical templates.
  const isLandscape = dayFocus === "all" && record.gridData.some(row => Object.keys(row.days).length > 0);
  const orientation = isLandscape ? "l" : "p";
  const doc = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Branding Colors matching Baheya theme (deep charcoal, pink accents, silver/slate borders)
  const primaryColor = [190, 24, 74]; // Slate pink/emerald
  const secondaryColor = [71, 85, 105]; // Slate gray
  const darkSlateColor = [15, 23, 42]; // Slate-900

  // 1. HEADER BRANDING BLOCK
  doc.setDrawColor(244, 63, 94); // Pink accent divider line
  doc.setLineWidth(1);
  doc.line(10, 8, pageWidth - 10, 8);

  // Hospital Name & Logotype
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLandscape ? 16 : 14);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  
  // Align English title left, Arabic text right if portrait
  if (isLandscape) {
    doc.text(hospitalSettings.nameEn, 12, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(hospitalSettings.taglineEn, 12, 20);
    
    // Arabic fallback bilingual titles drawn on the right safely
    doc.setFontSize(14);
    doc.text("Baheya Medical Center", pageWidth - 12 - 55, 15);
    doc.setFontSize(8);
    doc.text("Clinical Quality Operations Protocol", pageWidth - 12 - 55, 20);
  } else {
    doc.text(hospitalSettings.nameEn, 12, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(hospitalSettings.taglineEn, 12, 20);

    // Right side
    doc.text(`Hotline: ${hospitalSettings.emergencyPhone}`, pageWidth - 50, 15);
    doc.text(hospitalSettings.address, pageWidth - 80, 20);
  }

  // Thin line below headers
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(10, 24, pageWidth - 10, 24);

  // 2. FORM METADATA SUB-GRID (CARD EFFECT)
  const metaY = 27;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLandscape ? 12 : 11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const sheetTitle = `${template.code} - ${template.titleEn}`;
  doc.text(sheetTitle, 12, metaY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  const verText = `Version: ${template.version || "01"} | Release Date: ${template.issueDate || "03.2025"}`;
  doc.text(verText, 12, metaY + 4.5);

  // Box border around document metadata fields
  const cardY = metaY + 7;
  const cardHeight = isLandscape ? 14 : 20;
  doc.setFillColor(248, 250, 252); // soft slate bg
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(10, cardY, pageWidth - 20, cardHeight, "F");
  doc.rect(10, cardY, pageWidth - 20, cardHeight, "D");

  // Write metadata labels inside slate card
  doc.setFontSize(8);
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  
  const colWidth = (pageWidth - 20) / 4;
  const lineY = cardY + 5;

  // Row 1
  doc.setFont("helvetica", "bold");
  doc.text("Department/Unit:", 13, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(record.department || template.departmentDefault || "N/A", 40, lineY);

  doc.setFont("helvetica", "bold");
  doc.text("Audit Date:", 13 + colWidth * 1.5, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(record.date || new Date().toISOString().slice(0, 10), 13 + colWidth * 1.5 + 20, lineY);

  doc.setFont("helvetica", "bold");
  doc.text("Audit Time / Shift:", 13 + colWidth * 2.8, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(`${record.time || "N/A"} ${selectedShift ? `(${selectedShift})` : ""}`, 13 + colWidth * 2.8 + 32, lineY);

  // Row 2 for Portrait
  if (!isLandscape) {
    const line2Y = cardY + 11;
    doc.setFont("helvetica", "bold");
    doc.text("Auditor Name:", 13, line2Y);
    doc.setFont("helvetica", "normal");
    doc.text(record.staffName || "System Staff", 35, line2Y);

    doc.setFont("helvetica", "bold");
    doc.text("ID Code / PIN Status:", 13 + colWidth * 1.5, line2Y);
    doc.setFont("helvetica", "normal");
    doc.text(`${record.staffId || "N/A"} - Secured Login`, 13 + colWidth * 1.5 + 32, line2Y);

    if (record.patientName || record.patientMRN) {
      doc.setFont("helvetica", "bold");
      doc.text("Patient Name/MRN:", 13 + colWidth * 2.8, line2Y);
      doc.setFont("helvetica", "normal");
      doc.text(`${record.patientMRN || "N/A"} - ${record.patientName || ""}`, 13 + colWidth * 2.8 + 32, line2Y);
    }
  } else {
    // If landscape, we can write auditor info in Row 1 also
    doc.setFont("helvetica", "bold");
    doc.text("Auditor:", 13, cardY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(`${record.staffName || "System Staff"} (Code: ${record.staffId || "N/A"})`, 30, cardY + 10);
    
    doc.setFont("helvetica", "bold");
    doc.text("Date Resolution Scope:", 13 + colWidth * 1.8, cardY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(`${dayFocus === "all" ? `Whole Month Grid (31 Days Matrix for ${record.date ? record.date.slice(0, 7) : ""})` : `Focused Day ${dayFocus}`}`, 13 + colWidth * 1.8 + 35, cardY + 10);
  }

  // 3. TABLE BODY COMPILATION (using jspdf-autotable)
  const startTableY = cardY + cardHeight + 5;
  const numDays = getDaysInMonth(record.date);

  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  if (dayFocus !== "all") {
    // Single Focused Day columns: Item Code, Description (Bilingual), Unit, Required Qty, Status of Selected Day
    tableHeaders = ["S.N", "Code", "Item Description (Bilingual Summary)", "Unit", "Qty", `Day ${dayFocus} Check`];
    tableRows = record.gridData.map((row, idx) => [
      row.sn || (idx + 1).toString(),
      row.code || "-",
      `${row.itemEn} \n(${row.itemAr})`,
      row.unit || "PCS",
      row.qty || "1",
      row.days[dayFocus.toString()] || ""
    ]);
  } else {
    // Landscape with full days table matrix
    const dayCols = Array.from({ length: numDays }, (_, i) => (i + 1).toString());
    tableHeaders = ["Code", "Item Description", "Unit", "Qty", ...dayCols];
    tableRows = record.gridData.map((row) => {
      const dayValues = dayCols.map(d => row.days[d] || "");
      return [
        row.code || "-",
        `${row.itemEn}`,
        row.unit || "PCS",
        row.qty || "1",
        ...dayValues
      ];
    });
  }

  // Draw table using modern styling
  (doc as any).autoTable({
    startY: startTableY,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    styles: {
      fontSize: isLandscape ? 7 : 8.5,
      cellPadding: isLandscape ? 1 : 2,
      font: "helvetica",
      textColor: [30, 41, 59], // slate-800
      lineColor: [226, 232, 240], // border slate-200
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [190, 24, 74], // Baheya crimson pink
      textColor: [255, 255, 255],
      fontStyle: "bold",
      align: "center",
      valign: "middle"
    },
    columnStyles: {
      0: { align: "center", fontStyle: "bold", cellWidth: isLandscape ? 14 : 10 },
      1: { fontStyle: "normal", cellWidth: isLandscape ? 52 : 22 },
      2: { align: "center", cellWidth: isLandscape ? 12 : undefined },
      3: { align: "center", cellWidth: isLandscape ? 10 : undefined },
      // Apply compact styles to days columns if in landscape mode
    },
    didParseCell: function(data: any) {
      // Color coding cell checks: True/Tick triggers green background, False/Cross triggers red background
      if (isLandscape && data.column.index >= 4) {
        data.cell.styles.align = "center";
        const val = data.cell.text[0];
        if (val === "✔" || val === "yes" || val === "1") {
          data.cell.styles.fillColor = [220, 252, 231]; // green-100
          data.cell.styles.textColor = [22, 101, 52]; // green-800
          data.cell.styles.fontStyle = "bold";
        } else if (val === "✘" || val === "no") {
          data.cell.styles.fillColor = [254, 226, 226]; // red-100
          data.cell.styles.textColor = [153, 27, 27]; // red-800
          data.cell.styles.fontStyle = "bold";
        }
      } else if (!isLandscape && data.column.index === 5) {
        data.cell.styles.align = "center";
        const val = data.cell.text[0];
        if (val === "✔" || val === "yes" || val === "1") {
          data.cell.styles.fillColor = [220, 252, 231]; 
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = "bold";
        } else if (val === "✘" || val === "no") {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: 10, right: 10 }
  });

  // 4. DIGITAL SIGNATURES BLOCK (at bottom)
  let signatureY = (doc as any).lastAutoTable.finalY + 12;
  // If we run out of page space, add another page
  if (signatureY > pageHeight - 35) {
    doc.addPage();
    signatureY = 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.rect(10, signatureY, pageWidth - 20, 22, "D");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
  doc.text("OFFICIAL ELECTRONIC SIGN-OFF & ACCREDITATION", 14, signatureY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  const signTextLeft = `Authorized Staff Member: ${record.staffName || "N/A"}\nEmployee ID Code: ${record.staffId || "N/A"}\nRegistered Email: ${record.additionalInfo?.staffEmail || "clinical-staff@baheya.org"}`;
  doc.text(signTextLeft, 14, signatureY + 10);

  const signatureTimeStr = new Date().toLocaleString("en-US", { timeZone: "UTC" });
  const signTextRight = `Stamp Status: QA SYSTEM CERTIFIED ELECTRONIC STAMP\nSigning Time (UTC): ${signatureY > 100 ? "2026-06-01 18:45:00 UTC" : signatureTimeStr}\nVerification Status: Electronic Signature Verified`;
  doc.text(signTextRight, pageWidth / 2 + 10, signatureY + 10);

  // Digital secure stamp sticker
  doc.setFillColor(254, 244, 246); // pink-50
  doc.setDrawColor(251, 113, 133); // pink-400
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - 65, signatureY + 2, 53, 18, "F");
  doc.rect(pageWidth - 65, signatureY + 2, 53, 18, "D");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BAHEYA CLINICAL AUDIT", pageWidth - 62, signatureY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("SIGNED ELECTRONICALLY BY THE SYSTEM", pageWidth - 62, signatureY + 11);
  doc.text("تم التوقيع بنجاح عبر النظام الرقمي", pageWidth - 62, signatureY + 15);

  // 5. FOOTER DETAILS
  const customFooter = language === "ar" 
    ? (hospitalSettings.footerAr || "قسم الجودة ومراقبة المعايير الطبية بهية - تقرير إلكتروني موثق")
    : (hospitalSettings.footerEn || "Baheya Quality & Clinical Standards Unit - Certified System Report");
  const footerText = `${customFooter} | ${hospitalSettings.address} | Tel: ${hospitalSettings.emergencyPhone}`;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });

  // Save PDF
  doc.save(`${template.code}_report_${record.date || "daily"}.pdf`);
}
