/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import Dashboard from '../database/models/common/dashboard';

const defaultSettings = {
  columnsGrid: 2,
  dashboardType: 'normal',
  startVersionValue: '',
  endVersionValue: '',
  dynamicVersionValue: '1m',
};

export async function seedDashboard() {
  const updateIsShareble = await Dashboard.updateMany(
    { isShareble: { $exists: false } },
    { $set: { isShareble: false } }
  );
  console.info(`Updated ${updateIsShareble.modifiedCount} dashboard with isShareble.`);

  const updateWidgetThemeId = await Dashboard.updateMany(
    { widgetThemeId: { $exists: false } },
    { $set: { widgetThemeId: null } }
  );
  console.info(`Updated ${updateWidgetThemeId.modifiedCount} dashboard with widgetThemeId.`);

  const dashboards = await Dashboard.find({
    $or: [
      { 'settings.columnsGrid': { $exists: false } },
      { 'settings.dashboardType': { $exists: false } },
      { 'settings.startVersionValue': { $exists: false } },
      { 'settings.endVersionValue': { $exists: false } },
      { 'settings.dynamicVersionValue': { $exists: false } },
    ],
  });

  for (const dashboard of dashboards) {
    const settings = {
      columnsGrid: dashboard.settings?.columnsGrid ?? defaultSettings.columnsGrid,
      dashboardType: dashboard.settings?.dashboardType ?? defaultSettings.dashboardType,
      startVersionValue: dashboard.settings?.startVersionValue ?? defaultSettings.startVersionValue,
      endVersionValue: dashboard.settings?.endVersionValue ?? defaultSettings.endVersionValue,
      dynamicVersionValue: dashboard.settings?.dynamicVersionValue ?? defaultSettings.dynamicVersionValue,
    };

    dashboard.settings = settings;

    await dashboard.save();
  }
  console.info(`Updated ${dashboards.length} dashboards with settings.`);
}
