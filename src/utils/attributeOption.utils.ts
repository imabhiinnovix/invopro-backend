import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';

export async function autoPopulateAttributeOption({
  filePath,
  columnName, // not used here
  startRow = 2,
  entityId,
  attributesDetails,
  attributMapping,
}: {
  filePath: string;
  columnName: string;
  startRow: number;
  entityId: string;
  attributesDetails: any[];
  attributMapping: Record<string, any>;
}): Promise<Record<string, any[]>> {
  try {
    const targetAttributes = attributesDetails.filter((attr) => ['option', 'multioption'].includes(attr.type));

    const columnNames = targetAttributes.map((attr) => attributMapping[attr.name]);
    const columnToUniqueValues = await extractUniqueColumnValuesByNamesFromXLSX({
      filePath,
      columnNames,
      startRow,
    });

    // Map back to attribute name using attributMapping
    const result: Record<string, any[]> = {};

    for (const attr of targetAttributes) {
      const columnHeader = attributMapping[attr.name];
      if (columnToUniqueValues[columnHeader]) {
        result[attr.name] = columnToUniqueValues[columnHeader];
      }
    }

    return result;
  } catch (e) {
    console.error('Error while auto populating attribute options.', e);
    throw e;
  }
}
