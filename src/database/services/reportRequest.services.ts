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
