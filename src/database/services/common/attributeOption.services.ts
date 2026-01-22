/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Types } from 'mongoose';
import Attribute from '../../models/common/attributeOption';

export const createAttribute = async (attributeData: any) => {
  try {
    const attribute = new Attribute(attributeData);
    await attribute.save();
    return attribute;
  } catch (err) {
    throw err;
  }
};

export const updateAttribute = async (attributeId: string, attributeData: any) => {
  try {
    const attributeResp = await Attribute.findByIdAndUpdate(attributeId, attributeData, { new: true });
    return attributeResp;
  } catch (err) {
    throw err;
  }
};

export const addAttributeValueById = async (id: string | Types.ObjectId, newValue: string) => {
  try {
    const result = await Attribute.updateOne(
      { _id: new Types.ObjectId(id) },
      { $addToSet: { attributeValue: newValue } }
    );

    return result;
  } catch (error) {
    throw new Error(`Failed to add attribute value: ${error}`);
  }
};

export const getAttributeList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let usersQuery: any = Attribute.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        usersQuery = usersQuery.populate(field);
      });
    }

    // Now await the final query execution
    const attributes = await usersQuery.exec();

    const totalCount = await Attribute.countDocuments(query);

    return { data: attributes, totalCount };
  } catch (err) {
    throw err;
  }
};

export const findAttributeByNameAndOrganization = async (attributeName: string, organizationId: string) => {
  try {
    const attributeData = await Attribute.findOne(
      { attributeName, organizationId },
      null, // Projection (null means no specific fields are excluded or included)
      { collation: { locale: 'en', strength: 2 } } // Case-sensitive collation
    );
    return attributeData;
  } catch (err) {
    throw err;
  }
};

export const findAttributeOptionById = async (id: string) => {
  try {
    const attributeDetails = await Attribute.findById(id);

    return attributeDetails;
  } catch (err) {
    throw err;
  }
};

interface GetAttributeOptionExecutionParams {
  pipeline: any[];
  page?: number;
  limit?: number;
  paginate?: boolean;
  matchQuery?: Record<string, any>;
}

export const executeAttributeOptionQuery = async ({
  pipeline,
  page = 1,
  limit = 10,
  paginate = false,
  matchQuery = {},
}: GetAttributeOptionExecutionParams) => {
  const fullPipeline = [...pipeline];

  if (paginate) {
    const skip = (page - 1) * limit;
    fullPipeline.push({ $skip: skip }, { $limit: limit });
  }

  const [data, totalCount] = await Promise.all([
    Attribute.aggregate(fullPipeline),
    Attribute.countDocuments(matchQuery),
  ]);

  return { data, totalCount };
};

export const updateAttributeOptionsByQuery = async ({
  query,
  updateFields,
}: {
  query: Record<string, any>;
  updateFields: Record<string, any>;
}) => {
  try {
    const result = await Attribute.updateMany(
      query,
      { $set: updateFields }
    );

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (err) {
    throw err;
  }
};

