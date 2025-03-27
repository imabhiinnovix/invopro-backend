import ExcelJS from 'exceljs';
import { DataItem } from '../database/services/monthlyipReport.services';
import * as xlsx from 'xlsx';

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

// export async function getColumnNamesAndTypes(filePath: string, sheetName?: string): Promise<ColumnInfo[]> {
//   const workbook = new ExcelJS.Workbook();

//   await workbook.xlsx.readFile(filePath, {
//     ignoreNodes: [
//       'dataValidations', // ignores the workbook's Data Validations
//     ],
//   });

//   const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]; // Use the first sheet if no sheet name is provided

//   if (!worksheet) {
//     throw new Error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets found in the workbook.');
//   }

//   const columnsInfo: ColumnInfo[] = [];

//   // Get the header row and first data row
//   const headerRow = worksheet.getRow(1);
//   const firstDataRow = worksheet.getRow(2);

//   headerRow.eachCell((cell, colNumber) => {
//     const columnName = cell.value?.toString() || `Column ${colNumber}`;
//     const firstValue = firstDataRow.getCell(colNumber).value;

//     let type = 'text';
//     if (typeof firstValue === 'number') {
//       type = 'number';
//     } else if (firstValue instanceof Date) {
//       type = 'date';
//     }

//     columnsInfo.push({
//       id: colNumber,
//       name: columnName,
//       type: type,
//     });
//   });

//   return columnsInfo;
// }

// export async function readExcelFile(filePath: string, sheetNames?: string[]): Promise<any[]> {
//   try {
//     console.log('Inside readExcelFile', filePath);
//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.readFile(filePath);

//     let sheetsToRead: ExcelJS.Worksheet[] = [];

//     if (!sheetNames || sheetNames.length === 0) {
//       // If no sheet names are provided, read the first sheet
//       if (workbook.worksheets.length > 0) {
//         sheetsToRead.push(workbook.worksheets[0]);
//       }
//     } else {
//       // Read all specified sheets
//       sheetsToRead = sheetNames
//         .map((sheetName) => workbook.getWorksheet(sheetName))
//         .filter((sheet) => sheet !== undefined) as ExcelJS.Worksheet[];
//     }

//     if (sheetsToRead.length === 0) {
//       throw new Error(sheetNames ? `Sheets "${sheetNames.join(', ')}" not found` : 'No sheets found in the workbook.');
//     }

//     const allRows: any[] = [];

//     sheetsToRead.forEach((worksheet) => {
//       const rows: any[] = [];
//       const headers: string[] = [];

//       worksheet.eachRow((row, rowIndex) => {
//         if (rowIndex === 1) {
//           // First row is the header
//           row.eachCell((cell, colNumber) => {
//             headers[colNumber - 1] = cell.text.trim(); // Store header names
//           });
//         } else {
//           // Process other rows
//           const rowData: { [key: string]: any } = {};
//           row.eachCell((cell, colNumber) => {
//             const header = headers[colNumber - 1];
//             if (header) {
//               if (cell.type === ExcelJS.ValueType.Date) {
//                 // Convert date to ISO string
//                 rowData[header] = (cell.value as Date).toISOString();
//               } else {
//                 // Handle other types
//                 rowData[header] = typeof cell.value === 'string' ? cell.value?.trim() : cell.value;
//               }
//             }
//           });
//           rows.push(rowData);
//         }
//       });

//       allRows.push(...rows);
//     });

//     return allRows;
//   } catch (e) {
//     console.log(e);
//     throw 'Error while reading excel file.';
//   }
// }

export async function getColumnNamesAndTypes(filePath: string, sheetName?: string): Promise<ColumnInfo[]> {
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('No sheets found in the workbook.');
  }

  const worksheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[sheetNames[0]];

  if (!worksheet) {
    throw new Error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets found in the workbook.');
  }

  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    throw new Error('The sheet is empty.');
  }

  const headers = jsonData[0] as string[];
  const firstDataRow = jsonData[1] || [];

  return headers.map((header, index) => {
    const firstValue = firstDataRow[index];
    let type = 'text';

    if (typeof firstValue === 'number') {
      type = 'number';
    } else if (firstValue instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue)))) {
      type = 'date';
    }

    return {
      id: index + 1,
      name: header || `Column ${index + 1}`,
      type,
    };
  });
}

