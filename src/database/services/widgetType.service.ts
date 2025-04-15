/* eslint-disable @typescript-eslint/no-explicit-any */
import WidgetType from '../models/widgetType';

export const createWidgetType = async (data: any) => {
  try {
    const response = new WidgetType(data);
    await response.save();
    return response;
  } catch (err) {
    throw err;
  }
};

export const getWidgetType = async (query: any) => {
  try {
    const widgetTypeData = await WidgetType.findOne(query);
    return widgetTypeData;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getAllWidgetType = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let widgetTypeQuery = WidgetType.find(query).select(select).sort(sort);

    if (page && limit) {
      widgetTypeQuery = widgetTypeQuery.skip((page - 1) * limit).limit(limit);
    }

    if (sort) {
      widgetTypeQuery = widgetTypeQuery.sort(sort);
    }

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        widgetTypeQuery = widgetTypeQuery.populate(field);
      });
    }

    const widgetTypes = await widgetTypeQuery.exec();

    const totalCount = await WidgetType.countDocuments(query);

    return { data: widgetTypes, totalCount };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getWidgetTypeById = async (id: string) => {
  try {
    const data = await WidgetType.findById(id);
    if (!data) {
      throw new Error('Data not found');
    }
    return data;
  } catch (err) {
    throw err;
  }
};

export const updateWidgetTypeById = async (widgetTypeId: string, updateData: any) => {
  try {
    const data = await WidgetType.findByIdAndUpdate(widgetTypeId, updateData, {
      new: true,
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteWidgetType = async (widgetTypeId: string) => {
  try {
    const data = await WidgetType.findByIdAndDelete(widgetTypeId);
    if (!data) {
      throw new Error('Widget type not found');
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};
