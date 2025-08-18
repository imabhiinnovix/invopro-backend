import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import * as entityService from '../database/services/common/entity.services';
import { getEntityAttribute } from './entity.utils';
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

      // 1️⃣ If this attribute is a reference field → reuse referenced optionAttributeId
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
          // just update the entity’s field to point to the same optionAttributeId
          await entityService.updateEntityAttributeOptionId({
            entityId,
            attributeName,
            attributeType: attribute.type,
            optionAttributeId: refAttribute.optionAttributeId,
          });
        }

        // skip Excel processing for reference fields
        continue;
      }

      // 2️⃣ Normal Excel-driven option field
      const uniqueValues = columnHeader ? columnToUniqueValues[columnHeader] || [] : [];
      if (!uniqueValues || uniqueValues.length === 0) continue;

      if (attributeOptionId) {
        const existing = await attributeOptionService.findAttributeOptionById(
          attributeOptionId
        );
        const existingValues = existing?.attributeValue || [];

        // case-insensitive lookup map
        const existingMap = new Map(
          existingValues.map((ev: any) => [ev.value.toLowerCase(), ev])
        );

        const mappedValues = uniqueValues.map((val: string) => {
          const lower = val?.toLowerCase?.() || '';
          if (existingMap.has(lower)) {
            const match = existingMap.get(lower);
            return { _id: match._id, value: val };
          } else {
            return { value: val };
          }
        });

        await attributeOptionService.updateAttribute(attributeOptionId, {
          attributeValue: mappedValues,
          updatedBy: userId,
        });
      } else {
        const mappedValues = uniqueValues.map((val: string) => ({ value: val }));
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