import { DashboardFontModel } from '../../models/common/dashboardFont';

// Create
export const createFont = async (fontData: any) => {
  try {
    const font = new DashboardFontModel(fontData);
    await font.save();
    return font;
  } catch (err) {
    throw err;
  }
};

// Update
export const updateFont = async (fontId: string, fontData: any) => {
  try {
    const updatedFont = await DashboardFontModel.findByIdAndUpdate(fontId, fontData, { new: true });
    return updatedFont;
  } catch (err) {
    throw err;
  }
};

// Delete
export const deleteFont = async (fontId: string) => {
  try {
    const deletedFont = await DashboardFontModel.findByIdAndDelete(fontId);
    return deletedFont;
  } catch (err) {
    throw err;
  }
};

export const findFontById = async (id: string) => {
  try {
    return await DashboardFontModel.findById(id);
  } catch (err) {
    throw err;
  }
};

export const getFontList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
  paginate = true,
}: any) => {
  try {
    let fontQuery = DashboardFontModel.find(query).select(select).sort(sort);

    // Apply pagination only if enabled
    if (paginate && page && limit) {
      fontQuery = fontQuery.skip((page - 1) * limit).limit(limit);
    }

    // Populate references if provided
    if (Array.isArray(populate)) {
      populate.forEach((field) => {
        fontQuery = fontQuery.populate(field);
      });
    }

    const [fonts, totalCount] = await Promise.all([
      fontQuery.lean().exec(),
      DashboardFontModel.countDocuments(query), // Always count
    ]);

    return { data: fonts, totalCount };
  } catch (err) {
    throw err;
  }
};