export async function readExcelFile(filePath: string, sheetNames?: string[]): Promise<any[]> {
  try {
    console.log('Inside readExcelFile', filePath);

    const workbook = xlsx.readFile(filePath);

    let sheetsToRead: string[] = [];

    if (!sheetNames || sheetNames.length === 0) {
      // If no sheet names are provided, read the first sheet
      if (workbook.SheetNames.length > 0) {
        sheetsToRead.push(workbook.SheetNames[0]);
      }
    } else {
      // Read all specified sheets
      sheetsToRead = sheetNames.filter((sheetName) => workbook.SheetNames.includes(sheetName));
    }

    if (sheetsToRead.length === 0) {
      throw new Error(sheetNames ? `Sheets "${sheetNames.join(', ')}" not found` : 'No sheets found in the workbook.');
    }

    const allRows: any[] = [];

    sheetsToRead.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      if (worksheet) {
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: null });
        allRows.push(...jsonData);
      }
    });

    return allRows;
  } catch (e) {
    console.log(e);
    throw 'Error while reading excel file.';
  }
}

export async function writeDataToExcel(data: DataItem[], filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath); // Read the existing workbook

  const sheet = workbook.getWorksheet('Global')!; // Get the existing sheet by name

  // Iterate through the data and write it to the sheet
  data.forEach((item) => {
    if (item.cellName) {
      const cell = sheet.getCell(item.cellName);

      // if (item.numFormat === 'percentage') {
      //   cell.numFmt = '0%'; // Apply percentage format
      // } else {
      //   cell.numFmt = cell.numFmt || ''; // Preserve existing format
      // }

      cell.value = item.value;
    }
  });

  // Save the updated Excel file
  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel file written successfully to ${filePath}`);
}

export async function createExcelSheetFile(
  data: Array<Record<string, any>>, // Array of JSON objects with varying keys
  filePath: string,
  sheetName: string,
  titleHeading?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Load the existing workbook or create a new one
  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    console.log('File does not exist. A new file will be created.');
  }

  let worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    worksheet = workbook.addWorksheet(sheetName, { properties: { defaultColWidth: 20 } });
  }

  if (data.length === 0) {
    console.error('No data provided to create the sheet.');
    return;
  }

  // Get all unique keys across the data
  const allKeys = Array.from(new Set(data.flatMap((item) => Object.keys(item))));

  // Calculate where to start adding the new table
  let lastRow = worksheet.lastRow?.number || 0;
  let startRow = lastRow + 3; // Adjusted to leave an extra blank row

  // If title heading is provided, insert it as a merged row
  if (titleHeading) {
    const titleRow = worksheet.getRow(startRow - 1);
    titleRow.getCell(1).value = titleHeading;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    titleRow.height = 20;
    worksheet.mergeCells(startRow - 1, 1, startRow - 1, allKeys.length);
  }

  // Dynamically generate columns and rows
  const columns = allKeys.map((key) => ({ name: key, filterButton: true }));
  const rows = data.map((item) => allKeys.map((key) => item[key] || ''));

  // Define table reference (starting cell)
  const tableRef = `A${startRow}`;

  // Add a table to the worksheet
  const table = worksheet.addTable({
    name: `DynamicTable_${sheetName.toLowerCase().replace(/[^a-z]/g, '')}_${startRow}`, // Unique table name
    ref: tableRef,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium9', // Default table style
      showRowStripes: true,
    },
    columns,
    rows,
  });

  const headerRow = worksheet.getRow(startRow);
  headerRow.eachCell((cell, colIndex) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }, // Blue background
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  for (let i = startRow + 1; i < startRow + 1 + rows.length; i++) {
    const row = worksheet.getRow(i);
    row.eachCell((cell, colIndex) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D9E1F2' }, // Light blue
        };
      });
    }
  }

  worksheet.getColumn(1).hidden = false;
  // Save the workbook to the file
  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel sheet "${sheetName}" updated/created in file: ${filePath}`);
}

