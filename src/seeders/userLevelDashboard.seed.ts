/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import User from '../database/models/common/user';
import Dashboard from '../database/models/common/dashboard';

import { Types } from 'mongoose';
import dashboardWidget from '../database/models/common/dashboardWidget';

export async function seedDashboardsForOrganization({
  organizationId,
  widgetThemeId,
  dashboardName,
  dashboardDescription,
  dashboardSettings,
  widgets,
  entityDataSourceMap,
}: {
  organizationId: Types.ObjectId;
  widgetThemeId: Types.ObjectId;
  dashboardName: string;
  dashboardDescription?: string;
  dashboardSettings?: any;
  widgets?: any[];
  entityDataSourceMap: any;
}) {
  try {
    // Fetch all users for this organization
    const users = await User.find({ organizationId }).lean();

    if (!users.length) {
      console.log(`No users found for organization ${organizationId}`);
      return;
    }

    const dashboardsToInsert: any[] = [];

    for (const user of users) {
      // Check if dashboard already exists for this user
      const exists = await Dashboard.findOne({
        createdBy: user._id,
        name: dashboardName,
      });

      if (exists) {
        console.log(`Dashboard already exists for user ${user._id}, skipping.`);
        continue;
      }

      dashboardsToInsert.push({
        createdBy: user._id,
        organizationId: organizationId,
        widgetThemeId: widgetThemeId,
        name: dashboardName,
        description: dashboardDescription || '',
        isDefaultNotivix: true,
        settings: {
          columnsGrid: 2,
          dashboardType: 'normal',
          startVersionValue: '',
          endVersionValue: '',
          dynamicVersionValue: '1m',
          dataSourceId: entityDataSourceMap.case_list.dataSourceId,
        },
        isActive: true,
        isShareble: false,
        isDeleted: false,
      });
    }

    if (dashboardsToInsert.length > 0) {
      const createdDashboards = await Dashboard.insertMany(dashboardsToInsert);

      console.log(`Inserted ${createdDashboards.length} dashboards for organization ${organizationId}`);

      // 👇 Attach widgets for each dashboard
      if (widgets?.length) {
        const widgetsToInsert: any[] = [];

        for (const dashboard of createdDashboards) {
          for (const widgetDef of widgets) {
            widgetsToInsert.push({
              ...widgetDef,
              dashboardId: dashboard._id,
              organizationId: organizationId,
              createdBy: dashboard.createdBy,
              isDeleted: false,
              isActive: true,
            });
          }
        }

        if (widgetsToInsert.length) {
          await dashboardWidget.insertMany(widgetsToInsert);
          console.log(`Inserted ${widgetsToInsert.length} widgets for dashboards`);
        }
      }
    } else {
      console.log(`No new dashboards created for organization ${organizationId}`);
    }
  } catch (err) {
    console.error('Error seeding dashboards:', err);
    throw err;
  }
}
