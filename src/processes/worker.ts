import { Worker } from "bullmq";
import mongoose, { Model } from "mongoose";
import { getDownloadRequest } from "../database/services/common/downloadRequest.service";
import * as dataSourceVersionValueService from '../database/services/common/defaultDataSourceVersionValue.services';
import * as dataSourceVersionImportValueService from '../database/services/common/defaultImportLogDataSourceVersionValue.services';
import ExcelJS from 'exceljs';
import path from "path";
import FormData from "form-data";
import os from "os";
import "../database/models/common/organization";
import "../database/models/common/widgetType";
import "../database/models/common/dashboard";
import "../database/models/common/dataSource";
import "../database/models/common/user";
import "../database/models/invoicivixVendor/vendorAttorney";   // ⭐ THIS IS MISSING
import "../database/models/invoicivixVendor/vendor";
import "../database/models/invoicivixVendor/subVendor";
import "../database/models/invoicivixVendor/engagementLetter";
import fs from "fs";
import { formatDateValue, getValidatedFieldsMap, resolveServiceMethod } from "../utils/common.utils";
import { getDashboardWidget, updateDashboardWidget } from "../database/services/common/dashboardWidget.services";
import axios from "axios";
import { buildWidgetRequestPayload } from "../utils/buildWidgetRequest.utils";
import * as dataSourceService from "../database/services/common/dataSource.services";
import * as dataSourceVersionServices from "../database/services/common/dataSourceVersion.services";
import * as vendorService from "../database/services/invoicivixVendor/vendor.service";
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from "../utils/common.utils";
import * as vendorInvoiceService from "../database/services/invoicivixVendor/vendorInvoice.service";
import * as activityService from "../database/services/invoicivixVendor/activity.service";
import { generateAIToken } from "../utils/token.utils";
import createDefaultDataSourceVersionModel from "../database/models/common/defaultDataSourceVersionModel";



