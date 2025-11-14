import { Worker } from "bullmq";
import mongoose from "mongoose";
import { processNotification } from "../database/services/notivix/notificationTriggerService";
import { getPreparedNotification } from "../database/services/notivix/preparedNotification.service";
import { getDownloadRequest } from "../database/services/common/downloadRequest.service";
import * as dataSourceVersionValueService from '../database/services/common/defaultDataSourceVersionValue.services';
import ExcelJS from 'exceljs';
import path from "path";
import "../database/models/common/organization";
import fs from "fs";
import { formatDateValue } from "../utils/common.utils";


// ✅ Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://mongo:27017/reportivix", {
        dbName: "reportivix",
      });
      console.log("✅ Worker connected to MongoDB");
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
      process.exit(1);
    }
  }
}

// ✅ Start worker immediately
(async () => {
  await connectDB();

   // ================================================================
  // DOWNLOAD QUEUE WORKER
  // ================================================================
  new Worker(
    "downloadQueue",
    async (job) => {
      let req: any;
      try {
        const { downloadRequestId } = job.data;

        console.log(" Processing export job:", downloadRequestId);

        req = await getDownloadRequest({_id: downloadRequestId});
        if (!req) throw new Error("Download request not found");

        req.status = "processing";
        await req.save();
        // --------------------------------------------------------------------
          // Create Excel
          // --------------------------------------------------------------------
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("Export");

         const {
          schemaName,
          query,
          select,
          page,
          limit,
          sort,
          filters,
          entityId,
          searchFilters,
          conditions,
          selectedFields,
          dataSourceDetails,
          dashboardFilters,
          aggregation,
          dashBoardType,
          isPaginate,
        } = req.requestPayload;  
        if (job.name === "exportDSData") {
          // --------------------------------------------------------------------
          // Fetch data
          // --------------------------------------------------------------------
          const result = await dataSourceVersionValueService.getDataSourceVersionValueV1({
          schemaName,
          query,
          select,
          page,
          limit,
          sort,
          filters,
          entityId,
          searchFilters,
          conditions
          });
          const rows = result?.data ?? [];
          console.log('rows',JSON.stringify(rows[0]));
          

        // Parse selected fields safely
          let selectedFieldsParsed: string[] | null = null;

          try {
            selectedFieldsParsed = selectedFields ? JSON.parse(selectedFields) : null;
          } catch (e) {
            selectedFieldsParsed = null;
          }

          // Apply filter
          const selectedFieldsFiltered = dataSourceDetails.fieldSettings.filter((f) => {
            if (!f.isDisplayEnable) return false;

            // If selectedFields provided → include only selected mappedAttributeName
            if (selectedFieldsParsed?.length) {
              return selectedFieldsParsed.includes(f.mappedAttributeName);
            }

            // If no selectedFields → return all displayEnabled fields
            return true;
          });

          worksheet.columns = selectedFieldsFiltered.map((f) => ({
            header: f.label,
            key: f.label,
            width: 25,
          }));
        rows.forEach((row) => {
              const dataRow: any = {};

              selectedFieldsFiltered.forEach((f) => {
                let value = row.rowData[f.mappedAttributeName];

                // If array → convert to comma-separated
                if (Array.isArray(value)) {
                  value = value.join(", ");
                }

                // If date or date-range → format
                if (f.type === "date" || f.type === "date-range") {
                  value = formatDateValue(value);
                }

                dataRow[f.label] = value ?? "";
              });

              worksheet.addRow(dataRow);
            });
          }else{
             const result =
                await dataSourceVersionValueService.getDataSourceVersionValueWidgetDataV2({
                  schemaName,
                  query,
                  dashboardFilters,
                  entityId,
                  aggregation,
                  dashBoardType,
                  dataSourceDetails,
                  isPaginate,
                  page,
                  limit
                });
          const dataResults = result?.data ?? [];
          let headers: string[] = dataSourceDetails?.fieldSettings
            .filter((f: any) => f.isDisplayEnable === true)  
            .map((f: any) => f.label);

          const exportHeaders =
            Array.isArray(selectedFields) && selectedFields.length > 0
              ? selectedFields
              : headers;

          worksheet.columns = exportHeaders.map((h) => ({
            header: h,
            key: h,
            width: 25,
          }));

          // Build a quick lookup: label → field meta
          const fieldMap = Object.fromEntries(
            dataSourceDetails.fieldSettings.map((f: any) => [
              f.label,
              { key: f.label, type: f.type },
            ])
          );

          for (const record of dataResults) {
            const row: any = {};

            exportHeaders.forEach((label) => {
              const meta = fieldMap[label];
              if (!meta) {
                row[label] = record[label] ?? "";
                return;
              }

              const raw = record[meta.key];

              // Only two enhancements: date & array
              if (meta.type === "date" || meta.type === "date-range") {
                row[label] = formatDateValue(raw); // you already have this
              } else if (Array.isArray(raw)) {
                row[label] = raw.join(", "); // only array handling
              } else {
                row[label] = raw ?? "";
              }
            });

            worksheet.addRow(row);
          }


    
        }

        // --------------------------------------------------------------------
        // Save Excel
        // --------------------------------------------------------------------
        const exportFileName = `${dataSourceDetails.name}_Export_Data_${Date.now()}_${req._id}.xlsx`;
        const filePath = path.join(
          "downloads",
          req.organizationId.toString(),
          req.userId.toString()
        );

        fs.mkdirSync(filePath, { recursive: true });
        const fullFilePath = path.join(filePath, exportFileName);
        await workbook.xlsx.writeFile(fullFilePath);


        req.filePath = filePath;
        req.fileName = exportFileName;
        req.status = "completed";
        await req.save();

        console.log(" Export completed:", fullFilePath);
      } catch (error: any) {
          console.error("❌ Worker error:", error);

          // ------------------------------------------------------
          // ENSURE FAILURE STATUS SAVED
          // ------------------------------------------------------
          if (req) {
            req.status = "failed";
            req.error = error?.message || "Unknown error";
            await req.save();
          }

          throw error;
      } 
    },
    {
      connection: { host: "redis" },
    }
  );

  // ================================================================
  // EMAIL QUEUE WORKER
  // ================================================================
  const emailWorker = new Worker(
    "emailQueue",
    async (job) => {
      try{
        if (job.name === "sendEmail") {
          const { notificationId } = job.data;
          console.log("📨 notificationId:", notificationId);

          const notification = await getPreparedNotification(notificationId, [
            "templateId",
            "frequencySettingId",
            "notificationTriggerId",
            "acknowledgeId",
          ]);

          if (!notification) {
            throw new Error(`❌ Notification ${notificationId} not found`);
          }

          console.log(`📧 Sending email for notification ${notificationId}`);
          await processNotification(notification);
        }
      } catch (error) {
        console.error("❌ Email worker error:", error);
      }
    },
    {
      connection: {
        host: "redis",
      },
    }
  );

  console.log("worker started");
})();