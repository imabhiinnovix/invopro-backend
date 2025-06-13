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
      licenseExpiresAt: new Date('2025-12-31'),
      code: 'reportivix',
      status: 'active',
      totalLicenses: 10,
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
      licenseExpiresAt: new Date('2025-12-31'),
      code: 'sabic',
      status: 'active',
      totalLicenses: 10,
    });

    await newOrganization.save();
    console.info('Sabic Organization created successfully.');
  }

  const updateLicenseExpiresAt = await Organization.updateMany(
    { licenseExpiresAt: { $exists: false } },
    { $set: { licenseExpiresAt: new Date('2025-12-31') } }
  );
  console.info(`Updated ${updateLicenseExpiresAt.modifiedCount} organizations with licenseExpiresAt.`);
}
