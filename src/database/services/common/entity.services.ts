/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

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
    refAttributeId?: Types.ObjectId[];
    isDerived?: boolean;
    type?:string;
    optionAttributeId?:any;
  };
}

// export const getEntityFieldOptions = async (entityId: string): Promise<FieldOption[]> => {
//   const visited = new Set<string>(); // avoid circular references

//   const buildOptions = async (
//     currentEntityId: string,
//     pathLabels: string[] = [],
//     attributeIdChain: Types.ObjectId[] = []
//   ): Promise<FieldOption[]> => {
//     const options: FieldOption[] = [];

//     const entity = await Entity.findById(currentEntityId).lean();
//     if (!entity || !Array.isArray(entity.attributes)) return options;

//     for (const attr of entity.attributes) {
//       const currentAttrId = (attr as any)?._id;
//       const currentLabelPath = [...pathLabels, attr.name];
//       const currentRefPath = [...attributeIdChain, currentAttrId];

//       const refSetting = attr.referenceEntitySetting;

//       // Always include the current field itself
//       options.push({
//         label: currentLabelPath.join('.'),
//         value: {
//           attributeId: currentAttrId,
//           refAttributeId: attributeIdChain,
//           type: attr?.type || 'text',
//           optionAttributeId: attr?.optionAttributeId || null
//         },
//       });

//       // If it has a reference entity
//       if (refSetting?.refEntityId) {
//         const nestedEntityId = refSetting.refEntityId.toString();
//         const relationType = refSetting.relationType;

//         if (!visited.has(nestedEntityId)) {
//           visited.add(nestedEntityId);

//           const nestedEntity: any = await Entity.findById(nestedEntityId).lean();
//           if (!nestedEntity || !Array.isArray(nestedEntity.attributes)) continue;

//           for (const subAttr of nestedEntity.attributes) {
//             // Skip the refFieldId itself for mapping relations
//             if (
//               (relationType === 'mapping_one_to_one' || relationType === 'mapping_many_to_one') &&
//               refSetting.refEntityField?.toString() === subAttr._id.toString()
//             ) {
//               continue;
//             }

//             const nestedLabelPath = [...currentLabelPath, subAttr.name];
//             const nestedRefPath = [...currentRefPath, subAttr._id];

//             // Count repetitions of attribute name in path
//             const repeatedCount = nestedLabelPath.filter(l => l === subAttr.name).length;

//             // Always push the sub-attribute
//             options.push({
//               label: nestedLabelPath.join('.'),
//               value: {
//                 attributeId: currentAttrId,
//                 refAttributeId: nestedRefPath,
//                 type: subAttr.type || 'text',
//                 optionAttributeId: subAttr?.optionAttributeId || null
//               },
//             });

//             // Stop recursion if repeated more than 2 times
//             if (repeatedCount > 2) {
//               // Still include leaf attributes if any
//               if (subAttr.referenceEntitySetting?.refEntityId) {
//                 const leafEntity: any = await Entity.findById(subAttr.referenceEntitySetting.refEntityId).lean();
//                 if (leafEntity?.attributes) {
//                   for (const leafAttr of leafEntity.attributes) {
//                     const leafLabelPath = [...nestedLabelPath, leafAttr.name];
//                     const leafRefPath = [...nestedRefPath, leafAttr._id];
//                     options.push({
//                       label: leafLabelPath.join('.'),
//                       value: {
//                         attributeId: currentAttrId,
//                         refAttributeId: leafRefPath,
//                         type: leafAttr.type || 'text',
//                         optionAttributeId: leafAttr?.optionAttributeId || null
//                       },
//                     });
//                   }
//                 }
//               }
//               continue; // do not recurse further
//             }

//             // Normal recursion
//             if (subAttr.referenceEntitySetting?.refEntityId) {
//               const nestedOptions = await buildOptions(
//                 subAttr.referenceEntitySetting.refEntityId.toString(),
//                 nestedLabelPath,
//                 nestedRefPath
//               );
//               options.push(...nestedOptions);
//             }
//           }
//         }
//       }
//     }

//     return options;
//   };

//   const fieldOptions = await buildOptions(entityId);

