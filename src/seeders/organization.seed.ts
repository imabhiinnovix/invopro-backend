import Organization from '../database/models/organization';
// import User from '../database/models/user';

export async function seedOrganizations(payload) {
  // Check if the organization already exists
  const existingOrganization = await Organization.findById(payload.organizationId);

  if (!existingOrganization) {
    // If it doesn't exist, create a new organization
    const newOrganization = new Organization({
      _id: payload.organizationId,
      name: 'Searchivix',
      owner: payload.adminUserId,
      isMaster: true,
      licenseExpiresAt: new Date('2025-12-31'),
    });

    await newOrganization.save();
    console.info('Organization created successfully.');
  }

  const updateStatus = await Organization.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
  console.info(`Updated ${updateStatus.modifiedCount} organizations with status.`);

  const updateLicense = await Organization.updateMany(
    { totalLicenses: { $exists: false } },
    { $set: { totalLicenses: 50 } }
  );
  console.info(`Updated ${updateLicense.modifiedCount} organizations with totalLicenses.`);

  const updateLicenseExpiresAt = await Organization.updateMany(
    { licenseExpiresAt: { $exists: false } },
    { $set: { licenseExpiresAt: new Date('2025-12-31') } }
  );
  console.info(`Updated ${updateLicenseExpiresAt.modifiedCount} organizations with licenseExpiresAt.`);
}
