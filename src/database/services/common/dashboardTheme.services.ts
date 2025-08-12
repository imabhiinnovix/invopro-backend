import { DashboardThemeModel } from '../../models/common/dashboardTheme';

// Create
export const createDashboardTheme = async (themeData: any) => {
  try {
    const theme = new DashboardThemeModel(themeData);
    await theme.save();
    return theme;
  } catch (err) {
    throw err;
  }
};

// Update
export const updateDashboardTheme = async (themeId: string, themeData: any) => {
  try {
    const updatedTheme = await DashboardThemeModel.findByIdAndUpdate(themeId, themeData, { new: true });
    return updatedTheme;
  } catch (err) {
    throw err;
  }
};

// Delete
export const deleteDashboardTheme = async (themeId: string) => {
  try {
    const deletedTheme = await DashboardThemeModel.findByIdAndDelete(themeId);
    return deletedTheme;
  } catch (err) {
    throw err;
  }
};
