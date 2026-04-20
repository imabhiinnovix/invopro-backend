/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import * as activityRateCardService from "../../../database/services/invoicivixVendor/activityRateCard.service";
import { Types } from "mongoose";
import { formatDateTime, getConversionRate } from "../../../utils/common.utils";
import { createDownloadRequest } from "../../../database/services/common/downloadRequest.service";
import { Queue } from "bullmq";

/**
 * ================================
 * CREATE
 * ================================
 */
export const createActivityRateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, userId, orgDefaultCurrency } = req.user;

    const payload: any = {
      ...req.body,
      organizationId,
      userId,
    };

    // default entity
    payload.activityEntity = payload.activityEntity || "vendor";

    if (payload.vendorId) {
      payload.vendorId = new Types.ObjectId(payload.vendorId);
    }

    if (payload.attorneyId) {
      payload.attorneyId = new Types.ObjectId(payload.attorneyId);
    }

    if (payload.subVendorId) {
      payload.subVendorId = new Types.ObjectId(payload.subVendorId);
    }

    if (payload.engagementLetterId) {
      payload.engagementLetterId = new Types.ObjectId(payload.engagementLetterId);
    }

    /**
     * Entity validation
     */
    if (payload.activityEntity === "vendor") {
      payload.attorneyId = null;
      payload.subVendorId = null;
    }
    console.log('payload', payload);
    if (payload.activityEntity === "attorney" && !payload.attorneyId) {
      return res.status(400).json({
        success: false,
        message: "attorneyId is required when activityEntity is attorney",
      });
    }

    if (payload.activityEntity === "subvendor" && !payload.subVendorId) {
      return res.status(400).json({
        success: false,
        message: "subVendorId is required when activityEntity is subvendor",
      });
    }

    // ================= 🔥 CURRENCY LOGIC (YOUR STYLE) =================
    const rowCurrency =
      typeof payload.currency === "string" && payload.currency
        ? payload.currency.toUpperCase().trim()
        : "";

    if (rowCurrency) {
      const to = orgDefaultCurrency?.toUpperCase()?.trim();
      const from = rowCurrency;

      let rate;

      // ✅ SAME
      if (from === to) {
        rate = 1;
      } else {
        rate = await getConversionRate(from, to);

        // ✅ fallback
        if (!rate) {
          rate = 1;
        }
      }

      payload.conversion = {
        baseCurrency: from,
        targetCurrency: to,
        rate,
      };
    }
    // ====================================================

    const rateCard =
      await activityRateCardService.createActivityRateCard(payload);

    res.status(201).json({
      success: true,
      message: "Activity Rate Card created successfully",
      data: rateCard,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * GET BY ID
 * ================================
 */
export const getActivityRateCardById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { activityRateCardId } = req.params;

    const data = await activityRateCardService.findActivityRateCardById(
      activityRateCardId,
      [
        { path: "vendorId", select: "name code" },
        { path: "attorneyId", select: "name email" },
        { path: "subVendorId", select: "name code" },
        { path: "engagementLetterId", select: "referenceNumber" },
      ]
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Activity Rate Card not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activity Rate Card fetched successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * UPDATE
 * ================================
 */
export const updateActivityRateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { activityRateCardId } = req.params;

    const updatePayload: any = { ...req.body };

    const { orgDefaultCurrency } = req.user;

    if (!updatePayload.activityEntity) {
      updatePayload.activityEntity = "vendor";
    }

    if (updatePayload.vendorId) {
      updatePayload.vendorId = new Types.ObjectId(updatePayload.vendorId);
    }

    if (updatePayload.attorneyId) {
      updatePayload.attorneyId = new Types.ObjectId(updatePayload.attorneyId);
    }

    if (updatePayload.subVendorId) {
      updatePayload.subVendorId = new Types.ObjectId(updatePayload.subVendorId);
    }

    if (updatePayload.engagementLetterId) {
      updatePayload.engagementLetterId = new Types.ObjectId(
        updatePayload.engagementLetterId
      );
    }

    /**
     * Entity validation
     */
    if (updatePayload.activityEntity === "vendor") {
      updatePayload.attorneyId = null;
      updatePayload.subVendorId = null;
    }

    if (
      updatePayload.activityEntity === "attorney" &&
      !updatePayload.attorneyId
    ) {
      return res.status(400).json({
        success: false,
        message: "attorneyId is required when activityEntity is attorney",
      });
    }

    if (
      updatePayload.activityEntity === "subvendor" &&
      !updatePayload.subVendorId
    ) {
      return res.status(400).json({
        success: false,
        message: "subVendorId is required when activityEntity is subvendor",
      });
    }


   // ================= 🔥 SMART CURRENCY LOGIC =================
if (updatePayload.currency) {
  const newCurrency =
    typeof updatePayload.currency === "string"
      ? updatePayload.currency.toUpperCase().trim()
      : "";

  if (newCurrency) {
    // 🔴 get existing record first
    const existing = await activityRateCardService.findActivityRateCardById(activityRateCardId);

    const oldCurrency = existing?.currency?.toUpperCase()?.trim();
    const to = orgDefaultCurrency?.toUpperCase()?.trim();

    // ✅ ONLY if currency changed
    if (oldCurrency !== newCurrency) {
      let rate;

      if (newCurrency === to) {
        rate = 1;
      } else {
        rate = await getConversionRate(newCurrency, to);

        if (!rate) {
          rate = 1; // fallback
        }
      }

      updatePayload.conversion = {
        baseCurrency: newCurrency,
        targetCurrency: to,
        rate,
      };
    }
  }
}
// ==========================================================

    const updated =
      await activityRateCardService.updateActivityRateCard(
        activityRateCardId,
        updatePayload
      );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Activity Rate Card not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activity Rate Card updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * DELETE
 * ================================
 */
export const deleteActivityRateCard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { activityRateCardId } = req.params;

    const deleted =
      await activityRateCardService.deleteActivityRateCard(
        activityRateCardId
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Activity Rate Card not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Activity Rate Card deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ================================
 * LIST
 * ================================
 */
export const getActivityRateCardList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { vendorId, costCode, costType, activityEntity, engagementLetterId, type = 'list' } = req.query;
    const { organizationId, isSuperUser } = req.user;

     // ----------------------------------------------------
    // EXPORT SHORT-CIRCUIT
    // ----------------------------------------------------
    if (type === "export") {
      return exportActivityRateCardListToExcel(req, res, next);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit =
      parseInt(req.query.limit as string, 10) || Number.MAX_SAFE_INTEGER;

    const query: any = { status: "active" };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (vendorId) {
      query.vendorId = new Types.ObjectId(vendorId as string);
    }

    if (engagementLetterId) {
      query.engagementLetterId = new Types.ObjectId(engagementLetterId as string);
    }

    if (activityEntity) {
      query.activityEntity = activityEntity;
    }

    if (costCode) {
      query.costCode = costCode;
    }

    if (costType) {
      query.costType = costType;
    }

    const result =
      await activityRateCardService.getActivityRateCardList({
        query,
        page,
        limit,
        populate: [
          { path: "vendorId", select: "name code" },
          { path: "attorneyId", select: "name email" },
          { path: "subVendorId", select: "name code" },
          { path: "engagementLetterId", select: "referenceNumber" },
        ],
        conversionFields: ['rate', 'maxRate', 'minRate', 'upperCap']
      });

    res.status(200).json({
      success: true,
      message: "Activity Rate Cards fetched successfully",
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const exportActivityRateCardListToExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      vendorId,
      costCode,
      costType,
      activityEntity,
      engagementLetterId,
    } = req.query;

    const { userId, organizationId, isSuperUser, orgDefaultCurrency } = req.user;

    // ----------------------------------------------------
    // BUILD QUERY (SAME AS LIST API)
    // ----------------------------------------------------
    const query: any = { status: "active" };

    if (!isSuperUser) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (vendorId) {
      query.vendorId = new Types.ObjectId(vendorId as string);
    }

    if (engagementLetterId) {
      query.engagementLetterId = new Types.ObjectId(
        engagementLetterId as string
      );
    }

    if (activityEntity) {
      query.activityEntity = activityEntity;
    }

    if (costCode) {
      query.costCode = costCode;
    }

    if (costType) {
      query.costType = costType;
    }

    // ----------------------------------------------------
    // PAYLOAD FOR QUEUE
    // ----------------------------------------------------
    const requestPayload = {
      query,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      sort: { createdAt: -1 },
      populate: [
        { path: "vendorId", select: "name code" },
        { path: "attorneyId", select: "name email" },
        { path: "subVendorId", select: "name code" },
        { path: "engagementLetterId", select: "referenceNumber" },
      ],
      conversionFields: ["rate", "maxRate", "minRate", "upperCap"],
       selectedFields: [
        "vendorId.name",
        "engagementLetterId.referenceNumber",
        "attorneyId.name",
        "subVendorId.name",
        "costCode",
        "costType",
        "rateType",
        "rate",
        "maxRate",
        "minRate",
        "languageFrom",
        "languageTo",
        "upperCap",
        "currency",
         "Converted|rate",
        "Converted|minRate",
        "Converted|maxRate",
        "Converted|upperCap",
        "Converted|currency",
      ],
      aliasFields: {
        "vendorId.name": "Vendor Name",
        "engagementLetterId.referenceNumber": "Engagement Ref No",
        "attorneyId.name": "Attorney Name",
        "subVendorId.name": "Sub Vendor Name",
        costCode: "Cost Code",
        costType: "Cost Type",
        rateType: "Rate Type",
        rate: "Rate",
        minRate: "Min Rate",
        maxRate: "Max Rate",
        languageFrom: "Language From",
        languageTo: "Language To",
        upperCap: "Upper Cap",
        currency: "Currency",
        "Converted|rate": `Rate (${orgDefaultCurrency})`,
        "Converted|minRate": `Min Rate (${orgDefaultCurrency})`,
        "Converted|maxRate": `Max Rate (${orgDefaultCurrency})`,
        "Converted|upperCap": `Upper Cap (${orgDefaultCurrency})`,
         "Converted|currency": "Default Currency",
      },
      queryConfig: {
        service: "activityRateCard.service",
        method: "getActivityRateCardList",
        module: "invoicivixVendor"
      },
    };

    // ----------------------------------------------------
    // CREATE DOWNLOAD REQUEST
    // ----------------------------------------------------
    const fileName = `Activity_Rate_Card_${formatDateTime(
      Date.now()
    )}.xlsx`;

    const downloadRequest = await createDownloadRequest({
      organizationId,
      userId,
      status: "pending",
      fileName,
      requestPayload,
      type: "exportCustomData",
    });

    // ----------------------------------------------------
    // PUSH TO QUEUE
    // ----------------------------------------------------
    const downloadQueue = new Queue("downloadQueue", {
      connection: { host: "redis" },
    });

    await downloadQueue.add("exportCustomData", {
      downloadRequestId: downloadRequest._id,
    });

    // ----------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Export job queued successfully.",
      requestId: downloadRequest._id,
    });
  } catch (err) {
    console.error("exportActivityRateCardListToExcel:", err);
    next(err);
  }
};