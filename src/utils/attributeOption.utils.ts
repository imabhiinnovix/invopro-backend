import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import * as entityService from '../database/services/common/entity.services';

export async function autoPopulateAttributeOption({
  fileData = [],
  entityId,
  attributesDetails,
  attributMapping,
  userId,
  organizationId,
}: {
  fileData?: any[];
  entityId: any;
  attributesDetails: any[];
  attributMapping: Record<string, any>;
  userId: string;
  organizationId: string;
}) {
  try {
    const targetAttributes = attributesDetails.filter((attr) => ['option', 'multioption'].includes(attr.type));

    const columnToUniqueValues: Record<string, string[]> = {};

    for (const attribute of targetAttributes) {
      const columnKeys = attributMapping[attribute.name];
      if (!columnKeys) continue;

      const columnArray = Array.isArray(columnKeys) ? columnKeys : [columnKeys];
      const uniqueSet = new Set<string>();

      for (const row of fileData) {
        for (const key of columnArray) {
          const value = row[key];
          if (value !== undefined && value !== null && value !== '') {
            uniqueSet.add(value.toString().trim());
          }
        }
      }

      columnToUniqueValues[attribute.name] = Array.from(uniqueSet);
    }

    for (const attribute of targetAttributes) {
      const attributeName = attribute.name;
      const uniqueValues = columnToUniqueValues[attributeName];
      const attributeOptionId = attribute.optionAttributeId;

      if (!uniqueValues || uniqueValues.length === 0) continue;

      if (attributeOptionId) {
        // 🔁 Update existing option
        await attributeOptionService.updateAttribute(attributeOptionId, {
          attributeValue: uniqueValues,
        });
      } else {
        // 🆕 Create new option
        const created = await attributeOptionService.createAttribute({
          attributeName,
          attributeValue: uniqueValues,
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
