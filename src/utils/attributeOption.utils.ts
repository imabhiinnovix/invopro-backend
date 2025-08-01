import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import * as entityService from '../database/services/common/entity.services';

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
    const targetAttributes = attributesDetails.filter((attr) => ['option', 'multioption'].includes(attr.type));

    const columnNames = targetAttributes.map((attr) => attributMapping[attr.name]).filter(Boolean);

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
