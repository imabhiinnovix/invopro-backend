import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import * as entityService from '../database/services/common/entity.services';
import { getEntityAttribute } from './entity.utils';

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
      ['option', 'multioption', 'text-with-option'].includes(attr.type)
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
      const attributeOptionId = attribute.optionAttributeId;

      // Reference entity case → reuse optionAttributeId
      if (
        attribute.referenceEntitySetting?.refEntityId &&
        attribute.referenceEntitySetting?.refEntityField
      ) {
        const refEntityId = attribute.referenceEntitySetting.refEntityId;
        const refFieldId = attribute.referenceEntitySetting.refEntityField;

        const refAttribute = await getEntityAttribute(
          refEntityId.toString(),
          refFieldId.toString()
        );

        if (refAttribute?.optionAttributeId) {
          await entityService.updateEntityAttributeOptionId({
            entityId,
            attributeName,
            attributeType: attribute.type,
            optionAttributeId: refAttribute.optionAttributeId,
          });
        }

        continue; // skip Excel-driven logic for reference fields
      }

      // Normal case: extract from Excel
      const uniqueValues = columnHeader ? columnToUniqueValues[columnHeader] || [] : [];
      if (!uniqueValues || uniqueValues.length === 0) continue;

      if (attributeOptionId) {
        const existing = await attributeOptionService.findAttributeOptionById(attributeOptionId);
        const existingValues: string[] = existing?.attributeValue || [];

        // Case-insensitive set for existing values
        const existingSet = new Set(existingValues.map((v) => v.toLowerCase()));

        // Merge → preserve existing + add new ones (case-insensitive)
        const mergedValues: string[] = [
          ...existingValues,
          ...uniqueValues.filter((val) => !existingSet.has(val.toLowerCase())),
        ];

        await attributeOptionService.updateAttribute(attributeOptionId, {
          attributeValue: mergedValues,
          updatedBy: userId,
        });
      } else {
        // Create new
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