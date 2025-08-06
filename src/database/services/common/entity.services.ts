/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import Entity from '../../models/common/entity';
import { getAllDerivedFields } from './derivedField.services';

export const createEntity = async (entityData: any) => {
  try {
    const entity = new Entity(entityData);
    await entity.save();
    return entity;
  } catch (err) {
    throw err;
  }
};

export const updateEntity = async (entityId: string, entityData: any) => {
  try {
    const organization = await Entity.findByIdAndUpdate(entityId, entityData, { new: true });
    return organization;
  } catch (err) {
    throw err;
  }
};

export const getEntityList = async ({ query, select = '', page, limit, sort = { updatedAt: -1 }, populate }: any) => {
  try {
    let usersQuery = Entity.find(query).select(select).sort(sort);

    if (page && limit) {
      usersQuery = usersQuery.skip((page - 1) * limit).limit(limit);
    }

    if (Array.isArray(populate)) {
      populate.forEach((field) => {
        usersQuery = usersQuery.populate(field);
      });
    }

    const entities = await usersQuery.lean().exec();

    const enhancedEntities = await Promise.all(
      entities.map(async (entity: any) => {
        if (!Array.isArray(entity.attributes)) return entity;

        const updatedAttributes = await Promise.all(
          (entity.attributes as any[]).map(async (attr: any) => {
            const { referenceEntitySetting } = attr;

            if (referenceEntitySetting?.refEntityId && referenceEntitySetting?.refEntityField) {
              const refEntity = await Entity.findById(referenceEntitySetting.refEntityId)
                .select('name attributes._id attributes.name')
                .lean();

              if (refEntity) {
                const matchedField = (refEntity.attributes as any[])?.find(
                  (a: any) => a._id?.toString() === referenceEntitySetting.refEntityField.toString()
                );

                attr.referenceEntitySetting = {
                  refEntityId: {
                    _id: refEntity._id,
                    name: refEntity.name,
                  },
                  refEntityField: matchedField
                    ? {
                        _id: matchedField._id,
                        name: matchedField.name,
                      }
                    : referenceEntitySetting.refEntityField,
                  relationType: referenceEntitySetting.relationType,
                };
              }
            }

            return attr;
          })
        );

        return {
          ...entity,
          attributes: updatedAttributes,
        };
      })
    );

    const totalCount = await Entity.countDocuments(query);

    return { data: enhancedEntities, totalCount };
  } catch (err) {
    throw err;
  }
};

export const getEntity = async (query: any) => {
  try {
    const entities = await Entity.findOne(query);
    return entities;
  } catch (err) {
    throw err;
  }
};
export const findEntityByNameAndOrganization = async (name: string, organizationId: string) => {
  try {
    const entityDetails = await Entity.findOne(
      { name, organizationId },
      null, // Projection (null means no specific fields are excluded or included)
      { collation: { locale: 'en', strength: 2 } } // Case-sensitive collation
    );
    return entityDetails;
  } catch (err) {
    throw err;
  }
};

export const findEntityById = async (id: any) => {
  try {
    const entityDetails = await Entity.findById(id);

    return entityDetails;
  } catch (err) {
    throw err;
  }
};

interface FieldOption {
  label: string;
  value: {
    attributeId: Types.ObjectId;
    refAttributeId?: Types.ObjectId;
    isDerived?: boolean;
    type?:string;
  };
}

export const getEntityFieldOptions = async (entityId: string): Promise<FieldOption[]> => {
  const fieldOptions: FieldOption[] = [];

  const entity = await Entity.findById(entityId).lean();
  if (!entity || !Array.isArray(entity.attributes)) return fieldOptions;

  for (const attr of entity.attributes) {
    const attributeId = (attr as any)?._id;

    if (attr.referenceEntitySetting?.refEntityId) {
      const refEntityId = attr.referenceEntitySetting.refEntityId;
      const refEntity = await Entity.findById(refEntityId).lean();
      if (!refEntity || !Array.isArray(refEntity.attributes)) continue;

      for (const refAttr of refEntity.attributes) {
        const refAttributeId = (refAttr as any)?._id;
        fieldOptions.push({
          label: `${attr.name}.${refAttr.name}`,
          value: {
            attributeId,
            refAttributeId: refAttributeId,
            type: refAttr?.type || 'text'
          },
        });
      }
    } else {
      fieldOptions.push({
        label: attr.name,
        value: { 
          attributeId, 
          type: attr?.type || 'text' 
        },
      });
    }
  }

  // 2. Derived fields
  const derivedFields: any = await getAllDerivedFields({ entityId });
  for (const df of derivedFields) {
    fieldOptions.push({
      label: `${df.name}`,
      value: {
        attributeId: df._id,
        isDerived: true,
        type: df?.type || 'text' 
      },
    });
  }

  return fieldOptions;
};

export async function updateEntityAttributeOptionId({ entityId, attributeName, attributeType, optionAttributeId }) {
  try {
    const result = await Entity.updateOne(
      {
        _id: entityId,
        attributes: {
          $elemMatch: {
            name: attributeName,
            type: attributeType,
          },
        },
      },
      {
        $set: {
          'attributes.$.optionAttributeId': optionAttributeId,
        },
      }
    );

    return result;
  } catch (error) {
    console.error(`Failed to update attribute "${attributeName}":`, error);
    throw error;
  }
}