// ✅ Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://invoicivix-mongo:27017/invoicivix", {
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
          }else if (job.name === "exportDSSummaryData") {
  // --------------------------------------------------------------------
  // Fetch SUMMARY data
  // --------------------------------------------------------------------
  const result =
    await dataSourceVersionValueService.getDataSourceVersionSummaryValue({
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
      segregationField,
    });

  const rows = result?.data ?? [];

  // --------------------------------------------------------------------
  // FILTER FIELDS (ONLY selectedFields)
  // --------------------------------------------------------------------
  const selectedFieldsParsed: string[] | null = Array.isArray(selectedFields)
    ? selectedFields
    : selectedFields
    ? JSON.parse(selectedFields)
    : null;

  const selectedFieldsFiltered =
    dataSourceDetails.fieldSettings.filter((f) => {
      if (f.isDerived) return false;

      if (selectedFieldsParsed?.length) {
        return selectedFieldsParsed.includes(f.mappedAttributeName);
      }

      return true;
    });

  // --------------------------------------------------------------------
  // VALID PAIRED FIELDS
  // --------------------------------------------------------------------
  const normalSet = new Set<string>();
  const convertedSet = new Set<string>();

  selectedFieldsFiltered.forEach((f) => {
    if (f.type !== "number") return;

    if (f.mappedAttributeName.startsWith("Converted|")) {
      convertedSet.add(f.mappedAttributeName.replace("Converted|", ""));
    } else {
      normalSet.add(f.mappedAttributeName);
    }
  });

  const validFields = [...normalSet].filter((f) =>
    convertedSet.has(f)
  );

  // --------------------------------------------------------------------
  // BUILD OVERVIEW COLUMNS
  // --------------------------------------------------------------------
  const baseColumns: any[] = [];
  let lastConvertedIndex = -1;

  selectedFieldsFiltered.forEach((f) => {
    const isConverted =
      f.mappedAttributeName.startsWith("Converted|") &&
      f.type === "number";

    const header = isConverted
      ? `${f.label} (${defaultCurrency})`
      : f.label;

    baseColumns.push({
      header,
      key: header,
      width: 25,
    });

    if (isConverted) {
      lastConvertedIndex = baseColumns.length - 1;
    }
  });

  // Insert Total Fees (Converted)
  if (lastConvertedIndex !== -1) {
    baseColumns.splice(lastConvertedIndex + 1, 0, {
      header: `Total Fees (${defaultCurrency})`,
      key: `Total Fees (${defaultCurrency})`,
      width: 30,
    });
  }

  worksheet.columns = baseColumns;

  // --------------------------------------------------------------------
  // OVERVIEW ROWS
  // --------------------------------------------------------------------
  let grandTotalConverted = 0;

  rows.forEach((row) => {
    const dataRow: any = {};

    selectedFieldsFiltered.forEach((f) => {
      let value = row.rowData[f.mappedAttributeName];

      if (Array.isArray(value)) value = value.join(", ");

      if (f.type === "date" || f.type === "date-range") {
        value = formatDateValue(value);
      }

      const label =
        f.mappedAttributeName.includes("Converted|") &&
        f.type === "number"
          ? `${f.label} (${defaultCurrency})`
          : f.label;

      dataRow[label] = value ?? "";
    });

    let rowTotalConverted = 0;

    validFields.forEach((field) => {
      rowTotalConverted += Number(
        row.rowData[`Converted|${field}`] || 0
      );
    });

    grandTotalConverted += rowTotalConverted;

    dataRow[`Total Fees (${defaultCurrency})`] = rowTotalConverted;

    worksheet.addRow(dataRow);
  });

  worksheet.name = "Overview";

  // --------------------------------------------------------------------
  // FINAL TOTAL ROW (OVERVIEW)
  // --------------------------------------------------------------------
  const totalRow: any = {};
  totalRow[`Total Fees (${defaultCurrency})`] = grandTotalConverted;

  worksheet.addRow({});
  worksheet.addRow(totalRow);

  // --------------------------------------------------------------------
  // DETAIL DATA (NO TOTAL COLUMNS)
  // --------------------------------------------------------------------
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

  const lawFirmMap = new Map<string, any[]>();

  detailRows.forEach((row) => {
    let lawFirmName = row.rowData?.["Law Firm Name"];

    if (Array.isArray(lawFirmName)) lawFirmName = lawFirmName[0];

    lawFirmName = lawFirmName || "Unknown Law Firm";
    lawFirmName = String(lawFirmName);

    if (!lawFirmMap.has(lawFirmName)) {
      lawFirmMap.set(lawFirmName, []);
    }

    lawFirmMap.get(lawFirmName)!.push(row);
  });

  // --------------------------------------------------------------------
  // LAW FIRM SHEETS (ONLY TOTAL ROW)
  // --------------------------------------------------------------------
  lawFirmMap.forEach((firmRows, lawFirmName) => {
  const sheet = workbook.addWorksheet(
    lawFirmName.replace(/[\\/?*[\]:]/g, "").substring(0, 30)
  );

  // -------------------------------
  // Columns (NO total columns)
  // -------------------------------
  sheet.columns = selectedFieldsFiltered.map((f) => {
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

  // -------------------------------
  // Column-wise totals map
  // -------------------------------
  const columnTotals: Record<string, number> = {};

  selectedFieldsFiltered.forEach((f) => {
    columnTotals[f.mappedAttributeName] = 0;
  });

  // -------------------------------
  // ROWS
  // -------------------------------
  firmRows.forEach((row) => {
    const dataRow: any = {};

    selectedFieldsFiltered.forEach((f) => {
      let value = row.rowData[f.mappedAttributeName];

      if (Array.isArray(value)) value = value.join(", ");

      if (f.type === "date" || f.type === "date-range") {
        value = formatDateValue(value);
      }

      const label =
        f.mappedAttributeName.includes("Converted|") &&
        f.type === "number"
          ? `${f.label} (${defaultCurrency})`
          : f.label;

      const numValue = Number(row.rowData[f.mappedAttributeName]) || 0;

      columnTotals[f.mappedAttributeName] += numValue;

      dataRow[label] = value ?? "";
    });

    sheet.addRow(dataRow);
  });

  // -------------------------------
  // FINAL TOTAL ROW (COLUMN WISE)
  // -------------------------------
  const totalRow: any = {};

  selectedFieldsFiltered.forEach((f, idx) => {
    const key = f.mappedAttributeName;

    const label =
      f.mappedAttributeName.includes("Converted|") &&
      f.type === "number"
        ? `${f.label} (${defaultCurrency})`
        : f.label;

    if (idx === 0) {
      totalRow[label] = "TOTAL";
    } else {
      totalRow[label] = columnTotals[key] || 0;
    }
  });

  sheet.addRow({});
  sheet.addRow(totalRow);
});
}else if (job.name === "exportDSImportData") {
          // --------------------------------------------------------------------
          // Fetch data
          // --------------------------------------------------------------------
          const result = await dataSourceVersionImportValueService.getDataSourceImportVersionValueV1({
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
          }else if (job.name === "exportCustomData") {
// ================================================================
// CUSTOM DATA EXPORT (GENERIC, BATCHED)
// ================================================================

        const {
        query,
        sort,
        selectedFields,
        aliasFields = {},
        queryConfig,
        schemaName, // ✅ optionally included in payload
        user
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

      let aliasFieldsParsed: Record<string, string> = {};

      if (typeof aliasFields === "string") {
        try {
          aliasFieldsParsed = JSON.parse(aliasFields);
        } catch {
          aliasFieldsParsed = {};
        }
      } else {
        aliasFieldsParsed = aliasFields || {};
      }


      while (true) {
        const result = await fetchMethod({
          query,
          page,
          limit: safeLimit,
          sort,
          ...(schemaName ? { schemaName } : {}), // optional schemaName
          ...(user ? { user } : {}) // optional user
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
            header: aliasFieldsParsed[key] || key,
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

new Worker(
  "aiFileQueue",
  async (job) => {
    try {

      if (job.name !== "sendPreValidatedFiles" && job.name !== "sendActivityFiles" && job.name !== "sendPreValidatedRows" && job.name !== "sendCostValidatedRows") return;

      const { dataSourceIds, versionValue, vendorId, activityType, user } = job.data;

      console.log('job data', JSON.stringify(job.data));
      
      console.log(`🚀 Job Started: ${job.name}`);
      
      if (job.name == "sendPreValidatedFiles"){

        console.log("🚀 Large dataset AI export started");

        const aiToken = generateAIToken({
                      userId: user.userId,
                      organizationId: user.organizationId,
                      orgCode: user.orgCode,
                      orgDefaultCurrency: user?.orgDefaultCurrency || "USD",
                      scope: "ai:invoice:process",
                    });
        console.log('aiToken', aiToken);            

        const tempFiles: { path: string; fileType: string }[] = [];
        const generatedTempFiles: string[] = [];
        const safeLimit = 5000;

        // ---------------------------------------------
        // ✅ Fetch Vendor
        // ---------------------------------------------
        let vendorName = "";

        if (vendorId) {
          try {
            const vendor = await vendorService.findVendorById(vendorId);
            vendorName = vendor?.name || "";
          } catch (err: any) {
            console.warn("⚠ Failed to fetch vendor:", err?.message);
          }
        }

        // ---------------------------------------------
        // ✅ Fetch Vendor Invoice PDF
        // ---------------------------------------------
        // ---------------------------------------------
        // ✅ Fetch Multiple Vendor Invoice PDFs
        // ---------------------------------------------
        const vendorInvoiceFiles: { path: string; fileName: string }[] = [];

        if (vendorId && versionValue) {
          try {
            const invoices = await vendorInvoiceService.getVendorInvoiceList({
              query: {
                vendorId,
                versionValue,
                status: "active",
              },
              paginate: false, // 🔥 IMPORTANT (get all)
            });

            if (invoices?.data?.length) {
              for (const invoice of invoices.data) {
                if (invoice?.filePath && fs.existsSync(invoice.filePath)) {
                  vendorInvoiceFiles.push({
                    path: invoice.filePath,
                    fileName:
                      invoice.fileName || path.basename(invoice.filePath),
                  });

                  console.log("📎 Invoice added:", invoice.fileName);
                } else {
                  console.warn("⚠ Skipping invalid invoice file");
                }
              }
            } else {
              console.warn("⚠ No invoices found for vendor/version");
            }
          } catch (err: any) {
            console.warn("⚠ Failed to fetch vendor invoices:", err.message);
          }
        }

        // ---------------------------------------------
        // 🔁 Process Each DataSource
        // ---------------------------------------------
        for (const dataSourceId of dataSourceIds) {
          try {
            const dataSourceDetails: any =
              await dataSourceService.findDataSourceById(
                dataSourceId,
                true
              );

            if (!dataSourceDetails) continue;

            const schemaName =
              getSchemaNameBasedOnVersionCodeAndOrgCode({
                orgCode: user.orgCode,
                versionCode: dataSourceDetails.code,
              });

            const versionData =
              await dataSourceVersionServices.getDataSourceVersionList({
                query: {
                  dataSourceId,
                  isCurrent: true,
                  ...(versionValue && { versionValue }),
                  ...(vendorId && {vendorId})
                },
              });

            if (!versionData?.data?.length) continue;

            const dataSourceVersionIds = versionData.data.map(v => v._id);

            // const query: any = {
            //   status: "active",
            //   dataSourceVersionId: { $in: dataSourceVersionIds },
            // };
            const query: any = {
        status: "active",
        dataSourceVersionId: { $in: dataSourceVersionIds },
        aiPreValidateStatus: "pending",
      };

      // =============================================
      // ✅ NEW: LOCK rows → processing
      // =============================================
      const lockResult = await dataSourceVersionValueService.updateMany(
        schemaName,
        query,
        {
          $set: {
            aiPreValidateStatus: "processing",
            updatedAt: new Date(),
          },
        }
      );

      if (lockResult.modifiedCount === 0) {
        console.log("⚠ No rows to process for datasource:", dataSourceId);
        continue;
      }

      // 🔁 IMPORTANT: use processing filter afterward
      const processingFilter = {
        status: "active",
        dataSourceVersionId: { $in: dataSourceVersionIds },
        aiPreValidateStatus: "processing",
      };

            // ---------------------------------------------
            // 📄 Excel Setup
            // ---------------------------------------------
            const fileName = `${dataSourceDetails.name}_${Date.now()}.xlsx`;
            const tempFilePath = path.join(os.tmpdir(), fileName);

            console.log('tempFilePath',tempFilePath);

            const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
              filename: tempFilePath,
              useStyles: false,
              useSharedStrings: false,
            });

            const worksheet = workbook.addWorksheet("Export");

            const fields = dataSourceDetails.fieldSettings.filter(
              (f: any) => !f.isDerived
            );

            worksheet.columns = [
              { header: "DB Id", key: "dbId", width: 30 },
              { header: "Conversion Rate", key: "conversionRate", width: 30 },
              ...fields.map((f: any) => ({
                header: f.label,
                key: f.label,
                width: 25,
              })),
            ];

            // ---------------------------------------------
            // 📊 Data Streaming
            // ---------------------------------------------
            let page = 1;

            while (true) {
              const result =
                await dataSourceVersionValueService.getDataSourceVersionValueV1({
                  schemaName,
                  query: processingFilter,
                  page,
                  limit: safeLimit,
                  sort: {},
                  filters: {},
                  searchFilters: {},
                  entityId: dataSourceDetails.entityId,
                });

              const rows = result?.data ?? [];
              console.log('total Rows', rows.length, schemaName);
              if (!rows.length) break;

              for (const row of rows) {
                const excelRow: any = {
                  dbId: row._id?.toString() || "",
                };

                fields.forEach((f: any) => {
                  let value = row.rowData?.[f.mappedAttributeName];

                  if (Array.isArray(value)) value = value.join(", ");
                  if (value === null || value === undefined) value = "";

                  const label = f.mappedAttributeName.includes("Converted|") &&
                        f.type === "number"
                          ? `${f.label} (${user.orgDefaultCurrency})`
                          : f.label;

                  excelRow[label] = value;
                });
                excelRow['conversionRate'] = row?.conversion?.rate;


                worksheet.addRow(excelRow).commit();
              }

              console.log(
                `📄 ${dataSourceDetails.name} → processed page ${page}`
              );

              if (rows.length < safeLimit) break;
              page++;
            }

            await worksheet.commit();
            await workbook.commit();

            tempFiles.push({
              path: tempFilePath,
              fileType: dataSourceDetails?.code,
            });

            generatedTempFiles.push(tempFilePath);

            // ---------------------------------------------
        // ⚠ No Files Case
        // ---------------------------------------------
        if (!tempFiles.length && !vendorInvoiceFiles.length){
          console.warn("⚠ No files available for AI upload");
          return;
        }

        // ---------------------------------------------
        // 📤 Upload To AI
        // ---------------------------------------------
        const formData = new FormData();

        // ✅ Excel files
        tempFiles.forEach((file) => {
          formData.append(
            "files",
            fs.createReadStream(file.path) as any,
            path.basename(file.path)
          );
          formData.append("file_type", file.fileType);
        });

        formData.append("webhookUrl", `${process.env.BASE_BACKEND_URL}/api/v1/common/dataSourceVersion/reconciledInvoices`);
        formData.append("authToken", aiToken);

        // ✅ Vendor Invoice PDFs (Multiple)
        vendorInvoiceFiles.forEach((file) => {
          formData.append(
            "files",
            fs.createReadStream(file.path) as any,
            file.fileName
          );
          formData.append("file_type", "invoice_pdf");
        });

        // ✅ Metadata
        formData.append("billing_cycle", versionValue || "");
        formData.append("vendorName", vendorName);
        formData.append("vendorId", vendorId);

        console.log('validateInvoice payload', JSON.stringify(formData));

        // const response = await axios.post(
        //   `${process.env.BASE_AI_SERVICE_URL}/validateInvoice`,
        //   formData,
        //   {
        //     headers: {
        //       ...formData.getHeaders(),
        //     },
        //     maxBodyLength: Infinity,
        //     maxContentLength: Infinity,
        //     timeout: 15 * 60 * 1000,
        //   }
        // );

        // console.log("✅ AI upload success:", response?.data);
        let response;

      try {
        response = await axios.post(
          `${process.env.BASE_AI_SERVICE_URL}/validateInvoice`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 15 * 60 * 1000,
          }
        );

        console.log("✅ AI upload success:", response?.data);

        // =============================================
        // ❗ UPDATED: handle success=false as error
        // =============================================
        if (response?.data?.success !== true) {
          throw new Error("AI response success=false");
        }

        // ✅ DO NOTHING → webhook will mark completed

      } catch (error: any) {
        console.error("❌ AI upload failed:", error?.message);

        // =============================================
        // ✅ NEW: mark as ERROR
        // =============================================
        await dataSourceVersionValueService.updateMany(
          schemaName,
          processingFilter,
          {
            $set: {
              aiPreValidateStatus: "error",
              updatedAt: new Date(),
            },
          }
        );
      }
          } catch (err: any) {
            console.error(
              `❌ Failed processing datasource ${dataSourceId}:`,
              err.message
            );
          }
        }

        

        // ---------------------------------------------
        // 🧹 Cleanup Temp Files
        // ---------------------------------------------
        generatedTempFiles.forEach((file) => {
          try {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
            }
          } catch {
            console.warn("⚠ Failed to delete temp file:", file);
          }
        });

        return true;
      }else{
        // =========================================================
      // 🔵 JOB 2: ACTIVITY FILES
      // =========================================================
      if (job.name === "sendActivityFiles") {
        const formData = new FormData();
        const query: any = {
            versionValue,
            status: "active",
          };
        if(activityType){
          query.activityType = activityType;
        }
        // ✅ Fetch Activities
        const activities = await activityService.getActivityList({
          query,
          paginate: false
        });

        if (!activities?.data?.length) {
          console.warn("⚠ No activity files found");
          return;
        }

        for (const activity of activities.data) {
          if (
            activity.activityFilePath &&
            fs.existsSync(activity.activityFilePath)
          ) {
            formData.append(
              "files",
              fs.createReadStream(activity.activityFilePath) as any,
              activity.activityFileName ||
                path.basename(activity.activityFilePath)
            );

            formData.append("file_type", activity.activityType);
          }
        }

        formData.append("billing_cycle", versionValue || "");

        const res = await axios.post(
          `${process.env.BASE_AI_SERVICE_URL}/activityFiles`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 15 * 60 * 1000,
          }
        );

        console.log("✅ Activity upload success:", res.data);

        return res.data;
        }
      }

      // =========================================================
      // 🟣 JOB 3: SEND PRE-VALIDATED ROWS
      // =========================================================
     if (job.name === "sendPreValidatedRows") {
  console.log("🚀 Pre-validated rows job started");

  const {
    dataSourceId,
    rowIds,
    filters,
    search,
    year,
    month,
    user,
  } = job.data;

  try {
    // ---------------------------------------------
    // 📦 FETCH DATASOURCE
    // ---------------------------------------------
    const dataSourceDetails =
      await dataSourceService.findDataSourceById(dataSourceId, true);

    if (!dataSourceDetails) {
      throw new Error("Data source not found");
    }

    // ---------------------------------------------
    // 🧠 PARSE FILTERS
    // ---------------------------------------------
    let finalFilters: any = {};
    try {
      finalFilters = filters ? JSON.parse(filters) : {};
    } catch (err) {
      console.error("❌ Failed to parse filters:", err);
      finalFilters = {};
    }

    // ---------------------------------------------
    // 🧩 BASE QUERY
    // ---------------------------------------------
    let query: any = { status: "active" };
    let finalSearchFilters: any = {};

    if (rowIds?.length) {
      query._id = {
        $in: rowIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      };
    } else {
      // ---------------------------------------------
      // 🔍 SEARCH FILTERS
      // ---------------------------------------------
      if (search) {
        for (const field of dataSourceDetails.fieldSettings) {
          if (
            field.mappedAttributeName &&
            field.mappedAttributeName !== "Unknown"
          ) {
            finalSearchFilters[field.mappedAttributeName] = search;
          }
        }
      }

      // ---------------------------------------------
      // 🧠 VERSION FILTER
      // ---------------------------------------------
      const versionQuery: any = {
        dataSourceId,
        isCurrent: true,
      };

      if (year && month) {
        versionQuery.versionValue = `${year}-${month.padStart(2, "0")}`;
      } else if (year) {
        versionQuery.versionValue = { $regex: `^${year}` };
      }

      const versionList =
        await dataSourceVersionServices.getDataSourceVersionList({
          query: versionQuery,
        });

      const versionIds =
        versionList?.data?.map((v: any) => v._id) || [];

      if (dataSourceDetails.versionType !== "constant") {
        query.dataSourceVersionId = { $in: versionIds };
      }
    }

    // ---------------------------------------------
    // 🧠 SCHEMA NAME & TOKEN
    // ---------------------------------------------
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode: user.orgCode,
      versionCode: dataSourceDetails.code,
    });

    await dataSourceVersionValueService.updateMany(
  schemaName,
  query, // 🔁 use same query as-is
  {
    $set: {
      aiPreValidateStatus: "processing",
      updatedAt: new Date(),
    },
  }
);

    const aiToken = generateAIToken({
      userId: user.userId,
      organizationId: user.organizationId,
      orgCode: user.orgCode,
      orgDefaultCurrency: user?.orgDefaultCurrency || "USD",
      scope: "ai:invoice:process",
    });

    // ---------------------------------------------
    // 📄 Excel Setup
    // ---------------------------------------------
    const fileName = `revalidate_${Date.now()}.xlsx`;
    const tempFilePath = path.join(os.tmpdir(), fileName);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: tempFilePath,
    });

    const worksheet = workbook.addWorksheet("Rows");

    const fields = dataSourceDetails.fieldSettings.filter(
      (f: any) => !f.isDerived
    );

    worksheet.columns = [
      { header: "DB Id", key: "dbId", width: 30 },
      { header: "Conversion Rate", key: "conversionRate", width: 30 },
      ...fields.map((f: any) => ({
        header: f.label,
        key: f.label,
        width: 25,
      })),
    ];

    // ---------------------------------------------
    // 📊 BATCH PROCESSING
    // ---------------------------------------------
    let page = 1;
    const safeLimit = 5000;

    while (true) {
      const result =
        await dataSourceVersionValueService.getDataSourceVersionValueV1({
          schemaName,
          query : {
            ...query,
            aiPreValidateStatus: "processing",
          },
          page,
          limit: safeLimit,
          sort: {},
          filters: finalFilters,
          searchFilters: finalSearchFilters,
          entityId: dataSourceDetails.entityId,
        });

      const rows = result?.data ?? [];

      console.log("total rows", rows.length, schemaName);

      if (!rows.length) break;

      for (const row of rows) {
        const excelRow: any = {
          dbId: row._id?.toString() || "",
          conversionRate: row?.conversion?.rate,
        };

        // ---------------------------------------------
        // Use saved mappedAttributeName directly
        // ---------------------------------------------
        fields.forEach((f: any) => {
          const key = f.mappedAttributeName;
          let value =
            key && key !== "Unknown"
              ? row.rowData?.[key]
              : "";

          if (Array.isArray(value)) value = value.join(", ");
          if (value === null || value === undefined) value = "";

          const label =
            key &&
            key.includes("Converted|") &&
            f.type === "number"
              ? `${f.label} (${user.orgDefaultCurrency})`
              : f.label;

          excelRow[label] = value;
        });

        worksheet.addRow(excelRow).commit();
      }

      console.log(`📄 Processed page ${page}`);

      if (rows.length < safeLimit) break;

      page++;
    }

    await worksheet.commit();
    await workbook.commit();

    // ---------------------------------------------
    // 📤 AI CALL
    // ---------------------------------------------
    const formData = new FormData();

    formData.append(
      "files",
      fs.createReadStream(tempFilePath),
      path.basename(tempFilePath)
    );

    formData.append("file_type", dataSourceDetails.code);
    formData.append(
      "webhookUrl",
      `${process.env.BASE_BACKEND_URL}/api/v1/common/dataSourceVersion/reconciledInvoices`
    );
    formData.append("authToken", aiToken);
    try {
    const response = await axios.post(
      `${process.env.BASE_AI_SERVICE_URL}/validateInvoice`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 15 * 60 * 1000,
      }
    );

    console.log("✅ AI success:", response.data);

    if (response?.data?.success !== true) {
      throw new Error("AI response success=false");
    }
  } catch (err: any) {
  console.error("❌ AI failed:", err.message);

  await dataSourceVersionValueService.updateMany(
    schemaName,
    {
      ...query,
      aiPreValidateStatus: "processing",
    },
    {
      $set: {
        aiPreValidateStatus: "error",
        updatedAt: new Date(),
      },
    }
  );

  throw err;
}

    // cleanup
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return true;
  } catch (err: any) {
    console.error("❌ Job failed:", err.message);
    throw err;
  }
}

    if (job.name === "sendCostValidatedRows") {
  console.log("🚀 Pre-validated rows job started");

  const {
    dataSourceId,
    rowIds,
    filters,
    search,
    year,
    month,
    user,
  } = job.data;

  try {
    // ---------------------------------------------
    // 📦 FETCH DATASOURCE
    // ---------------------------------------------
    const dataSourceDetails =
      await dataSourceService.findDataSourceById(dataSourceId, true);

    if (!dataSourceDetails) {
      throw new Error("Data source not found");
    }

    // ---------------------------------------------
    // 🧠 PARSE FILTERS
    // ---------------------------------------------
    let finalFilters: any = {};
    try {
      finalFilters = filters ? JSON.parse(filters) : {};
    } catch (err) {
      console.error("❌ Failed to parse filters:", err);
      finalFilters = {};
    }

    // ---------------------------------------------
    // 🧩 BASE QUERY
    // ---------------------------------------------
    let query: any = { status: "active" };
    let finalSearchFilters: any = {};

    if (rowIds?.length) {
      query._id = {
        $in: rowIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      };
    } else {
      // ---------------------------------------------
      // 🔍 SEARCH FILTERS
      // ---------------------------------------------
      if (search) {
        for (const field of dataSourceDetails.fieldSettings) {
          if (
            field.mappedAttributeName &&
            field.mappedAttributeName !== "Unknown"
          ) {
            finalSearchFilters[field.mappedAttributeName] = search;
          }
        }
      }

      // ---------------------------------------------
      // 🧠 VERSION FILTER
      // ---------------------------------------------
      const versionQuery: any = {
        dataSourceId,
        isCurrent: true,
      };

      if (year && month) {
        versionQuery.versionValue = `${year}-${month.padStart(2, "0")}`;
      } else if (year) {
        versionQuery.versionValue = { $regex: `^${year}` };
      }

      const versionList =
        await dataSourceVersionServices.getDataSourceVersionList({
          query: versionQuery,
        });

      const versionIds =
        versionList?.data?.map((v: any) => v._id) || [];

      if (dataSourceDetails.versionType !== "constant") {
        query.dataSourceVersionId = { $in: versionIds };
      }
    }

    // ---------------------------------------------
    // 🧠 SCHEMA NAME & TOKEN
    // ---------------------------------------------
    const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode: user.orgCode,
      versionCode: dataSourceDetails.code,
    });

    await dataSourceVersionValueService.updateMany(
  schemaName,
  query, // 🔁 use same query as-is
  {
    $set: {
      aiCostValidateStatus: "processing",
      updatedAt: new Date(),
    },
  }
);

    const aiToken = generateAIToken({
      userId: user.userId,
      organizationId: user.organizationId,
      orgCode: user.orgCode,
      orgDefaultCurrency: user?.orgDefaultCurrency || "USD",
      scope: "ai:invoice:process",
    });

    // ---------------------------------------------
    // 📄 Excel Setup
    // ---------------------------------------------
    const fileName = `revalidate_${Date.now()}.xlsx`;
    const tempFilePath = path.join(os.tmpdir(), fileName);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: tempFilePath,
    });

    const worksheet = workbook.addWorksheet("Rows");

    const fields = dataSourceDetails.fieldSettings.filter(
      (f: any) => !f.isDerived
    );

    worksheet.columns = [
      { header: "DB Id", key: "dbId", width: 30 },
      { header: "Conversion Rate", key: "conversionRate", width: 30 },
      ...fields.map((f: any) => ({
        header: f.label,
        key: f.label,
        width: 25,
      })),
    ];

    // ---------------------------------------------
    // 📊 BATCH PROCESSING
    // ---------------------------------------------
    let page = 1;
    const safeLimit = 5000;

    while (true) {
      const result =
        await dataSourceVersionValueService.getDataSourceVersionValueV1({
          schemaName,
          query : {
            ...query,
            aiCostValidateStatus: "processing",
          },
          page,
          limit: safeLimit,
          sort: {},
          filters: finalFilters,
          searchFilters: finalSearchFilters,
          entityId: dataSourceDetails.entityId,
        });

      const rows = result?.data ?? [];

      console.log("total rows", rows.length, schemaName);

      if (!rows.length) break;

      for (const row of rows) {
        const excelRow: any = {
          dbId: row._id?.toString() || "",
          conversionRate: row?.conversion?.rate,
        };

        // ---------------------------------------------
        // Use saved mappedAttributeName directly
        // ---------------------------------------------
        fields.forEach((f: any) => {
          const key = f.mappedAttributeName;
          let value =
            key && key !== "Unknown"
              ? row.rowData?.[key]
              : "";

          if (Array.isArray(value)) value = value.join(", ");
          if (value === null || value === undefined) value = "";

          const label =
            key &&
            key.includes("Converted|") &&
            f.type === "number"
              ? `${f.label} (${user.orgDefaultCurrency})`
              : f.label;

          excelRow[label] = value;
        });

        worksheet.addRow(excelRow).commit();
      }

      console.log(`📄 Processed page ${page}`);

      if (rows.length < safeLimit) break;

      page++;
    }

    await worksheet.commit();
    await workbook.commit();

    // ---------------------------------------------
    // 📤 AI CALL
    // ---------------------------------------------
    const formData = new FormData();

    formData.append(
      "files",
      fs.createReadStream(tempFilePath),
      path.basename(tempFilePath)
    );

    formData.append("file_type", dataSourceDetails.code);
    formData.append(
      "webhookUrl",
      `${process.env.BASE_BACKEND_URL}/api/v1/common/dataSourceVersion/reconciledInvoicesCost`
    );
    formData.append("authToken", aiToken);
    try {
    const response = await axios.post(
      `${process.env.BASE_AI_SERVICE_URL}/validateInvoiceCost`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 15 * 60 * 1000,
      }
    );

    console.log("✅ AI success:", response.data);

    if (response?.data?.success !== true) {
      throw new Error("AI response success=false");
    }
  } catch (err: any) {
  console.error("❌ AI failed:", err.message);

  await dataSourceVersionValueService.updateMany(
    schemaName,
    {
      ...query,
      aiCostValidateStatus: "processing",
    },
    {
      $set: {
        aiCostValidateStatus: "error",
        updatedAt: new Date(),
      },
    }
  );

  throw err;
}

    // cleanup
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return true;
  } catch (err: any) {
    console.error("❌ Job failed:", err.message);
    throw err;
  }
}
    } catch (error: any) {
      console.error("❌ AI File Worker Failed:", error.message);
      throw error;
    }
  },
  {
    connection: { host: "redis" },
    lockDuration: 15 * 60 * 1000,
    concurrency: 1,
  }
);

