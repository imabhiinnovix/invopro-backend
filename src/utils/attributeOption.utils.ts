import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import * as entityService from '../database/services/common/entity.services';
import { Types } from 'mongoose';

export async function autoPopulateAttributeOption({
  filePath,
  startRow = 2,
  entityId,
  attributesDetails,
  attributMapping,
  userId,
  organizationId,
}: {
  filePath: string;
  startRow?: number;
  entityId: any;
  attributesDetails: any[];
  attributMapping: Record<string, any>;
  userId: string;
  organizationId: string;
}) {
  try {
    const targetAttributes = attributesDetails.filter((attr) =>
      ['option', 'multioption'].includes(attr.type)
    );

    const columnNames = targetAttributes
      .map((attr) => attributMapping[attr.name])
      .filter(Boolean);

    const columnToUniqueValues = await extractUniqueColumnValuesByNamesFromXLSX({
      filePath,
      columnNames,
      startRow,
    });
    for (const attribute of targetAttributes) {
      const attributeName = attribute.name;
      const columnHeader = attributMapping[attributeName];
      const uniqueValues = columnToUniqueValues[columnHeader];
      const attributeOptionId = attribute.optionAttributeId;

      if (!uniqueValues || uniqueValues.length === 0) continue;
      if (attributeOptionId) {
        // Fetch existing option to preserve _id
        const existing = await attributeOptionService.findAttributeOptionById(attributeOptionId);
        const existingValues = existing?.attributeValue || [];

        // Normalize existing values for case-insensitive comparison
        const existingMap = new Map(
          existingValues.map((ev: any) => [ev.value.toLowerCase(), ev])
        );

        // Map unique values to reuse _id if exists (case-insensitive), else assign new one
        const mappedValues = uniqueValues.map((val: string) => {
          const lower = val.toLowerCase();
          if (existingMap.has(lower)) {
            const match = existingMap.get(lower);
            return { _id: match._id, value: val }; // keep _id, but store actual casing from Excel
          } else {
            return { value: val };
          }
        });

        await attributeOptionService.updateAttribute(attributeOptionId, {
          attributeValue: mappedValues,
          updatedBy: userId,
        });
      } else {
        // Create new option
        const mappedValues = uniqueValues.map((val: string) => ({
          value: val,
        }));
        const created = await attributeOptionService.createAttribute({
          attributeName,
          attributeValue: mappedValues,
          organizationId,
          createdBy: userId,
          isActive: true,
        });

        await entityService.updateEntityAttributeOptionId({
          entityId,
          attributeName,
          attributeType: attribute.type,
          optionAttributeId: created._id,
        });
      }
    }

    const newEntityDetails = await entityService.findEntityById(entityId);
    return newEntityDetails?.attributes;
  } catch (e) {
    console.error('Error while auto populating attribute options:', e);
    throw e;
  }
}