import Attribute from '../models/attributeOption';

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

export const findAttributeByName = async (attributeName: string) => {
  try {
    const attributeData = await Attribute.findOne(
      { attributeName },
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
