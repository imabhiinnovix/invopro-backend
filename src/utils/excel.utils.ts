import ExcelJS from 'exceljs';
import { DataItem } from '../database/services/reportivix/monthlyipReport.services';
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
  titleHeaderBackgroundColor,
  headers,
  headerColor,
  headerBackgroundColor,
  lastRowColor,
  gap,
  onlyHeader,
  cellBackGroundColor,
  cellBold,
  isWhiteBackGround,
  cellFormats,
  startCellNumber,
  mergeEndColumn,
  titleCellBorder,
  titleCellAlignment,
  tableRowBackGroundColor,
  tableRowCellFormat,
  tableRowAlignment,
  isMergeCell,
  columnBackGroundColor,
  columnBackGroundColorIndex,
  columnWidth,
  numRows,
  borderColor,
}: {
  data: Array<Record<string, any>>; // Array of JSON objects with varying keys
  filePath: string;
  sheetName: string;
  startTableRow?: number;
  startTableColumn?: string;
  titleHeading?: string;
  titleHeaderBackgroundColor?: string;
  headers?: string[];
  headerColor?: string;
  headerBackgroundColor?: string;
  lastRowColor?: string;
  gap?: number;
  onlyHeader?: boolean;
  cellBackGroundColor?: string;
  cellBold?: boolean;
  isWhiteBackGround?: boolean;
  cellFormats?: Record<string, string>;
  startCellNumber?: number;
  mergeEndColumn?: number;
  titleCellBorder?: boolean;
  tableRowBackGroundColor?: Record<number, string>;
  columnBackGroundColor?: string;
  columnBackGroundColorIndex?: number;
  columnWidth?: number;
  numRows?: number;

  tableRowAlignment?: Record<
    number,
    'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed' | undefined
  >;
  tableRowCellFormat?: Record<number, string>;
  isMergeCell?: boolean;
  titleCellAlignment?:
    | 'left'
    | 'center'
    | 'right'
    | 'fill'
    | 'justify'
    | 'centerContinuous'
    | 'distributed'
    | undefined;

  borderColor?: Record<string, string>;
}): Promise<void> {
  try {
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

    // Get all unique keys across the data
    let allKeys: string[] = [];
    if (headers && headers.length > 0) {
      allKeys = headers;
    } else if (data && data.length > 0) {
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

    if (columnBackGroundColor && columnBackGroundColor.length > 0 && columnBackGroundColorIndex && numRows) {
      worksheet.getColumn(columnBackGroundColorIndex).width = columnWidth ? columnWidth : 20;
      for (let rowIndex = startRow; rowIndex <= numRows + 1; rowIndex++) {
        const cell = worksheet.getRow(rowIndex).getCell(columnBackGroundColorIndex);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: columnBackGroundColor },
        };
      }
    } else if (isMergeCell) {
      console.log('Mergin cells..');
      worksheet.mergeCells(startRow, startCellNumber ?? 1, startRow, mergeEndColumn ?? 5);
    } else if (titleHeading) {
      console.log('Writing title heading...');
      worksheet.mergeCells(startRow, startCellNumber ?? 1, startRow, mergeEndColumn ?? 5);
      const titleRow = worksheet.getRow(startRow);
      const titleCell = titleRow.getCell(startCellNumber ?? 1);
      titleCell.value = titleHeading;
      titleCell.font = { bold: cellBold ?? false, size: 14, color: { argb: '000000' } };
      titleCell.alignment = { horizontal: titleCellAlignment ? titleCellAlignment : 'left', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: titleHeaderBackgroundColor ?? '4472C4' },
      };
      if (titleCellBorder) {
        titleCell.border = {
          top: { style: 'thin', color: { argb: borderColor && borderColor.top ? borderColor.top : '000000' } },
          left: { style: 'thin', color: { argb: borderColor && borderColor.left ? borderColor.left : '000000' } },
          bottom: { style: 'thin', color: { argb: borderColor && borderColor.bottom ? borderColor.bottom : '000000' } },
          right: { style: 'thin', color: { argb: borderColor && borderColor.right ? borderColor.right : '000000' } },
        };
      }

      titleRow.height = 20;
    } else {
      if (data.length === 0) {
        console.error('No data provided to create the sheet.');
        return;
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
        cell.font = { bold: true, color: { argb: headerColor ? headerColor : '000000' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: headerBackgroundColor ? headerBackgroundColor : '4472C4' }, // Blue background
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
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

          let newCellBackground = 'FFFFFF';
          let cellHorizontalAlignment:
            | 'left'
            | 'center'
            | 'right'
            | 'fill'
            | 'justify'
            | 'centerContinuous'
            | 'distributed'
            | undefined = 'left';
          if (tableRowAlignment && tableRowAlignment[rowNumber]) {
            cellHorizontalAlignment = tableRowAlignment[rowNumber];
          }
          if (tableRowBackGroundColor && tableRowBackGroundColor[rowNumber]) {
            newCellBackground = tableRowBackGroundColor[rowNumber];
          }
          if (cellBackGroundColor) {
            newCellBackground = cellBackGroundColor;
          }

          let newCellFormat = '';
          if (tableRowCellFormat && tableRowCellFormat[rowNumber]) {
            newCellFormat = tableRowCellFormat[rowNumber];
          }
          row.eachCell((cell, colIndex) => {
            cell.alignment = { vertical: 'middle', horizontal: cellHorizontalAlignment };
            if (cellBold) {
              cell.font = { bold: true, color: { argb: '000000' } };
            }

            const columnKey = allKeys[colIndex - (startCellNumber ? startCellNumber : 0)];

            if (cellFormats && columnKey in cellFormats) {
              newCellFormat = cellFormats[columnKey];
            }
            if (newCellFormat) {
              cell.numFmt = newCellFormat;
            }

            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: newCellBackground }, // whit background
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
    }

    worksheet.getColumn(1).hidden = false;

    await workbook.xlsx.writeFile(filePath);
    console.log(`Excel sheet "${sheetName}" updated/created in file: ${filePath}`);
  } catch (e) {
    console.log('Error in createUpdateExcelTable.', e);
    throw e;
  }
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

interface ReportSettings {
  sheetName: string;
  sheetCode: string;
  isWhiteBackGround: boolean;
  startTableColumn: string;
  startRowNumber: number;
}

interface SubSection {
  headerName: string;
  fontBold: boolean;
  headerBackGroundColor: string;
  headerTextColor: string;
  horizontalAlignment:
    | 'left'
    | 'center'
    | 'right'
    | 'fill'
    | 'justify'
    | 'centerContinuous'
    | 'distributed'
    | undefined;
  verticalAlignment: 'middle' | 'top' | 'bottom' | 'distributed' | 'justify' | undefined;
  type: string;
  cellFormat: string;
  spanColumns: boolean;
  lastCellBackGroundColor: string;
}

interface Comments {
  comment: string;
  backGroundColor: string;
  horizontalAlignment?:
    | 'left'
    | 'center'
    | 'right'
    | 'fill'
    | 'justify'
    | 'centerContinuous'
    | 'distributed'
    | undefined;
  verticalAlignment: 'middle' | 'top' | 'bottom' | 'distributed' | 'justify' | undefined;
  startTableColumn: string;
  textColor: string;
  fontBold: boolean;
  isBorder: boolean;
  mergeCell: number;
}

interface Section {
  sectionName?: string;
  cellFormat: string;
  fontBold: boolean;
  sectionBackGroundColor?: string;
  sectionTextColor?: string;
  sectionHorizontalAlignment?:
    | 'left'
    | 'center'
    | 'right'
    | 'fill'
    | 'justify'
    | 'centerContinuous'
    | 'distributed'
    | undefined;
  sectionVerticalAlignment?: 'middle' | 'top' | 'bottom' | 'distributed' | 'justify' | undefined;
  space?: number;
  comments?: Comments[];
  view: 'row' | 'column';
  spanColumns?: boolean;
  subSections: SubSection[];
}

type ExcelTableColumn = {
  name: string;
  filterButton?: boolean;
};

type WriteTableOptions = {
  striped?: boolean;
  headerFill?: ExcelJS.FillPattern;
  startRow?: number;
};
function writeDynamicTable(
  worksheet: ExcelJS.Worksheet,
  columns: ExcelTableColumn[],
  rows: (string | number | null)[][],
  options: WriteTableOptions = {}
): number {
  const { striped = false, headerFill, startRow } = options;

  // Optional manual row positioning
  const insertRowAt = startRow ?? worksheet.rowCount + 1;
  let currentRowPointer = insertRowAt;

  // Write header row
  const headerValues = columns.map((col) => col.name);
  const headerRow = worksheet.insertRow(currentRowPointer++, headerValues);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  if (headerFill) {
    headerRow.fill = headerFill;
  }

  // Write data rows
  rows.forEach((rowData, i) => {
    const row = worksheet.insertRow(currentRowPointer++, rowData);
    if (striped && i % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }, // light gray
      };
    }
  });

  // Return the next available row for chaining
  return currentRowPointer;
}

