import Entity from '../models/entity';

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
