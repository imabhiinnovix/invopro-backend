import CustomReportModel from '../models/customReport';

export const getCustomReportList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let customReportQuery: any = CustomReportModel.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        customReportQuery = customReportQuery.populate(field);
      });
    }

    // Now await the final query execution
    const customReport = await customReportQuery.exec();

    const totalCount = await CustomReportModel.countDocuments(query);

    return { data: customReport, totalCount };
  } catch (err) {
    throw err;
  }
};

export const findCustomReportById = async (id: string, populate = true) => {
  try {
    return await CustomReportModel.findById(id);
  } catch (err) {
    throw err;
  }
};
