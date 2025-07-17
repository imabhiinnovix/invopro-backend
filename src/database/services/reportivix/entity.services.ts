/* eslint-disable @typescript-eslint/no-explicit-any */
import Entity from '../../models/reportivix/entity';

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
    // Remove the await keyword here
    let usersQuery: any = Entity.find(query)
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
    const entities = await usersQuery.exec();

    const totalCount = await Entity.countDocuments(query);

    return { data: entities, totalCount };
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

export const findEntityById = async (id: string) => {
  try {
    const entityDetails = await Entity.findById(id);

    return entityDetails;
  } catch (err) {
    throw err;
  }
};
