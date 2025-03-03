import Entity from '../database/models/entity';

export async function seedEntities(payload) {
  // Check if the entity already exists
  const existingEntity = await Entity.findById(payload.entityId);

  if (!existingEntity) {
    // If it doesn't exist, create a new entity
    const newEntity = new Entity({
      _id: payload.entityId,
      name: payload.name,
      description: payload.description,
      attributes: payload.attributes, // Array of attributes
      organizationId: payload.organizationId,
      createdBy: payload.createdBy,
      updatedBy: payload.updatedBy,
      isActive: payload.isActive,
    });

    await newEntity.save();
    console.info(`New entity with payload ${payload} created successfully.`);
  } else {
    console.info(`New entity with entity id ${payload.entityId} already exists.`);
  }
}
