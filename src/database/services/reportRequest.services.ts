import ReportRequestModel from '../models/requestedReport';
export const createReportRequest = async (reqData: any) => {
  try {
    const newReportRequest = new ReportRequestModel(reqData);
    await newReportRequest.save();
    return newReportRequest;
  } catch (err) {
    throw err;
  }
};

export const updateReportRequest = async (reportRequestId: string, reportRequestData: any) => {
  try {
    const repReqDataResp = await ReportRequestModel.findByIdAndUpdate(reportRequestId, reportRequestData, {
      new: true,
    });
    return repReqDataResp;
  } catch (err) {
    throw err;
  }
};

export const getReportRequestList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { updatedAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let reportRequestQuery: any = ReportRequestModel.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        reportRequestQuery = reportRequestQuery.populate(field);
      });
    }

    // Now await the final query execution
    const reportRequestList = await reportRequestQuery.exec();

    const totalCount = await ReportRequestModel.countDocuments(query);

    return { data: reportRequestList, totalCount };
  } catch (err) {
    throw err;
  }
};

export const findReportRequestById = async (id: string) => {
  try {
    const requestDetails = await ReportRequestModel.findById(id);

    return requestDetails;
  } catch (err) {
    throw err;
  }
};
