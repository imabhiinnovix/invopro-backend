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

export const getDashboardThemeList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
  paginate = true,
}: any) => {
  try {
    let dashboardThemeQuery = DashboardThemeModel.find(query).select(select).sort(sort);

    // Apply pagination only if enabled
    if (paginate && page && limit) {
      dashboardThemeQuery = dashboardThemeQuery.skip((page - 1) * limit).limit(limit);
    }

    // Populate references if provided
    if (Array.isArray(populate)) {
      populate.forEach((field) => {
        dashboardThemeQuery = dashboardThemeQuery.populate(field);
      });
    }

    const [dashboardTheme, totalCount] = await Promise.all([
      dashboardThemeQuery.lean().exec(),
      DashboardThemeModel.countDocuments(query), // Always count
    ]);

    return { data: dashboardTheme, totalCount };
  } catch (err) {
    throw err;
  }
};
