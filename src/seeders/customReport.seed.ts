import CustomReportModel from '../database/models/customReport';

export async function seedCustomReports(payload) {
  // Check if the custom report already exists
  const existingCustomReport = await CustomReportModel.findById(payload.customReportId);

  if (!existingCustomReport) {
    // If it doesn't exist, create a new custom report
    const newCustomReport = new CustomReportModel({
      _id: payload.customReportId,
      reportName: payload.reportName,
      functionName: payload.functionName,
      dataSourceIds: payload.dataSourceIds,
      organizationId: payload.organizationId,
      sampleFilePath: payload.sampleFilePath,
    });

    await newCustomReport.save();
    console.info(`New custom report with payload ${payload} created successfully.`);
  } else {
    console.info(`New custom report with custom report id ${payload.customReportId} already exists.`);
  }
}
