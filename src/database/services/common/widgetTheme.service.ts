/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import WidgetTheme, { IWidgetTheme } from '../../models/reportivix/widgetTheme';

export const createWidgetTheme = async (data: Partial<IWidgetTheme>) => {
  try {
    const widgetTheme = new WidgetTheme(data);
    return await widgetTheme.save();
  } catch (error) {
    throw error;
  }
};

export const findAllWidgetThemes = async ({ query, populate, page, limit, sort }: any) => {
  try {
    let widgetThemesQuery = WidgetTheme.find(query);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        widgetThemesQuery = widgetThemesQuery.populate(field);
      });
    }

    if (sort) {
      widgetThemesQuery = widgetThemesQuery.sort(sort);
    }

    if (page && limit) {
      widgetThemesQuery = widgetThemesQuery.skip((page - 1) * limit).limit(limit);
    }
    const widgetThemes = await widgetThemesQuery.exec();

    const totalCount = await WidgetTheme.countDocuments(query);

    return { data: widgetThemes, totalCount };
  } catch (error) {
    throw error;
  }
};

export const findWidgetThemeById = async (id: string) => {
  try {
    return await WidgetTheme.findById(id);
  } catch (error) {
    throw error;
  }
};

export const findWidgetTheme = async (query) => {
  try {
    return await WidgetTheme.findOne(query);
  } catch (error) {
    throw error;
  }
};

export const findWidgetThemesByOrganizationId = async (organizationId: string) => {
  try {
    return await WidgetTheme.find({ organizationId: new Types.ObjectId(organizationId) });
  } catch (error) {
    throw error;
  }
};

export const updateWidgetTheme = async (id: string, data: Partial<IWidgetTheme>) => {
  try {
    return await WidgetTheme.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  } catch (error) {
    throw error;
  }
};

export const updateWidgetThemeMany = async (query: any, data: Partial<IWidgetTheme>) => {
  try {
    return await WidgetTheme.updateMany(query, { $set: data });
  } catch (error) {
    throw error;
  }
};

export const deleteWidgetTheme = async (id: string) => {
  try {
    return await WidgetTheme.findByIdAndDelete(id);
  } catch (error) {
    throw error;
  }
};
