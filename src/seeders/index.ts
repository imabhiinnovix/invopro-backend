import mongoose from 'mongoose';

import config from '../config';
// import { seedUsers } from './user.seed';
// import { seedOrganizations } from './organization.seed';
// import { seedCustomReports } from './customReport.seed';
// import path from 'path';
import { seedChart } from './widget_Type_chart.seed';
import { seedOperators } from './operators.seed';
import { seedWidgetTheme } from './widgetTheme.seed';
import { seedDashboardWidget } from './dashboardWidget.seed';
import { seedDashboard } from './dashboard.seed';

const payload = {
  superAdminUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e312'),
  adminUserId: new mongoose.Types.ObjectId('64d229e76e4d3f1d2f9f3e8c'),
  testUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e360'),
  organizationId: new mongoose.Types.ObjectId('66de96d3548d06560e2931cb'),
  superAdminWorkspaceId: new mongoose.Types.ObjectId('670fa939dd2e7e82ec55ac4d'),
  adminWorkspaceId: new mongoose.Types.ObjectId('670fa947dd2e7e82ec55ac4e'),
  userWorkspaceId: new mongoose.Types.ObjectId('66c6f88773caaef93d40807a'),
  pieChartId: new mongoose.Types.ObjectId('67e5011c966d261de673d1f1'),
  lineChartId: new mongoose.Types.ObjectId('67e68fd541db187651d5e6b8'),
  areaChartId: new mongoose.Types.ObjectId('67f3a9f7a3668434210f2e18'),
  numberChartId: new mongoose.Types.ObjectId('67f3a9f7a3668434210f2e1b'),
  horizontalBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7ba6'),
  verticalBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7ba9'),
  stackedBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bac'),
  bubbleChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7baf'),
  doughnutChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb2'),
  multiSeriesBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb5'),
  polarAreaChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb8'),
  radarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bbb'),
  scatterChartId: new mongoose.Types.ObjectId('67f75cd8b28822189f7ae71c'),
  widgetThemeId: new mongoose.Types.ObjectId('67f783d7d2001cac19c75961'),
};

