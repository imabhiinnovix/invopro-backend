import ExcelJS from 'exceljs';
import { DataItem } from '../database/services/monthlyipReport.services';

interface KeywordPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  id: number;
}

export async function getColumnNamesAndTypes(filePath: string, sheetName?: string): Promise<ColumnInfo[]> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(filePath, {
    ignoreNodes: [
      'dataValidations', // ignores the workbook's Data Validations
    ],
  });

  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]; // Use the first sheet if no sheet name is provided

  if (!worksheet) {
    throw new Error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets found in the workbook.');
  }

  const columnsInfo: ColumnInfo[] = [];

  // Get the header row and first data row
  const headerRow = worksheet.getRow(1);
  const firstDataRow = worksheet.getRow(2);

  headerRow.eachCell((cell, colNumber) => {
    const columnName = cell.value?.toString() || `Column ${colNumber}`;
    const firstValue = firstDataRow.getCell(colNumber).value;

    let type = 'text';
    if (typeof firstValue === 'number') {
      type = 'number';
    } else if (firstValue instanceof Date) {
      type = 'date';
    }

    columnsInfo.push({
      id: colNumber,
      name: columnName,
      type: type,
    });
  });

  return columnsInfo;
}

export async function readExcelFile(filePath: string, sheetName?: string): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(filePath);
  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]; // Use the first sheet if no sheet name is provided

  if (!worksheet) {
    throw new Error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets found in the workbook.');
  }

  const rows: any[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) {
      // First row is the header
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.text.trim(); // Store header names
      });
    } else {
      // Process other rows
      const rowData: { [key: string]: any } = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          if (cell.type === ExcelJS.ValueType.Date) {
            // Convert date to ISO string
            rowData[header] = (cell.value as Date).toISOString();
          } else {
            // Handle other types
            rowData[header] = typeof cell.value === 'string' ? cell.value?.trim() : cell.value;
          }
        }
      });
      rows.push(rowData);
    }
  });

  return rows;
}

export async function writeDataToExcel(data: DataItem[], filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath); // Read the existing workbook

  const sheet = workbook.getWorksheet('Global')!; // Get the existing sheet by name

  // Iterate through the data and write it to the sheet
  data.forEach((item) => {
    if (item.cellName) {
      // If a specific cell is provided, write the value there
      const cell = sheet.getCell(item.cellName);
      cell.value = `${item.value ?? ''}`;
    }
  });

  // Save the updated Excel file
  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel file written successfully to ${filePath}`);
}
