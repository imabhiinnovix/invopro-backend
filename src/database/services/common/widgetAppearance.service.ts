/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import WidgetAppearance from '../../models/common/widgetAppearance';

export const findAllWidgetAppearance = async ({ query, populate, page, limit, sort }: any) => {
  try {
    let widgetAppearanceQuery = WidgetAppearance.find(query);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        widgetAppearanceQuery = widgetAppearanceQuery.populate(field);
      });
    }

    if (sort) {
      widgetAppearanceQuery = widgetAppearanceQuery.sort(sort);
    }

    if (page && limit) {
      widgetAppearanceQuery = widgetAppearanceQuery.skip((page - 1) * limit).limit(limit);
    }
    const widgetAppearance = await widgetAppearanceQuery.exec();

    const totalCount = await WidgetAppearance.countDocuments(query);

    return { data: widgetAppearance, totalCount };
  } catch (error) {
    throw error;
  }
};

export const createWidgetAppearance = async (data: any) => {
  try {
    const widgetAppearance = new WidgetAppearance(data);
    return await widgetAppearance.save();
  } catch (error) {
    throw error;
  }
};

export const updateWidgetAppearance = async (id: string, data: any) => {
  try {
    const widgetAppearance = await WidgetAppearance.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!widgetAppearance) {
      throw new Error('Widget appearance not found');
    }
    return widgetAppearance;
  } catch (error) {
    throw error;
  }
};

export const deleteWidgetAppearance = async (id: string, organizationId: string) => {
  try {
    const widgetAppearance = await WidgetAppearance.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!widgetAppearance) {
      throw new Error('Widget appearance not found');
    }
    return widgetAppearance;
  } catch (error) {
    throw error;
  }
};

export const findWidgetAppearanceById = async (id: string) => {
  try {
    const widgetAppearance = await WidgetAppearance.findById(id);

    if (!widgetAppearance) {
      throw new Error('Widget appearance not found');
    }
    return widgetAppearance;
  } catch (error) {
    throw error;
  }
};

export const getWidgetAppearance = async (query) => {
  try {
    const widgetAppearance = await WidgetAppearance.findOne(query);
    return widgetAppearance;
  } catch (error) {
    throw error;
  }
};
