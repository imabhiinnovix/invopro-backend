import ExcelJS from 'exceljs';

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
  await workbook.xlsx.readFile(filePath);

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
