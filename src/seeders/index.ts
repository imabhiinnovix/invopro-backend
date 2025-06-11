import mongoose from 'mongoose';

import config from '../config';
import { seedUsers } from './user.seed';
import { seedOrganizations } from './organization.seed';
// import { seedCustomReports } from './customReport.seed';
// import path from 'path';
import { seedChart } from './widget_Type_chart.seed';
import { seedOperators } from './operators.seed';
import { seedWidgetTheme } from './widgetTheme.seed';
// import { seedDashboardWidget } from './dashboardWidget.seed';
import { seedDashboard } from './dashboard.seed';
import { seedEntities } from './entities.seed';

const payload = {
  reportivixSuperAdminUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e312'),
  reportivixAdminUserId: new mongoose.Types.ObjectId('64d229e76e4d3f1d2f9f3e8c'),
  reportivixTestUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e360'),

  sabicAdminUserId: new mongoose.Types.ObjectId('67caac8cc4f70d4fdbdb7299'),
  mahuaAdminUserId: new mongoose.Types.ObjectId('67cb46f5fd7215371ed92173'),
  //organization
  reportivixOrganizationId: new mongoose.Types.ObjectId('66de96d3548d06560e2931cb'),
  sabicOrganizationId: new mongoose.Types.ObjectId('67caac1ec4f70d4fdbdb7294'),

  pieChartId: new mongoose.Types.ObjectId('67e5011c966d261de673d1f1'),
  lineChartId: new mongoose.Types.ObjectId('67e68fd541db187651d5e6b8'),
  areaChartId: new mongoose.Types.ObjectId('67f3a9f7a3668434210f2e18'),
  numberChartId: new mongoose.Types.ObjectId('67f3a9f7a3668434210f2e1b'),
  horizontalBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7ba6'),
  verticalBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7ba9'),
  stackedBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bac'),
  bubbleChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7baf'),
  doughnutChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb2'),
  multiSeriesPieChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb5'),
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
    await seedUsers(payload);

    console.info('\n====> Seeding Entities Widget <====');
    await seedEntities(payload);

    console.info('\n====> Seeding organizations <====');
    await seedOrganizations(payload);

    console.info('\n====> Seeding Dashboard <====');
    await seedDashboard();

    console.info('\n====> Seeding Chart <====');
    await seedChart(payload);

    console.info('\n====> Seeding Operators <====');
    await seedOperators();

    console.info('\n====> Seeding Widget Theme <====');
    await seedWidgetTheme(payload);

    // console.info('\n====> Seeding Dashboard Widget <====');
    // await seedDashboardWidget();

    console.log('\nDatabase seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
