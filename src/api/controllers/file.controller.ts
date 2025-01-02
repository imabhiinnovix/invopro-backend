/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

import { promises as fsPromises } from 'fs';
import path from 'path';
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

async function getColumnNamesAndTypes(filePath: string, sheetName?: string): Promise<ColumnInfo[]> {
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
  await fsPromises.unlink(filePath);
  return columnsInfo;
}

async function getAttributesFromXlsxOrCsvHeaders({
  organizationId,
  userId,
  file,
}: {
  organizationId: any;
  userId: any;
  file: Express.Multer.File;
}) {
  const { originalname, path: filePath, size, mimetype } = file;
  const fileName = originalname;
  const fileExtension = fileName.split('.').pop();
  const newFilePath = path.join('uploads', organizationId, userId, 'temp', fileName);
  await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
  await fsPromises.rename(filePath, newFilePath);

  if (fileExtension && ['csv', 'xlsx', 'xls'].includes(fileExtension)) {
    return await getColumnNamesAndTypes(newFilePath);
  } else {
    await fsPromises.unlink(newFilePath);
    throw new Error('Invalid file format');
  }
}

export const handleFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, organizationId } = req?.user;
  try {
    if (!req.files?.length) {
      return res.status(400).send('No files uploaded.');
    }

    const { operation } = req.body;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

    let data;
    for (const file of files) {
      if (operation === 'getAttributesFromXlsxOrCsvHeaders') {
        data = await getAttributesFromXlsxOrCsvHeaders({ organizationId, userId, file });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: data,
    });
  } catch (err: any) {
    console.error(err);
    next(err);
  }
};
