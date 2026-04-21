/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import ActivityRateCard from '../../models/invoicivixVendor/activityRateCard';

export const createActivityRateCard = async (data: any) => {
  const rateCard = new ActivityRateCard(data);
  await rateCard.save();
  return rateCard;
};

export const findActivityRateCardById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = ActivityRateCard.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const updateActivityRateCard = async (id: string, data: any) => {
  return await ActivityRateCard.findByIdAndUpdate(id, data, { new: true });
};

export const deleteActivityRateCard = async (activityRateCardId: string) => {
  return await ActivityRateCard.findByIdAndUpdate(
    activityRateCardId,
    { status: 'inactive' },
    { new: true }
  );
};

// export const getActivityRateCardList = async ({
//   query,
//   select = '',
//   page,
//   limit,
//   sort = { createdAt: -1 },
//   populate,
// }: any) => {
//   let rateQuery: any = ActivityRateCard.find(query)
//     .select(select)
//     .skip((page - 1) * limit)
//     .limit(limit)
//     .sort(sort);

//   if (populate && Array.isArray(populate)) {
//     populate.forEach((field) => {
//       rateQuery = rateQuery.populate(field);
//     });
//   }

//   const data = await rateQuery.exec();
//   const totalCount = await ActivityRateCard.countDocuments(query);

//   return { data, totalCount };
// };

export const getActivityRateCardList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
  conversionFields = [], // ✅ NEW
}: any) => {
  const skip = (page - 1) * limit;

  let rateQuery: any = ActivityRateCard.find(query)
    .select(select)
    .skip(skip)
    .limit(limit)
    .sort(sort);

  // ✅ KEEP YOUR EXISTING POPULATE (NO CHANGE)
  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      rateQuery = rateQuery.populate(field);
    });
  }

  const rawData = await rateQuery.exec();
  const totalCount = await ActivityRateCard.countDocuments(query);

  // =========================
  // ✅ APPLY CONVERSION (POST QUERY)
  // =========================
  const data = rawData.map((doc: any) => {
    const obj = doc.toObject();

    // if (!obj.conversion || !obj.conversion.rate) {
    //   return obj;
    // }

    const rate = obj?.conversion?.rate ?? 1;

    conversionFields.forEach((field: string) => {
      const value = obj[field];

      if (
        value !== null &&
        value !== undefined &&
        !isNaN(value) &&
        rate !== 0
      ) {
        obj[`Converted|${field}`] = Number(
          (value / rate).toFixed(2) // ✅ DIVIDE
        );
      } else {
        obj[`Converted|${field}`] = null;
      }
    });

    // ✅ Add Converted Currency
    obj["Converted|currency"] = obj?.conversion?.targetCurrency ?? 'USD';

    return obj;
  });

  return { data, totalCount };
};

export const getActivityRateCardExportList = async ({
  query = {},
  sort = { createdAt: -1 },
  user,
  page,
  limit,
}: any) => {

  const skip = (page - 1) * limit;

  const populate = [
    { path: "vendorId", select: "name code" },
    { path: "attorneyId", select: "name email" },
    { path: "subVendorId", select: "name code" },
    { path: "engagementLetterId", select: "referenceNumber" },
  ];

  const conversionFields = ["rate", "maxRate", "minRate", "upperCap"];

  const selectedFields = [
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
  ];

  const aliasFields: any = {
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
  "Converted|rate": `Rate (${user.orgDefaultCurrency})`,
  "Converted|minRate": `Min Rate (${user.orgDefaultCurrency})`,
  "Converted|maxRate": `Max Rate (${user.orgDefaultCurrency})`,
  "Converted|upperCap": `Upper Cap (${user.orgDefaultCurrency})`,
  "Converted|currency": "Default Currency",
};

  // =========================
  // ✅ HELPER: SAFE GET (DEEP PATH)
  // =========================
  const getValueByPath = (obj: any, path: string) => {
    return path.split(".").reduce((acc, key) => {
      return acc ? acc[key] : null;
    }, obj);
  };

  // =========================
  // ✅ BUILD QUERY
  // =========================
  let queryBuilder: any = ActivityRateCard.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .lean();

  // =========================
  // ✅ APPLY POPULATE
  // =========================
  populate.forEach((pop) => {
    queryBuilder = queryBuilder.populate(pop);
  });

  const rawData = await queryBuilder.exec();

  // =========================
  // ✅ APPLY CONVERSION (SAME AS LIST API)
  // =========================
  const processedData = rawData.map((item: any) => {
    const rate = item?.conversion?.rate ?? 1;

    conversionFields.forEach((field: string) => {
      const value = item[field];

      if (
        value !== null &&
        value !== undefined &&
        !isNaN(value) &&
        rate !== 0
      ) {
        item[`Converted|${field}`] = Number(
          (value / rate).toFixed(2)
        );
      } else {
        item[`Converted|${field}`] = null;
      }
    });

    item["Converted|currency"] =
      item?.conversion?.targetCurrency ?? "USD";

    return item;
  });

  // =========================
  // ✅ FINAL EXPORT FORMAT
  // =========================
  const transformProcessedData = processedData.map((item: any) => {
  const row: any = {};

  selectedFields.forEach((field: string) => {
    let value;

    if (field.startsWith("Converted|")) {
      value = item[field];
    } else {
      value = getValueByPath(item, field);
    }

    const columnKey = aliasFields[field] || field; // ✅ APPLY ALIAS
    row[columnKey] = value ?? null;
  });

  return row;
});

  return { data: transformProcessedData, totalCount: transformProcessedData.length  };
};

export const findOneByQuery = async (query: any) => {
  return await ActivityRateCard.findOne(query);
};