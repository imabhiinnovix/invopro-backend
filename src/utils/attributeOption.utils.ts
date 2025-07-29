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
  entityId: string;
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

    const updatedAttributes = [...attributesDetails]; // make modifiable copy

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

        console.log('created', created, created._id);
        // Update local attribute with new option ID
        const attrIndex = updatedAttributes.findIndex((a) => a.name === attributeName);
        if (attrIndex !== -1) {
          updatedAttributes[attrIndex].optionAttributeId = created._id;
        }
      }
    }
    console.log('updatedAttributes', updatedAttributes);
    // 🔄 Single entity update
    const updatedEntityDetails = await entityService.updateEntity(entityId, {
      attributes: updatedAttributes,
    });

    console.log('updatedEntityDetails', updatedEntityDetails);
    return updatedEntityDetails?.attributes;
  } catch (e) {
    console.error('Error while auto populating attribute options:', e);
    throw e;
  }
}
