import Dashboard from '../database/models/dashboard';

const defaultSettings = {
  columnsGrid: 2,
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
    $or: [{ 'settings.columnsGrid': { $exists: false } }],
  });

  for (const dashboard of dashboards) {
    const settings = {
      columnsGrid: dashboard.settings?.columnsGrid || defaultSettings.columnsGrid,
    };

    dashboard.settings = settings;

    await dashboard.save();
  }
  console.info(`Updated ${dashboards.length} dashboards with settings.`);
}
