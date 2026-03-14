/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

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
import { seedDataSource } from './dataSource.seed';
// import { seedCustomReports } from './customReport.seed';
import { seedProducts } from './product.seed';
import { seedRolesAndPermissions } from './seedRoleAndPermission';
import { seedPermissions } from './permission.seed';
import { createProductSubscription } from './organizationHasProduct.seed';
import { seedDashboardsForOrganization } from './userLevelDashboard.seed';
import { seedAttributeOptions } from './attibuteOptionSeed';
import { seedDerivedField } from './derivedField.seed';

const payload = {
  reportivixSuperAdminUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e312'),
  reportivixAdminUserId: new mongoose.Types.ObjectId('64d229e76e4d3f1d2f9f3e8c'),
  reportivixTestUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e360'),

  sabicAdminUserId: new mongoose.Types.ObjectId('67caac8cc4f70d4fdbdb7299'),
  mahuaAdminUserId: new mongoose.Types.ObjectId('67cb46f5fd7215371ed92173'),
  //organization
  reportivixOrganizationId: new mongoose.Types.ObjectId('66de96d3548d06560e2931cb'),
  sabicOrganizationId: new mongoose.Types.ObjectId('67caac1ec4f70d4fdbdb7294'),

  invoicivixVendorProductId: new mongoose.Types.ObjectId('6870c9e335f4e90221de9ece'),

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
  tabularChartId: new mongoose.Types.ObjectId('67f75cd8b28822189f7ae71d'),
  stackedBarLineId: new mongoose.Types.ObjectId('68cd5d2a33e110208844cfc8'),
  comboBarLineId: new mongoose.Types.ObjectId('68cd5d2a33e110208844cfcb'),
  widgetThemeId: new mongoose.Types.ObjectId('67f783d7d2001cac19c75961'),
  widgetSabicThemeId: new mongoose.Types.ObjectId('67f783d7d2001cac19c75962'),
};


export async function seedDatabase() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.info(`MongoDB Connected: ${conn.connection.host}`);
    console.info('\n====> Seeding organizations <====');
    await seedOrganizations([
      {
        _id: payload.reportivixOrganizationId,
        name: 'ReportiVix',
        owner: payload.reportivixSuperAdminUserId,
        code: 'reportivix',
        isMaster: true,
      },
      {
        _id: payload.sabicOrganizationId,
        name: 'SABIC',
        owner: payload.sabicAdminUserId,
        code: 'sabic',
      },
    ]);

    console.info('\n====> Seeding Widget Theme <====');
    await seedWidgetTheme({
      ...payload,
      organizationId: payload.reportivixOrganizationId,
      superAdminUserId: payload.reportivixSuperAdminUserId,
      widgetThemeId: payload.widgetThemeId
    });
    await seedWidgetTheme({
      ...payload,
      organizationId: payload.sabicOrganizationId,
      superAdminUserId: payload.reportivixSuperAdminUserId,
      widgetThemeId: payload.widgetSabicThemeId
    });

    await seedPermissions([]);

    await seedProducts(payload);

    await createProductSubscription([
      {
        organizationId: payload.reportivixOrganizationId,
        productIds: [payload.invoicivixVendorProductId],
        status: 'active',
        totalLicenses: 10,
        durationInMonths: 12,
      },
      {
        organizationId: payload.sabicOrganizationId,
        productIds: [payload.invoicivixVendorProductId],
        status: 'active',
        totalLicenses: 10,
        durationInMonths: 12,
      },
    ]);

    await seedRolesAndPermissions({ organizationId: [payload.reportivixOrganizationId, payload.sabicOrganizationId] });
    await seedUsers([
      {
        organizationId: payload.reportivixOrganizationId,
        isMaster: true,
        users: [
          {
            email: 'superadmin@reportivix.com',
            password: 'Superadmin@1234',
            firstName: 'Super',
            lastName: 'Admin',
            type: 'superadmin',
            customId: payload.reportivixSuperAdminUserId,
          },
          {
            email: 'admin@reportivix.com',
            password: 'Admin@1234',
            firstName: 'Admin',
            lastName: 'User',
            type: 'admin',
            customId: payload.reportivixAdminUserId,
          },
          {
            email: 'test@reportivix.com',
            password: 'Test@1234',
            firstName: 'Test',
            lastName: 'User',
            type: 'user',
            customId: payload.reportivixTestUserId,
          },
        ],
      },
      {
        organizationId: payload.sabicOrganizationId,
        isMaster: false,
        users: [
          {
            email: 'cs.sabic@innovix-labs.com',
            password: 'Sabic@1234',
            firstName: 'Sabic',
            lastName: 'Admin',
            type: 'admin',
            customId: payload.sabicAdminUserId,
          },
          {
            email: 'mahua.dutta@sabic.com',
            password: 'Sabic@1234',
            firstName: 'Mahua',
            lastName: 'Dutta',
            type: 'admin',
            customId: payload.mahuaAdminUserId,
          },
        ],
      },
    ]);


    console.info('\n====> Seeding Dashboard <====');
    await seedDashboard();

    console.info('\n====> Seeding Chart <====');
    await seedChart(payload);

    console.info('\n====> Seeding Operators <====');
    await seedOperators();

    console.log('\nDatabase seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
