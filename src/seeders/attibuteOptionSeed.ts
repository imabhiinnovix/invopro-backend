import mongoose from 'mongoose';
import AttributeOption from '../database/models/common/attributeOption';

/**
 * Converts the attributeOptionMap into an array of objects ready to seed.
 */
function getAttributeOptionsToSeed(attributeOptionMap, organizationId, createdBy, updatedBy) {
  const options: any = [];

  for (const key in attributeOptionMap) {
    if (attributeOptionMap[key]) {
      const { id, name, value } = attributeOptionMap[key];
      options.push({
        id,
        attributeName: name,
        organizationId,
        attributeValue: value,
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
      await AttributeOption.findByIdAndUpdate(
        new mongoose.Types.ObjectId(item.id),
        {
          $set: {
            attributeName: item.attributeName,
            organizationId: new mongoose.Types.ObjectId(organizationId),
            attributeValue: item.attributeValue,
            isActive: true,
            updatedBy: item.updatedBy,
          },
          $setOnInsert: {
            createdBy: item.createdBy,
          },
        },
        { upsert: true, new: true }
      );
    }

    console.log('✅ Attribute options seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding attribute options:', error);
    throw error;
  }
};
