import Dashboard from '../database/models/dashboard';

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
}