export async function generateExcelReport({
  reportName,
  reportData,
  designData,
  reportSettings,
  filePath,
  sheetCodeNameMap,
}: {
  reportName: string;
  reportData: Record<string, any[][]>;
  designData: Record<string, Section[]>;
  reportSettings: ReportSettings[];
  filePath: string;
  sheetCodeNameMap: Record<string, string>;
}) {
  const workbook = new ExcelJS.Workbook();

  for (const setting of reportSettings) {
    const { sheetCode, startTableColumn, startRowNumber, isWhiteBackGround } = setting;

    const sheetName = sheetCodeNameMap[sheetCode];
    if (sheetName) {
      const worksheet = workbook.addWorksheet(sheetName, {
        properties: { defaultColWidth: 22 },
        views: [{ showGridLines: isWhiteBackGround ? false : true }],
      });

      const sections = designData[sheetCode] || [];
      const reportDataBasedOnSheetCode = reportData[sheetCode] || [];

      let rowPointer = startRowNumber;
      const tableData: any[] = [];
      let processingDataTableIndex = 0;
      let dataToBeProcessed: any = reportDataBasedOnSheetCode[processingDataTableIndex] || [];
      let headerLabelKey = '';

      let tableObj: any = { headers: [], rows: [] };
      let isSpan = false;
      //for data prepration for table
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const subSections = section.subSections || [];
        const sectionView = section.view;
        if (section.sectionName || subSections.length > 0) {
          if (section.spanColumns) {
            isSpan = true;
          }
          if (section.sectionName && headerLabelKey) {
            tableObj.rows.push([section.sectionName]);
          }
          for (let j = 0; j < subSections.length; j++) {
            const subSection = subSections[j];
            const headerName = subSection.headerName;
            if (subSection.spanColumns) {
              isSpan = true;
            }
            if (sectionView === 'row') {
              if (!headerLabelKey) {
                headerLabelKey = headerName;
                const uniqueHeaders = new Set();
                uniqueHeaders.add(headerLabelKey);
                tableObj.headers.push({ name: headerLabelKey, filterButton: false });

                dataToBeProcessed.forEach((obj) => {
                  const value = obj[headerLabelKey];
                  if (!uniqueHeaders.has(value)) {
                    uniqueHeaders.add(value);
                    tableObj.headers.push({ name: value, filterButton: false });
                  }
                });
              } else {
                const rowData = [headerName];
                for (let k = 1; k < tableObj.headers.length; k++) {
                  const tableHeader = tableObj.headers[k].name;
                  const checkAvailableData = dataToBeProcessed.find((item) => {
                    return item[headerLabelKey] === tableHeader;
                  });

                  if (checkAvailableData) {
                    rowData.push(checkAvailableData[headerName]);
                  } else {
                    rowData.push('');
                  }
                }
                tableObj.rows.push(rowData);
              }
            } else {
              tableObj.headers.push({ name: headerName, filterButton: false });
            }
          }
        } else {
          if (tableObj.headers.length > 0) {
            if (tableObj.rows.length === 0) {
              const newData = dataToBeProcessed.map((item) => tableObj.headers.map((key) => item[key.name]));
              tableObj.rows = newData;
            }
            tableData.push(tableObj);
            processingDataTableIndex++;
            dataToBeProcessed = reportDataBasedOnSheetCode[processingDataTableIndex] || [];
            headerLabelKey = '';
            tableObj = { headers: [], rows: [] };
          }
        }
      }

      if (tableObj.headers.length > 0) {
        if (tableObj.rows.length === 0) {
          const newData = dataToBeProcessed.map((item) => tableObj.headers.map((key) => item[key.name]));
          tableObj.rows = newData;
        }
        tableData.push(tableObj);
        processingDataTableIndex = 0;
        dataToBeProcessed = reportDataBasedOnSheetCode[processingDataTableIndex] || [];
      }

      //for table desing
      let processingTableIndex = 0;
      let processingTableHeaders = [];
      let processingTableRows = [];
      let headerRowIndex = 0;
      let lastRowIndex = 0;
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const subSections = section.subSections || [];
        const sectionView = section.view;
        const sectionComments = section.comments || [];
        const space = section.space !== undefined && section.space >= 0 ? section.space : 2;
        if (sectionComments.length > 0) {
          for (const comment of sectionComments) {
            const starComentColumn = comment.startTableColumn ? comment.startTableColumn : startTableColumn;
            const cell = worksheet.getCell(`${starComentColumn}${rowPointer}`);
            cell.value = comment.comment;
            cell.font = {
              bold: !!comment.fontBold,
              color: { argb: comment.textColor ? comment.textColor : '000000' },
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: comment.backGroundColor ? comment.backGroundColor : 'FFFFFF' },
            };
            cell.alignment = {
              vertical: comment.verticalAlignment,
              horizontal: comment.horizontalAlignment,
              wrapText: false,
            };
            if (comment.isBorder) {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };
            }

            if (comment.mergeCell) {
              const endCol = colToLetter(colToNumber(starComentColumn) + comment.mergeCell - 1);
              worksheet.mergeCells(`${starComentColumn}${rowPointer}:${endCol}${rowPointer}`);
            }
            if (sectionView === 'column') {
              rowPointer++;
            }
          }
          if (sectionView === 'row') {
            rowPointer++;
          }
          rowPointer = rowPointer + space;
        } else if (section.sectionName || subSections.length > 0) {
          if (section.sectionName) {
            const mergeEnd = colToLetter(colToNumber(startTableColumn) + processingTableHeaders.length - 1);
            const cell = worksheet.getCell(`${startTableColumn}${rowPointer}`);
            cell.font = {
              bold: section.fontBold,
              color: { argb: section.sectionTextColor ? section.sectionTextColor : '000000' },
            };
            cell.alignment = {
              horizontal: section.sectionHorizontalAlignment || 'center',
              vertical: section.sectionVerticalAlignment || 'middle',
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            if (section.sectionBackGroundColor) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: section.sectionBackGroundColor },
              };
            }
            if (section.spanColumns) {
              worksheet.mergeCells(`${startTableColumn}${rowPointer}:${mergeEnd}${rowPointer}`);
            }
            rowPointer++;
          }

          for (let j = 0; j < subSections.length; j++) {
            const subSection = subSections[j];
            const headerName = subSection.headerName;
            const spanColumns = subSection.spanColumns;
            const mergeEnd = colToLetter(colToNumber(startTableColumn) + processingTableHeaders.length - 1);
            if (sectionView === 'row') {
              const row = worksheet.getRow(rowPointer);
              row.eachCell((cell, colIndex) => {
                cell.font = {
                  bold: subSection.fontBold,
                  color: { argb: subSection.headerTextColor ? subSection.headerTextColor : '000000' },
                };
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: subSection.headerBackGroundColor ? subSection.headerBackGroundColor : 'FFFFFF ' }, // white background
                };
                cell.alignment = {
                  vertical: subSection.verticalAlignment,
                  horizontal: subSection.horizontalAlignment,
                  wrapText: true,
                };
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' },
                };
                if (subSection.cellFormat) {
                  cell.numFmt = subSection.cellFormat;
                }
              });
              if (spanColumns) {
                worksheet.mergeCells(`${startTableColumn}${rowPointer}:${mergeEnd}${rowPointer}`);
              }
              rowPointer++;
            } else {
              rowPointer = lastRowIndex + 2;
              const headerRow = worksheet.getRow(headerRowIndex);
              headerRow.eachCell((cell, colIndex) => {
                if (cell.value === headerName) {
                  cell.font = {
                    bold: subSection.fontBold,
                    color: { argb: subSection.headerTextColor ? subSection.headerTextColor : '000000' },
                  };
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: subSection.headerBackGroundColor ? subSection.headerBackGroundColor : '4472C4' }, // Blue background
                  };
                  cell.alignment = {
                    vertical: subSection.verticalAlignment,
                    horizontal: subSection.horizontalAlignment,
                    wrapText: true,
                  };

                  const column = worksheet.getColumn(colIndex);
                  column.width = 22;
                  column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    if (rowNumber >= headerRowIndex) {
                      cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                      };
                    }
                  });

                  if (subSection.cellFormat) {
                    column.numFmt = subSection.cellFormat;
                  }
                  if (subSection.lastCellBackGroundColor) {
                    const lastRow = worksheet.getRow(lastRowIndex);
                    const lastCell = lastRow.getCell(colIndex);
                    lastCell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: subSection.lastCellBackGroundColor },
                    };
                  }
                }
              });
            }
          }
        } else {
          const individualTable = tableData[processingTableIndex];
          processingTableHeaders = individualTable.headers;
          processingTableRows = individualTable.rows;
          headerRowIndex = rowPointer;
          lastRowIndex = processingTableRows.length + headerRowIndex;
          const tableRef = startTableColumn ? `${startTableColumn}${rowPointer}` : `A${rowPointer}`;

          if (isSpan) {
            writeDynamicTable(worksheet, processingTableHeaders, processingTableRows, {
              striped: false,
              // headerFill: {
              //   type: 'pattern',
              //   pattern: 'solid',
              //   fgColor: { argb: 'FFB8CCE4' }, // Light blue header background
              // },
            });
          } else {
            worksheet.addTable({
              name: `DynamicTable_${sheetCode.toLowerCase().replace(/[^a-z]/g, '')}_${processingTableIndex}_${rowPointer}`, // Unique table name
              ref: tableRef,
              headerRow: true,
              totalsRow: false,
              // style: {
              //   theme: 'TableStyleMedium9', // Default table style
              //   showRowStripes: true,
              // },
              columns: processingTableHeaders,
              rows: processingTableRows,
            });
          }

          processingTableIndex++;
        }
      }
    }
  }

  await workbook.xlsx.writeFile(filePath);
  console.log(`${reportName}.xlsx generated successfully.`);
}

export function colToLetter(col: number | string): string {
  if (typeof col === 'string') return col;
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod) / 26);
  }
  return letter;
}

export function colToNumber(col: string): number {
  let num = 0;
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

export async function getUniqueColumnValuesFromXLSXFile(
  filePath: string,
  columnNumber: number,
  startRow: number
): Promise<string[]> {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const uniqueValues = new Set<string>();

    for (let i = startRow - 1; i < rows.length; i++) {
      const row = rows[i];
      const cellValue = row[columnNumber - 1];

      if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
        uniqueValues.add(String(cellValue).trim());
      }
    }

    return Array.from(uniqueValues);
  } catch (err) {
    console.error('Error reading Excel file:', err);
    return [];
  }
}
