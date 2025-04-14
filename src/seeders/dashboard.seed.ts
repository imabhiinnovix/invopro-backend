import Dashboard from '../database/models/dashboard';

export async function seedDashboard() {
  const updateIsShareble = await Dashboard.updateMany(
    { isShareble: { $exists: false } },
    { $set: { isShareble: false } }
  );

  console.info(`Updated ${updateIsShareble.modifiedCount} dashboard with isShareble.`);
}
