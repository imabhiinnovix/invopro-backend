import mongoose from 'mongoose';

import config from '../config';
import { seedUsers } from './user.seed';
import { seedOrganizations } from './organization.seed';
import { seedCustomReports } from './customReport.seed';
import path from 'path';

const payload = {
  superAdminUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e312'),
  adminUserId: new mongoose.Types.ObjectId('64d229e76e4d3f1d2f9f3e8c'),
  testUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e360'),
  organizationId: new mongoose.Types.ObjectId('66de96d3548d06560e2931cb'),
  superAdminWorkspaceId: new mongoose.Types.ObjectId('670fa939dd2e7e82ec55ac4d'),
  adminWorkspaceId: new mongoose.Types.ObjectId('670fa947dd2e7e82ec55ac4e'),
  userWorkspaceId: new mongoose.Types.ObjectId('66c6f88773caaef93d40807a'),
};

export async function seedDatabase() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.info(`MongoDB Connected: ${conn.connection.host}`);

    // Seed individual collections
    console.info('\n====> Seeding users <====');
    await seedUsers(payload);

    console.info('\n====> Seeding organizations <====');
    await seedOrganizations(payload);

    console.info('\n====> Seeding monthly ip <====');
    await seedCustomReports({
      _id: '66b34cbbd40e24fca2e3e313',
      reportName: 'monthlyip',
      functionName: 'generateMonthlyIpReport',
      dataSourceIds: [
        {
          code: 'portfolio',
          dataSourceId: '67923590d31b8f4ea211147b',
          fileDetails: [{ name: 'Complete Portfolio' }, { name: 'Complete Portfolio _SHPP' }],
        },
        {
          code: 'disclosure',
          dataSourceId: '6792332a753ceb4945e5b3b8',
          fileDetails: [{ name: 'All Disclosures' }, { name: 'All Disclosures _SHPP' }],
        },
        { code: 'sabicip', dataSourceId: '67a3226221f5f8dd752ce644', fileDetails: [{ name: 'AnnuitiesDueList_SHPP' }] },
        {
          code: 'ctclinsab',
          dataSourceId: '67a33c7f22cb8a927a85e427',
          fileDetails: [{ name: 'AnnuitiesDueList_Linde' }],
        },
        {
          code: 'annuities',
          dataSourceId: '67a3429322cb8a927a85e4b9',
          fileDetails: [{ name: 'AnnuitiesDueList_CPi' }],
        },
      ],
      organizationId: payload.organizationId,
      sampleFilePath: path.join('reports', 'sample', 'sample-monthly-ip-report.xlsx'),
    });

    console.log('\nDatabase seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
