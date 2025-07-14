import Organization from '../database/models/organization';
// import User from '../database/models/user';

export async function seedOrganizations(payload) {
  // Check if the organization already exists
  const reportivixExistingOrganization = await Organization.findById(payload.reportivixOrganizationId);

  if (!reportivixExistingOrganization) {
    // If it doesn't exist, create a new organization
    const newOrganization = new Organization({
      _id: payload.reportivixOrganizationId,
      name: 'reportivix',
      owner: payload.reportivixAdminUserId,
      isMaster: true,
      code: 'reportivix',
      status: 'active',
    });

    await newOrganization.save();
    console.info('Reportivix Organization created successfully.');
  }

  const sabicExistingOrganization = await Organization.findById(payload.sabicOrganizationId);

  if (!sabicExistingOrganization) {
    // If it doesn't exist, create a new organization
    const newOrganization = new Organization({
      _id: payload.sabicOrganizationId,
      name: 'sabic',
      owner: payload.reportivixSuperAdminUserId,
      isMaster: true,
      code: 'sabic',
      status: 'active',
    });

    await newOrganization.save();
    console.info('Sabic Organization created successfully.');
  }
}