export async function seedDatabase() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.info(`MongoDB Connected: ${conn.connection.host}`);

    // Seed individual collections
    console.info('\n====> Seeding users <====');
    // await seedUsers(payload);

    console.info('\n====> Seeding organizations <====');
    // await seedOrganizations(payload);

    console.info('\n====> Seeding monthly ip <====');
    // await seedCustomReports({
    //   _id: '66b34cbbd40e24fca2e3e313',
    //   reportName: 'monthlyip',
    //   functionName: 'generateMonthlyIpReport',
    //   dataSourceIds: [
    //     {
    //       code: 'portfolio',
    //       dataSourceId: '67923590d31b8f4ea211147b',
    //       fileDetails: [{ name: 'Complete Portfolio',isRequired:true }, { name: 'Complete Portfolio _SHPP' ,isRequired:false }],
    //     },
    //     {
    //       code: 'disclosure',
    //       dataSourceId: '6792332a753ceb4945e5b3b8',
    //       fileDetails: [{ name: 'All Disclosures',,isRequired:true  }, { name: 'All Disclosures _SHPP' ,isRequired:false }],
    //     },
    //     { code: 'sabicip', dataSourceId: '67a3226221f5f8dd752ce644', fileDetails: [{ name: 'AnnuitiesDueList_SHPP' ,isRequired:false }] },
    //     {
    //       code: 'ctclinsab',
    //       dataSourceId: '67a33c7f22cb8a927a85e427',
    //       fileDetails: [{ name: 'AnnuitiesDueList_Linde',,isRequired:true  }],
    //     },
    //     {
    //       code: 'annuities',
    //       dataSourceId: '67a3429322cb8a927a85e4b9',
    //       fileDetails: [{ name: 'AnnuitiesDueList_CPi' ,isRequired:true }],
    //     },
    //   ],
    //   organizationId: payload.organizationId,
    //   sampleFilePath: path.join('reports', 'sample', 'sample-monthly-ip-report.xlsx'),
    // });
    // await seedCustomReports({
    //   _id: '66b34cbbd40e24fca2e3e314',
    //   reportName: 'supplementalip',
    //   functionName: 'generateSupplementalIpReport',
    //   dataSourceIds: [
    //     {
    //       code: 'portfolio',
    //       dataSourceId: '67923590d31b8f4ea211147b',
    //       fileDetails: [{ name: 'Complete Portfolio' ,isRequired:true }, { name: 'Complete Portfolio _SHPP' ,isRequired:false}],
    //     },
    //     {
    //       code: 'disclosure',
    //       dataSourceId: '6792332a753ceb4945e5b3b8',
    //       fileDetails: [{ name: 'All Disclosures',isRequired:true  }, { name: 'All Disclosures _SHPP',isRequired:false  }],
    //     },
    //     { code: 'sabicip', dataSourceId: '67a3226221f5f8dd752ce644', fileDetails: [{ name: 'AnnuitiesDueList_SHPP' ,isRequired:false}] },
    //     {
    //       code: 'ctclinsab',
    //       dataSourceId: '67a33c7f22cb8a927a85e427',
    //       fileDetails: [{ name: 'AnnuitiesDueList_Linde' ,isRequired:true }],
    //     },
    //     {
    //       code: 'annuities',
    //       dataSourceId: '67a3429322cb8a927a85e4b9',
    //       fileDetails: [{ name: 'AnnuitiesDueList_CPi',isRequired:true  }],
    //     },
    //     {
    //       code: 'sabiccontracts',
    //       dataSourceId: '67c6d4eb9fb857c9aaf5319c',
    //       fileDetails: [{ name: 'SABIC Contracts' ,isRequired:true }],
    //     },
    //     {
    //       code: 'shppcontracts',
    //       dataSourceId: '67c6d4fd9fb857c9aaf531b1',
    //       fileDetails: [{ name: 'SHPP Contracts',isRequired:true  }],
    //     },
    //     {
    //       code: 'ksacontracts',
    //       dataSourceId: '67c6d50e9fb857c9aaf531c6',
    //       fileDetails: [{ name: 'KSA Contracts' ,isRequired:true }],
    //     },
    //     {
    //       code: 'attorneymapping',
    //       dataSourceId: '67c6d5279fb857c9aaf531db',
    //       fileDetails: [{ name: 'Required Mapping-Contracts', sheetName: 'Attorney Mapping',isRequired:true  }],
    //     },
    //     {
    //       code: 'agreementtypemapping',
    //       dataSourceId: '67c6d5499fb857c9aaf531f0',
    //       fileDetails: [{ name: 'Required Mapping-Contracts', sheetName: 'Agreement Type Mapping' ,isRequired:true }],
    //     },
    //     {
    //       code: 'ipanalystdashboard',
    //       dataSourceId: '67c6e4ba44cef11611823e70',
    //       fileDetails: [{ name: 'IP Analyst Dashboard' ,isRequired:true }],
    //     },
    //     {
    //       code: 'shppaccolade',
    //       dataSourceId: '67c6e4f144cef11611823e8a',
    //       fileDetails: [{ name: 'SHPP Accolade',isRequired:true  }],
    //     },
    //     {
    //       code: 'sabicaccolade',
    //       dataSourceId: '67c6e50a44cef11611823e9e',
    //       fileDetails: [{ name: 'SABIC Accolade',isRequired:true  }],
    //     },
    //   ],
    //   organizationId: payload.organizationId,
    //   sampleFilePath: '',
    // });

    console.info('\n====> Seeding Dashboard <====');
    await seedDashboard();

    console.info('\n====> Seeding Chart <====');
    await seedChart(payload);

    console.info('\n====> Seeding Operators <====');
    await seedOperators();

    console.info('\n====> Seeding Widget Theme <====');
    await seedWidgetTheme(payload);

    console.info('\n====> Seeding Dashboard Widget <====');
    await seedDashboardWidget();

    console.log('\nDatabase seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
