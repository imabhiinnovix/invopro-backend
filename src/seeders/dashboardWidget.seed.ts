import DashboardWidget from '../database/models/dashboardWidget';

export async function seedDashboardWidget() {
  const updateStatus = await DashboardWidget.updateMany(
    { widgetAppearanceId: { $exists: false } },
    { $set: { widgetAppearanceId: null } }
  );
  console.info(`Updated ${updateStatus.modifiedCount} dashboard widgets with widgetAppearanceId.`);
}
