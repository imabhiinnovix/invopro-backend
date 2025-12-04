import { extractUniqueColumnValuesByNamesFromXLSX } from './excel.utils';
import * as attributeOptionService from '../database/services/common/attributeOption.services';
import * as entityService from '../database/services/common/entity.services';
import { getEntityAttribute } from './entity.utils';
import { Types } from 'mongoose';

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
    const targetAttributes = attributesDetails.filter((attr) =>
      ['option', 'multioption', 'text-with-option'].includes(attr.type)
    );

    const columnToUniqueValues: Record<string, string[]> = {};

    // Build a mapping of column → unique values from Excel
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

      for (const key of columnArray) {
        columnToUniqueValues[key] = Array.from(uniqueSet);
      }
    }

    // Process each target attribute
    for (const attribute of targetAttributes) {
      const attributeName = attribute.name;
      const columnHeader = attributMapping[attributeName];
      const attributeOptionId = attribute.optionAttributeId;

      // Reference entity case → reuse optionAttributeId
      if (attribute.referenceEntitySetting?.refEntityId && attribute.referenceEntitySetting?.refEntityField && !['mapping_many_to_one', 'mapping_one_to_one'].includes(attribute.referenceEntitySetting?.relationType)) {
        const refEntityId = attribute.referenceEntitySetting.refEntityId;
        const refFieldId = attribute.referenceEntitySetting.refEntityField;

        const refAttribute = await getEntityAttribute(refEntityId.toString(), refFieldId.toString());

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

        const existingSet = new Set(existingValues.map((v) => v.toLowerCase()));
        const mergedValues: string[] = [
          ...existingValues,
          ...uniqueValues.filter((val) => !existingSet.has(val.toLowerCase())),
        ];
        await attributeOptionService.updateAttribute(attributeOptionId, {
          attributeValue: mergedValues,
          updatedBy: userId,
        });
      } else {
        // 🔑 Fix: check if attribute already exists before creating
        const existing: any = await attributeOptionService.findAttributeByNameAndOrganization(attributeName, organizationId);
        if (existing) {
          const existingValues: string[] = existing?.attributeValue || [];
          const existingSet = new Set(existingValues.map((v) => v.toLowerCase()));
          const mergedValues = [
            ...existingValues,
            ...uniqueValues.filter((val) => !existingSet.has(val.toLowerCase())),
          ];
          await attributeOptionService.updateAttribute(existing._id, {
            attributeValue: mergedValues,
            updatedBy: userId,
          });

          await entityService.updateEntityAttributeOptionId({
            entityId,
            attributeName,
            attributeType: attribute.type,
            optionAttributeId: existing._id,
          });
        } else {
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
    }

    const newEntityDetails = await entityService.findEntityById(entityId);
    return newEntityDetails?.attributes;
  } catch (e) {
    console.error('Error while auto populating attribute options:', e);
    throw e;
  }
}

export async function autoPopulateAttributeOptionFromRow({
  entityId,
  attributes,
  rowData,
  userId,
  organizationId,
}: {
  entityId: Types.ObjectId;
  attributes: any[];
  rowData: Record<string, any>;
  userId: string;
  organizationId: string;
}) {
  try {
    const targetAttributes = attributes.filter((attr) =>
      ['option', 'multioption', 'text-with-option'].includes(attr.type)
    );

    for (const attribute of targetAttributes) {
      const attributeName = attribute.name;
      let rawValue = rowData[attributeName];
      if (!rawValue) continue;

      const values = Array.isArray(rawValue) ? rawValue.map((v) => String(v).trim()) : [String(rawValue).trim()];

      // Reference entity case
      if (attribute.referenceEntitySetting?.refEntityId && attribute.referenceEntitySetting?.refEntityField) {
        const refEntityId = attribute.referenceEntitySetting.refEntityId;
        const refFieldId = attribute.referenceEntitySetting.refEntityField;

        const refAttribute = await getEntityAttribute(refEntityId.toString(), refFieldId.toString());
        if (refAttribute?.optionAttributeId) {
          await entityService.updateEntityAttributeOptionId({
            entityId,
            attributeName,
            attributeType: attribute.type,
            optionAttributeId: refAttribute.optionAttributeId,
          });
        }
        continue;
      }

      if (attribute.optionAttributeId) {
        const existing = await attributeOptionService.findAttributeOptionById(attribute.optionAttributeId);
        const existingValues: string[] = existing?.attributeValue || [];
        const existingSet = new Set(existingValues.map((v) => v.toLowerCase()));

        const mergedValues = [...existingValues, ...values.filter((val) => !existingSet.has(val.toLowerCase()))];

        await attributeOptionService.updateAttribute(attribute.optionAttributeId, {
          attributeValue: mergedValues,
          updatedBy: userId,
        });
      } else {
        // 🔑 Fix: check before creating
        const existing: any = await attributeOptionService.findAttributeByNameAndOrganization(attributeName, organizationId);

        if (existing) {
          const existingValues: string[] = existing?.attributeValue || [];
          const existingSet = new Set(existingValues.map((v) => v.toLowerCase()));
          const mergedValues = [...existingValues, ...values.filter((val) => !existingSet.has(val.toLowerCase()))];

          await attributeOptionService.updateAttribute(existing._id, {
            attributeValue: mergedValues,
            updatedBy: userId,
          });

          await entityService.updateEntityAttributeOptionId({
            entityId,
            attributeName,
            attributeType: attribute.type,
            optionAttributeId: existing._id,
          });
        } else {
          const created = await attributeOptionService.createAttribute({
            attributeName,
            attributeValue: values,
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
    }
  } catch (e) {
    console.error('Error in autoPopulateAttributeOptionFromRow:', e);
    throw e;
  }
}