export async function createUpdateExcelTable({
  data, // Array of JSON objects with varying keys
  filePath,
  sheetName,
  startTableRow,
  startTableColumn,
  titleHeading,
  titleHeadingColor,
  headers,
  headerColor,
  lastRowColor,
  gap,
  onlyHeader,
  cellColor,
  cellBold,
  isWhiteBackGround,
}: {
  data: Array<Record<string, any>>; // Array of JSON objects with varying keys
  filePath: string;
  sheetName: string;
  startTableRow?: number;
  startTableColumn?: string;
  titleHeading?: string;
  titleHeadingColor?: string;
  headers?: string[];
  headerColor?: string;
  lastRowColor?: string;
  gap?: number;
  onlyHeader?: boolean;
  cellColor?: string;
  cellBold?: boolean;
  isWhiteBackGround?: boolean;
}): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Load the existing workbook or create a new one
  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    console.log('File does not exist. A new file will be created.');
  }

  let worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    if (isWhiteBackGround) {
      worksheet = workbook.addWorksheet(sheetName, {
        properties: { defaultColWidth: 22 },
        views: [{ showGridLines: false }],
      });
    } else {
      worksheet = workbook.addWorksheet(sheetName, {
        properties: { defaultColWidth: 22 },
      });
    }
  }

  if (data.length === 0) {
    console.error('No data provided to create the sheet.');
    return;
  }

  // Get all unique keys across the data
  let allKeys: string[] = [];
  if (headers && headers.length > 0) {
    allKeys = headers;
  } else {
    allKeys = Array.from(new Set(data.flatMap((item) => Object.keys(item))));
  }

  // Calculate where to start adding the new table
  let lastRow = worksheet.lastRow?.number || 0;
  let startRow = lastRow + 1;
  if (startTableRow) {
    startRow = startTableRow;
  }

  if (gap) {
    startRow = startRow + gap;
  }

  // If title heading is provided, insert it as a merged row
  if (titleHeading) {
    const titleRow = worksheet.getRow(startRow - 1);
    titleRow.getCell(1).value = titleHeading;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: titleHeadingColor ? titleHeadingColor : '4472C4' },
    };
    titleRow.height = 20;
    worksheet.mergeCells(startRow - 1, 1, startRow - 1, allKeys.length);
  }

  // Dynamically generate columns and rows
  const columns = allKeys.map((key) => ({ name: key, filterButton: false }));
  const rows = data.map((item) => allKeys.map((key) => item[key] || ''));

  // Define table reference (starting cell)

  const tableRef = startTableColumn ? `${startTableColumn}${startRow}` : `A${startRow}`;

  // Add a table to the worksheet
  const table = worksheet.addTable({
    name: `DynamicTable_${sheetName.toLowerCase().replace(/[^a-z]/g, '')}_${startRow}`, // Unique table name
    ref: tableRef,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium9', // Default table style
      showRowStripes: true,
    },
    columns,
    rows,
  });

  const headerRow = worksheet.getRow(startRow);
  headerRow.eachCell((cell, colIndex) => {
    cell.font = { bold: true, color: { argb: '000000' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerColor ? headerColor : '4472C4' }, // Blue background
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Apply border to all table rows (fixes missing borders issue)
  if (!onlyHeader) {
    const totalTableRows = data.length;
    for (let i = 0; i < totalTableRows; i++) {
      const rowNumber = startRow + 1 + i; // Data starts after header row
      const row = worksheet.getRow(rowNumber);
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        if (cellBold) {
          cell.font = { bold: true, color: { argb: '000000' } };
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: cellColor ? cellColor : 'FFFFFF' }, // whit background
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  }

  if (lastRowColor) {
    const lastTableRowNumber = startRow + data.length; // Last row of the new table
    const lastTableRow = worksheet.getRow(lastTableRowNumber);

    lastTableRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: '000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: lastRowColor }, // User-defined color
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  worksheet.getColumn(1).hidden = false;

  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel sheet "${sheetName}" updated/created in file: ${filePath}`);
}

export function excelDateToJSDate(serial: number) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;

  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;

  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
    hours,
    minutes,
    seconds
  ).toISOString();
}
