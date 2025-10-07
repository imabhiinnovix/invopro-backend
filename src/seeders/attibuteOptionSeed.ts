import mongoose from 'mongoose';
import AttributeOption from '../database/models/common/attributeOption';

/**
 * Converts the attributeOptionMap into an array of objects ready to seed.
 */
function getAttributeOptionsToSeed(attributeOptionMap, organizationId, createdBy, updatedBy) {
  const options: any = [];

  for (const key in attributeOptionMap) {
    if (attributeOptionMap[key]) {
      const { id, attributeName, attributeValue } = attributeOptionMap[key];
      if (!attributeName) continue; // ✅ skip bad entries

      options.push({
        id,
        attributeName,
        organizationId,
        attributeValue,
        isActive: true,
        updatedBy: updatedBy || createdBy,
        createdBy,
      });
    }
  }

  return options;
}

/**
 * Seeds attribute options dynamically based on the provided attributeOptionMap.
 */
export const seedAttributeOptions = async ({ organizationId, createdBy, updatedBy, attributeOptionMap }) => {
  try {
    const dataToSeed = getAttributeOptionsToSeed(attributeOptionMap, organizationId, createdBy, updatedBy);

    for (const item of dataToSeed) {
      const existing = await AttributeOption.findById(item.id);
      const existingUniqueKey = await AttributeOption.findOne({
        attributeName: item.attributeName,
        organizationId: item.organizationId,
      });

      if (existingUniqueKey) continue;
      if (existing) {
        // ✅ Update only if it exists
        await AttributeOption.findByIdAndUpdate(
          item.id,
          {
            $set: {
              attributeName: item.attributeName,
              organizationId: new mongoose.Types.ObjectId(organizationId),
              attributeValue: item.attributeValue,
              isActive: true,
              updatedBy: item.updatedBy,
            },
          },
          { new: true }
        );
      } else {
        // ✅ Insert only if not exists
        await AttributeOption.create({
          _id: new mongoose.Types.ObjectId(item.id),
          attributeName: item.attributeName,
          organizationId: new mongoose.Types.ObjectId(organizationId),
          attributeValue: item.attributeValue,
          isActive: true,
          createdBy: item.createdBy,
          updatedBy: item.updatedBy,
        });
      }
    }

    console.log('✅ Attribute options seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding attribute options:', error);
    throw error;
  }
};