new Worker(
  "aiAnalyzeData",
  async (job) => {
    try {
      if (job.name !== "aiReconcilationInvoices" && job.name !== "aiReconcilationInvoicesCost") return;

      if(job.name == "aiReconcilationInvoices" ){
      console.log("🚀 Reconciliation Job Started");

      const { filePath, orgCode, dataSourceId } = job.data;

      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      if (!dataSourceId) {
        throw new Error("dataSourceId is required");
      }

      // ---------------------------------------------
      // ✅ Fetch DataSource Details
      // ---------------------------------------------
      const dataSourceDetails: any =
        await dataSourceService.findDataSourceById(dataSourceId, true);

      if (!dataSourceDetails) {
        throw new Error("Invalid dataSourceId");
      }

      // ---------------------------------------------
      // ✅ Get ONLY Validated Fields
      // ---------------------------------------------
      const validatedFieldMap: any = getValidatedFieldsMap(dataSourceDetails, "Validated|");

      console.log("✅ Validated Fields:", validatedFieldMap);

      // ---------------------------------------------
      // ✅ Resolve Schema
      // ---------------------------------------------
      const schemaName =
        getSchemaNameBasedOnVersionCodeAndOrgCode({
          orgCode,
          versionCode: dataSourceDetails.code,
        });

      const Model = createDefaultDataSourceVersionModel(
        schemaName
      ) as Model<Document>;

      console.log("schemaName:", schemaName);
      console.log("orgCode:", orgCode);
      console.log("versionCode:", dataSourceDetails.code);

      // ---------------------------------------------
      // 📄 Read Excel
      // ---------------------------------------------
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("No sheet found");

      const headers: string[] = [];

      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || "";
      });

      // ---------------------------------------------
      // 🔥 Bulk Ops
      // ---------------------------------------------
      const bulkOps: any[] = [];
      const BATCH_SIZE = 5000;

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);

        let dbId: any = null;
        const updateFields: Record<string, any> = {};

        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber];
          let value = cell.value;
          if (key === "DB Id") {
            dbId = value?.toString().trim();
          }  else if (validatedFieldMap[key]) {
            const field = validatedFieldMap[key];

             // If array → convert to comma-separated
            if (Array.isArray(value)) {
              value = value.join(", ");
            }

            // If date or date-range → format
            if (field.type === "date" || field.type === "date-range") {
              value = formatDateValue(value);
            }

            updateFields[`rowData.${field.mappedAttributeName}`] = value;
          }
        });

        console.log('updateFields', updateFields, dbId);

        if (!dbId || Object.keys(updateFields).length === 0) continue;

        bulkOps.push({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(dbId) },
            update: {
              $set: {
                ...updateFields,
                status: "active", // optional
                aiPreValidateStatus: "completed"
              },
            },
          },
        });

        // ---------------------------------------------
        // 🚀 Batch Execution
        // ---------------------------------------------
        if (bulkOps.length >= BATCH_SIZE) {
          const result = await Model.bulkWrite(bulkOps);

          console.log("📦 Batch Update:", {
            matched: result.matchedCount,
            modified: result.modifiedCount,
          });

          bulkOps.length = 0;
        }
      }

      // ---------------------------------------------
      // 🚀 Final Flush
      // ---------------------------------------------
      if (bulkOps.length) {
        console.log('bulkOps', JSON.stringify(bulkOps));
        const result = await Model.bulkWrite(bulkOps);

        console.log("📊 Final Bulk Result:", {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        });
      }

      // ---------------------------------------------
      // 🧹 Cleanup
      // ---------------------------------------------
      try {
        fs.unlinkSync(filePath);
      } catch {
        console.warn("⚠ Failed to delete file:", filePath);
      }

      console.log("✅ Reconciliation Completed");

      return true;
    }else{
      console.log("🚀 Reconciliation Cost Job Started");

      const { filePath, orgCode, dataSourceId } = job.data;

      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      if (!dataSourceId) {
        throw new Error("dataSourceId is required");
      }

      // ---------------------------------------------
      // ✅ Fetch DataSource Details
      // ---------------------------------------------
      const dataSourceDetails: any =
        await dataSourceService.findDataSourceById(dataSourceId, true);

      if (!dataSourceDetails) {
        throw new Error("Invalid dataSourceId");
      }

      // ---------------------------------------------
      // ✅ Get ONLY Validated Fields
      // ---------------------------------------------
      const validatedFieldMap: any = getValidatedFieldsMap(dataSourceDetails, "Analyzed|");

      console.log("✅ Validated Fields:", validatedFieldMap);

      // ---------------------------------------------
      // ✅ Resolve Schema
      // ---------------------------------------------
      const schemaName =
        getSchemaNameBasedOnVersionCodeAndOrgCode({
          orgCode,
          versionCode: dataSourceDetails.code,
        });

      const Model = createDefaultDataSourceVersionModel(
        schemaName
      ) as Model<Document>;

      console.log("schemaName:", schemaName);
      console.log("orgCode:", orgCode);
      console.log("versionCode:", dataSourceDetails.code);

      // ---------------------------------------------
      // 📄 Read Excel
      // ---------------------------------------------
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("No sheet found");

      const headers: string[] = [];

      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || "";
      });

      // ---------------------------------------------
      // 🔥 Bulk Ops
      // ---------------------------------------------
      const bulkOps: any[] = [];
      const BATCH_SIZE = 5000;

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);

        let dbId: any = null;
        const updateFields: Record<string, any> = {};

        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber];
          let value = cell.value;
          if (key === "DB Id") {
            dbId = value?.toString().trim();
          }  else if (validatedFieldMap[key]) {
            const field = validatedFieldMap[key];

             // If array → convert to comma-separated
            if (Array.isArray(value)) {
              value = value.join(", ");
            }

            // If date or date-range → format
            if (field.type === "date" || field.type === "date-range") {
              value = formatDateValue(value);
            }

            updateFields[`rowData.${field.mappedAttributeName}`] = value;
          }
        });

        console.log('updateFields', updateFields, dbId);

        if (!dbId || Object.keys(updateFields).length === 0) continue;

        bulkOps.push({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(dbId) },
            update: {
              $set: {
                ...updateFields,
                status: "active", // optional
                aiCostValidateStatus: "completed"
              },
            },
          },
        });

        // ---------------------------------------------
        // 🚀 Batch Execution
        // ---------------------------------------------
        if (bulkOps.length >= BATCH_SIZE) {
          const result = await Model.bulkWrite(bulkOps);

          console.log("📦 Batch Update:", {
            matched: result.matchedCount,
            modified: result.modifiedCount,
          });

          bulkOps.length = 0;
        }
      }

      // ---------------------------------------------
      // 🚀 Final Flush
      // ---------------------------------------------
      if (bulkOps.length) {
        console.log('bulkOps', JSON.stringify(bulkOps));
        const result = await Model.bulkWrite(bulkOps);

        console.log("📊 Final Bulk Result:", {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        });
      }

      // ---------------------------------------------
      // 🧹 Cleanup
      // ---------------------------------------------
      try {
        fs.unlinkSync(filePath);
      } catch {
        console.warn("⚠ Failed to delete file:", filePath);
      }

      console.log("✅ Reconciliation Cost Completed");

      return true;
    }
    } catch (error: any) {
      console.error("❌ Reconciliation Worker Failed:", error.message);
      throw error;
    }
  },
  {
    connection: { host: "redis" },
    concurrency: 1,
  }
);

  console.log("AI Worker started");

})();