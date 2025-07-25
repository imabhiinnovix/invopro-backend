import Organization from '../database/models/common/organization';
import { Types } from 'mongoose';

interface OrganizationSeedInput {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  code: string;
  isMaster?: boolean;
  status?: 'active' | 'inactive';
}

export async function seedOrganizations(payload: OrganizationSeedInput[]) {
  for (const org of payload) {
    const existingOrg: any = await Organization.findById(org._id);

    if (existingOrg) {
      if (existingOrg.get('licenseExpiresAt')) {
        await Organization.findByIdAndDelete(org._id);
        console.info(`🗑️ Deleted existing organization "${org.name}" with licenseExpiresAt.`);
      } else {
        console.info(`ℹ️ Organization "${org.name}" already exists (no licenseExpiresAt).`);
        continue;
      }
    }

    const newOrg = new Organization({
      _id: org._id,
      name: org.name,
      owner: org.owner,
      code: org.code,
      isMaster: org.isMaster ?? false,
      status: org.status ?? 'active',
    });

    await newOrg.save();
    console.info(`✅ Organization "${org.name}" created successfully.`);
  }
}