//   // Add derived fields
//   const derivedFields: any = await getAllDerivedFields({ entityId });
//   for (const df of derivedFields) {
//     fieldOptions.push({
//       label: df.name,
//       value: {
//         attributeId: df._id,
//         refAttributeId: [],
//         isDerived: true,
//         type: df?.type || 'text',
//         optionAttributeId: df?.optionAttributeId || null
//       },
//     });
//   }

//   return fieldOptions;
// };


// Utility function to clean up duplicate trailing segments
function trimTrailingRepeats(label: string): string {
  const parts = label.split(".");
  if (parts.length < 3) return label;

  let last = parts[parts.length - 1];
  let count = 0;

  // Count consecutive repeats from the end
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === last) {
      count++;
    } else {
      break;
    }
  }

  // If more than 2 repeats, trim
  if (count > 2) {
    parts.splice(parts.length - count + 2); // keep only 2 occurrences
  }

  return parts.join(".");
}


export const getEntityFieldOptions = async (entityId: string): Promise<FieldOption[]> => {
  const buildOptions = async (
    currentEntityId: string,
    pathLabels: string[] = [],
    attributeIdChain: Types.ObjectId[] = [],
    visited = new Set<string>() // moved inside, so we can reset per root attr
  ): Promise<FieldOption[]> => {
    const options: FieldOption[] = [];

    const entity = await Entity.findById(currentEntityId).lean();
    if (!entity || !Array.isArray(entity.attributes)) return options;

    for (const attr of entity.attributes) {
      // ✅ Reset visited for each root-level attribute (only when pathLabels is empty)
      const localVisited = pathLabels.length === 0 ? new Set<string>() : visited;

      const currentAttrId = (attr as any)?._id;
      const currentLabelPath = [...pathLabels, attr.name];
      const currentRefPath = [...attributeIdChain, currentAttrId];

      const refSetting = attr.referenceEntitySetting;

      // Always include the current field itself
      options.push({
        label: currentLabelPath.join('.'),
        value: {
          attributeId: currentAttrId,
          refAttributeId: attributeIdChain,
          type: attr?.type || 'text',
          optionAttributeId: attr?.optionAttributeId || null,
        },
      });

      // If it has a reference entity
      if (refSetting?.refEntityId) {
        const nestedEntityId = refSetting.refEntityId.toString();
        const relationType = refSetting.relationType;

        if (!localVisited.has(nestedEntityId)) {
          localVisited.add(nestedEntityId);

          const nestedEntity: any = await Entity.findById(nestedEntityId).lean();
          if (!nestedEntity || !Array.isArray(nestedEntity.attributes)) continue;

          for (const subAttr of nestedEntity.attributes) {
            // Skip the refFieldId itself for mapping relations
            if (
              (relationType === 'mapping_one_to_one' || relationType === 'mapping_many_to_one') &&
              refSetting.refEntityField?.toString() === subAttr._id.toString()
            ) {
              continue;
            }

            const nestedLabelPath = [...currentLabelPath, subAttr.name];
            const nestedRefPath = [...currentRefPath, subAttr._id];

            // Recurse if the sub-attribute itself is a reference
            if (subAttr.referenceEntitySetting?.refEntityId) {
              const nestedOptions = await buildOptions(
                subAttr.referenceEntitySetting.refEntityId.toString(),
                nestedLabelPath,
                nestedRefPath,
                localVisited // pass same visited for sublevels
              );
              options.push(...nestedOptions);
            } else {
              const [rootAttributeId, ...refAttributeId] = nestedRefPath;
              options.push({
                label: nestedLabelPath.join('.'),
                value: {
                  attributeId: rootAttributeId,
                  refAttributeId,
                  type: subAttr.type || 'text',
                  optionAttributeId: subAttr?.optionAttributeId || null,
                },
              });
            }
          }
        }
      }
    }

    return options;
  };

  // Example usage
  const fieldOptions = await buildOptions(entityId);

  // Add derived fields
  const derivedFields: any = await getAllDerivedFields({ entityId });
  for (const df of derivedFields) {
    fieldOptions.push({
      label: df.name,
      value: {
        attributeId: df._id,
        refAttributeId: [],
        isDerived: true,
        type: df?.type || 'text',
        optionAttributeId: df?.optionAttributeId || null,
      },
    });
  }

  // Cleanup duplicate trailing labels
  for (const option of fieldOptions) {
    option.label = trimTrailingRepeats(option.label);
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
