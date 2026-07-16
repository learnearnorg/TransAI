import * as XLSX from 'xlsx';
import { translateSpreadsheetContent } from './geminiService';
import { ProfessionalField } from '../types';

/**
 * Orchestrates the end-to-end Excel translation flow.
 * 1. Parses original base64 Excel.
 * 2. Extracts structured sheet data.
 * 3. Neural translation via Gemini.
 * 4. Reconstructs a new Excel file with the same structure.
 */
export const processExcelTranslation = async (
  base64Data: string,
  targetLang: string,
  field: ProfessionalField
): Promise<void> => {
  try {
    // 1. Parse Excel
    const workbook = XLSX.read(base64Data, { type: 'base64', cellStyles: true, cellNF: true, cellDates: true, cellFormula: true });
    const sheetsToTranslate: { name: string; data: any[][] }[] = [];

    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      sheetsToTranslate.push({ name, data });
    });

    // 2. Neural Translation Cycle
    const translatedSheets = await translateSpreadsheetContent(sheetsToTranslate, targetLang, field);

    // 3. Reconstruct Workbook in place to preserve formatting
    translatedSheets.forEach(sheetData => {
      const originalSheet = workbook.Sheets[sheetData.name];
      if (originalSheet && sheetData.data && Array.isArray(sheetData.data)) {
        XLSX.utils.sheet_add_aoa(originalSheet, sheetData.data, { origin: "A1" });
      }
    });

    // 4. Trigger Download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transai_translated_${new Date().getTime()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Spreadsheet processing failure:", error);
    throw error;
  }
};
