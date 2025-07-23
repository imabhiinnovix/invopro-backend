/* eslint-disable @typescript-eslint/no-explicit-any */
import WidgetType from '../../models/common/widgetType';

export const createWidgetType = async (widgetTypeData: any) => {
  try {
    const widgetType = new WidgetType(widgetTypeData);
    await widgetType.save();
    return widgetType;
  } catch (err) {
    throw err;
  }
};

export const getWidgetType = async (query: any) => {
  try {
    const widgetType = await WidgetType.findOne(query);
    return widgetType;
  } catch (err) {
    throw err;
  }
};

export const getAllWidgetTypes = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let widgetTypesQuery = WidgetType.find(query)
      .select(select)
      .skip(page * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        widgetTypesQuery = widgetTypesQuery.populate(field);
      });
    }

    const widgetTypes = await widgetTypesQuery.exec();

    const totalCount = await WidgetType.countDocuments(query);

    return { data: widgetTypes, totalCount };
  } catch (err) {
    throw err;
  }
};

export const updateWidgetType = async (id: string, widgetTypeData: any) => {
  try {
    const widgetType = await WidgetType.findByIdAndUpdate(id, widgetTypeData, { new: true });
    return widgetType;
  } catch (err) {
    throw err;
  }
};

export const deleteWidgetType = async (id: string) => {
  try {
    await WidgetType.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};
