import { Worker } from "bullmq";
import mongoose from "mongoose";
import { getDownloadRequest } from "../database/services/common/downloadRequest.service";
import * as dataSourceVersionValueService from '../database/services/common/defaultDataSourceVersionValue.services';
import ExcelJS from 'exceljs';
import path from "path";
import "../database/models/common/organization";
import "../database/models/common/widgetType";
import "../database/models/common/dashboard";
import "../database/models/common/dataSource";
import "../database/models/common/user";
import fs from "fs";
import { formatDateValue, resolveServiceMethod } from "../utils/common.utils";
import { getDashboardWidget, updateDashboardWidget } from "../database/services/common/dashboardWidget.services";
import axios from "axios";
import { buildWidgetRequestPayload } from "../utils/buildWidgetRequest.utils";


// ✅ Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://mongo:27017/invoicivix", {
        dbName: "invoicivix",
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
          isSummary,
          summaryFields,
          segregationField,
          defaultCurrency
        } = req.requestPayload;  
        if (job.name === "exportDSData") {
          // --------------------------------------------------------------------
          // Fetch data
          // --------------------------------------------------------------------
          const result = isSummary == true ? await dataSourceVersionValueService.getDataSourceVersionSummaryValue({
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
            summaryFields,
            segregationField
          }) : await dataSourceVersionValueService.getDataSourceVersionValueV1({
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

          if (Array.isArray(selectedFields)) {
            selectedFieldsParsed = selectedFields;
          } else {
            try {
              selectedFieldsParsed = selectedFields ? JSON.parse(selectedFields) : null;
            } catch (e) {
              selectedFieldsParsed = null;
            }
          }

          // Apply filter
          const selectedFieldsFiltered = dataSourceDetails.fieldSettings.filter((f) => {
            if (f.isDerived === true) return false;

            // If selectedFields provided → include only selected mappedAttributeName
            if (selectedFieldsParsed?.length) {
              return selectedFieldsParsed.includes(f.mappedAttributeName);
            }

            // If no selectedFields → return all displayEnabled fields
            return true;
          });

          worksheet.columns = selectedFieldsFiltered.map((f) => {
            const header =
              f.mappedAttributeName.includes("Converted|") &&
              f.type === "number"
                ? `${f.label} (${defaultCurrency})`
                : f.label;

            return {
              header,
              key: header,
              width: 25,
            };
          });
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

                const label = f.mappedAttributeName.includes("Converted|") &&
                        f.type === "number"
                          ? `${f.label} (${defaultCurrency})`
                          : f.label;

                dataRow[label] = value ?? "";
              });

              worksheet.addRow(dataRow);
            });

            // ======================================================
  // ✅ ADDITIONAL LOGIC (ONLY for isSummary === true)
  // ======================================================
  if (isSummary === true) {
    // Rename existing sheet to Overview
    worksheet.name = "Overview";

    // -----------------------------------------------
    // Fetch detail data
    // -----------------------------------------------
    const detailResult =
      await dataSourceVersionValueService.getDataSourceVersionValueV1({
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
      });

    const detailRows = detailResult?.data ?? [];

    // -----------------------------------------------
    // Group by Law Firm Name
    // -----------------------------------------------
    const lawFirmMap = new Map<string, any[]>();

    detailRows.forEach((row) => {
      let lawFirmName = row.rowData?.["Law Firm Name"];

      // Handle array case
      if (Array.isArray(lawFirmName)) {
        lawFirmName = lawFirmName[0];
      }

      // Final fallback
      lawFirmName = lawFirmName || "Unknown Law Firm";

      // Ensure it's string
      lawFirmName = String(lawFirmName);

      if (!lawFirmMap.has(lawFirmName)) {
        lawFirmMap.set(lawFirmName, []);
      }

      lawFirmMap.get(lawFirmName)!.push(row);
    });

    // -----------------------------------------------
    // Create Sheet per Law Firm
    // -----------------------------------------------
    lawFirmMap.forEach((firmRows, lawFirmName) => {
      const safeSheetName = lawFirmName
                            .replace(/[\\/?*[\]:]/g, "") // remove invalid chars
                            .substring(0, 30);

      const sheet = workbook.addWorksheet(safeSheetName);

      // ALL FIELDS
      const allFields = dataSourceDetails.fieldSettings.filter(
        (f) => f.isDerived !== true
      );

      sheet.columns = allFields.map((f) => {
        const header =
          f.mappedAttributeName.includes("Converted|") &&
          f.type === "number"
            ? `${f.label} (${defaultCurrency})`
            : f.label;

        return {
          header,
          key: header,
          width: 25,
        };
      });

      firmRows.forEach((row) => {
        const dataRow: any = {};

        allFields.forEach((f) => {
          let value = row.rowData?.[f.mappedAttributeName];

          if (Array.isArray(value)) {
            value = value.join(", ");
          }

          if (f.type === "date" || f.type === "date-range") {
            value = formatDateValue(value);
          }

           const label = f.mappedAttributeName.includes("Converted|") &&
                        f.type === "number"
                          ? `${f.label} (${defaultCurrency})`
                          : f.label;

          dataRow[label] = value ?? "";
        });

        sheet.addRow(dataRow);
      });
    });
  }
          }else if (job.name === "exportCustomData") {
// ================================================================
// CUSTOM DATA EXPORT (GENERIC, BATCHED)
// ================================================================

        const {
        query,
        sort,
        selectedFields,
        queryConfig,
        schemaName, // ✅ optionally included in payload
      } = req.requestPayload;

      if (!queryConfig?.service || !queryConfig?.method) {
        throw new Error("queryConfig.service and queryConfig.method are required");
      }

      const fetchMethod = await resolveServiceMethod(queryConfig);

      const safeLimit = 1000;
      let page = 1;
      let isFirstBatch = true;

      // Parse selectedFields once
      let selectedFieldsParsed: string[] | null = null;

      if (Array.isArray(selectedFields)) {
        selectedFieldsParsed = selectedFields;
      } else {
        try {
          selectedFieldsParsed = selectedFields ? JSON.parse(selectedFields) : null;
        } catch {
          selectedFieldsParsed = null;
        }
      }


      while (true) {
        const result = await fetchMethod({
          query,
          page,
          limit: safeLimit,
          sort,
          ...(schemaName ? { schemaName } : {}), // optional schemaName
        });

        const rows = result?.data ?? [];
        if (!rows.length) break;

        // ------------------------------------------------------
        // SET HEADERS ONCE (SAFE & STABLE)
        // ------------------------------------------------------
        if (isFirstBatch) {
          const firstRow =
            rows[0]?.toObject ? rows[0].toObject() : rows[0];

          const headers =
            selectedFieldsParsed?.length
              ? selectedFieldsParsed
              : Object.keys(firstRow).filter(
                  (k) => !k.startsWith("_")
                );

          worksheet.columns = headers.map((key) => ({
            header: key,
            key,
            width: 30,
          }));

          isFirstBatch = false;
        }

        // ------------------------------------------------------
        // WRITE ROWS (SAFE VALUE HANDLING)
        // ------------------------------------------------------
        rows.forEach((doc: any) => {
          const row = doc?.toObject ? doc.toObject() : doc;
          const excelRow: any = {};

          worksheet.columns.forEach((col: any) => {
            let value = row[col.key];

            if (value === null || value === undefined) {
              excelRow[col.key] = "";
            } else if (Array.isArray(value)) {
              excelRow[col.key] = value.join(", ");
            } else if (value instanceof Date) {
              excelRow[col.key] = value.toISOString();
            } else if (typeof value === "object") {
              excelRow[col.key] = JSON.stringify(value);
            } else {
              excelRow[col.key] = value;
            }
          });

          worksheet.addRow(excelRow);
        });

        if (rows.length < safeLimit) break;
        page++;
      }
    } else{
             const safeLimit = 1000; // batch size
          let page = 1;
          let dataResults: any[] = [];

          while (true) {
            const result =
              await dataSourceVersionValueService.getDataSourceVersionValueWidgetDataV2({
                schemaName,
                query,
                dashboardFilters,
                conditions,
                entityId,
                aggregation,
                dashBoardType,
                dataSourceDetails,
                isPaginate: true, // always paginate
                page,
                limit: safeLimit,
                sort
              });

            const batchData = result?.data ?? [];
            dataResults.push(...batchData);

            if (batchData.length < safeLimit) break; // last page
            page++;
          }

          console.log('Total rows fetched for export:', dataResults.length);

          let headers: string[] = dataSourceDetails?.fieldSettings
            .filter((f: any) => !f.isDerived)  
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
        const filePath = path.join(
          "uploads",
          req.organizationId.toString(),
          req.userId.toString(),
          "exportsData"
        );

        fs.mkdirSync(filePath, { recursive: true });
        const fullFilePath = path.join(filePath, req.fileName);
        await workbook.xlsx.writeFile(fullFilePath);


        req.filePath = filePath;
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

  console.log("worker started");


// ------------------------------------------------------
// Start AI Worker
// ------------------------------------------------------
  new Worker(
    "aiDataQueue",
    async (job) => {
      try {
        if (job.name !== "generateWidgetSummary") return;

        const { widgetId, senderUserId } = job.data;
        console.log("AI summary job started for widget:", widgetId);

        // ------------------------------------------------------
        // 1️ Fetch widget USING SERVICE (with populate)
        // ------------------------------------------------------
        const widget: any = await getDashboardWidget(
          { _id: widgetId },
          ["widgetTypeId", "dataSourceId", "dashboardId", "organizationId", "createdBy"]
        );

        if (!widget) {
          console.warn("Dashboard widget not found. Skipping:", widgetId);
          return;
        }

        // ------------------------------------------------------
        // 2️ Fetch ALL widget data (pagination-safe)
        // ------------------------------------------------------
        const safeLimit = 5000;
        let dataResults: any[] = [];
        const widgetRequestPayload = await buildWidgetRequestPayload(widget, senderUserId);
        let page = 1;
        while (true) {
          const result =
            await dataSourceVersionValueService.getDataSourceVersionValueWidgetDataV2({...widgetRequestPayload, page, limit: safeLimit});
          const batchData = result?.data ?? [];
          dataResults.push(...batchData);
          if (batchData.length < safeLimit) break;
          page++;
        }

        console.log("Total rows fetched:", dataResults.length);

        // ------------------------------------------------------
        // 3️ Build AI Payload (AS REQUESTED)
        // ------------------------------------------------------
        const aiPayload = {
          widget: {
            name: widget.name,
            widgetType: widget.widgetTypeId?.name || "Unknown",
            plotType: widget.plotType,
            dimensions: widget.dimensions,
            groupBy: widget.groupBy,
            aggregation: widget.aggregation,
            conditions: widget.conditions,
            isIncremental: widget.isIncremental,
          },
          data: {
            rows: dataResults,               // FULL DATA
            totalRows: dataResults.length,
          },
        };

        // console.log('ai payload', JSON.stringify(aiPayload));

      // ------------------------------------------------------
      // 4️ Call AI Analyze API
      // ------------------------------------------------------
      let response: any;
      try {
        response = await axios.post(
          `${process.env.BASE_AI_SERVICE_URL}/analyzeChart`,
          aiPayload, // DO NOT stringify
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 10 * 60 * 1000,
          }
        );
      } catch (error: any) {
        console.error("AI Axios call failed");

        if (error.response) {
          console.error("Status:", error.response.status);
          console.error("Response Data:", error.response.data);
          console.error("Headers:", error.response.headers);
        } else if (error.request) {
          console.error("No response received");
          console.error(error.request);
        } else {
          console.error("Axios error message:", error.message);
        }

        console.error("Axios Config:", {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          data: error.config?.data,
        });

        throw error;
      }

      console.log("AI response received", response?.data);

      const summary = response.data?.message || "";

      if (!summary) {
        console.warn("Empty AI summary for widget:", widgetId);
        return;
      }

        // ------------------------------------------------------
        // 5️ Update widget USING SERVICE
        // ------------------------------------------------------
        await updateDashboardWidget(widgetId, {
          description: summary,
        });

        console.log("Widget description updated:", widgetId);

      } catch (error: any) {
        console.error("AI Worker failed:", error.message);
        throw error;
      }
    },
    {
      connection: { host: "redis" },

      // REQUIRED for long AI calls
      lockDuration: 10 * 60 * 1000,

      concurrency: 1,
    }
  );

  console.log("AI Worker started");

})();